const { getKstDateString } = require('../utils/date');
const { DAILY_MISSIONS, DAILY_MISSION_BONUSES } = require('../config/dailyMissions.config');
const repo = require('../repositories/dailyMissions.repo');
const { unlockAchievementCodes } = require('./achievement.service');
const { logActivity } = require('./activity.service');

function missionError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function missionByCode(code) {
  return DAILY_MISSIONS.find((mission) => mission.code === code);
}

async function incrementMission(userId, missionCode) {
  const mission = missionByCode(missionCode);
  if (!mission || !userId) return null;
  return repo.incrementProgress({ userId, missionDate: getKstDateString(), mission });
}

async function getDailyMissions(userId) {
  const date = getKstDateString();
  const [rows, claims] = await Promise.all([repo.listProgress(userId, date), repo.listBonusClaims(userId, date)]);
  const progress = new Map(rows.map((row) => [row.mission_code, row]));
  const claimed = new Map(claims.map((row) => [row.bonus_code, row]));
  const missions = DAILY_MISSIONS.map((mission) => {
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
    missions,
    bonuses: DAILY_MISSION_BONUSES.map((bonus) => ({
      ...bonus,
      completedCount,
      claimable: completedCount >= (bonus.requiredCompleted === 'all' ? missions.length : bonus.requiredCompleted),
      claimed: Boolean(claimed.get(bonus.code)?.claimed)
    })),
    completedCount,
    totalCount: missions.length
  };
}

async function claimMission(userId, missionCode) {
  if (!missionByCode(missionCode)) throw missionError('존재하지 않는 미션입니다.', 404);
  const result = await repo.claimMission({ userId, missionDate: getKstDateString(), missionCode });
  return { ...result, unlockedAchievements: await unlockAchievementCodes(userId, ['DAILY_MISSION_FIRST']) };
}

async function claimBonus(userId, bonusCode) {
  const bonus = DAILY_MISSION_BONUSES.find((item) => item.code === bonusCode);
  if (!bonus) throw missionError('존재하지 않는 미션 보너스입니다.', 404);
  const result = await repo.claimBonus({
    userId,
    missionDate: getKstDateString(),
    bonusCode,
    requiredCompleted: bonus.requiredCompleted === 'all' ? DAILY_MISSIONS.length : bonus.requiredCompleted,
    rewardPoints: bonus.rewardPoints
  });
  const codes = bonus.code === 'complete_all' ? ['DAILY_MISSION_ALL'] : [];
  if (bonus.code === 'complete_all') await logActivity({
    userId, action: 'daily_missions_completed_all', platform: 'hub-missions',
    metadata: { missionDate: getKstDateString(), rewardPoints: bonus.rewardPoints }, isPublic: true
  });
  return { ...result, unlockedAchievements: await unlockAchievementCodes(userId, codes) };
}

module.exports = { incrementMission, getDailyMissions, claimMission, claimBonus };
