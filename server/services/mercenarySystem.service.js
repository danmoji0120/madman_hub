const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { provider, run } = require('../db');
const { ensurePointAccount } = require('./points.service');
const repo = require('../repositories/mercenarySystem.repo');

const MASTER_PATH = path.join(__dirname, '../../public/data/mercenaries.master.json');
const MISSION_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.missions.master.json');
const RECRUIT_BOARD_SIZE = 5;
const RECRUIT_REFRESH_COST = 20000;
const RECRUIT_DAILY_REFRESH_LIMIT = 4;
const RECRUIT_GRADE_RATES = [
  { grade: 'N', rate: 94.9 },
  { grade: 'R', rate: 5.0 },
  { grade: 'SR', rate: 0.1 }
];
const SQUAD_SLOT_LIMIT = 3;
const SQUAD_MEMBER_LIMIT = 3;
const MAX_OFFICE_LEVEL = 50;
const BASE_OFFICE_EXP = 150;
const MISSION_OFFER_REFILL_INTERVAL_SECONDS = 1800;
const ALLOWED_OPERATIONAL_STATUSES = new Set(['idle', 'dispatched', 'injured', 'treating']);
const OPERATIONAL_STATUS_LABELS = {
  idle: '대기 중',
  dispatched: '파견 중',
  injured: '부상',
  treating: '치료 중'
};
const GRADE_GROWTH_RATES = {
  N: 0.45,
  R: 0.65,
  SR: 0.9,
  SSR: 1.2,
  EX: 1
};
const BASE_EXP_BY_GRADE = {
  N: 100,
  R: 140,
  SR: 210,
  SSR: 320,
  EX: 260
};
const MERCENARY_INITIAL_GOLD = Number(process.env.MERCENARY_INITIAL_GOLD ?? 50000) || 0;

let masterCache = null;
let missionCache = null;

function httpError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

function publicMercenaryProfile(profile) {
  const officeProgress = normalizeOfficeProgress(profile);
  const unlocks = calculateOfficeUnlocks(officeProgress.officeLevel);
  return {
    gold: Number(profile?.gold || 0),
    mercenaryGold: Number(profile?.gold || 0),
    reputation: Number(profile?.reputation || 0),
    rank: profile?.rank || 'D',
    officeLevel: officeProgress.officeLevel,
    officeExp: officeProgress.officeExp,
    officeMaxLevel: MAX_OFFICE_LEVEL,
    officeExpToNext: officeProgress.officeExpToNext,
    officeExpProgress: officeProgress.officeExpProgress,
    isOfficeMaxLevel: officeProgress.isOfficeMaxLevel,
    officeReputation: officeProgress.officeReputation,
    maxSquadSlots: unlocks.maxSquadSlots,
    maxActiveRuns: unlocks.maxActiveRuns,
    missionTier: unlocks.missionTier
  };
}

function calculateOfficeExpToNext(officeLevel, maxOfficeLevel = MAX_OFFICE_LEVEL) {
  const safeMaxLevel = Math.max(1, Number(maxOfficeLevel) || MAX_OFFICE_LEVEL);
  const safeLevel = Math.max(1, Math.min(Number(officeLevel) || 1, safeMaxLevel));
  if (safeLevel >= safeMaxLevel) return 0;
  const levelOffset = safeLevel - 1;
  const growth = 1 + levelOffset * 0.28 + Math.pow(levelOffset, 2) * 0.022;
  return Math.floor(BASE_OFFICE_EXP * growth);
}

function calculateOfficeExpProgress(officeExp, officeExpToNext, isOfficeMaxLevel) {
  if (isOfficeMaxLevel) return 1;
  const required = Number(officeExpToNext || 0);
  if (required <= 0) return 0;
  return Math.max(0, Math.min(1, (Number(officeExp || 0) || 0) / required));
}

function calculateOfficeUnlocks(officeLevel) {
  const level = Math.max(1, Number(officeLevel) || 1);
  return {
    maxSquadSlots: level >= 10 ? 5 : level >= 5 ? 4 : 3,
    maxActiveRuns: level >= 15 ? 3 : level >= 6 ? 2 : 1,
    missionTier: level >= 10 ? 3 : level >= 3 ? 2 : 1
  };
}

function applyOfficeExpProgress(profile, gainedOfficeExp = 0, maxOfficeLevel = MAX_OFFICE_LEVEL) {
  const safeMaxLevel = Math.max(1, Number(maxOfficeLevel) || MAX_OFFICE_LEVEL);
  let officeLevel = Math.max(1, Math.min(Number(profile?.officeLevel ?? profile?.office_level ?? 1) || 1, safeMaxLevel));
  officeLevel = Math.floor(officeLevel);
  let officeExp = Math.max(0, Number(profile?.officeExp ?? profile?.office_exp ?? 0) || 0);
  officeExp += Math.max(0, Number(gainedOfficeExp || 0) || 0);

  while (officeLevel < safeMaxLevel) {
    const required = calculateOfficeExpToNext(officeLevel, safeMaxLevel);
    if (required <= 0 || officeExp < required) break;
    officeExp -= required;
    officeLevel += 1;
  }

  if (officeLevel >= safeMaxLevel) {
    officeLevel = safeMaxLevel;
    officeExp = 0;
  }

  const officeExpToNext = calculateOfficeExpToNext(officeLevel, safeMaxLevel);
  const isOfficeMaxLevel = officeLevel >= safeMaxLevel;
  return {
    officeLevel,
    officeExp,
    officeExpToNext,
    officeExpProgress: calculateOfficeExpProgress(officeExp, officeExpToNext, isOfficeMaxLevel),
    isOfficeMaxLevel,
    officeReputation: profile?.officeReputation || profile?.office_reputation || profile?.rank || 'D'
  };
}

function normalizeOfficeProgress(profile) {
  return applyOfficeExpProgress(profile, 0, MAX_OFFICE_LEVEL);
}

function getOperationalStatusLabel(status) {
  return OPERATIONAL_STATUS_LABELS[status] || '확인 필요';
}

function normalizeOperationalStatus(status) {
  const normalized = String(status || 'idle').trim();
  return ALLOWED_OPERATIONAL_STATUSES.has(normalized) ? normalized : '';
}

function normalizeBaseStats(masterStats = {}) {
  return {
    hp: Number(masterStats.hp ?? masterStats.HP ?? 0) || 0,
    atk: Number(masterStats.atk ?? masterStats.ATK ?? 0) || 0,
    def: Number(masterStats.def ?? masterStats.DEF ?? 0) || 0,
    spd: Number(masterStats.spd ?? masterStats.SPD ?? 0) || 0,
    tec: Number(masterStats.tec ?? masterStats.TEC ?? 0) || 0,
    sup: Number(masterStats.sup ?? masterStats.SUP ?? 0) || 0
  };
}

function getBaseExpByGrade(grade) {
  return BASE_EXP_BY_GRADE[String(grade || 'N').toUpperCase()] || BASE_EXP_BY_GRADE.N;
}

function calculateExpToNext(currentLevel, grade, maxLevel) {
  const safeMaxLevel = Math.max(1, Number(maxLevel) || 1);
  const safeLevel = Math.max(1, Math.min(Number(currentLevel) || 1, safeMaxLevel));
  if (safeLevel >= safeMaxLevel) return 0;
  const base = getBaseExpByGrade(grade);
  const levelOffset = safeLevel - 1;
  const growth = 1 + levelOffset * 0.22 + Math.pow(levelOffset, 2) * 0.018;
  return Math.floor(base * growth);
}

function calculateExpProgress(currentExp, expToNext, isMaxLevel) {
  if (isMaxLevel) return 1;
  const required = Number(expToNext || 0);
  if (required <= 0) return 0;
  return Math.max(0, Math.min(1, (Number(currentExp || 0) || 0) / required));
}

