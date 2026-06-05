const { getKstDateString } = require('../utils/date');
const {
  DAILY_MISSIONS,
  DAILY_MISSION_BONUSES,
  WEEKLY_MISSIONS,
  WEEKLY_MISSION_BONUSES
} = require('../config/dailyMissions.config');
const repo = require('../repositories/dailyMissions.repo');
const { unlockAchievementCodes } = require('./achievement.service');
const { logActivity } = require('./activity.service');

function missionError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function mondayKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const kstNoonUtc = new Date(parts.year + '-' + parts.month + '-' + parts.day + 'T03:00:00.000Z');
  const day = kstNoonUtc.getUTCDay() || 7;
  kstNoonUtc.setUTCDate(kstNoonUtc.getUTCDate() - day + 1);
  return formatter.format(kstNoonUtc);
}

function missionMatchesAction(mission, actionCode) {
  if (mission.actionCode) return mission.actionCode === actionCode;
  if (Array.isArray(mission.actionCodes)) return mission.actionCodes.includes(actionCode);
  return mission.code === actionCode;
}

function missionsForScope(scope = 'daily') {
  return scope === 'weekly' ? WEEKLY_MISSIONS : DAILY_MISSIONS;
}

function bonusesForScope(scope = 'daily') {
  return scope === 'weekly' ? WEEKLY_MISSION_BONUSES : DAILY_MISSION_BONUSES;
}

function missionByCode(code, scope = 'daily') {
  return missionsForScope(scope).find((mission) => mission.code === code);
}

function bonusByCode(code, scope = 'daily') {
  return bonusesForScope(scope).find((bonus) => bonus.code === code);
}

function periodKey(scope) {
  return scope === 'weekly' ? mondayKey() : getKstDateString();
}

async function incrementMission(userId, actionCode) {
  if (!userId || !actionCode) return null;
  const dailyDate = getKstDateString();
  const weeklyDate = mondayKey();
  const tasks = [];

  for (const mission of DAILY_MISSIONS.filter((item) => missionMatchesAction(item, actionCode))) {
    tasks.push(repo.incrementProgress({ userId, missionDate: dailyDate, mission }));
  }
  for (const mission of WEEKLY_MISSIONS.filter((item) => missionMatchesAction(item, actionCode))) {
    tasks.push(repo.incrementProgress({ userId, missionDate: weeklyDate, mission }));
  }

  if (!tasks.length) return null;
  const results = await Promise.allSettled(tasks);
  const rejected = results.find((result) => result.status === 'rejected');
  if (rejected) throw rejected.reason;
  return results.map((result) => result.value);
}

async function getMissions(userId, scope = 'daily') {
  const date = periodKey(scope);
  const sourceMissions = missionsForScope(scope);
  const sourceBonuses = bonusesForScope(scope);
  const [rows, claims] = await Promise.all([repo.listProgress(userId, date), repo.listBonusClaims(userId, date)]);
  const progress = new Map(rows.map((row) => [row.mission_code, row]));
  const claimed = new Map(claims.map((row) => [row.bonus_code, row]));
  const missions = sourceMissions.map((mission) => {
    const row = progress.get(mission.code);
    return {
      ...mission,
      progress: Number(row?.progress || 0),
      completed: Boolean(row?.completed),
      claimed: Boolean(row?.claimed)
    };
  });
  const completedCount = missions.filter((mission) => mission.completed).length;
  return {
    date,
    scope,
    missions,
    bonuses: sourceBonuses.map((bonus) => ({
      ...bonus,
      completedCount,
      claimable: completedCount >= (bonus.requiredCompleted === 'all' ? missions.length : bonus.requiredCompleted),
      claimed: Boolean(claimed.get(bonus.code)?.claimed)
    })),
    completedCount,
    totalCount: missions.length
  };
}

async function getDailyMissions(userId) {
  return getMissions(userId, 'daily');
}

async function getWeeklyMissions(userId) {
  return getMissions(userId, 'weekly');
}

async function claimMission(userId, missionCode, scope = 'daily') {
  if (!missionByCode(missionCode, scope)) throw missionError('존재하지 않는 미션입니다.', 404);
  const date = periodKey(scope);
  const result = scope === 'weekly'
    ? await repo.claimWeeklyMission({ userId, missionDate: date, missionCode })
    : await repo.claimMission({ userId, missionDate: date, missionCode });
  const codes = scope === 'daily' ? ['DAILY_MISSION_FIRST'] : [];
  return { ...result, unlockedAchievements: await unlockAchievementCodes(userId, codes) };
}

async function claimBonus(userId, bonusCode, scope = 'daily') {
  const bonus = bonusByCode(bonusCode, scope);
  if (!bonus) throw missionError('존재하지 않는 보너스입니다.', 404);
  const missions = missionsForScope(scope);
  const payload = {
    userId,
    missionDate: periodKey(scope),
    bonusCode,
    missionCodes: missions.map((mission) => mission.code),
    requiredCompleted: bonus.requiredCompleted === 'all' ? missions.length : bonus.requiredCompleted,
    rewardPoints: bonus.rewardPoints
  };
  const result = scope === 'weekly' ? await repo.claimWeeklyBonus(payload) : await repo.claimBonus(payload);
  const codes = scope === 'daily' && bonus.code === 'complete_all' ? ['DAILY_MISSION_ALL'] : [];
  if (scope === 'daily' && bonus.code === 'complete_all') await logActivity({
    userId, action: 'daily_missions_completed_all', platform: 'hub-missions',
    metadata: { missionDate: getKstDateString(), rewardPoints: bonus.rewardPoints }, isPublic: true
  });
  return { ...result, unlockedAchievements: await unlockAchievementCodes(userId, codes) };
}

module.exports = {
  incrementMission,
  getDailyMissions,
  getWeeklyMissions,
  claimMission,
  claimBonus,
  mondayKey
};