function applyMercenaryExpProgress(owned, gainedExp, master) {
  const maxLevel = Math.max(1, Number(master?.maxLevel || 1) || 1);
  let currentLevel = Math.max(1, Math.min(Number(owned?.currentLevel ?? owned?.level ?? 1) || 1, maxLevel));
  currentLevel = Math.floor(currentLevel);
  let currentExp = Math.max(0, Number(owned?.currentExp ?? owned?.exp ?? 0) || 0);
  currentExp += Math.max(0, Number(gainedExp || 0) || 0);
  const grade = master?.grade || 'N';

  while (currentLevel < maxLevel) {
    const required = calculateExpToNext(currentLevel, grade, maxLevel);
    if (required <= 0 || currentExp < required) break;
    currentExp -= required;
    currentLevel += 1;
  }

  if (currentLevel >= maxLevel) {
    currentLevel = maxLevel;
    currentExp = 0;
  }

  const expToNext = calculateExpToNext(currentLevel, grade, maxLevel);
  const isMaxLevel = currentLevel >= maxLevel;
  return {
    currentLevel,
    currentExp,
    maxLevel,
    expToNext,
    expProgress: calculateExpProgress(currentExp, expToNext, isMaxLevel),
    isMaxLevel
  };
}

function normalizeOwnedProgress(owned, master) {
  return applyMercenaryExpProgress(owned, 0, master);
}

function calculateEffectiveStat(baseStat, currentLevel, maxLevel, grade) {
  const base = Number(baseStat || 0) || 0;
  const safeMax = Math.max(1, Number(maxLevel || 1) || 1);
  const safeLevel = Math.min(safeMax, Math.max(1, Number(currentLevel || 1) || 1));
  const levelRatio = safeMax <= 1 ? 0 : (safeLevel - 1) / (safeMax - 1);
  const rate = GRADE_GROWTH_RATES[String(grade || 'N').toUpperCase()] ?? GRADE_GROWTH_RATES.N;
  return Math.floor(base * (1 + rate * levelRatio));
}

function calculateEffectiveStats(masterStats, currentLevel, maxLevel, grade) {
  const baseStats = normalizeBaseStats(masterStats);
  return Object.fromEntries(Object.entries(baseStats).map(([key, value]) => [
    key,
    calculateEffectiveStat(value, currentLevel, maxLevel, grade)
  ]));
}

function calculateCombatPowerFromStats(stats = {}) {
  const normalized = normalizeBaseStats(stats);
  return Math.round(
    normalized.hp * 0.25
    + normalized.atk * 1.2
    + normalized.def * 1
    + normalized.spd * 0.8
    + normalized.tec * 0.8
    + normalized.sup * 0.6
  );
}

function calculateBaseWorkPowerFromStats(stats = {}) {
  const normalized = normalizeBaseStats(stats);
  return Number(normalized.tec || 0) + Number(normalized.sup || 0) + Number(normalized.spd || 0);
}

function calculateBaseWorkPower(mercenary) {
  return calculateBaseWorkPowerFromStats(mercenary?.effectiveStats || mercenary?.baseStats || {});
}

function buildOwnedMercenaryItem(row, master) {
  if (!row || !master) return null;
  const operationalStatus = normalizeOperationalStatus(row.operationalStatus) || 'idle';
  const statusLabel = getOperationalStatusLabel(operationalStatus);
  const progress = normalizeOwnedProgress(row, master);
  const baseStats = normalizeBaseStats(master.baseStats || master.stats);
  const effectiveStats = calculateEffectiveStats(baseStats, progress.currentLevel, progress.maxLevel, master.grade);
  const workPower = calculateBaseWorkPowerFromStats(effectiveStats);
  const combatPower = calculateCombatPowerFromStats(effectiveStats);
  const item = {
    ...master,
    baseStats,
    effectiveStats,
    ownedId: row.id,
    level: progress.currentLevel,
    exp: progress.currentExp,
    currentLevel: progress.currentLevel,
    currentExp: progress.currentExp,
    maxLevel: progress.maxLevel,
    expToNext: progress.expToNext,
    expProgress: progress.expProgress,
    isMaxLevel: progress.isMaxLevel,
    baseCombatPower: Number(master.baseCombatPower || 0) || 0,
    combatPower,
    power: combatPower,
    workPower,
    status: statusLabel,
    operationalStatus,
    statusLabel,
    available: operationalStatus === 'idle',
    currentActivityType: row.currentActivityType,
    currentActivityId: row.currentActivityId,
    isLocked: row.isLocked,
    locked: row.isLocked,
    contractDate: String(row.hiredAt || '').slice(0, 10),
    hiredAt: row.hiredAt,
    obtainMethod: master.obtainMethod || '채용 게시판'
  };
  return item;
}

function summarizeSquad(members) {
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
  const tagCounts = new Map();
  for (const member of safeMembers) {
    for (const tag of member.tags || []) {
      const key = String(tag || '').trim();
      if (!key) continue;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    }
  }
  const mainTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, 4)
    .map(([tag]) => tag);
  const totalWorkPower = safeMembers.reduce((sum, member) => sum + calculateBaseWorkPower(member), 0);
  const averageLevel = safeMembers.length
    ? Math.round((safeMembers.reduce((sum, member) => sum + Number(member.level || 0), 0) / safeMembers.length) * 10) / 10
    : 0;

  return {
    memberCount: safeMembers.length,
    totalWorkPower,
    averageLevel,
    availableCount: safeMembers.filter((member) => member.available).length,
    mainTags
  };
}

async function getOrCreateMercenaryProfile(userId) {
  const existing = await repo.getMercenaryProfile(userId);
  if (existing) return existing;
  return repo.createMercenaryProfile({ userId, gold: MERCENARY_INITIAL_GOLD });
}

async function getMercenaryGold(userId) {
  const profile = await getOrCreateMercenaryProfile(userId);
  return Number(profile.gold || 0);
}

async function getCommunityPoints(userId) {
  const account = await ensurePointAccount(userId);
  return Number(account?.balance || 0);
}

async function spendMercenaryGold(userId, amount, reason = '') {
  const cost = Number(amount || 0);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw httpError(400, '용병단 골드 차감액이 올바르지 않습니다.', 'INVALID_GOLD_AMOUNT');
  }
  const profile = await getOrCreateMercenaryProfile(userId);
  if (Number(profile.gold || 0) < cost) {
    throw httpError(400, '용병단 골드가 부족합니다.', 'NOT_ENOUGH_GOLD');
  }
  const updated = await repo.updateMercenaryGold(userId, Number(profile.gold || 0) - cost);
  return { profile: updated, reason };
}

async function addMercenaryGold(userId, amount, reason = '') {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    throw httpError(400, '용병단 골드 지급액이 올바르지 않습니다.', 'INVALID_GOLD_AMOUNT');
  }
  const profile = await getOrCreateMercenaryProfile(userId);
  const updated = await repo.updateMercenaryGold(userId, Number(profile.gold || 0) + value);
  return { profile: updated, reason };
}

function readMasterData() {
  if (!masterCache) {
    const rows = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
    masterCache = rows
      .filter((item) => item && item.id && item.grade)
      .map((item) => ({ ...item, grade: String(item.grade || '').toUpperCase() }));
  }
  return masterCache;
}

function masterById() {
  return new Map(readMasterData().map((item) => [item.id, item]));
}

function deterministicHash(value) {
  return String(value || '').split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }, 0);
}

function deterministicNumber(id, min, max, salt = '') {
  const hash = Math.abs(deterministicHash(`${id}:${salt}`));
  return min + (hash % (max - min + 1));
}

function deterministicUnit(seed) {
  const x = Math.sin(Math.abs(deterministicHash(seed)) + 1) * 10000;
  return x - Math.floor(x);
}

function todayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function weightedRecruitGrade(seed) {
  const roll = deterministicUnit(seed);
  let accumulated = 0;
  for (const item of RECRUIT_GRADE_RATES) {
    accumulated += item.rate / 100;
    if (roll < accumulated) return item.grade;
  }
  return 'N';
}

function isUniqueGrade(grade) {
  return ['R', 'SR', 'SSR', 'EX'].includes(String(grade || '').toUpperCase());
}

async function ownedUniqueMercenaryIds(userId) {
  const ownedRows = await repo.listUserMercenaries(userId);
  const lookup = masterById();
  return new Set(ownedRows
    .filter((row) => isUniqueGrade(lookup.get(row.mercenaryId)?.grade))
    .map((row) => row.mercenaryId));
}

function pickRecruitCandidate(pool, grade, usedIds, seed) {
  const gradeOrder = grade === 'SR' ? ['SR', 'R', 'N'] : grade === 'R' ? ['R', 'N'] : ['N'];
  for (const targetGrade of gradeOrder) {
    const candidates = pool.filter((item) => item.grade === targetGrade && !usedIds.has(item.id));
    if (candidates.length) return candidates[deterministicNumber(seed, 0, candidates.length - 1, targetGrade)];
  }
  return pool.find((item) => !usedIds.has(item.id)) || null;
}

async function generateCandidateIds(userId, boardDate, refreshCount) {
  const ownedUniqueIds = await ownedUniqueMercenaryIds(userId);
  const pool = readMasterData().filter((item) => {
    if (!['N', 'R', 'SR'].includes(item.grade)) return false;
    if (item.grade === 'N') return true;
    return !ownedUniqueIds.has(item.id);
  });
  const usedIds = new Set();
  const ids = [];
  const seedBase = `${userId}:${boardDate}:recruitment:${refreshCount}`;

  for (let index = 0; index < RECRUIT_BOARD_SIZE; index += 1) {
    const grade = weightedRecruitGrade(`${seedBase}:grade:${index}`);
    const candidate = pickRecruitCandidate(pool, grade, usedIds, `${seedBase}:pick:${index}`);
    if (candidate) {
      usedIds.add(candidate.id);
      ids.push(candidate.id);
    }
  }

  return ids;
}

function getRecruitCost(mercenary) {
  const ranges = {
    N: [1000, 5000],
    R: [7000, 25000],
    SR: [60000, 150000]
  };
  const [min, max] = ranges[mercenary.grade] || ranges.N;
  const raw = deterministicNumber(mercenary.id, min, max, 'recruit-cost');
  return Math.round(raw / 100) * 100;
}

function attachCandidate(master, hiredIds = []) {
  if (!master) return null;
  return {
    ...master,
    recruitCost: getRecruitCost(master),
    hired: hiredIds.includes(master.id)
  };
}

function readMissionData() {
  if (!missionCache) {
    const rows = JSON.parse(fs.readFileSync(MISSION_MASTER_PATH, 'utf8'));
    missionCache = rows
      .filter((item) => item && item.missionId && item.category)
      .map((item) => ({
        ...item,
        missionId: String(item.missionId).trim(),
        enabled: Boolean(item.enabled),
        category: String(item.category || '').trim(),
        type: String(item.type || '').trim(),
        risk: String(item.risk || '낮음').trim(),
        primaryStats: Array.isArray(item.primaryStats) ? item.primaryStats.map((stat) => String(stat).toUpperCase()) : [],
        recommendedWorkPower: Number(item.recommendedWorkPower || 0) || 0,
        minMembers: Number(item.minMembers || 1) || 1,
        maxMembers: Number(item.maxMembers || 3) || 3,
        durationSeconds: Number(item.durationSeconds || 0) || 0,
        rewardGold: Number(item.rewardGold || 0) || 0,
        failureRewardGold: Number(item.failureRewardGold || 0) || 0,
        preferredTags: Array.isArray(item.preferredTags) ? item.preferredTags.map(String).filter(Boolean) : [],
        preferredPositions: Array.isArray(item.preferredPositions) ? item.preferredPositions.map(String).filter(Boolean) : [],
        officeExp: Number(item.officeExp || 0) || 0,
        mercenaryExp: Number(item.mercenaryExp || 0) || 0,
        failureOfficeExp: Number(item.failureOfficeExp || 0) || 0,
        failureMercenaryExp: Number(item.failureMercenaryExp || 0) || 0
      }));
  }
  return missionCache;
}

function missionById() {
  return new Map(readMissionData().map((mission) => [mission.missionId, mission]));
}

function getMissionRiskRank(risk) {
  return { '낮음': 1, '보통': 2, '높음': 3, '위험': 4 }[String(risk || '')] || 9;
}

function getMissionRiskPenalty(risk) {
  return { '낮음': 0, '보통': -5, '높음': -12, '위험': -20 }[String(risk || '')] ?? 0;
}

function getMissionUnlockState(mission, officeLevel) {
  const condition = String(mission?.unlockCondition || '').trim();
  if (!condition || condition === '기본') return { unlocked: true, lockedReason: '' };
  if (condition.includes('소문망')) {
    return { unlocked: false, lockedReason: '소문망 기능 개방 후 등장합니다.' };
  }
  const levelMatch = condition.match(/사무소\s*레벨\s*(\d+)\s*이상/);
  if (levelMatch) {
    const required = Number(levelMatch[1] || 0);
    return Number(officeLevel || 1) >= required
      ? { unlocked: true, lockedReason: '' }
      : { unlocked: false, lockedReason: `사무소 레벨 ${required} 이상 필요` };
  }
  return { unlocked: false, lockedReason: condition || '등장 조건을 만족하지 못했습니다.' };
}

function publicMission(mission) {
  return {
    missionId: mission.missionId,
    enabled: mission.enabled,
    title: mission.title,
    category: mission.category,
    type: mission.type,
    risk: mission.risk,
    primaryStats: mission.primaryStats || [],
    recommendedWorkPower: mission.recommendedWorkPower,
    minMembers: mission.minMembers,
    maxMembers: mission.maxMembers,
    durationSeconds: mission.durationSeconds,
    rewardGold: mission.rewardGold,
    failureRewardGold: mission.failureRewardGold,
    preferredTags: mission.preferredTags || [],
    preferredPositions: mission.preferredPositions || [],
    description: mission.description || '',
    successText: mission.successText || '',
    failureText: mission.failureText || '',
    unlockCondition: mission.unlockCondition || '',
    officeExp: mission.officeExp,
    mercenaryExp: mission.mercenaryExp,
    failureOfficeExp: mission.failureOfficeExp,
    failureMercenaryExp: mission.failureMercenaryExp
  };
}

function getMissionOfferBoardLimit(officeLevel) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  if (level >= 10) return 6;
  if (level >= 6) return 5;
  if (level >= 3) return 4;
  return 3;
}

function getMissionOfferRefillIntervalSeconds() {
  return MISSION_OFFER_REFILL_INTERVAL_SECONDS;
}

function nextMissionOfferAt(fromDate = new Date()) {
  return new Date(fromDate.getTime() + getMissionOfferRefillIntervalSeconds() * 1000).toISOString();
}

function missionOfferNextAtMs(profile) {
  const value = profile?.missionOfferNextAt || profile?.mission_offer_next_at || '';
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function missionEligibleForOffer(mission, officeLevel) {
  const unlock = getMissionUnlockState(mission, officeLevel);
  return Boolean(mission?.enabled && mission.category === 'non_combat' && unlock.unlocked);
}

function riskAllowedForOffer(risk, officeLevel) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  const normalized = String(risk || '낮음');
  if (level <= 2) return normalized === '낮음' || normalized === '보통';
  if (level < 10) return normalized !== '위험';
  return true;
}

function weightedOfferCandidates(missions, officeLevel) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  const weighted = [];
  for (const mission of missions) {
    const risk = String(mission.risk || '낮음');
    let weight = 1;
    if (level <= 2) weight = risk === '낮음' ? 5 : 1;
    else if (level < 10) weight = risk === '낮음' ? 3 : risk === '보통' ? 3 : 1;
    else weight = risk === '위험' ? 1 : risk === '높음' ? 2 : 3;
    for (let index = 0; index < weight; index += 1) weighted.push(mission);
  }
  return weighted.length ? weighted : missions;
}

function pickMissionForOffer(profile, activeOffers = []) {
  const officeLevel = Number(profile?.officeLevel || 1) || 1;
  const activeMissionIds = new Set(activeOffers.map((offer) => String(offer.missionId)));
  const eligible = readMissionData()
    .filter((mission) => missionEligibleForOffer(mission, officeLevel))
    .filter((mission) => riskAllowedForOffer(mission.risk, officeLevel));
  const deduped = eligible.filter((mission) => !activeMissionIds.has(mission.missionId));
  const pool = weightedOfferCandidates(deduped.length ? deduped : eligible, officeLevel);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildMissionOfferResponse(offer, mission) {
  return {
    offerId: offer.id,
    generatedAt: offer.generatedAt,
    acceptedAt: offer.acceptedAt,
    rejectedAt: offer.rejectedAt,
    acceptedRunId: offer.acceptedRunId,
    ...publicMission(mission)
  };
}

function buildMissionBoardState(profile, activeOffers = []) {
  const maxMissionOffers = getMissionOfferBoardLimit(profile?.officeLevel);
  const nextAt = profile?.missionOfferNextAt || null;
  const nextMs = missionOfferNextAtMs(profile);
  const secondsUntilNextOffer = nextAt ? Math.max(0, Math.ceil((nextMs - Date.now()) / 1000)) : 0;
  const activeOfferCount = activeOffers.length;
  return {
    activeOfferCount,
    maxMissionOffers,
    emptySlots: Math.max(0, maxMissionOffers - activeOfferCount),
    nextOfferAt: nextAt,
    secondsUntilNextOffer,
    refillIntervalSeconds: getMissionOfferRefillIntervalSeconds()
  };
}

async function createMissionOfferForUser(userId, missionId, generatedAt = new Date().toISOString()) {
  return repo.createMissionOffer({
    id: `offer_${randomUUID()}`,
    userId,
    missionId,
    generatedAt
  });
}

async function ensureMissionOffersForUser(userId, profile) {
  let currentProfile = profile;
  let activeOffers = await repo.listActiveMissionOffers(userId);
  const maxMissionOffers = getMissionOfferBoardLimit(currentProfile.officeLevel);
  const now = new Date();
  const nowMs = now.getTime();
  const nextMs = missionOfferNextAtMs(currentProfile);

  if (!activeOffers.length && !currentProfile.missionOfferNextAt) {
    const created = [];
    for (let index = 0; index < maxMissionOffers; index += 1) {
      const mission = pickMissionForOffer(currentProfile, [...activeOffers, ...created]);
      if (!mission) break;
      created.push(await createMissionOfferForUser(userId, mission.missionId, now.toISOString()));
    }
    currentProfile = await repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now));
    activeOffers = await repo.listActiveMissionOffers(userId);
    return { profile: currentProfile, activeOffers };
  }

  if (activeOffers.length >= maxMissionOffers) {
    if (!currentProfile.missionOfferNextAt || nowMs >= nextMs) {
      currentProfile = await repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now));
    }
    activeOffers = await repo.listActiveMissionOffers(userId);
    return { profile: currentProfile, activeOffers };
  }

  if (!currentProfile.missionOfferNextAt) {
    currentProfile = await repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now));
    return { profile: currentProfile, activeOffers };
  }

  if (nowMs >= nextMs) {
    const mission = pickMissionForOffer(currentProfile, activeOffers);
    if (mission) await createMissionOfferForUser(userId, mission.missionId, now.toISOString());
    currentProfile = await repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now));
    activeOffers = await repo.listActiveMissionOffers(userId);
  }

  return { profile: currentProfile, activeOffers };
}

async function pushMissionOfferRefillIfDue(userId, profile) {
  const now = new Date();
  if (!profile?.missionOfferNextAt || now.getTime() >= missionOfferNextAtMs(profile)) {
    return repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now));
  }
  return profile;
}

function calculateMissionWorkPower(ownedMercenaries, mission) {
  const members = Array.isArray(ownedMercenaries) ? ownedMercenaries.filter(Boolean) : [];
  const primaryStats = Array.isArray(mission?.primaryStats) ? mission.primaryStats : [];
  if (!primaryStats.length) {
    return members.reduce((sum, member) => sum + calculateBaseWorkPower(member), 0);
  }

  return members.reduce((sum, member) => {
    const stats = normalizeBaseStats(member.effectiveStats || member.baseStats || {});
    return sum + primaryStats.reduce((statSum, stat) => {
      return statSum + Number(stats[String(stat).toLowerCase()] || 0);
    }, 0);
  }, 0);
}

function countMatchedMissionTags(ownedMercenaries, mission) {
  const preferred = new Set((mission?.preferredTags || []).map((tag) => String(tag).trim()).filter(Boolean));
  if (!preferred.size) return 0;
  const memberTags = new Set();
  for (const member of ownedMercenaries || []) {
    for (const tag of member.tags || []) {
      const normalized = String(tag || '').trim();
      if (normalized) memberTags.add(normalized);
    }
  }
  return [...preferred].filter((tag) => memberTags.has(tag)).length;
}

function countMatchedMissionPositions(ownedMercenaries, mission) {
  const preferred = new Set((mission?.preferredPositions || []).map((item) => String(item).trim()).filter(Boolean));
  if (!preferred.size) return 0;
  const memberPositions = new Set();
  for (const member of ownedMercenaries || []) {
    [member.position, member.role, member.job].forEach((value) => {
      const normalized = String(value || '').trim();
      if (normalized) memberPositions.add(normalized);
    });
  }
  return [...preferred].filter((position) => memberPositions.has(position)).length;
}

function calculateMissionSuccessRate(ownedMercenaries, mission) {
  const recommended = Math.max(50, Number(mission?.recommendedWorkPower || 0) || 50);
  const partyWorkPower = calculateMissionWorkPower(ownedMercenaries, mission);
  const baseRate = 45 + ((partyWorkPower - recommended) / recommended) * 35;
  const matchedTagCount = countMatchedMissionTags(ownedMercenaries, mission);
  const matchedPositionCount = countMatchedMissionPositions(ownedMercenaries, mission);
  const riskPenalty = getMissionRiskPenalty(mission?.risk);
  const successRate = Math.round(baseRate + matchedTagCount * 4 + matchedPositionCount * 5 + riskPenalty);
  return {
    partyWorkPower,
    recommendedWorkPower: recommended,
    matchedTagCount,
    matchedPositionCount,
    riskPenalty,
    successRate: Math.max(15, Math.min(95, successRate))
  };
}

function decideMissionResult(successRate, randomValue = Math.random()) {
  const safeRate = Math.max(1, Math.min(100, Number(successRate || 0) || 0));
  return randomValue * 100 < safeRate ? 'success' : 'failure';
}

function serializeRun(runRow, members = []) {
  const now = Date.now();
  const completesAtMs = new Date(runRow.completesAt).getTime();
  const remainingSeconds = Math.max(0, Math.ceil((completesAtMs - now) / 1000));
  return {
    id: runRow.id,
    missionId: runRow.missionId,
    missionTitle: runRow.missionTitle,
    selectedMercenaryIds: runRow.selectedMercenaryIds || [],
    members,
    successRate: runRow.successRate,
    rewardGold: runRow.rewardGold,
    failureRewardGold: runRow.failureRewardGold,
    officeExp: runRow.officeExp,
    mercenaryExp: runRow.mercenaryExp,
    failureOfficeExp: runRow.failureOfficeExp,
    failureMercenaryExp: runRow.failureMercenaryExp,
    durationSeconds: runRow.durationSeconds,
    startedAt: runRow.startedAt,
    completesAt: runRow.completesAt,
    claimedAt: runRow.claimedAt,
    resultStatus: runRow.resultStatus,
    resultText: runRow.resultText,
    remainingSeconds,
    readyToClaim: remainingSeconds <= 0 && !runRow.claimedAt
  };
}

async function serializeBoard(userId, board, profile) {
  const lookup = masterById();
  const hiredIds = board.hiredCandidateIds || [];
  const mercenaryProfile = publicMercenaryProfile(profile);
  const communityPoints = await getCommunityPoints(userId);
  return {
    ok: true,
    board: {
      boardDate: board.boardDate,
      refreshCount: board.refreshCount,
      refreshRemaining: Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - board.refreshCount),
      remainingRefreshes: Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - board.refreshCount),
      maxRefresh: RECRUIT_DAILY_REFRESH_LIMIT,
      refreshLimit: RECRUIT_DAILY_REFRESH_LIMIT,
      refreshCost: RECRUIT_REFRESH_COST,
      candidateIds: board.candidateIds,
      hiredCandidateIds: hiredIds,
      candidates: board.candidateIds.map((id) => attachCandidate(lookup.get(id), hiredIds)).filter(Boolean),
      rates: RECRUIT_GRADE_RATES
    },
    candidates: board.candidateIds.map((id) => attachCandidate(lookup.get(id), hiredIds)).filter(Boolean),
    boardDate: board.boardDate,
    refreshCount: board.refreshCount,
    refreshLimit: RECRUIT_DAILY_REFRESH_LIMIT,
    remainingRefreshes: Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - board.refreshCount),
    refreshCost: RECRUIT_REFRESH_COST,
    rates: RECRUIT_GRADE_RATES.reduce((acc, item) => ({ ...acc, [item.grade]: item.rate }), {}),
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function ensureTodayBoard(userId) {
  const boardDate = todayKey();
  const existing = await repo.getRecruitBoard(userId);
  if (existing && existing.boardDate === boardDate && existing.candidateIds.length === RECRUIT_BOARD_SIZE) {
    return existing;
  }
  return repo.upsertRecruitBoard({
    userId,
    boardDate,
    refreshCount: 0,
    candidateIds: await generateCandidateIds(userId, boardDate, 0),
    hiredCandidateIds: []
  });
}

async function getRecruitBoard(userId) {
  const [board, profile] = await Promise.all([
    ensureTodayBoard(userId),
    getOrCreateMercenaryProfile(userId)
  ]);
  return serializeBoard(userId, board, profile);
}

async function refreshRecruitBoard(userId) {
  const board = await ensureTodayBoard(userId);
  if (board.refreshCount >= RECRUIT_DAILY_REFRESH_LIMIT) {
    throw httpError(429, '오늘 게시판 갱신 한도를 모두 사용했습니다.', 'recruit_refresh_limit');
  }

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const spent = await spendMercenaryGold(userId, RECRUIT_REFRESH_COST, '용병 채용 게시판 유료 갱신');
    const nextCount = board.refreshCount + 1;
    const updated = await repo.upsertRecruitBoard({
      userId,
      boardDate: board.boardDate,
      refreshCount: nextCount,
      candidateIds: await generateCandidateIds(userId, board.boardDate, nextCount),
      hiredCandidateIds: []
    });
    await repo.createRecruitLog({
      userId,
      action: 'refresh_board',
      goldDelta: -RECRUIT_REFRESH_COST
    });
    if (provider === 'sqlite') await run('COMMIT');
    return serializeBoard(userId, updated, spent.profile);
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function hireRecruitCandidate(userId, mercenaryId) {
  const board = await ensureTodayBoard(userId);
  if (!board.candidateIds.includes(mercenaryId)) {
    throw httpError(400, '이 후보는 현재 게시판에 없습니다.', 'CANDIDATE_NOT_FOUND');
  }
  if (board.hiredCandidateIds.includes(mercenaryId)) {
    throw httpError(409, '오늘 게시판의 이 전단은 이미 계약되었습니다.', 'ALREADY_HIRED');
  }

  const mercenary = masterById().get(mercenaryId);
  if (!mercenary || !['N', 'R', 'SR'].includes(mercenary.grade)) {
    throw httpError(404, '이 후보는 현재 게시판에 없습니다.', 'CANDIDATE_NOT_FOUND');
  }
  if (isUniqueGrade(mercenary.grade) && await repo.hasOwnedMercenary(userId, mercenary.id)) {
    throw httpError(409, '이미 보유 중인 고유 용병입니다.', 'ALREADY_OWNED');
  }

  const hireCost = getRecruitCost(mercenary);
  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const spent = await spendMercenaryGold(userId, hireCost, `용병 영입: ${mercenary.name}`);
    const owned = await repo.createUserMercenary({
      userId,
      mercenaryId: mercenary.id,
      currentLevel: 1,
      currentExp: 0,
      status: '대기 중'
    });
    const updated = await repo.upsertRecruitBoard({
      userId,
      boardDate: board.boardDate,
      refreshCount: board.refreshCount,
      candidateIds: board.candidateIds,
      hiredCandidateIds: [...board.hiredCandidateIds, mercenary.id]
    });
    await repo.createRecruitLog({
      userId,
      action: 'hire_mercenary',
      mercenaryId: mercenary.id,
      goldDelta: -hireCost
    });
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ...(await serializeBoard(userId, updated, spent.profile)),
      hired: { ...mercenary, ...owned, recruitCost: hireCost },
      hiredMercenary: { ...mercenary, ...owned, recruitCost: hireCost },
      hiredCandidateIds: updated.hiredCandidateIds,
      hireCost
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function setOwnedMercenaryStatus(userId, ownedMercenaryId, status, options = {}) {
  const operationalStatus = normalizeOperationalStatus(status);
  if (!operationalStatus) {
    throw httpError(400, '잘못된 용병 상태입니다.', 'INVALID_MERCENARY_STATUS');
  }

  const owned = await repo.getUserMercenary(userId, ownedMercenaryId);
  if (!owned) {
    throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  }

  const clearActivity = Boolean(options.clearActivity);
  return repo.updateUserMercenaryStatus(userId, ownedMercenaryId, {
    operationalStatus,
    currentActivityType: clearActivity ? null : options.currentActivityType ?? owned.currentActivityType ?? null,
    currentActivityId: clearActivity ? null : options.currentActivityId ?? owned.currentActivityId ?? null
  });
}

async function assertOwnedMercenariesAvailable(userId, ownedMercenaryIds) {
  const ids = (ownedMercenaryIds || []).map((id) => String(id || '').trim()).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw httpError(400, '같은 보유 용병이 중복 선택되었습니다.', 'DUPLICATE_OWNED_MERCENARY');
  }

  const ownedRows = await repo.listUserMercenaries(userId);
  const ownedById = new Map(ownedRows.map((row) => [String(row.id), row]));
  const selected = ids.map((id) => ownedById.get(id));

  if (selected.some((row) => !row)) {
    throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  }
  if (selected.some((row) => row.operationalStatus !== 'idle')) {
    throw httpError(409, '파견할 수 없는 상태의 용병이 포함되어 있습니다.', 'MERCENARY_NOT_AVAILABLE');
  }

  return selected;
}

async function listMyMercenaries(userId) {
  const [ownedRows, profile, communityPoints] = await Promise.all([
    repo.listUserMercenaries(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const lookup = masterById();
  const items = ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean);

  return {
    ok: true,
    items,
    mercenaries: items,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile,
    capacity: 40
  };
}

function normalizeSquadMemberIds(value) {
  if (!Array.isArray(value)) {
    throw httpError(400, '편성원 정보가 올바르지 않습니다.', 'INVALID_SQUAD_PAYLOAD');
  }
  const ids = value.map((id) => String(id || '').trim()).filter(Boolean);
  if (!ids.length) {
    throw httpError(400, '편성에는 최소 1명의 용병이 필요합니다.', 'SQUAD_MEMBER_REQUIRED');
  }
  if (ids.length > SQUAD_MEMBER_LIMIT) {
    throw httpError(400, '편성은 최대 3명까지 가능합니다.', 'SQUAD_MEMBER_LIMIT_EXCEEDED');
  }
  if (new Set(ids).size !== ids.length) {
    throw httpError(400, '같은 보유 용병이 중복 선택되었습니다.', 'DUPLICATE_OWNED_MERCENARY');
  }
  return ids;
}

function normalizeSquadName(name, slotIndex) {
  const trimmed = String(name || '').trim();
  return trimmed.slice(0, 30) || `파견조 ${slotIndex}`;
}

function normalizeSlotIndex(slotIndex) {
  const value = Number(slotIndex);
  if (!Number.isInteger(value) || value < 1 || value > SQUAD_SLOT_LIMIT) {
    throw httpError(400, '편성 슬롯 번호가 올바르지 않습니다.', 'SQUAD_SLOT_INVALID');
  }
  return value;
}

async function ownedItemMapForSquads(userId) {
  const ownedRows = await repo.listUserMercenaries(userId);
  const lookup = masterById();
  return new Map(ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean)
    .map((item) => [String(item.ownedId), item]));
}

function validateSquadMembers(ownedItemById, ownedMercenaryIds, leaderOwnedMercenaryId) {
  const missing = ownedMercenaryIds.find((id) => !ownedItemById.has(String(id)));
  if (missing) {
    throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  }

  const leader = leaderOwnedMercenaryId ? String(leaderOwnedMercenaryId).trim() : ownedMercenaryIds[0];
  if (!ownedMercenaryIds.includes(leader)) {
    throw httpError(400, '리더는 편성 멤버 안에서만 지정할 수 있습니다.', 'LEADER_NOT_IN_SQUAD');
  }
  return leader;
}

function serializeSquad(squad, ownedItemById) {
  const memberIds = (squad?.ownedMercenaryIds || []).map((id) => String(id));
  const members = memberIds.map((id) => ownedItemById.get(id)).filter(Boolean);
  const leaderId = squad?.leaderOwnedMercenaryId && memberIds.includes(String(squad.leaderOwnedMercenaryId))
    ? String(squad.leaderOwnedMercenaryId)
    : memberIds[0] || null;
  return {
    id: squad.id,
    name: squad.name || `파견조 ${squad.slotIndex}`,
    slotIndex: squad.slotIndex,
    ownedMercenaryIds: memberIds,
    leaderOwnedMercenaryId: leaderId,
    members,
    summary: summarizeSquad(members),
    createdAt: squad.createdAt,
    updatedAt: squad.updatedAt
  };
}

function emptySquadSlot(slotIndex) {
  return {
    id: null,
    name: `파견조 ${slotIndex}`,
    slotIndex,
    ownedMercenaryIds: [],
    leaderOwnedMercenaryId: null,
    members: [],
    summary: summarizeSquad([]),
    empty: true
  };
}

async function listSquads(userId) {
  const [squads, ownedItemById, profile, communityPoints] = await Promise.all([
    repo.listUserSquads(userId),
    ownedItemMapForSquads(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const serialized = squads.map((squad) => serializeSquad(squad, ownedItemById));
  const bySlot = new Map(serialized.map((squad) => [squad.slotIndex, squad]));
  const slots = Array.from({ length: SQUAD_SLOT_LIMIT }, (_, index) => {
    const slotIndex = index + 1;
    return bySlot.get(slotIndex) || emptySquadSlot(slotIndex);
  });
  const mercenaryProfile = publicMercenaryProfile(profile);

  return {
    ok: true,
    squads: serialized,
    slots,
    slotLimit: SQUAD_SLOT_LIMIT,
    memberLimit: SQUAD_MEMBER_LIMIT,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function createSquad(userId, payload = {}) {
  const slotIndex = normalizeSlotIndex(payload.slotIndex);
  const existing = await repo.getUserSquadBySlot(userId, slotIndex);
  if (existing) {
    throw httpError(409, '이미 사용 중인 편성 슬롯입니다.', 'SQUAD_SLOT_ALREADY_USED');
  }

  const ownedMercenaryIds = normalizeSquadMemberIds(payload.ownedMercenaryIds);
  const ownedItemById = await ownedItemMapForSquads(userId);
  const leaderOwnedMercenaryId = validateSquadMembers(
    ownedItemById,
    ownedMercenaryIds,
    payload.leaderOwnedMercenaryId
  );
  const squad = await repo.createUserSquad({
    userId,
    name: normalizeSquadName(payload.name, slotIndex),
    slotIndex,
    ownedMercenaryIds,
    leaderOwnedMercenaryId
  });

  return {
    ok: true,
    squad: serializeSquad(squad, ownedItemById),
    ...(await listSquads(userId))
  };
}

async function updateSquad(userId, squadId, payload = {}) {
  const existing = await repo.getUserSquad(userId, squadId);
  if (!existing) {
    throw httpError(404, '편성을 찾을 수 없습니다.', 'SQUAD_NOT_FOUND');
  }

  const ownedMercenaryIds = normalizeSquadMemberIds(payload.ownedMercenaryIds);
  const ownedItemById = await ownedItemMapForSquads(userId);
  const leaderOwnedMercenaryId = validateSquadMembers(
    ownedItemById,
    ownedMercenaryIds,
    payload.leaderOwnedMercenaryId
  );
  const updated = await repo.updateUserSquad({
    userId,
    squadId,
    name: normalizeSquadName(payload.name, existing.slotIndex),
    ownedMercenaryIds,
    leaderOwnedMercenaryId
  });

  return {
    ok: true,
    squad: serializeSquad(updated, ownedItemById),
    ...(await listSquads(userId))
  };
}

async function deleteSquad(userId, squadId) {
  const existing = await repo.getUserSquad(userId, squadId);
  if (!existing) {
    throw httpError(404, '편성을 찾을 수 없습니다.', 'SQUAD_NOT_FOUND');
  }
  await repo.deleteUserSquad(userId, squadId);
  return {
    ok: true,
    deletedId: squadId,
    ...(await listSquads(userId))
  };
}

async function listMissions(userId) {
  const [profile, communityPoints] = await Promise.all([
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const ensured = await ensureMissionOffersForUser(userId, profile);
  const mercenaryProfile = publicMercenaryProfile(ensured.profile);
  const lookup = missionById();
  const offers = ensured.activeOffers
    .map((offer) => {
      const mission = lookup.get(offer.missionId);
      return mission ? buildMissionOfferResponse(offer, mission) : null;
    })
    .filter(Boolean)
    .sort((a, b) => getMissionRiskRank(a.risk) - getMissionRiskRank(b.risk)
      || new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
  const board = buildMissionBoardState(ensured.profile, ensured.activeOffers);

  return {
    ok: true,
    offers,
    missions: offers,
    board,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

function getUnlockedMissionOrThrow(missionId, officeLevel) {
  const mission = missionById().get(String(missionId || '').trim());
  if (!mission) throw httpError(404, '의뢰를 찾을 수 없습니다.', 'MISSION_NOT_FOUND');
  if (!mission.enabled) throw httpError(400, '비활성화된 의뢰입니다.', 'MISSION_DISABLED');
  if (mission.category !== 'non_combat') {
    throw httpError(400, '현재는 비전투 의뢰만 파견할 수 있습니다.', 'INVALID_MISSION_CATEGORY');
  }
  const unlock = getMissionUnlockState(mission, officeLevel);
  if (!unlock.unlocked) {
    throw httpError(403, unlock.lockedReason || '의뢰 조건을 만족하지 못했습니다.', 'MISSION_LOCKED');
  }
  return mission;
}

function getMissionFromOfferOrThrow(offer, officeLevel) {
  const mission = missionById().get(String(offer?.missionId || '').trim());
  if (!mission) throw httpError(404, '제안된 의뢰 원본을 찾을 수 없습니다.', 'OFFER_MISSION_NOT_FOUND');
  if (!mission.enabled) throw httpError(400, '비활성화된 의뢰입니다.', 'MISSION_DISABLED');
  if (mission.category !== 'non_combat') {
    throw httpError(400, '현재는 비전투 의뢰만 파견할 수 있습니다.', 'INVALID_MISSION_CATEGORY');
  }
  const unlock = getMissionUnlockState(mission, officeLevel);
  if (!unlock.unlocked) {
    throw httpError(403, unlock.lockedReason || '의뢰 조건을 만족하지 못했습니다.', 'OFFER_MISSION_LOCKED');
  }
  return mission;
}

async function resolveMissionMemberIds(userId, payload = {}) {
  if (payload.squadId) {
    const squad = await repo.getUserSquad(userId, payload.squadId);
    if (!squad) throw httpError(404, '편성을 찾을 수 없습니다.', 'SQUAD_NOT_FOUND');
    if (!squad.ownedMercenaryIds.length) throw httpError(400, '빈 편성은 파견할 수 없습니다.', 'SQUAD_EMPTY');
    return squad.ownedMercenaryIds;
  }

  if (!Array.isArray(payload.ownedMercenaryIds)) {
    throw httpError(400, '파견할 보유 용병을 선택해 주세요.', 'INVALID_MERCENARY_SELECTION');
  }
  return payload.ownedMercenaryIds.map((id) => String(id || '').trim()).filter(Boolean);
}

function validateMissionMemberCount(memberIds, mission) {
  if (!memberIds.length) {
    throw httpError(400, '파견할 보유 용병을 선택해 주세요.', 'INVALID_MERCENARY_SELECTION');
  }
  if (memberIds.length < Number(mission.minMembers || 1)) {
    throw httpError(400, `최소 ${mission.minMembers}명이 필요합니다.`, 'INVALID_MERCENARY_SELECTION');
  }
  if (memberIds.length > Number(mission.maxMembers || 3)) {
    throw httpError(400, `최대 ${mission.maxMembers}명까지 파견할 수 있습니다.`, 'INVALID_MERCENARY_SELECTION');
  }
}

async function buildRunMembers(userId, memberIds) {
  const ownedRows = await repo.listUserMercenaries(userId);
  const lookup = masterById();
  const ownedById = new Map(ownedRows.map((row) => [String(row.id), row]));
  return memberIds.map((id) => {
    const row = ownedById.get(String(id));
    return buildOwnedMercenaryItem(row, lookup.get(row?.mercenaryId));
  }).filter(Boolean);
}

async function listRuns(userId) {
  const [runs, ownedItemById, profile, communityPoints] = await Promise.all([
    repo.listOpenMercenaryRuns(userId),
    ownedItemMapForSquads(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const serialized = runs.map((runRow) => serializeRun(
    runRow,
    (runRow.selectedMercenaryIds || []).map((id) => ownedItemById.get(String(id))).filter(Boolean)
  ));

  return {
    ok: true,
    runs: serialized,
    activeRunCount: serialized.length,
    maxActiveRuns: mercenaryProfile.maxActiveRuns,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function startMissionRun(userId, payload = {}) {
  const profile = await getOrCreateMercenaryProfile(userId);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const offerId = String(payload.offerId || '').trim();
  if (!offerId) {
    throw httpError(400, '의뢰 게시판의 제안을 선택해 주세요.', 'OFFER_ID_REQUIRED');
  }
  const offer = await repo.getMissionOffer(userId, offerId);
  if (!offer) throw httpError(404, '의뢰 제안을 찾을 수 없습니다.', 'OFFER_NOT_FOUND');
  if (offer.acceptedAt) throw httpError(409, '이미 수락한 의뢰입니다.', 'OFFER_ALREADY_ACCEPTED');
  if (offer.rejectedAt) throw httpError(409, '이미 거부한 의뢰입니다.', 'OFFER_ALREADY_REJECTED');
  const mission = getMissionFromOfferOrThrow(offer, mercenaryProfile.officeLevel);
  const openRuns = await repo.listOpenMercenaryRuns(userId);
  if (openRuns.length >= mercenaryProfile.maxActiveRuns) {
    throw httpError(409, '동시에 진행 가능한 의뢰 수를 초과했습니다.', 'ACTIVE_RUN_LIMIT_REACHED');
  }

  const memberIds = await resolveMissionMemberIds(userId, payload);
  if (new Set(memberIds).size !== memberIds.length) {
    throw httpError(400, '같은 보유 용병이 중복 선택되었습니다.', 'DUPLICATE_OWNED_MERCENARY');
  }
  validateMissionMemberCount(memberIds, mission);
  await assertOwnedMercenariesAvailable(userId, memberIds);
  const members = await buildRunMembers(userId, memberIds);
  if (members.length !== memberIds.length) {
    throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  }

  const successPreview = calculateMissionSuccessRate(members, mission);
  const now = new Date();
  const completesAt = new Date(now.getTime() + Math.max(1, mission.durationSeconds) * 1000);
  const runId = `run_${randomUUID()}`;

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const runRow = await repo.createMercenaryRun({
      id: runId,
      userId,
      missionId: mission.missionId,
      missionTitle: mission.title,
      selectedMercenaryIds: memberIds,
      successRate: successPreview.successRate,
      rewardGold: mission.rewardGold,
      failureRewardGold: mission.failureRewardGold,
      officeExp: mission.officeExp,
      mercenaryExp: mission.mercenaryExp,
      failureOfficeExp: mission.failureOfficeExp,
      failureMercenaryExp: mission.failureMercenaryExp,
      durationSeconds: mission.durationSeconds,
      startedAt: now.toISOString(),
      completesAt: completesAt.toISOString()
    });
    for (const ownedId of memberIds) {
      await repo.updateUserMercenaryStatus(userId, ownedId, {
        operationalStatus: 'dispatched',
        currentActivityType: 'mission',
        currentActivityId: runId
      });
    }
    const accepted = await repo.markMissionOfferAccepted(userId, offer.id, runId, now.toISOString());
    if (!accepted?.acceptedAt || accepted.acceptedRunId !== runId) {
      throw httpError(409, '이미 처리된 의뢰 제안입니다.', accepted?.rejectedAt ? 'OFFER_ALREADY_REJECTED' : 'OFFER_ALREADY_ACCEPTED');
    }
    await pushMissionOfferRefillIfDue(userId, profile);
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ok: true,
      run: serializeRun(runRow, members),
      acceptedOfferId: offer.id,
      successPreview,
      ...(await listRuns(userId))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function rejectMissionOffer(userId, offerId) {
  const normalizedOfferId = String(offerId || '').trim();
  if (!normalizedOfferId) throw httpError(400, '의뢰 제안을 선택해 주세요.', 'OFFER_NOT_FOUND');
  const offer = await repo.getMissionOffer(userId, normalizedOfferId);
  if (!offer) throw httpError(404, '의뢰 제안을 찾을 수 없습니다.', 'OFFER_NOT_FOUND');
  if (offer.acceptedAt) throw httpError(409, '이미 수락한 의뢰는 거부할 수 없습니다.', 'OFFER_ALREADY_ACCEPTED');
  if (offer.rejectedAt) throw httpError(409, '이미 거부한 의뢰입니다.', 'OFFER_ALREADY_REJECTED');

  const profile = await getOrCreateMercenaryProfile(userId);
  const rejected = await repo.markMissionOfferRejected(userId, normalizedOfferId, new Date().toISOString());
  if (!rejected?.rejectedAt) {
    const latest = await repo.getMissionOffer(userId, normalizedOfferId);
    throw httpError(409, '이미 처리된 의뢰 제안입니다.', latest?.acceptedAt ? 'OFFER_ALREADY_ACCEPTED' : 'OFFER_ALREADY_REJECTED');
  }
  const nextProfile = await pushMissionOfferRefillIfDue(userId, profile);
  const activeOffers = await repo.listActiveMissionOffers(userId);
  const board = buildMissionBoardState(nextProfile, activeOffers);
  const mercenaryProfile = publicMercenaryProfile(nextProfile);

  return {
    ok: true,
    rejectedOfferId: normalizedOfferId,
    board,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints: await getCommunityPoints(userId),
    mercenaryProfile
  };
}

function assertRunClaimable(runRow) {
  if (!runRow) throw httpError(404, '의뢰 진행 기록을 찾을 수 없습니다.', 'RUN_NOT_FOUND');
  if (runRow.claimedAt) throw httpError(409, '이미 결과를 수령한 의뢰입니다.', 'RUN_ALREADY_CLAIMED');
  if (new Date(runRow.completesAt).getTime() > Date.now()) {
    throw httpError(409, '아직 완료되지 않은 의뢰입니다.', 'RUN_NOT_COMPLETE');
  }
}

async function claimMissionRun(userId, runId) {
  const runRow = await repo.getMercenaryRun(userId, runId);
  assertRunClaimable(runRow);

  const memberIds = runRow.selectedMercenaryIds || [];
  const ownedRows = await repo.listUserMercenaries(userId);
  const ownedById = new Map(ownedRows.map((row) => [String(row.id), row]));
  const lookup = masterById();
  const selectedRows = memberIds.map((id) => ownedById.get(String(id)));
  if (selectedRows.some((row) => !row)) {
    throw httpError(404, '파견 용병 정보를 찾을 수 없습니다.', 'RUN_MEMBER_NOT_FOUND');
  }

  const mission = missionById().get(runRow.missionId) || {
    successText: '의뢰를 완료했습니다.',
    failureText: '의뢰를 완수하지 못했습니다.'
  };
  const resultStatus = decideMissionResult(runRow.successRate);
  const succeeded = resultStatus === 'success';
  const gainedGold = succeeded ? runRow.rewardGold : runRow.failureRewardGold;
  const gainedOfficeExp = succeeded ? runRow.officeExp : runRow.failureOfficeExp;
  const gainedMercenaryExp = succeeded ? runRow.mercenaryExp : runRow.failureMercenaryExp;
  const resultText = succeeded
    ? (mission.successText || '의뢰를 완료했습니다.')
    : (mission.failureText || '의뢰를 완수하지 못했습니다.');

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const profile = await getOrCreateMercenaryProfile(userId);
    const officeProgress = applyOfficeExpProgress(profile, gainedOfficeExp);
    const updatedProfile = await repo.updateMercenaryProfileProgress(userId, {
      gold: Number(profile.gold || 0) + gainedGold,
      officeLevel: officeProgress.officeLevel,
      officeExp: officeProgress.officeExp
    });

    const memberResults = [];
    for (const row of selectedRows) {
      const master = lookup.get(row.mercenaryId);
      if (!master) throw httpError(404, '파견 용병 마스터 정보를 찾을 수 없습니다.', 'RUN_MEMBER_NOT_FOUND');
      const beforeProgress = normalizeOwnedProgress(row, master);
      const afterProgress = applyMercenaryExpProgress(row, gainedMercenaryExp, master);
      await repo.updateUserMercenaryProgress(userId, row.id, {
        currentLevel: afterProgress.currentLevel,
        currentExp: afterProgress.currentExp
      });
      const statusRow = await repo.updateUserMercenaryStatus(userId, row.id, {
        operationalStatus: 'idle',
        currentActivityType: null,
        currentActivityId: null
      });
      const afterItem = buildOwnedMercenaryItem(statusRow, master);
      memberResults.push({
        ownedId: row.id,
        name: master.name,
        grade: master.grade,
        beforeLevel: beforeProgress.currentLevel,
        afterLevel: afterProgress.currentLevel,
        beforeExp: beforeProgress.currentExp,
        afterExp: afterProgress.currentExp,
        expToNext: afterProgress.expToNext,
        expProgress: afterProgress.expProgress,
        isMaxLevel: afterProgress.isMaxLevel,
        levelUps: Math.max(0, afterProgress.currentLevel - beforeProgress.currentLevel),
        effectiveStats: afterItem.effectiveStats,
        workPower: afterItem.workPower,
        combatPower: afterItem.combatPower
      });
    }

    const claimed = await repo.claimMercenaryRun(userId, runRow.id, {
      resultStatus,
      resultText,
      claimedAt: new Date().toISOString()
    });
    if (gainedGold > 0) {
      await repo.createRecruitLog({
        userId,
        action: 'mission_reward',
        mercenaryId: runRow.missionId,
        goldDelta: gainedGold
      });
    }
    if (provider === 'sqlite') await run('COMMIT');
    const mercenaryProfile = publicMercenaryProfile(updatedProfile);
    return {
      ok: true,
      result: {
        runId: runRow.id,
        missionTitle: runRow.missionTitle,
        status: resultStatus,
        resultText,
        gainedGold,
        gainedOfficeExp,
        gainedMercenaryExp
      },
      run: serializeRun(claimed, memberResults),
      members: memberResults,
      gold: mercenaryProfile.gold,
      mercenaryGold: mercenaryProfile.gold,
      communityPoints: await getCommunityPoints(userId),
      mercenaryProfile,
      ...(await listRuns(userId))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

module.exports = {
  getRecruitBoard,
  refreshRecruitBoard,
  hireRecruitCandidate,
  listMyMercenaries,
  getRecruitCost,
  getOrCreateMercenaryProfile,
  getMercenaryGold,
  getCommunityPoints,
  spendMercenaryGold,
  addMercenaryGold,
  setOwnedMercenaryStatus,
  assertOwnedMercenariesAvailable,
  getBaseExpByGrade,
  calculateExpToNext,
  calculateExpProgress,
  calculateOfficeExpToNext,
  calculateOfficeExpProgress,
  calculateOfficeUnlocks,
  normalizeOfficeProgress,
  applyOfficeExpProgress,
  normalizeOwnedProgress,
  applyMercenaryExpProgress,
  calculateEffectiveStat,
  calculateEffectiveStats,
  calculateCombatPowerFromStats,
  calculateBaseWorkPowerFromStats,
  calculateBaseWorkPower,
  calculateMissionWorkPower,
  calculateMissionSuccessRate,
  getMissionRiskPenalty,
  countMatchedMissionTags,
  countMatchedMissionPositions,
  decideMissionResult,
  summarizeSquad,
  getMissionOfferBoardLimit,
  getMissionOfferRefillIntervalSeconds,
  listMissions,
  listRuns,
  startMissionRun,
  rejectMissionOffer,
  claimMissionRun,
  listSquads,
  createSquad,
  updateSquad,
  deleteSquad
};
