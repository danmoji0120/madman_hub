const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { provider, run } = require('../db');
const { ensurePointAccount } = require('./points.service');
const repo = require('../repositories/mercenarySystem.repo');

const MASTER_PATH = path.join(__dirname, '../../public/data/mercenaries.master.json');
const MISSION_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.missions.master.json');
const CASE_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.cases.master.json');
const COMBAT_MISSION_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.combat-missions.master.json');
const COMBAT_REWARD_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.combat-rewards.master.json');
const ITEM_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.items.master.json');
const EQUIPMENT_SLOT_KEYS = ['weapon', 'armor', 'accessory', 'tool'];
const EQUIPMENT_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.equipment.master.json');
const EQUIPMENT_IMAGE_PROMPT_MASTER_PATH = path.join(__dirname, '../../public/data/mercenary.equipment-image-prompts.master.json');
const REMOVED_LEGACY_BATTLE_OPERATION_IDS = new Set([
  'mock_sewer_cleanup_01',
  'mock_back_alley_02',
  'mock_red_thread_03'
]);
const RECRUIT_BOARD_SIZE = 5;
const RECRUIT_REFRESH_COST = 20000;
const RECRUIT_DAILY_REFRESH_LIMIT = 10;
const DEFAULT_RECRUIT_GRADE_RATES = [
  { grade: 'N', rate: 69.5 },
  { grade: 'R', rate: 30.0 },
  { grade: 'SR', rate: 0.5 }
];
const RECRUIT_GRADE_RATE_TIERS = [
  { minLevel: 40, rates: [{ grade: 'N', rate: 52.0 }, { grade: 'R', rate: 45.0 }, { grade: 'SR', rate: 3.0 }] },
  { minLevel: 30, rates: [{ grade: 'N', rate: 57.5 }, { grade: 'R', rate: 40.0 }, { grade: 'SR', rate: 2.5 }] },
  { minLevel: 20, rates: [{ grade: 'N', rate: 60.0 }, { grade: 'R', rate: 38.0 }, { grade: 'SR', rate: 2.0 }] },
  { minLevel: 10, rates: [{ grade: 'N', rate: 63.5 }, { grade: 'R', rate: 35.0 }, { grade: 'SR', rate: 1.5 }] },
  { minLevel: 5, rates: [{ grade: 'N', rate: 66.0 }, { grade: 'R', rate: 33.0 }, { grade: 'SR', rate: 1.0 }] },
  { minLevel: 1, rates: [{ grade: 'N', rate: 69.5 }, { grade: 'R', rate: 30.0 }, { grade: 'SR', rate: 0.5 }] }
];
const SQUAD_SLOT_LIMIT = 3;
const SQUAD_MEMBER_LIMIT = 3;
const MAX_OFFICE_LEVEL = 50;
const BASE_OFFICE_EXP = 150;
const MISSION_OFFER_REFILL_INTERVAL_SECONDS = 600;
const ALLOWED_OPERATIONAL_STATUSES = new Set(['idle', 'dispatched', 'injured', 'injured_light', 'injured_heavy', 'treatment_required', 'incapacitated', 'treating', 'office_assigned']);
const TREATABLE_OPERATIONAL_STATUSES = new Set(['injured', 'injured_light', 'injured_heavy', 'treatment_required', 'incapacitated']);
const OPERATIONAL_STATUS_LABELS = {
  idle: '대기 중',
  dispatched: '파견 중',
  injured: '부상',
  treating: '치료 중',
  office_assigned: '사무실 배치 중'
};
const OFFICE_FACILITIES = [
  {
    key: 'reception',
    label: '접수 데스크',
    description: '의뢰 접수와 민원 대응을 맡기는 자리입니다.',
    primaryStats: ['SUP', 'TEC'],
    recommendedPower: 220,
    maxSlots: 2,
    preferredTags: ['접수', '민원', '행정', '서류', '협상', '정보'],
    effectLabels: ['의뢰 보충 시간 감소']
  },
  {
    key: 'accounting',
    label: '회계 책상',
    description: '장부와 계약 비용을 정리하는 자리입니다.',
    primaryStats: ['TEC', 'SUP'],
    recommendedPower: 240,
    maxSlots: 2,
    preferredTags: ['회계', '장부', '세금', '계약', '회수', '독촉'],
    effectLabels: ['의뢰 보상 골드 증가', '치료비 감소']
  },
  {
    key: 'operations',
    label: '작전 테이블',
    description: '파견 동선과 작전 계획을 조율하는 자리입니다.',
    primaryStats: ['TEC', 'SPD', 'SUP'],
    recommendedPower: 320,
    maxSlots: 3,
    preferredTags: ['지휘', '정찰', '작전', '분석', '호송', '전술'],
    effectLabels: ['의뢰 성공률 증가', '의뢰 소요 시간 감소']
  },
  {
    key: 'infirmary_support',
    label: '의무실 보조석',
    description: '부상자 처치와 치료 준비를 돕는 자리입니다.',
    primaryStats: ['SUP', 'TEC'],
    recommendedPower: 260,
    maxSlots: 2,
    preferredTags: ['의무', '치료', '붕대', '약초', '응급', '정화'],
    effectLabels: ['치료 시간 감소', '치료비 감소', '부상 확률 감소']
  }
];
const FALLBACK_MAX_LEVEL_BY_GRADE = {
  N: 40,
  R: 50,
  SR: 60,
  SSR: 70,
  EX: 70
};
// Level bonus is rarity-neutral; rarity differences come from base stats, max level, and skills.
const LEVEL_STAT_GAIN = {
  hp: 3,
  atk: 2,
  def: 2,
  spd: 1,
  tec: 2,
  sup: 2
};
const BASE_EXP_BY_GRADE = {
  N: 100,
  R: 140,
  SR: 210,
  SSR: 320,
  EX: 260
};
const INJURY_CHANCE_BY_RISK = {
  '낮음': 5,
  '보통': 12,
  '높음': 25,
  '위험': 40
};
const TREATMENT_COST_BY_GRADE = {
  N: { base: 300, perLevel: 40 },
  R: { base: 800, perLevel: 90 },
  SR: { base: 1800, perLevel: 180 },
  SSR: { base: 4000, perLevel: 350 },
  EX: { base: 3000, perLevel: 300 }
};
const TREATMENT_DURATION_BY_GRADE = {
  N: 180,
  R: 300,
  SR: 600,
  SSR: 1200,
  EX: 900
};
const OFFICE_UNLOCK_MILESTONES = [
  {
    level: 1,
    title: '기본 사무소 운영',
    description: '낮음 위험도 의뢰, 동시 파견 1개, 의뢰 게시판 3칸이 열립니다.'
  },
  {
    level: 3,
    title: '보통 위험도 의뢰 등장',
    description: '보통 위험도 의뢰가 게시판 후보에 포함됩니다.'
  },
  {
    level: 5,
    title: '편성 슬롯 4개',
    description: '저장 가능한 편성 슬롯이 4개로 증가합니다.'
  },
  {
    level: 7,
    title: '게시판 슬롯 4',
    description: '의뢰 게시판 슬롯이 4칸으로 증가합니다.'
  },
  {
    level: 10,
    title: '채용 확률 상승 1단계',
    description: '채용 게시판에서 R/SR 후보 등장 확률이 소폭 상승합니다.'
  },
  {
    level: 12,
    title: '높음 위험도 의뢰 등장',
    description: '높음 위험도 의뢰가 게시판 후보에 포함됩니다.'
  },
  {
    level: 15,
    title: '동시 파견 2개',
    description: '동시에 진행할 수 있는 의뢰가 2개로 증가합니다.'
  },
  {
    level: 18,
    title: '의뢰 보충 시간 감소 1단계',
    description: '향후 의뢰 게시판 보충 속도 개선 효과가 적용될 예정입니다.'
  },
  {
    level: 20,
    title: '게시판 슬롯 5',
    description: '의뢰 게시판 슬롯이 5칸으로 증가합니다.'
  },
  {
    level: 25,
    title: 'SR 등장률 상승 1단계',
    description: '채용 게시판의 SR 후보 등장 확률이 상승하고, 편성 슬롯이 5개로 증가합니다.'
  },
  {
    level: 30,
    title: '위험 의뢰 등장',
    description: '위험 등급 의뢰가 게시판 후보에 포함됩니다.'
  },
  {
    level: 35,
    title: '동시 파견 3개',
    description: '동시에 진행할 수 있는 의뢰가 3개로 증가합니다.'
  },
  {
    level: 40,
    title: '게시판 슬롯 6',
    description: '의뢰 게시판 슬롯이 6칸으로 증가합니다.'
  },
  {
    level: 45,
    title: '고위험 의뢰 보상 보너스',
    description: '향후 고위험 의뢰의 용병단 골드 보상 보정이 적용될 예정입니다.'
  },
  {
    level: 50,
    title: '폐급 명문 사무소 효과',
    description: '채용, 의뢰, 치료 전체 소폭 보너스가 적용될 예정입니다.'
  }
];

const MERCENARY_INITIAL_GOLD = Number(process.env.MERCENARY_INITIAL_GOLD ?? 50000) || 0;

let masterCache = null;
let missionCache = null;
let caseCache = null;
let combatMissionCache = null;
let combatRewardCache = null;
let itemMasterCache = null;
let equipmentMasterCache = null;
let equipmentImagePromptCache = null;

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
    maxMissionOffers: unlocks.maxMissionOffers,
    maxSquadSlots: unlocks.maxSquadSlots,
    maxActiveRuns: unlocks.maxActiveRuns,
    missionTier: unlocks.missionTier,
    unlockedRiskLevels: unlocks.unlockedRiskLevels
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
    maxMissionOffers: getMissionOfferBoardLimit(level),
    maxSquadSlots: level >= 25 ? 5 : level >= 5 ? 4 : 3,
    maxActiveRuns: level >= 35 ? 3 : level >= 15 ? 2 : 1,
    missionTier: level >= 30 ? 4 : level >= 12 ? 3 : level >= 3 ? 2 : 1,
    recruitRates: getRecruitGradeRates(level),
    unlockedRiskLevels: [
      '낮음',
      ...(level >= 3 ? ['보통'] : []),
      ...(level >= 12 ? ['높음'] : []),
      ...(level >= 30 ? ['위험'] : [])
    ]
  };
}

function getOfficeUnlockMilestones(officeLevel = 1) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  return OFFICE_UNLOCK_MILESTONES.map((milestone) => ({
    ...milestone,
    unlocked: level >= milestone.level
  }));
}

function getNextOfficeUnlock(officeLevel) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  const next = OFFICE_UNLOCK_MILESTONES.find((milestone) => milestone.level > level);
  return next ? { ...next } : null;
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
  if (status === 'injured_light') return '경상';
  if (status === 'injured_heavy') return '중상';
  if (status === 'treatment_required') return '치료 필요';
  if (status === 'incapacitated') return '전투불능';
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

function getMaxLevelForMaster(master = {}) {
  const grade = String(master?.grade || 'N').toUpperCase();
  return Math.max(1, Number(master?.maxLevel || FALLBACK_MAX_LEVEL_BY_GRADE[grade] || FALLBACK_MAX_LEVEL_BY_GRADE.N) || FALLBACK_MAX_LEVEL_BY_GRADE.N);
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
  const maxLevel = getMaxLevelForMaster(master);
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

function getLevelStatGainTable() {
  return { ...LEVEL_STAT_GAIN };
}

function calculateUnifiedLevelBonus(currentLevel) {
  const safeLevel = Math.max(1, Number(currentLevel || 1) || 1);
  const levelOffset = Math.max(0, Math.floor(safeLevel) - 1);
  return Object.fromEntries(Object.entries(LEVEL_STAT_GAIN).map(([key, value]) => [key, value * levelOffset]));
}

function calculateCurrentStatsFromParts(baseStats = {}, levelBonus = {}, trainingBonus = {}, equipmentBonus = {}, permanentBonus = {}) {
  const normalizedBase = normalizeBaseStats(baseStats);
  const statKeys = Object.keys(LEVEL_STAT_GAIN);
  return statKeys.reduce((acc, key) => {
    acc[key] = Math.max(0, Math.round(
      Number(normalizedBase[key] || 0)
      + Number(levelBonus?.[key] || 0)
      + Number(trainingBonus?.[key] || 0)
      + Number(equipmentBonus?.[key] || 0)
      + Number(permanentBonus?.[key] || 0)
    ));
    return acc;
  }, {});
}

function calculateEffectiveStat(baseStat, currentLevel, maxLevel, grade, statKey = '') {
  const key = String(statKey || '').trim();
  const base = Math.max(0, Number(baseStat || 0) || 0);
  const levelBonus = calculateUnifiedLevelBonus(currentLevel);
  return Math.floor(base + Number(levelBonus[key] || 0));
}

function calculateEffectiveStats(masterStats, currentLevel, maxLevel, grade) {
  const baseStats = normalizeBaseStats(masterStats);
  return calculateCurrentStatsFromParts(baseStats, calculateUnifiedLevelBonus(currentLevel));
}

function emptyServerStatBlock() {
  return { hp: 0, atk: 0, def: 0, spd: 0, tec: 0, sup: 0, combatPower: 0 };
}

function subtractServerStats(left = {}, right = {}) {
  return Object.keys(emptyServerStatBlock()).reduce((acc, key) => {
    acc[key] = Math.round((Number(left?.[key] || 0) || 0) - (Number(right?.[key] || 0) || 0));
    return acc;
  }, {});
}

function buildCurrentStatsFromBase(baseStats, currentLevel, maxLevel, grade) {
  const effectiveStats = calculateCurrentStatsFromParts(baseStats, calculateUnifiedLevelBonus(currentLevel));
  return {
    ...effectiveStats,
    combatPower: calculateCombatPowerFromStats(effectiveStats)
  };
}

function buildStatBreakdownForProgress(master, progress) {
  const baseStats = normalizeBaseStats(master?.baseStats || master?.stats);
  const maxLevel = progress?.maxLevel || getMaxLevelForMaster(master);
  const levelBonus = {
    ...calculateUnifiedLevelBonus(progress?.currentLevel || 1),
    combatPower: 0
  };
  const currentStats = buildCurrentStatsFromBase(baseStats, progress?.currentLevel || 1, maxLevel, master?.grade);
  const baseWithPower = {
    ...baseStats,
    combatPower: calculateCombatPowerFromStats(baseStats)
  };
  levelBonus.combatPower = calculateCombatPowerFromStats(currentStats) - baseWithPower.combatPower;
  return {
    baseStats: baseWithPower,
    levelBonus,
    trainingBonus: emptyServerStatBlock(),
    equipmentBonus: emptyServerStatBlock(),
    permanentBonus: emptyServerStatBlock(),
    currentStats
  };
}

function buildMercenaryGrowthResult(row, master, beforeProgress, afterProgress, gainedExp) {
  const beforeBreakdown = buildStatBreakdownForProgress(master, beforeProgress);
  const afterBreakdown = buildStatBreakdownForProgress(master, afterProgress);
  const statDelta = subtractServerStats(afterBreakdown.currentStats, beforeBreakdown.currentStats);
  return {
    userMercenaryId: String(row.id),
    ownedId: String(row.id),
    mercenaryId: row.mercenaryId,
    name: master.name,
    grade: master.grade,
    beforeLevel: beforeProgress.currentLevel,
    afterLevel: afterProgress.currentLevel,
    beforeExp: beforeProgress.currentExp,
    afterExp: afterProgress.currentExp,
    gainedExp: Math.max(0, Number(gainedExp || 0) || 0),
    requiredExpBefore: beforeProgress.expToNext,
    requiredExpAfter: afterProgress.expToNext,
    expToNext: afterProgress.expToNext,
    expProgress: afterProgress.expProgress,
    isMaxLevel: afterProgress.isMaxLevel,
    maxLevel: afterProgress.maxLevel,
    levelUps: Math.max(0, afterProgress.currentLevel - beforeProgress.currentLevel),
    statBefore: beforeBreakdown.currentStats,
    statAfter: afterBreakdown.currentStats,
    statDelta,
    currentStats: afterBreakdown.currentStats,
    statBreakdown: afterBreakdown
  };
}

function buildOfficeGrowthResult(beforeProgress, afterProgress, gainedExp) {
  return {
    beforeLevel: beforeProgress.officeLevel,
    afterLevel: afterProgress.officeLevel,
    beforeExp: beforeProgress.officeExp,
    afterExp: afterProgress.officeExp,
    gainedExp: Math.max(0, Number(gainedExp || 0) || 0),
    requiredExpBefore: beforeProgress.officeExpToNext,
    requiredExpAfter: afterProgress.officeExpToNext,
    expToNext: afterProgress.officeExpToNext,
    expProgress: afterProgress.officeExpProgress,
    isMaxLevel: afterProgress.isOfficeMaxLevel,
    maxLevel: MAX_OFFICE_LEVEL,
    levelUps: Math.max(0, afterProgress.officeLevel - beforeProgress.officeLevel)
  };
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
  const statBreakdown = buildStatBreakdownForProgress(master, progress);
  const effectiveStats = normalizeBaseStats(statBreakdown.currentStats);
  const workPower = calculateBaseWorkPowerFromStats(effectiveStats);
  const combatPower = statBreakdown.currentStats.combatPower;
  const item = {
    ...master,
    baseStats,
    levelBonus: statBreakdown.levelBonus,
    trainingBonus: statBreakdown.trainingBonus,
    equipmentBonus: statBreakdown.equipmentBonus,
    permanentBonus: statBreakdown.permanentBonus,
    currentStats: statBreakdown.currentStats,
    statBreakdown,
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

function getOfficeFacilitiesConfig() {
  return OFFICE_FACILITIES.map((facility) => ({
    ...facility,
    primaryStats: [...facility.primaryStats],
    preferredTags: [...facility.preferredTags],
    effectLabels: [...facility.effectLabels]
  }));
}

function officeFacilityByKey(facilityKey) {
  return getOfficeFacilitiesConfig().find((facility) => facility.key === facilityKey) || null;
}

function calculateOfficeFacilityPower(members, facility) {
  const primaryStats = facility.primaryStats || [];
  return (members || []).reduce((sum, member) => {
    const stats = normalizeBaseStats(member?.effectiveStats || {});
    return sum + primaryStats.reduce((statSum, stat) => {
      return statSum + Number(stats[String(stat).toLowerCase()] || 0);
    }, 0);
  }, 0);
}

function calculateOfficeFacilityEfficiency(members, facility) {
  const workPower = calculateOfficeFacilityPower(members, facility);
  const preferredTags = new Set((facility.preferredTags || []).map(String));
  const matchedTags = new Set();
  for (const member of members || []) {
    for (const tag of member.tags || []) {
      if (preferredTags.has(String(tag))) matchedTags.add(String(tag));
    }
  }
  const rawEfficiency = workPower / Math.max(1, Number(facility.recommendedPower || 1));
  const tagMultiplier = 1 + Math.min(matchedTags.size * 0.05, 0.25);
  const efficiency = Math.max(0, Math.min(1.25, rawEfficiency * tagMultiplier));
  return { workPower, matchedTagCount: matchedTags.size, efficiency };
}

function emptyOfficeEffects() {
  return {
    offerRefillReductionPct: 0,
    rewardGoldBonusPct: 0,
    treatmentCostReductionPct: 0,
    treatmentTimeReductionPct: 0,
    missionSuccessBonusPoints: 0,
    missionDurationReductionPct: 0,
    injuryChanceReductionPoints: 0
  };
}

function clampOfficeEffects(effects) {
  return {
    offerRefillReductionPct: Math.min(0.2, Number(effects.offerRefillReductionPct || 0)),
    rewardGoldBonusPct: Math.min(0.1, Number(effects.rewardGoldBonusPct || 0)),
    treatmentCostReductionPct: Math.min(0.2, Number(effects.treatmentCostReductionPct || 0)),
    treatmentTimeReductionPct: Math.min(0.15, Number(effects.treatmentTimeReductionPct || 0)),
    missionSuccessBonusPoints: Math.min(5, Number(effects.missionSuccessBonusPoints || 0)),
    missionDurationReductionPct: Math.min(0.1, Number(effects.missionDurationReductionPct || 0)),
    injuryChanceReductionPoints: Math.min(5, Number(effects.injuryChanceReductionPoints || 0))
  };
}

function effectsForFacility(facilityKey, efficiency) {
  const scale = Math.min(1, Math.max(0, Number(efficiency || 0)));
  const effects = emptyOfficeEffects();
  if (facilityKey === 'reception') effects.offerRefillReductionPct = 0.2 * scale;
  if (facilityKey === 'accounting') {
    effects.rewardGoldBonusPct = 0.1 * scale;
    effects.treatmentCostReductionPct = 0.15 * scale;
  }
  if (facilityKey === 'operations') {
    effects.missionSuccessBonusPoints = 5 * scale;
    effects.missionDurationReductionPct = 0.1 * scale;
  }
  if (facilityKey === 'infirmary_support') {
    effects.treatmentTimeReductionPct = 0.15 * scale;
    effects.treatmentCostReductionPct = 0.1 * scale;
    effects.injuryChanceReductionPoints = 5 * scale;
  }
  return effects;
}

function mergeOfficeEffects(items) {
  const merged = emptyOfficeEffects();
  for (const item of items || []) {
    for (const key of Object.keys(merged)) merged[key] += Number(item?.[key] || 0);
  }
  return clampOfficeEffects(merged);
}

function buildOfficeFacilityResponse(facility, assignments, itemByOwnedId) {
  const slots = [];
  const members = [];
  for (let index = 0; index < facility.maxSlots; index += 1) {
    const assignment = assignments.find((item) => item.facilityKey === facility.key && item.slotIndex === index) || null;
    const mercenary = assignment ? itemByOwnedId.get(String(assignment.ownedMercenaryId)) || null : null;
    if (mercenary) members.push(mercenary);
    slots.push({ slotIndex: index, assignment, mercenary });
  }
  const calculated = calculateOfficeFacilityEfficiency(members, facility);
  const effects = effectsForFacility(facility.key, calculated.efficiency);
  return {
    ...facility,
    workPower: calculated.workPower,
    matchedTagCount: calculated.matchedTagCount,
    efficiency: calculated.efficiency,
    effects,
    slots
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

function getRecruitGradeRates(officeLevel = 1) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  return (RECRUIT_GRADE_RATE_TIERS.find((tier) => level >= tier.minLevel)?.rates || DEFAULT_RECRUIT_GRADE_RATES)
    .map((item) => ({ ...item }));
}

function weightedRecruitGrade(seed, rates = DEFAULT_RECRUIT_GRADE_RATES) {
  const roll = deterministicUnit(seed);
  let accumulated = 0;
  for (const item of rates) {
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

async function generateCandidateIds(userId, boardDate, refreshCount, officeLevel = 1) {
  const ownedUniqueIds = await ownedUniqueMercenaryIds(userId);
  const pool = readMasterData().filter((item) => {
    if (!['N', 'R', 'SR'].includes(item.grade)) return false;
    if (item.grade === 'N') return true;
    return !ownedUniqueIds.has(item.id);
  });
  const usedIds = new Set();
  const ids = [];
  const seedBase = `${userId}:${boardDate}:recruitment:${refreshCount}`;
  const rates = getRecruitGradeRates(officeLevel);

  for (let index = 0; index < RECRUIT_BOARD_SIZE; index += 1) {
    const grade = weightedRecruitGrade(`${seedBase}:grade:${index}`, rates);
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

function normalizeCaseStep(step = {}, fallbackRisk = '낮음') {
  return {
    ...step,
    stepId: String(step.stepId || '').trim(),
    order: Number(step.order || 0) || 0,
    title: String(step.title || '').trim(),
    missionId: String(step.missionId || step.stepId || '').trim(),
    type: String(step.type || 'case').trim(),
    risk: String(step.risk || fallbackRisk || '낮음').trim(),
    primaryStats: Array.isArray(step.primaryStats) ? step.primaryStats.map((stat) => String(stat).toUpperCase()).filter(Boolean) : [],
    recommendedWorkPower: Number(step.recommendedWorkPower || 0) || 0,
    minMembers: Number(step.minMembers || 1) || 1,
    maxMembers: Number(step.maxMembers || 3) || 3,
    durationSeconds: Number(step.durationSeconds || 120) || 120,
    rewardGold: Number(step.rewardGold || 0) || 0,
    failureRewardGold: Number(step.failureRewardGold || 0) || 0,
    preferredTags: Array.isArray(step.preferredTags) ? step.preferredTags.map(String).filter(Boolean) : [],
    preferredPositions: Array.isArray(step.preferredPositions) ? step.preferredPositions.map(String).filter(Boolean) : [],
    officeExp: Number(step.officeExp || 0) || 0,
    mercenaryExp: Number(step.mercenaryExp || 0) || 0,
    failureOfficeExp: Number(step.failureOfficeExp || 0) || 0,
    failureMercenaryExp: Number(step.failureMercenaryExp || 0) || 0,
    introText: String(step.introText || '').trim(),
    successText: String(step.successText || '').trim(),
    failureText: String(step.failureText || '').trim()
  };
}

function readCaseData() {
  if (!caseCache) {
    const rows = JSON.parse(fs.readFileSync(CASE_MASTER_PATH, 'utf8'));
    caseCache = rows
      .filter((item) => item && item.caseId)
      .map((item) => ({
        ...item,
        caseId: String(item.caseId).trim(),
        enabled: Boolean(item.enabled),
        title: String(item.title || '').trim(),
        subtitle: String(item.subtitle || '').trim(),
        category: String(item.category || '').trim(),
        risk: String(item.risk || '낮음').trim(),
        requiredOfficeLevel: Number(item.requiredOfficeLevel || 1) || 1,
        unlockType: String(item.unlockType || 'default').trim(),
        unlockSource: item.unlockSource || null,
        sourceHint: String(item.sourceHint || '').trim(),
        recommendedTags: Array.isArray(item.recommendedTags) ? item.recommendedTags.map(String).filter(Boolean) : [],
        description: String(item.description || '').trim(),
        steps: Array.isArray(item.steps)
          ? item.steps.map((step) => normalizeCaseStep(step, item.risk)).filter((step) => step.stepId).sort((a, b) => a.order - b.order)
          : [],
        finalRewards: {
          mercenaryGold: Number(item.finalRewards?.mercenaryGold || 0) || 0,
          officeExp: Number(item.finalRewards?.officeExp || 0) || 0,
          officeReputation: Number(item.finalRewards?.officeReputation || 0) || 0
        },
        completionText: String(item.completionText || '').trim(),
        notes: String(item.notes || '').trim()
      }))
      .filter((item) => item.enabled && item.steps.length);
  }
  return caseCache;
}

function readOptionalJsonArray(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn('[mercenary] optional JSON load failed:', filePath, error);
    return [];
  }
}

function readCombatMissionData() {
  if (!combatMissionCache) {
    combatMissionCache = readOptionalJsonArray(COMBAT_MISSION_MASTER_PATH)
      .filter((item) => item && (item.missionId || item.operationId || item.id))
      .map((item) => ({
        ...item,
        missionId: String(item.missionId || item.operationId || item.id).trim(),
        operationId: String(item.operationId || item.missionId || item.id).trim(),
        rewardGroupId: String(item.rewardGroupId || '').trim(),
        enabled: item.enabled !== false
      }));
  }
  return combatMissionCache;
}

function readCombatRewardData() {
  if (!combatRewardCache) {
    combatRewardCache = readOptionalJsonArray(COMBAT_REWARD_MASTER_PATH)
      .filter((item) => item && item.rewardGroupId)
      .map((item) => ({
        ...item,
        rewardGroupId: String(item.rewardGroupId || '').trim(),
        rewardType: String(item.rewardType || '').trim(),
        systemRequirement: String(item.systemRequirement || '').trim(),
        gold: Number(item.gold || 0) || 0,
        officeExp: Number(item.officeExp || 0) || 0,
        mercExp: Number(item.mercExp ?? item.mercenaryExp ?? 0) || 0,
        enabled: item.enabled !== false
      }));
  }
  return combatRewardCache;
}

function getCombatMissionByOperationId(operationId) {
  const safeOperationId = String(operationId || '').trim();
  return readCombatMissionData().find((item) => item.enabled && (
    item.operationId === safeOperationId ||
    item.missionId === safeOperationId ||
    item.id === safeOperationId
  )) || null;
}

function splitUnlockConditions(unlockCondition) {
  const text = String(unlockCondition || '').trim();
  if (!text || text === 'default') return [];
  return text.split(';').map((item) => item.trim()).filter(Boolean);
}

function buildStageClearMaps(clears = []) {
  return {
    byMissionId: new Map(clears.map((item) => [String(item.missionId || ''), item])),
    byStageId: new Map(clears.map((item) => [String(item.stageId || ''), item]))
  };
}

function getStageUnlockReasons({ mission, profile, clears }) {
  if (!mission?.stageId && !mission?.isStageMission) return [];
  const reasons = [];
  const officeLevel = Number(profile?.officeLevel || 1) || 1;
  const requiredOfficeLevel = Math.max(1, Number(mission.requiredOfficeLevel || 1) || 1);
  if (officeLevel < requiredOfficeLevel) {
    reasons.push({
      code: 'OFFICE_LEVEL_REQUIRED',
      message: `office_level>=${requiredOfficeLevel}`,
      requiredOfficeLevel,
      currentOfficeLevel: officeLevel
    });
  }

  const clearMaps = buildStageClearMaps(clears);
  for (const condition of splitUnlockConditions(mission.unlockCondition)) {
    if (condition === 'default') continue;
    if (condition.startsWith('clear:')) {
      const requiredMissionId = condition.slice('clear:'.length).trim();
      if (!clearMaps.byMissionId.has(requiredMissionId) && !clearMaps.byStageId.has(requiredMissionId)) {
        reasons.push({ code: 'CLEAR_REQUIRED', message: condition, requiredMissionId });
      }
      continue;
    }
    const officeMatch = condition.match(/^office_level\s*>=\s*(\d+)$/i);
    if (officeMatch) {
      const required = Number(officeMatch[1] || 0);
      if (officeLevel < required) {
        reasons.push({
          code: 'OFFICE_LEVEL_REQUIRED',
          message: condition,
          requiredOfficeLevel: required,
          currentOfficeLevel: officeLevel
        });
      }
      continue;
    }
    if (condition.startsWith('rumor_seed:')) {
      reasons.push({ code: 'RUMOR_SEED_REQUIRED', message: condition });
      continue;
    }
    if (condition.startsWith('case_or_rumor:')) {
      reasons.push({ code: 'CASE_OR_RUMOR_REQUIRED', message: condition });
      continue;
    }
    reasons.push({ code: 'UNSUPPORTED_UNLOCK_CONDITION', message: condition });
  }
  return reasons;
}

async function assertCombatStageUnlocked(userId, mission) {
  if (!mission?.stageId && !mission?.isStageMission) return { ok: true, reasons: [] };
  const [profile, clears] = await Promise.all([
    getOrCreateMercenaryProfile(userId),
    repo.listCombatStageClears(userId)
  ]);
  const reasons = getStageUnlockReasons({ mission, profile, clears });
  if (reasons.length) {
    const error = httpError(403, 'Locked combat stage.', 'STAGE_LOCKED');
    error.reasons = reasons;
    throw error;
  }
  return { ok: true, reasons: [] };
}

async function listCombatStageClears(userId) {
  return { clears: await repo.listCombatStageClears(userId) };
}

function getBattleRoundCount(battleResult = {}) {
  const directRoundCount = Number(battleResult.roundCount ?? (typeof battleResult.rounds === 'number' ? battleResult.rounds : 0));
  if (Number.isFinite(directRoundCount) && directRoundCount > 0) return directRoundCount;
  if (Array.isArray(battleResult.rounds)) return battleResult.rounds.length;
  if (Array.isArray(battleResult.actions)) {
    const rounds = new Set(battleResult.actions.map((action) => Number(action?.round || 0)).filter(Boolean));
    return rounds.size || null;
  }
  return null;
}



function readItemMasterData() {
  if (!itemMasterCache) {
    itemMasterCache = readOptionalJsonArray(ITEM_MASTER_PATH)
      .filter((item) => item && item.itemId)
      .map((item) => ({ ...item, itemId: String(item.itemId || '').trim() }));
  }
  return itemMasterCache;
}

function readEquipmentMasterData() {
  if (!equipmentMasterCache) {
    equipmentMasterCache = readOptionalJsonArray(EQUIPMENT_MASTER_PATH)
      .filter((item) => item && item.equipmentId)
      .map((item) => ({ ...item, equipmentId: String(item.equipmentId || '').trim(), itemId: String(item.itemId || '').trim() }));
  }
  return equipmentMasterCache;
}

function readEquipmentImagePromptData() {
  if (!equipmentImagePromptCache) {
    equipmentImagePromptCache = readOptionalJsonArray(EQUIPMENT_IMAGE_PROMPT_MASTER_PATH)
      .filter((item) => item && item.imageKey)
      .map((item) => ({ ...item, imageKey: String(item.imageKey || '').trim(), itemId: String(item.itemId || '').trim() }));
  }
  return equipmentImagePromptCache;
}
function caseById() {
  return new Map(readCaseData().map((item) => [item.caseId, item]));
}

function buildCaseStepMission(caseFile, step) {
  const existing = missionById().get(step.missionId);
  return {
    ...(existing || {}),
    missionId: step.missionId,
    enabled: true,
    title: step.title,
    category: 'non_combat',
    type: step.type || existing?.type || caseFile.category || 'case',
    risk: step.risk || existing?.risk || caseFile.risk || '낮음',
    primaryStats: step.primaryStats.length ? step.primaryStats : (existing?.primaryStats || []),
    recommendedWorkPower: step.recommendedWorkPower || existing?.recommendedWorkPower || 50,
    minMembers: step.minMembers || existing?.minMembers || 1,
    maxMembers: step.maxMembers || existing?.maxMembers || 3,
    durationSeconds: step.durationSeconds || existing?.durationSeconds || 120,
    rewardGold: step.rewardGold || existing?.rewardGold || 0,
    failureRewardGold: step.failureRewardGold || existing?.failureRewardGold || 0,
    preferredTags: step.preferredTags.length ? step.preferredTags : (existing?.preferredTags || caseFile.recommendedTags || []),
    preferredPositions: step.preferredPositions.length ? step.preferredPositions : (existing?.preferredPositions || []),
    description: step.introText || existing?.description || caseFile.description,
    successText: step.successText || existing?.successText || '사건 단계 의뢰를 완료했습니다.',
    failureText: step.failureText || existing?.failureText || '사건 단계 의뢰를 완수하지 못했습니다.',
    unlockCondition: '사건 파일',
    officeExp: step.officeExp || existing?.officeExp || 0,
    mercenaryExp: step.mercenaryExp || existing?.mercenaryExp || 0,
    failureOfficeExp: step.failureOfficeExp || existing?.failureOfficeExp || 0,
    failureMercenaryExp: step.failureMercenaryExp || existing?.failureMercenaryExp || 0
  };
}

function getMissionRiskRank(risk) {
  return { '낮음': 1, '보통': 2, '높음': 3, '위험': 4 }[String(risk || '')] || 9;
}

function getMissionRiskPenalty(risk) {
  return { '낮음': 0, '보통': -5, '높음': -12, '위험': -20 }[String(risk || '')] ?? 0;
}

function getMissionUnlockState(mission, officeLevel) {
  const condition = String(mission?.unlockCondition || '').trim();
  const riskRequiredLevel = { '낮음': 1, '보통': 3, '높음': 12, '위험': 30 }[String(mission?.risk || '낮음')] || 1;
  const level = Number(officeLevel || 1) || 1;
  const riskLock = (baseRequired = 1) => {
    const required = Math.max(baseRequired, riskRequiredLevel);
    return level >= required
      ? { unlocked: true, lockedReason: '', unlockLevel: required }
      : { unlocked: false, lockedReason: `사무소 Lv.${required} 이상 필요`, unlockLevel: required };
  };
  if (!condition || condition === '기본') return riskLock(1);
  if (condition.includes('소문망')) {
    return { unlocked: false, lockedReason: '소문망 기능 개방 후', unlockLevel: null };
  }
  const levelMatch = condition.match(/사무소\s*레벨\s*(\d+)\s*이상/);
  if (levelMatch) {
    const required = Number(levelMatch[1] || 0);
    return riskLock(required);
  }
  return { unlocked: false, lockedReason: condition || '해금 조건 미충족', unlockLevel: null };
}

function getMissionLockedReason(mission, officeLevel) {
  const unlock = getMissionUnlockState(mission, officeLevel);
  if (unlock.unlocked) return { lockedReason: '', unlockLevel: unlock.unlockLevel || 1 };
  return {
    lockedReason: unlock.lockedReason || '해금 조건 미충족',
    unlockLevel: unlock.unlockLevel || null
  };
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
  if (level >= 40) return 6;
  if (level >= 20) return 5;
  if (level >= 7) return 4;
  return 3;
}

function getMissionOfferRefillIntervalSeconds(officeEffects = null) {
  const reduction = Math.max(0, Math.min(0.2, Number(officeEffects?.offerRefillReductionPct || 0)));
  return Math.max(300, Math.floor(MISSION_OFFER_REFILL_INTERVAL_SECONDS * (1 - reduction)));
}

function nextMissionOfferAt(fromDate = new Date(), officeEffects = null) {
  return new Date(fromDate.getTime() + getMissionOfferRefillIntervalSeconds(officeEffects) * 1000).toISOString();
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
  if (level < 3) return normalized === '낮음';
  if (level < 12) return normalized === '낮음' || normalized === '보통';
  if (level < 30) return normalized !== '위험';
  return true;
}

function weightedOfferCandidates(missions, officeLevel) {
  const level = Math.max(1, Number(officeLevel || 1) || 1);
  const weighted = [];
  for (const mission of missions) {
    const risk = String(mission.risk || '낮음');
    let weight = 1;
    if (level < 3) weight = risk === '낮음' ? 5 : 1;
    else if (level < 12) weight = risk === '낮음' ? 4 : risk === '보통' ? 3 : 1;
    else if (level < 30) weight = risk === '낮음' ? 3 : risk === '보통' ? 3 : 2;
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

function buildLockedMissionResponse(mission, officeLevel) {
  const lock = getMissionLockedReason(mission, officeLevel);
  return {
    ...publicMission(mission),
    enabled: mission.enabled,
    unlockLevel: lock.unlockLevel,
    lockedReason: lock.lockedReason || '해금 조건 미충족',
    locked: true
  };
}

function listLockedMissionsForOffice(officeLevel) {
  return readMissionData()
    .map((mission, index) => ({ mission, index, lock: getMissionLockedReason(mission, officeLevel) }))
    .filter(({ mission }) => mission.enabled && mission.category === 'non_combat')
    .filter(({ mission }) => !getMissionUnlockState(mission, officeLevel).unlocked)
    .sort((a, b) => {
      const aHasLevel = Number.isFinite(Number(a.lock.unlockLevel));
      const bHasLevel = Number.isFinite(Number(b.lock.unlockLevel));
      if (aHasLevel !== bHasLevel) return aHasLevel ? -1 : 1;
      return (Number(a.lock.unlockLevel || 999) - Number(b.lock.unlockLevel || 999))
        || getMissionRiskRank(a.mission.risk) - getMissionRiskRank(b.mission.risk)
        || a.index - b.index;
    })
    .slice(0, 3)
    .map(({ mission }) => buildLockedMissionResponse(mission, officeLevel));
}

function buildOfficeGrowth(profile) {
  const progress = normalizeOfficeProgress(profile);
  const currentEffects = calculateOfficeUnlocks(progress.officeLevel);
  return {
    currentEffects,
    nextUnlock: getNextOfficeUnlock(progress.officeLevel),
    milestones: getOfficeUnlockMilestones(progress.officeLevel)
  };
}

function buildMissionBoardState(profile, activeOffers = [], officeEffects = null) {
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
    refillIntervalSeconds: getMissionOfferRefillIntervalSeconds(officeEffects)
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

async function ensureMissionOffersForUser(userId, profile, officeEffects = null) {
  let currentProfile = profile;
  let activeOffers = await repo.listActiveMissionOffers(userId);
  const maxMissionOffers = getMissionOfferBoardLimit(currentProfile.officeLevel);
  const now = new Date();
  const nowMs = now.getTime();
  const nextMs = missionOfferNextAtMs(currentProfile);
  const intervalMs = getMissionOfferRefillIntervalSeconds(officeEffects) * 1000;

  if (!activeOffers.length && !currentProfile.missionOfferNextAt) {
    const created = [];
    for (let index = 0; index < maxMissionOffers; index += 1) {
      const mission = pickMissionForOffer(currentProfile, [...activeOffers, ...created]);
      if (!mission) break;
      created.push(await createMissionOfferForUser(userId, mission.missionId, now.toISOString()));
    }
    currentProfile = await repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now, officeEffects));
    activeOffers = await repo.listActiveMissionOffers(userId);
    return { profile: currentProfile, activeOffers };
  }

  if (activeOffers.length >= maxMissionOffers) {
    if (!currentProfile.missionOfferNextAt || nowMs >= nextMs) {
      const dueTicks = nextMs > 0 && nowMs >= nextMs
        ? Math.floor((nowMs - nextMs) / intervalMs) + 1
        : 1;
      currentProfile = await repo.updateMissionOfferNextAt(userId, new Date((nextMs || nowMs) + dueTicks * intervalMs).toISOString());
    }
    activeOffers = await repo.listActiveMissionOffers(userId);
    return { profile: currentProfile, activeOffers };
  }

  if (!currentProfile.missionOfferNextAt) {
    currentProfile = await repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now, officeEffects));
    return { profile: currentProfile, activeOffers };
  }

  if (nowMs >= nextMs) {
    const dueTicks = Math.floor((nowMs - nextMs) / intervalMs) + 1;
    const emptySlots = Math.max(0, maxMissionOffers - activeOffers.length);
    const createCount = Math.min(dueTicks, emptySlots);
    const created = [];
    for (let index = 0; index < createCount; index += 1) {
      const mission = pickMissionForOffer(currentProfile, [...activeOffers, ...created]);
      if (!mission) break;
      created.push(await createMissionOfferForUser(userId, mission.missionId, now.toISOString()));
    }
    currentProfile = await repo.updateMissionOfferNextAt(userId, new Date(nextMs + dueTicks * intervalMs).toISOString());
    activeOffers = await repo.listActiveMissionOffers(userId);
  }

  return { profile: currentProfile, activeOffers };
}

async function pushMissionOfferRefillIfDue(userId, profile, officeEffects = null) {
  const now = new Date();
  if (!profile?.missionOfferNextAt || now.getTime() >= missionOfferNextAtMs(profile)) {
    return repo.updateMissionOfferNextAt(userId, nextMissionOfferAt(now, officeEffects));
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

function calculateMissionSuccessRate(ownedMercenaries, mission, officeEffects = null) {
  const recommended = Math.max(50, Number(mission?.recommendedWorkPower || 0) || 50);
  const partyWorkPower = calculateMissionWorkPower(ownedMercenaries, mission);
  const baseRate = 45 + ((partyWorkPower - recommended) / recommended) * 35;
  const matchedTagCount = countMatchedMissionTags(ownedMercenaries, mission);
  const matchedPositionCount = countMatchedMissionPositions(ownedMercenaries, mission);
  const riskPenalty = getMissionRiskPenalty(mission?.risk);
  const officeBonusPoints = Math.max(0, Math.min(5, Number(officeEffects?.missionSuccessBonusPoints || 0)));
  const successRate = Math.round(baseRate + matchedTagCount * 4 + matchedPositionCount * 5 + riskPenalty + officeBonusPoints);
  return {
    partyWorkPower,
    recommendedWorkPower: recommended,
    matchedTagCount,
    matchedPositionCount,
    riskPenalty,
    officeBonusPoints,
    successRate: Math.max(15, Math.min(95, successRate))
  };
}

function decideMissionResult(successRate, randomValue = Math.random()) {
  const safeRate = Math.max(1, Math.min(100, Number(successRate || 0) || 0));
  return randomValue * 100 < safeRate ? 'success' : 'failure';
}

function getInjuryChanceByRisk(risk, officeEffects = null) {
  const baseChance = INJURY_CHANCE_BY_RISK[String(risk || '낮음')] ?? 0;
  if (baseChance <= 0) return 0;
  const reductionPoints = Math.max(0, Math.min(5, Number(officeEffects?.injuryChanceReductionPoints || 0)));
  return Math.max(1, baseChance - reductionPoints);
}

function pickInjuredMember(members, randomFn = Math.random) {
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
  if (!safeMembers.length) return null;
  return safeMembers[Math.floor(randomFn() * safeMembers.length)] || safeMembers[0];
}

function rollMissionInjury(mission, members, randomFn = Math.random, officeEffects = null) {
  const chance = getInjuryChanceByRisk(mission?.risk, officeEffects);
  if (chance <= 0 || !members?.length) {
    return { occurred: false, chance, injuredMember: null };
  }
  if (randomFn() * 100 >= chance) {
    return { occurred: false, chance, injuredMember: null };
  }
  const injured = pickInjuredMember(members, randomFn);
  return {
    occurred: Boolean(injured),
    chance,
    injuredMember: injured ? {
      ownedId: String(injured.id || injured.ownedId),
      name: injured.name || '이름 없는 용병'
    } : null
  };
}

function calculateTreatmentCost(grade, level) {
  const key = String(grade || 'N').toUpperCase();
  const rule = TREATMENT_COST_BY_GRADE[key] || TREATMENT_COST_BY_GRADE.N;
  const safeLevel = Math.max(1, Number(level || 1) || 1);
  return Math.max(1, Math.floor(rule.base + safeLevel * rule.perLevel));
}

function calculateTreatmentDurationSeconds(grade, level) {
  const key = String(grade || 'N').toUpperCase();
  const base = TREATMENT_DURATION_BY_GRADE[key] || TREATMENT_DURATION_BY_GRADE.N;
  const safeLevel = Math.max(1, Number(level || 1) || 1);
  return Math.max(1, Math.floor(base + safeLevel * 10));
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

function serializeTreatment(treatment, item) {
  const now = Date.now();
  const completesAtMs = new Date(treatment.completesAt).getTime();
  const remainingSeconds = Math.max(0, Math.ceil((completesAtMs - now) / 1000));
  return {
    treatmentId: treatment.id,
    ownedId: treatment.ownedMercenaryId,
    name: item?.name || '이름 없는 용병',
    grade: item?.grade || 'N',
    level: item?.level || 1,
    imageKey: item?.imageKey || '',
    species: item?.species || '',
    role: item?.role || '',
    position: item?.position || '',
    costGold: treatment.costGold,
    durationSeconds: treatment.durationSeconds,
    startedAt: treatment.startedAt,
    completesAt: treatment.completesAt,
    claimedAt: treatment.claimedAt,
    remainingSeconds,
    readyToClaim: remainingSeconds <= 0 && !treatment.claimedAt
  };
}

function attachTreatmentQuote(item) {
  const level = Number(item?.level || 1) || 1;
  return {
    ...item,
    treatmentCostGold: calculateTreatmentCost(item?.grade, level),
    treatmentDurationSeconds: calculateTreatmentDurationSeconds(item?.grade, level)
  };
}

async function serializeBoard(userId, board, profile) {
  const lookup = masterById();
  const hiredIds = board.hiredCandidateIds || [];
  const mercenaryProfile = publicMercenaryProfile(profile);
  const communityPoints = await getCommunityPoints(userId);
  const recruitRates = getRecruitGradeRates(mercenaryProfile.officeLevel);
  const gradeRates = recruitRates.map((item) => ({ grade: item.grade, rate: item.rate }));
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
      gradeRates,
      recruitGradeRates: gradeRates,
      rates: gradeRates
    },
    candidates: board.candidateIds.map((id) => attachCandidate(lookup.get(id), hiredIds)).filter(Boolean),
    boardDate: board.boardDate,
    refreshCount: board.refreshCount,
    refreshLimit: RECRUIT_DAILY_REFRESH_LIMIT,
    remainingRefreshes: Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - board.refreshCount),
    refreshCost: RECRUIT_REFRESH_COST,
    gradeRates,
    recruitGradeRates: gradeRates,
    rates: recruitRates.reduce((acc, item) => ({ ...acc, [item.grade]: item.rate }), {}),
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function ensureTodayBoard(userId) {
  const boardDate = todayKey();
  const profile = await getOrCreateMercenaryProfile(userId);
  const existing = await repo.getRecruitBoard(userId);
  if (existing && existing.boardDate === boardDate && existing.candidateIds.length === RECRUIT_BOARD_SIZE) {
    return existing;
  }
  return repo.upsertRecruitBoard({
    userId,
    boardDate,
    refreshCount: 0,
    candidateIds: await generateCandidateIds(userId, boardDate, 0, profile.officeLevel),
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
  let board = await ensureTodayBoard(userId);
  if (board.refreshCount >= RECRUIT_DAILY_REFRESH_LIMIT) {
    throw httpError(429, '오늘 게시판 갱신 한도를 모두 사용했습니다.', 'recruit_refresh_limit');
  }

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    board = await ensureTodayBoard(userId);
    if (board.refreshCount >= RECRUIT_DAILY_REFRESH_LIMIT) {
      throw httpError(429, '오늘 게시판 갱신 한도를 모두 사용했습니다.', 'recruit_refresh_limit');
    }
    const spent = await spendMercenaryGold(userId, RECRUIT_REFRESH_COST, '용병 채용 게시판 유료 갱신');
    const profile = publicMercenaryProfile(spent.profile);
    const nextCount = board.refreshCount + 1;
    const updated = await repo.upsertRecruitBoard({
      userId,
      boardDate: board.boardDate,
      refreshCount: nextCount,
      candidateIds: await generateCandidateIds(userId, board.boardDate, nextCount, profile.officeLevel),
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
  let board = await ensureTodayBoard(userId);
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
    board = await ensureTodayBoard(userId);
    if (!board.candidateIds.includes(mercenaryId)) {
      throw httpError(400, '이 후보는 현재 게시판에 없습니다.', 'CANDIDATE_NOT_FOUND');
    }
    if (board.hiredCandidateIds.includes(mercenaryId)) {
      throw httpError(409, '오늘 게시판의 이 전단은 이미 계약되었습니다.', 'ALREADY_HIRED');
    }
    if (isUniqueGrade(mercenary.grade) && await repo.hasOwnedMercenary(userId, mercenary.id)) {
      throw httpError(409, '이미 보유 중인 고유 용병입니다.', 'ALREADY_OWNED');
    }
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

async function lockOwnedMercenaryForActivity(userId, ownedMercenaryId, {
  operationalStatus,
  currentActivityType,
  currentActivityId,
  fromStatus = 'idle',
  requireNoActivity = true,
  errorCode = 'MERCENARY_BUSY',
  errorMessage = '용병이 이미 다른 작업 중입니다.'
}) {
  const updated = await repo.updateUserMercenaryStatusIfCurrent(userId, ownedMercenaryId, {
    operationalStatus: fromStatus,
    currentActivityType: requireNoActivity ? null : undefined,
    currentActivityId: requireNoActivity ? null : undefined,
    isLocked: false
  }, {
    operationalStatus,
    currentActivityType,
    currentActivityId
  });
  if (!updated) {
    throw httpError(409, errorMessage, errorCode);
  }
  return updated;
}


function assertOwnedMercenaryVisible(owned) {
  if (!owned || owned.dismissedAt || String(owned.operationalStatus || '') === 'dismissed') {
    throw httpError(404, 'Owned mercenary not found.', 'OWNED_MERCENARY_NOT_FOUND');
  }
}

function assertMercenaryCanDismiss(owned) {
  assertOwnedMercenaryVisible(owned);
  if (owned.isLocked || owned.locked) throw httpError(409, '잠금 상태인 용병은 해고할 수 없습니다.', 'MERCENARY_LOCKED');
  if (String(owned.operationalStatus || 'idle') !== 'idle') {
    throw httpError(409, '진행 중인 활동이 있어 해고할 수 없습니다.', 'MERCENARY_BUSY');
  }
}

async function setOwnedMercenaryLock(userId, ownedMercenaryId, locked) {
  const owned = await repo.getUserMercenary(userId, ownedMercenaryId);
  assertOwnedMercenaryVisible(owned);
  if (typeof locked !== 'boolean') throw httpError(400, 'locked must be boolean.', 'INVALID_LOCK_VALUE');
  const updated = await repo.setUserMercenaryLocked(userId, ownedMercenaryId, locked);
  const master = masterById().get(updated?.mercenaryId);
  return {
    ok: true,
    mercenary: buildOwnedMercenaryItem(updated, master),
    locked: Boolean(updated?.isLocked)
  };
}

async function dismissOwnedMercenary(userId, ownedMercenaryId, payload = {}) {
  const owned = await repo.getUserMercenary(userId, ownedMercenaryId);
  assertMercenaryCanDismiss(owned);
  const master = masterById().get(owned.mercenaryId);
  const displayName = String(master?.name || owned.mercenaryId || '').trim();
  const confirmName = String(payload.confirmName || '').trim();
  if (!confirmName || confirmName !== displayName) {
    throw httpError(400, '용병명을 정확히 입력해야 합니다.', 'CONFIRM_NAME_MISMATCH');
  }
  const unequippedItems = await repo.unequipAllInventoryItemSlotsForMercenary(userId, ownedMercenaryId);
  const removedFromFormations = await repo.removeOwnedMercenaryFromSquads(userId, ownedMercenaryId);
  const dismissed = await repo.dismissUserMercenary(userId, ownedMercenaryId, {
    reason: payload.reason || 'user_dismiss',
    dismissedAt: new Date().toISOString()
  });
  return {
    ok: true,
    dismissedMercenaryId: String(ownedMercenaryId),
    mercenary: buildOwnedMercenaryItem(dismissed, master),
    unequippedItemsCount: unequippedItems.length,
    removedFromFormations,
    refunded: null
  };
}


async function listMyMercenaries(userId) {
  const [ownedRows, profile, communityPoints, equipmentSlots] = await Promise.all([
    repo.listUserMercenaries(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId),
    repo.listUserEquipmentSlots(userId)
  ]);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const lookup = masterById();
  const items = attachEquipmentToMercenaryItems(ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean), equipmentSlots);

  return {
    ok: true,
    items,
    mercenaries: items,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile,
    officeGrowth: buildOfficeGrowth(profile),
    capacity: 40
  };
}

async function buildMercenaryOfficeView(userId) {
  const [ownedRows, assignments, profile, communityPoints, equipmentSlots] = await Promise.all([
    repo.listUserMercenaries(userId),
    repo.listOfficeAssignments(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId),
    repo.listUserEquipmentSlots(userId)
  ]);
  const lookup = masterById();
  const items = attachEquipmentToMercenaryItems(ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean), equipmentSlots);
  const itemByOwnedId = new Map(items.map((item) => [String(item.ownedId), item]));
  const facilities = getOfficeFacilitiesConfig().map((facility) => buildOfficeFacilityResponse(facility, assignments, itemByOwnedId));
  const officeEffects = mergeOfficeEffects(facilities.map((facility) => facility.effects));
  const mercenaryProfile = publicMercenaryProfile(profile);

  return {
    ok: true,
    profile: mercenaryProfile,
    mercenaryProfile,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    facilities,
    officeEffects,
    availableMercenaries: items.filter((item) => item.operationalStatus === 'idle'),
    assignedMercenaries: items.filter((item) => item.operationalStatus === 'office_assigned'),
    mercenaries: items
  };
}

async function getOfficeEffectsForUser(userId) {
  return (await buildMercenaryOfficeView(userId)).officeEffects;
}

async function assignMercenaryToOffice(userId, payload = {}) {
  const facilityKey = String(payload.facilityKey || '').trim();
  const facility = officeFacilityByKey(facilityKey);
  if (!facility) throw httpError(400, '유효하지 않은 사무실 시설입니다.', 'INVALID_FACILITY');
  const slotIndex = Number(payload.slotIndex);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= facility.maxSlots) {
    throw httpError(400, '유효하지 않은 사무실 슬롯입니다.', 'INVALID_OFFICE_SLOT');
  }
  const ownedMercenaryId = String(payload.ownedMercenaryId || '').trim();
  const owned = await repo.getUserMercenary(userId, ownedMercenaryId);
  if (!owned) throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  if (owned.operationalStatus !== 'idle') {
    throw httpError(409, '대기 중인 용병만 사무실에 배치할 수 있습니다.', 'MERCENARY_NOT_IDLE');
  }
  if (await repo.getOfficeAssignmentByOwnedMercenaryId(userId, ownedMercenaryId)) {
    throw httpError(409, '이미 사무실에 배치된 용병입니다.', 'MERCENARY_ALREADY_ASSIGNED');
  }
  if (await repo.getOfficeAssignmentBySlot(userId, facilityKey, slotIndex)) {
    throw httpError(409, '이미 사용 중인 사무실 슬롯입니다.', 'OFFICE_SLOT_OCCUPIED');
  }

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    await lockOwnedMercenaryForActivity(userId, ownedMercenaryId, {
      operationalStatus: 'office_assigned',
      currentActivityType: 'office',
      currentActivityId: facilityKey,
      errorCode: 'MERCENARY_NOT_IDLE',
      errorMessage: '대기 중인 용병만 사무실에 배치할 수 있습니다.'
    });
    const assignment = await repo.createOfficeAssignment({
      id: `office_${randomUUID()}`,
      userId,
      facilityKey,
      slotIndex,
      ownedMercenaryId
    });
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ok: true,
      assignment,
      ...(await buildMercenaryOfficeView(userId))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    if (error.code === 'SQLITE_CONSTRAINT') {
      throw httpError(409, '이미 사용 중인 사무실 배치입니다.', 'OFFICE_SLOT_OCCUPIED');
    }
    throw error;
  }
}

async function unassignMercenaryFromOffice(userId, payload = {}) {
  let assignment = null;
  const assignmentId = String(payload.assignmentId || '').trim();
  if (assignmentId) {
    assignment = await repo.getOfficeAssignment(userId, assignmentId);
  } else {
    const facilityKey = String(payload.facilityKey || '').trim();
    const slotIndex = Number(payload.slotIndex);
    assignment = Number.isInteger(slotIndex) ? await repo.getOfficeAssignmentBySlot(userId, facilityKey, slotIndex) : null;
  }
  if (!assignment) throw httpError(404, '사무실 배치를 찾을 수 없습니다.', 'OFFICE_ASSIGNMENT_NOT_FOUND');

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const deleted = await repo.deleteOfficeAssignment(userId, assignment.id);
    if (!deleted) throw httpError(404, '사무실 배치를 찾을 수 없습니다.', 'OFFICE_ASSIGNMENT_NOT_FOUND');
    const statusRow = await repo.updateUserMercenaryStatusIfCurrent(userId, assignment.ownedMercenaryId, {
      operationalStatus: 'office_assigned',
      currentActivityType: 'office',
      currentActivityId: assignment.facilityKey
    }, {
      operationalStatus: 'idle',
      currentActivityType: null,
      currentActivityId: null
    });
    if (!statusRow) throw httpError(409, '사무실 배치 상태가 아닙니다.', 'INVALID_STATE');
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ok: true,
      assignmentId: assignment.id,
      ownedMercenaryId: assignment.ownedMercenaryId,
      ...(await buildMercenaryOfficeView(userId))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
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

async function getUnlockedCaseIdsFromRumors() {
  // TODO: wire this to the future rumor tracking system.
  return new Set();
}

function buildRumorSourceHint(caseFile) {
  return caseFile.sourceHint || '소문망 추적 필요';
}

function getCaseOrThrow(caseId) {
  const caseFile = caseById().get(String(caseId || '').trim());
  if (!caseFile) throw httpError(404, '사건 파일을 찾을 수 없습니다.', 'CASE_NOT_FOUND');
  return caseFile;
}

async function getCaseUnlockState(userId, caseFile, profile) {
  const officeLevel = Number(profile?.officeLevel ?? profile?.office_level ?? 1) || 1;
  if (officeLevel < Number(caseFile.requiredOfficeLevel || 1)) {
    return {
      unlocked: false,
      lockedReason: `사무소 Lv.${caseFile.requiredOfficeLevel} 필요`
    };
  }
  if (caseFile.unlockType === 'rumor') {
    const unlockedIds = await getUnlockedCaseIdsFromRumors(userId);
    if (!unlockedIds.has(caseFile.caseId)) {
      return {
        unlocked: false,
        lockedReason: buildRumorSourceHint(caseFile) || '소문망 추적 필요'
      };
    }
  }
  if (caseFile.unlockType === 'event') {
    return {
      unlocked: false,
      lockedReason: caseFile.sourceHint || '이벤트 해금 필요'
    };
  }
  return { unlocked: true, lockedReason: '' };
}

function effectiveCaseStatus(progress, unlockState) {
  if (!unlockState.unlocked) return 'locked';
  return progress?.status || 'available';
}

function publicCaseSummary(caseFile, progress, unlockState) {
  const status = effectiveCaseStatus(progress, unlockState);
  const completedSteps = progress?.completedStepIds?.length || 0;
  return {
    caseId: caseFile.caseId,
    title: caseFile.title,
    subtitle: caseFile.subtitle,
    category: caseFile.category,
    risk: caseFile.risk,
    requiredOfficeLevel: caseFile.requiredOfficeLevel,
    unlockType: caseFile.unlockType,
    sourceHint: caseFile.sourceHint,
    recommendedTags: caseFile.recommendedTags,
    description: caseFile.description,
    status,
    currentStepIndex: progress?.currentStepIndex || 0,
    totalSteps: caseFile.steps.length,
    completedSteps,
    canStart: status === 'available',
    canClaimReward: status === 'completed',
    lockedReason: unlockState.unlocked ? '' : unlockState.lockedReason,
    finalRewards: caseFile.finalRewards
  };
}

function caseStepRunToPublic(runRow, members = []) {
  return runRow ? serializeRun(runRow, members) : null;
}

async function buildCaseStepResponse(userId, caseFile, progress, stepRuns, step, index) {
  const completed = new Set(progress?.completedStepIds || []);
  const runningBridge = stepRuns.find((item) => item.stepId === step.stepId && item.status === 'running') || null;
  const latestBridge = stepRuns.find((item) => item.stepId === step.stepId) || null;
  const runRow = runningBridge ? await repo.getMercenaryRun(userId, runningBridge.runId) : null;
  const members = runRow ? await buildRunMembers(userId, runRow.selectedMercenaryIds || []) : [];
  const isCurrent = progress?.status === 'in_progress' && Number(progress.currentStepIndex || 0) === index;
  const isCompleted = completed.has(step.stepId);
  const status = isCompleted
    ? 'completed'
    : runningBridge
      ? 'running'
      : isCurrent
        ? 'available'
        : 'locked';
  const mission = buildCaseStepMission(caseFile, step);
  return {
    stepId: step.stepId,
    order: step.order,
    title: step.title,
    introText: step.introText,
    successText: step.successText,
    failureText: step.failureText,
    missionPreview: publicMission(mission),
    status,
    canStart: status === 'available',
    canClaim: Boolean(runRow && new Date(runRow.completesAt).getTime() <= Date.now() && !runRow.claimedAt),
    runningRun: caseStepRunToPublic(runRow, members),
    latestRunId: latestBridge?.runId || null
  };
}

async function buildCaseDetail(userId, caseFile, progress = null) {
  const [profile, existingProgress, stepRuns, ownedRows, communityPoints] = await Promise.all([
    getOrCreateMercenaryProfile(userId),
    progress ? Promise.resolve(progress) : repo.getCaseProgress(userId, caseFile.caseId),
    repo.listCaseStepRuns(userId, caseFile.caseId),
    repo.listUserMercenaries(userId),
    getCommunityPoints(userId)
  ]);
  const unlockState = await getCaseUnlockState(userId, caseFile, profile);
  const effectiveProgress = existingProgress || {
    caseId: caseFile.caseId,
    status: unlockState.unlocked ? 'available' : 'locked',
    currentStepIndex: 0,
    completedStepIds: []
  };
  const lookup = masterById();
  const mercenaries = ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean);
  const steps = [];
  for (let index = 0; index < caseFile.steps.length; index += 1) {
    steps.push(await buildCaseStepResponse(userId, caseFile, effectiveProgress, stepRuns, caseFile.steps[index], index));
  }
  const mercenaryProfile = publicMercenaryProfile(profile);
  return {
    ok: true,
    case: publicCaseSummary(caseFile, existingProgress, unlockState),
    progress: effectiveProgress,
    steps,
    officeEffects: await getOfficeEffectsForUser(userId),
    availableMercenaries: mercenaries.filter((item) => item.operationalStatus === 'idle'),
    mercenaries,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function listCases(userId) {
  const [profile, progressRows, communityPoints] = await Promise.all([
    getOrCreateMercenaryProfile(userId),
    repo.listCaseProgress(userId),
    getCommunityPoints(userId)
  ]);
  const progressByCase = new Map(progressRows.map((row) => [row.caseId, row]));
  const cases = [];
  for (const caseFile of readCaseData()) {
    const unlockState = await getCaseUnlockState(userId, caseFile, profile);
    cases.push(publicCaseSummary(caseFile, progressByCase.get(caseFile.caseId), unlockState));
  }
  const mercenaryProfile = publicMercenaryProfile(profile);
  return {
    ok: true,
    cases,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function getCaseDetail(userId, caseId) {
  return buildCaseDetail(userId, getCaseOrThrow(caseId));
}

async function startCaseFile(userId, caseId) {
  const caseFile = getCaseOrThrow(caseId);
  const profile = await getOrCreateMercenaryProfile(userId);
  const unlockState = await getCaseUnlockState(userId, caseFile, profile);
  if (!unlockState.unlocked) throw httpError(403, unlockState.lockedReason || '사건 파일이 잠겨 있습니다.', 'CASE_LOCKED');
  const existing = await repo.getCaseProgress(userId, caseFile.caseId);
  if (existing?.status === 'in_progress') return buildCaseDetail(userId, caseFile, existing);
  if (existing && ['completed', 'reward_claimed'].includes(existing.status)) {
    throw httpError(409, '이미 완료한 사건 파일입니다.', 'CASE_ALREADY_COMPLETED');
  }
  const startedAt = new Date().toISOString();
  const progress = existing
    ? await repo.updateCaseProgress(userId, caseFile.caseId, { status: 'in_progress', currentStepIndex: 0, startedAt })
    : await repo.createCaseProgress({
      id: `case_${randomUUID()}`,
      userId,
      caseId: caseFile.caseId,
      status: 'in_progress',
      currentStepIndex: 0,
      completedStepIds: [],
      startedAt
    });
  return buildCaseDetail(userId, caseFile, progress);
}

function currentCaseStepOrThrow(caseFile, progress, stepId) {
  if (!progress || progress.status !== 'in_progress') {
    throw httpError(409, '사건 파일을 먼저 시작해야 합니다.', 'CASE_NOT_STARTED');
  }
  const currentStep = caseFile.steps[Number(progress.currentStepIndex || 0)];
  if (!currentStep || currentStep.stepId !== stepId) {
    throw httpError(409, '현재 진행할 수 있는 사건 단계가 아닙니다.', 'CASE_STEP_NOT_CURRENT');
  }
  return currentStep;
}

async function startCaseStepRun(userId, caseId, stepId, payload = {}) {
  const caseFile = getCaseOrThrow(caseId);
  const progress = await repo.getCaseProgress(userId, caseFile.caseId);
  const step = currentCaseStepOrThrow(caseFile, progress, stepId);
  if (await repo.getRunningCaseStepRun(userId, caseFile.caseId, step.stepId)) {
    throw httpError(409, '이미 진행 중인 사건 단계입니다.', 'CASE_STEP_ALREADY_RUNNING');
  }
  if (!Array.isArray(payload.ownedMercenaryIds)) {
    throw httpError(400, '파견할 보유 용병을 선택해 주세요.', 'INVALID_MERCENARY_SELECTION');
  }
  const memberIds = payload.ownedMercenaryIds.map((id) => String(id || '').trim()).filter(Boolean);
  const mission = buildCaseStepMission(caseFile, step);

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    if (await repo.getRunningCaseStepRun(userId, caseFile.caseId, step.stepId)) {
      throw httpError(409, '이미 진행 중인 사건 단계입니다.', 'CASE_STEP_ALREADY_RUNNING');
    }
    const created = await createDirectMissionRun(userId, mission, memberIds, { inTransaction: true });
    const bridge = await repo.createCaseStepRun({
      id: `case_step_${randomUUID()}`,
      userId,
      caseId: caseFile.caseId,
      stepId: step.stepId,
      runId: created.runRow.id,
      status: 'running',
      startedAt: created.startedAt
    });
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ok: true,
      caseId: caseFile.caseId,
      stepId: step.stepId,
      bridge,
      run: serializeRun(created.runRow, created.members),
      successPreview: created.successPreview,
      officeEffects: created.officeEffects,
      ...(await buildCaseDetail(userId, caseFile))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function applyCaseProgressAfterRunClaim(userId, runId, resultStatus) {
  const bridge = await repo.getCaseStepRunByRunId(userId, runId);
  if (!bridge || bridge.status !== 'running') return null;
  const caseFile = caseById().get(bridge.caseId);
  if (!caseFile) return null;
  const progress = await repo.getCaseProgress(userId, bridge.caseId);
  if (!progress) return null;
  const stepIndex = caseFile.steps.findIndex((step) => step.stepId === bridge.stepId);
  if (stepIndex < 0) return null;
  const completedIds = new Set(progress.completedStepIds || []);
  completedIds.add(bridge.stepId);
  const nextIndex = Math.min(caseFile.steps.length, Math.max(Number(progress.currentStepIndex || 0), stepIndex + 1));
  const allCompleted = completedIds.size >= caseFile.steps.length;
  const completedAt = allCompleted ? new Date().toISOString() : null;
  await repo.updateCaseStepRunStatus(userId, bridge.id, {
    status: resultStatus === 'success' ? 'completed' : 'failed',
    completedAt: new Date().toISOString()
  });
  const updated = await repo.updateCaseProgress(userId, bridge.caseId, {
    status: allCompleted ? 'completed' : 'in_progress',
    currentStepIndex: nextIndex,
    completedStepIds: [...completedIds],
    completedAt
  });
  return { caseFile, progress: updated };
}

async function claimCaseStepRun(userId, caseId, stepId) {
  const caseFile = getCaseOrThrow(caseId);
  const progress = await repo.getCaseProgress(userId, caseFile.caseId);
  const step = currentCaseStepOrThrow(caseFile, progress, stepId);
  const bridge = await repo.getRunningCaseStepRun(userId, caseFile.caseId, step.stepId);
  if (!bridge) throw httpError(404, '수령할 사건 단계 진행 기록이 없습니다.', 'CASE_STEP_NOT_READY');
  const runRow = await repo.getMercenaryRun(userId, bridge.runId);
  assertRunClaimable(runRow);
  const result = await claimMissionRun(userId, bridge.runId);
  return {
    ...result,
    ...(await buildCaseDetail(userId, caseFile))
  };
}

async function claimCaseReward(userId, caseId) {
  const caseFile = getCaseOrThrow(caseId);
  const progress = await repo.getCaseProgress(userId, caseFile.caseId);
  if (!progress || progress.status !== 'completed') {
    if (progress?.status === 'reward_claimed' || progress?.rewardClaimedAt) {
      throw httpError(409, '이미 사건 최종 보상을 수령했습니다.', 'CASE_REWARD_ALREADY_CLAIMED');
    }
    throw httpError(409, '사건 최종 보상을 아직 수령할 수 없습니다.', 'CASE_REWARD_NOT_READY');
  }
  const rewards = caseFile.finalRewards || {};
  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const latestProgress = await repo.getCaseProgress(userId, caseFile.caseId);
    if (!latestProgress || latestProgress.status !== 'completed' || latestProgress.rewardClaimedAt) {
      throw httpError(409, '이미 사건 최종 보상을 수령했거나 아직 수령할 수 없습니다.', latestProgress?.rewardClaimedAt ? 'CASE_REWARD_ALREADY_CLAIMED' : 'CASE_REWARD_NOT_READY');
    }
    const claimedAt = new Date().toISOString();
    const updatedProgress = await repo.updateCaseProgress(userId, caseFile.caseId, {
      status: 'reward_claimed',
      rewardClaimedAt: claimedAt
    });
    if (!updatedProgress || updatedProgress.status !== 'reward_claimed') {
      throw httpError(409, '이미 사건 최종 보상을 수령했습니다.', 'CASE_REWARD_ALREADY_CLAIMED');
    }
    const profile = await getOrCreateMercenaryProfile(userId);
    const officeProgress = applyOfficeExpProgress(profile, rewards.officeExp || 0);
    const updatedProfile = await repo.updateMercenaryProfileProgress(userId, {
      gold: Number(profile.gold || 0) + Number(rewards.mercenaryGold || 0),
      officeLevel: officeProgress.officeLevel,
      officeExp: officeProgress.officeExp,
      reputation: Number(profile.reputation || 0) + Number(rewards.officeReputation || 0)
    });
    await repo.createRecruitLog({
      userId,
      action: 'case_reward',
      mercenaryId: caseFile.caseId,
      goldDelta: Number(rewards.mercenaryGold || 0)
    });
    if (provider === 'sqlite') await run('COMMIT');
    const mercenaryProfile = publicMercenaryProfile(updatedProfile);
    return {
      ok: true,
      caseId: caseFile.caseId,
      completionText: caseFile.completionText,
      rewards,
      progress: updatedProgress,
      gold: mercenaryProfile.gold,
      mercenaryGold: mercenaryProfile.gold,
      communityPoints: await getCommunityPoints(userId),
      mercenaryProfile,
      ...(await buildCaseDetail(userId, caseFile, updatedProgress))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function listMissions(userId) {
  const [profile, communityPoints] = await Promise.all([
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const officeEffects = await getOfficeEffectsForUser(userId);
  const ensured = await ensureMissionOffersForUser(userId, profile, officeEffects);
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
  const board = buildMissionBoardState(ensured.profile, ensured.activeOffers, officeEffects);
  const lockedMissions = listLockedMissionsForOffice(mercenaryProfile.officeLevel);
  const officeGrowth = buildOfficeGrowth(ensured.profile);

  return {
    ok: true,
    offers,
    missions: offers,
    lockedMissions,
    board,
    officeEffects,
    officeGrowth,
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

async function createDirectMissionRun(userId, mission, memberIds, options = {}) {
  const profile = await getOrCreateMercenaryProfile(userId);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const openRuns = await repo.listOpenMercenaryRuns(userId);
  if (openRuns.length >= mercenaryProfile.maxActiveRuns) {
    throw httpError(409, '동시에 진행 가능한 의뢰 수를 초과했습니다.', 'ACTIVE_RUN_LIMIT_REACHED');
  }
  if (new Set(memberIds).size !== memberIds.length) {
    throw httpError(400, '같은 보유 용병이 중복 선택되었습니다.', 'DUPLICATE_OWNED_MERCENARY');
  }
  validateMissionMemberCount(memberIds, mission);
  await assertOwnedMercenariesAvailable(userId, memberIds);
  const members = await buildRunMembers(userId, memberIds);
  if (members.length !== memberIds.length) {
    throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  }

  const officeEffects = await getOfficeEffectsForUser(userId);
  const successPreview = calculateMissionSuccessRate(members, mission, officeEffects);
  const durationSeconds = Math.max(30, Math.floor(Number(mission.durationSeconds || 0) * (1 - Number(officeEffects.missionDurationReductionPct || 0))));
  const rewardGold = Math.max(0, Math.floor(Number(mission.rewardGold || 0) * (1 + Number(officeEffects.rewardGoldBonusPct || 0))));
  const now = new Date();
  const runId = `run_${randomUUID()}`;
  const completesAt = new Date(now.getTime() + durationSeconds * 1000);

  const ownsTransaction = provider === 'sqlite' && !options.inTransaction;
  if (ownsTransaction) await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    for (const ownedId of memberIds) {
      await lockOwnedMercenaryForActivity(userId, ownedId, {
        operationalStatus: 'dispatched',
        currentActivityType: 'mission',
        currentActivityId: runId,
        errorCode: 'MERCENARY_NOT_AVAILABLE',
        errorMessage: '파견할 수 없는 상태의 용병이 포함되어 있습니다.'
      });
    }

    const runRow = await repo.createMercenaryRun({
      id: runId,
      userId,
      missionId: mission.missionId,
      missionTitle: mission.title,
      selectedMercenaryIds: memberIds,
      successRate: successPreview.successRate,
      rewardGold,
      failureRewardGold: mission.failureRewardGold,
      officeExp: mission.officeExp,
      mercenaryExp: mission.mercenaryExp,
      failureOfficeExp: mission.failureOfficeExp,
      failureMercenaryExp: mission.failureMercenaryExp,
      durationSeconds,
      startedAt: now.toISOString(),
      completesAt: completesAt.toISOString()
    });

    if (ownsTransaction) await run('COMMIT');
    return { runRow, members, successPreview, officeEffects, startedAt: now.toISOString() };
  } catch (error) {
    if (ownsTransaction) await run('ROLLBACK').catch(() => {});
    throw error;
  }
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

async function getInfirmaryState(userId) {
  const [ownedRows, treatments, profile, communityPoints] = await Promise.all([
    repo.listUserMercenaries(userId),
    repo.listActiveTreatments(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const lookup = masterById();
  const itemByOwnedId = new Map(ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean)
    .map((item) => [String(item.ownedId), item]));
  const treatmentOwnedIds = new Set(treatments.map((treatment) => String(treatment.ownedMercenaryId)));
  const injured = [...itemByOwnedId.values()]
    .filter((item) => TREATABLE_OPERATIONAL_STATUSES.has(item.operationalStatus) && !treatmentOwnedIds.has(String(item.ownedId)))
    .map(attachTreatmentQuote);
  const treating = treatments
    .map((treatment) => serializeTreatment(treatment, itemByOwnedId.get(String(treatment.ownedMercenaryId))))
    .filter(Boolean);
  const mercenaryProfile = publicMercenaryProfile(profile);

  return {
    ok: true,
    injured,
    treating,
    gold: mercenaryProfile.gold,
    mercenaryGold: mercenaryProfile.gold,
    communityPoints,
    mercenaryProfile
  };
}

async function startTreatment(userId, ownedMercenaryId) {
  const ownedId = String(ownedMercenaryId || '').trim();
  if (!ownedId) throw httpError(400, '치료할 보유 용병을 선택해 주세요.', 'MERCENARY_NOT_OWNED');
  const owned = await repo.getUserMercenary(userId, ownedId);
  if (!owned) throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  if (!TREATABLE_OPERATIONAL_STATUSES.has(owned.operationalStatus)) {
    throw httpError(409, '부상 상태인 용병만 치료를 시작할 수 있습니다.', 'MERCENARY_NOT_INJURED');
  }
  const beforeStatus = owned.operationalStatus;
  const existing = await repo.getActiveTreatmentByOwnedMercenaryId(userId, ownedId);
  if (existing) throw httpError(409, '이미 치료 중인 용병입니다.', 'TREATMENT_ALREADY_ACTIVE');
  const master = masterById().get(owned.mercenaryId);
  if (!master) throw httpError(404, '용병 마스터 정보를 찾을 수 없습니다.', 'MERCENARY_NOT_OWNED');
  const item = buildOwnedMercenaryItem(owned, master);
  const officeEffects = await getOfficeEffectsForUser(userId);
  const baseCostGold = calculateTreatmentCost(master.grade, item.level);
  const baseDurationSeconds = calculateTreatmentDurationSeconds(master.grade, item.level);
  const costGold = Math.max(1, Math.floor(baseCostGold * (1 - Number(officeEffects.treatmentCostReductionPct || 0))));
  const durationSeconds = Math.max(30, Math.floor(baseDurationSeconds * (1 - Number(officeEffects.treatmentTimeReductionPct || 0))));
  const profileBeforeTreatment = await getOrCreateMercenaryProfile(userId);
  if (Number(profileBeforeTreatment.gold || 0) < costGold) {
    throw httpError(400, '용병단 골드가 부족합니다.', 'INSUFFICIENT_MERCENARY_GOLD');
  }
  const now = new Date();
  const treatmentId = `treat_${randomUUID()}`;
  const completesAt = new Date(now.getTime() + durationSeconds * 1000);

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    await lockOwnedMercenaryForActivity(userId, ownedId, {
      operationalStatus: 'treating',
      currentActivityType: 'treatment',
      currentActivityId: treatmentId,
      fromStatus: beforeStatus,
      requireNoActivity: false,
      errorCode: 'MERCENARY_NOT_INJURED',
      errorMessage: '부상 상태인 용병만 치료를 시작할 수 있습니다.'
    });
    const spent = await spendMercenaryGold(userId, costGold, `의무실 치료: ${master.name}`);
    const treatment = await repo.createTreatment({
      id: treatmentId,
      userId,
      ownedMercenaryId: ownedId,
      costGold,
      durationSeconds,
      startedAt: now.toISOString(),
      completesAt: completesAt.toISOString()
    });
    await repo.createRecruitLog({
      userId,
      action: 'start_treatment',
      mercenaryId: owned.mercenaryId,
      goldDelta: -costGold
    });
    if (provider === 'sqlite') await run('COMMIT');
    const mercenaryProfile = publicMercenaryProfile(spent.profile);
    return {
      ok: true,
      treatment: serializeTreatment(treatment, item),
      gold: mercenaryProfile.gold,
      mercenaryGold: mercenaryProfile.gold,
      communityPoints: await getCommunityPoints(userId),
      mercenaryProfile,
      officeEffects,
      ...(await getInfirmaryState(userId))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    if (error.code === 'NOT_ENOUGH_GOLD') {
      throw httpError(400, '용병단 골드가 부족합니다.', 'INSUFFICIENT_MERCENARY_GOLD');
    }
    throw error;
  }
}

async function claimTreatment(userId, treatmentId) {
  const id = String(treatmentId || '').trim();
  if (!id) throw httpError(404, '치료 기록을 찾을 수 없습니다.', 'TREATMENT_NOT_FOUND');
  const treatment = await repo.getTreatment(userId, id);
  if (!treatment) throw httpError(404, '치료 기록을 찾을 수 없습니다.', 'TREATMENT_NOT_FOUND');
  if (treatment.claimedAt) throw httpError(409, '이미 치료 완료 처리된 기록입니다.', 'TREATMENT_ALREADY_CLAIMED');
  if (new Date(treatment.completesAt).getTime() > Date.now()) {
    throw httpError(409, '아직 치료가 끝나지 않았습니다.', 'TREATMENT_NOT_COMPLETE');
  }
  const owned = await repo.getUserMercenary(userId, treatment.ownedMercenaryId);
  if (!owned) throw httpError(404, '보유하지 않은 용병입니다.', 'MERCENARY_NOT_OWNED');
  if (owned.operationalStatus !== 'treating') {
    throw httpError(409, '치료 중 상태인 용병만 복귀할 수 있습니다.', 'MERCENARY_NOT_TREATING');
  }

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const claimed = await repo.claimTreatment(userId, id, new Date().toISOString());
    if (!claimed?.claimedAt) throw httpError(409, '이미 치료 완료 처리된 기록입니다.', 'TREATMENT_ALREADY_CLAIMED');
    const statusRow = await repo.updateUserMercenaryStatusIfCurrent(userId, treatment.ownedMercenaryId, {
      operationalStatus: 'treating',
      currentActivityType: 'treatment',
      currentActivityId: id
    }, {
      operationalStatus: 'idle',
      currentActivityType: null,
      currentActivityId: null
    });
    if (!statusRow) throw httpError(409, '치료 중 상태인 용병만 복귀할 수 있습니다.', 'MERCENARY_NOT_TREATING');
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ok: true,
      treatmentId: id,
      ownedId: treatment.ownedMercenaryId,
      status: 'idle',
      mercenary: buildOwnedMercenaryItem(statusRow, masterById().get(statusRow.mercenaryId)),
      ...(await getInfirmaryState(userId))
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function startMissionRun(userId, payload = {}) {
  const profile = await getOrCreateMercenaryProfile(userId);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const officeEffects = await getOfficeEffectsForUser(userId);
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

  const successPreview = calculateMissionSuccessRate(members, mission, officeEffects);
  const durationSeconds = Math.max(30, Math.floor(Number(mission.durationSeconds || 0) * (1 - Number(officeEffects.missionDurationReductionPct || 0))));
  const rewardGold = Math.max(0, Math.floor(Number(mission.rewardGold || 0) * (1 + Number(officeEffects.rewardGoldBonusPct || 0))));
  const now = new Date();
  const completesAt = new Date(now.getTime() + durationSeconds * 1000);
  const runId = `run_${randomUUID()}`;

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const accepted = await repo.markMissionOfferAccepted(userId, offer.id, runId, now.toISOString());
    if (!accepted?.acceptedAt || accepted.acceptedRunId !== runId) {
      throw httpError(409, '이미 처리된 의뢰 제안입니다.', accepted?.rejectedAt ? 'OFFER_ALREADY_REJECTED' : 'OFFER_ALREADY_ACCEPTED');
    }
    for (const ownedId of memberIds) {
      await lockOwnedMercenaryForActivity(userId, ownedId, {
        operationalStatus: 'dispatched',
        currentActivityType: 'mission',
        currentActivityId: runId,
        errorCode: 'MERCENARY_NOT_AVAILABLE',
        errorMessage: '파견할 수 없는 상태의 용병이 포함되어 있습니다.'
      });
    }
    const runRow = await repo.createMercenaryRun({
      id: runId,
      userId,
      missionId: mission.missionId,
      missionTitle: mission.title,
      selectedMercenaryIds: memberIds,
      successRate: successPreview.successRate,
      rewardGold,
      failureRewardGold: mission.failureRewardGold,
      officeExp: mission.officeExp,
      mercenaryExp: mission.mercenaryExp,
      failureOfficeExp: mission.failureOfficeExp,
      failureMercenaryExp: mission.failureMercenaryExp,
      durationSeconds,
      startedAt: now.toISOString(),
      completesAt: completesAt.toISOString()
    });
    await pushMissionOfferRefillIfDue(userId, profile, officeEffects);
    if (provider === 'sqlite') await run('COMMIT');
    return {
      ok: true,
      run: serializeRun(runRow, members),
      acceptedOfferId: offer.id,
      successPreview,
      officeEffects,
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
  const officeEffects = await getOfficeEffectsForUser(userId);
  const nextProfile = await pushMissionOfferRefillIfDue(userId, profile, officeEffects);
  const activeOffers = await repo.listActiveMissionOffers(userId);
  const board = buildMissionBoardState(nextProfile, activeOffers, officeEffects);
  const mercenaryProfile = publicMercenaryProfile(nextProfile);

  return {
    ok: true,
    rejectedOfferId: normalizedOfferId,
    board,
    officeEffects,
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

function getBattleOperationRewardConfig(operationId) {
  const safeOperationId = String(operationId || '').trim();
  if (REMOVED_LEGACY_BATTLE_OPERATION_IDS.has(safeOperationId)) {
    throw httpError(410, '구버전 전투 기록은 더 이상 보상 수령 대상이 아닙니다.', 'LEGACY_BATTLE_OPERATION_REMOVED');
  }
  const mission = getCombatMissionByOperationId(safeOperationId);
  if (mission?.rewardGroupId) {
    const rewards = readCombatRewardData().filter((item) => (
      item.enabled
      && item.rewardGroupId === mission.rewardGroupId
      && item.rewardType === 'gold'
      && (!item.systemRequirement || item.systemRequirement === 'core')
    ));
    if (rewards.length) {
      return rewards.reduce((acc, item) => ({
        gold: acc.gold + Math.max(0, Number(item.gold || 0)),
        officeExp: acc.officeExp + Math.max(0, Number(item.officeExp || 0)),
        mercenaryExp: acc.mercenaryExp + Math.max(0, Number(item.mercExp || item.mercenaryExp || 0)),
        rewardSource: 'sheet_combat_reward',
        rewardGroupId: mission.rewardGroupId
      }), { gold: 0, officeExp: 0, mercenaryExp: 0, rewardSource: 'sheet_combat_reward', rewardGroupId: mission.rewardGroupId });
    }
  }
  throw httpError(400, '전투 의뢰 보상 정보를 찾을 수 없습니다.', 'UNKNOWN_BATTLE_OPERATION');
}

function extractBattleParticipantIds(payload = {}) {
  const explicit = Array.isArray(payload.partyUserMercenaryIds) ? payload.partyUserMercenaryIds : [];
  const fromAllies = Array.isArray(payload.allies)
    ? payload.allies.map((unit) => unit?.sourceId || unit?.ownedId || unit?.mercenaryId)
    : [];
  const fromResult = Array.isArray(payload.battleResult?.allies)
    ? payload.battleResult.allies.map((unit) => unit?.sourceId || unit?.ownedId || unit?.mercenaryId)
    : [];
  return [...explicit, ...fromAllies, ...fromResult]
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .filter((id, index, list) => list.indexOf(id) === index);
}

function normalizeBattleResultPayload(payload = {}) {
  const hasFullBattleResult = payload.battleResult && typeof payload.battleResult === 'object';
  const sourceBattleResult = hasFullBattleResult ? payload.battleResult : {};
  const battleId = String(payload.battleId || payload.runId || sourceBattleResult.battleId || '').trim();
  const operationId = String(payload.operationId || payload.missionId || payload.sourceId || sourceBattleResult.operationId || '').trim();
  const result = String(payload.result || payload.outcome || sourceBattleResult.result || sourceBattleResult.outcome || '').trim();
  if (!battleId) throw httpError(400, 'battleId is required.', 'BATTLE_ID_REQUIRED');
  if (!operationId) throw httpError(400, 'operationId is required.', 'OPERATION_ID_REQUIRED');
  if (!['victory', 'defeat', 'draw', 'party_wipe', 'timeout'].includes(result)) {
    throw httpError(400, 'Invalid battle result.', 'INVALID_BATTLE_RESULT');
  }
  const slimRoundCount = Number(payload.roundCount ?? payload.rounds ?? sourceBattleResult.roundCount ?? 0);
  const battleResult = hasFullBattleResult
    ? sourceBattleResult
    : {
      battleId,
      requestId: payload.requestId || null,
      sourceType: payload.sourceType || 'combat_mission',
      sourceId: payload.sourceId || operationId,
      missionId: payload.missionId || operationId,
      operationId,
      result,
      outcome: result,
      seed: payload.seed ?? null,
      roundCount: Number.isFinite(slimRoundCount) && slimRoundCount > 0 ? slimRoundCount : null,
      allies: Array.isArray(payload.allies) ? payload.allies : [],
      enemies: [],
      summary: payload.clientSummary && typeof payload.clientSummary === 'object'
        ? payload.clientSummary
        : payload.summary || {}
    };
  const participantIds = extractBattleParticipantIds({ ...payload, battleResult });
  if (!participantIds.length) throw httpError(400, 'Battle party is required.', 'BATTLE_PARTY_REQUIRED');
  return {
    battleResult,
    battleId,
    operationId,
    result,
    participantIds,
    seed: payload.seed ?? battleResult.seed ?? null,
    startedAt: battleResult.startedAt || null,
    completedAt: battleResult.endedAt || battleResult.completedAt || new Date().toISOString()
  };
}

function calculateBattleRewards(operationId, result) {
  const config = getBattleOperationRewardConfig(operationId);
  if (result !== 'victory') {
    return { gold: 0, officeExp: 0, mercenaryExp: 0, items: [] };
  }
  return {
    gold: Math.max(0, Number(config.gold || 0)),
    officeExp: Math.max(0, Number(config.officeExp || 0)),
    mercenaryExp: Math.max(0, Number(config.mercenaryExp || 0)),
    items: [],
    rewardSource: config.rewardSource || 'sheet_combat_reward',
    rewardGroupId: config.rewardGroupId || ''
  };
}

const INVENTORY_COMBAT_REWARD_TYPES = new Set(['material', 'equipment', 'item', 'drop']);

function createDeterministicRandom(seedText) {
  let state = 2166136261;
  const text = String(seedText || 'mercenary-combat-reward');
  for (let index = 0; index < text.length; index += 1) {
    state ^= text.charCodeAt(index);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeDropRate(value) {
  if (value === null || value === undefined || value === '') return 1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric <= 0) return 0;
  return Math.min(1, numeric > 1 ? numeric / 100 : numeric);
}

function getRewardQuantityRange(row = {}) {
  const minRaw = row.amountMin ?? row.amount_min ?? row.minAmount ?? row.quantityMin ?? row.quantity_min;
  const maxRaw = row.amountMax ?? row.amount_max ?? row.maxAmount ?? row.quantityMax ?? row.quantity_max;
  const amountRaw = row.quantity ?? row.amount ?? row.count;
  if (minRaw !== undefined || maxRaw !== undefined) {
    const min = Math.max(0, Math.floor(Number(minRaw ?? maxRaw ?? 1) || 0));
    const max = Math.max(min, Math.floor(Number(maxRaw ?? minRaw ?? min) || min));
    return { min, max };
  }
  const amount = Math.max(0, Math.floor(Number(amountRaw ?? 1) || 0));
  return { min: amount, max: amount };
}

function rollRewardQuantity(row, random) {
  const { min, max } = getRewardQuantityRange(row);
  if (max <= 0) return 0;
  if (max === min) return max;
  return min + Math.floor(random() * (max - min + 1));
}

function resolveCombatInventoryRewardItem(row = {}, bundle = getInventoryMasterBundle()) {
  const rewardType = String(row.rewardType || row.reward_type || row.type || '').trim().toLowerCase();
  const explicitItemId = String(
    row.itemId || row.item_id || row.rewardItemId || row.reward_item_id ||
    row.materialItemId || row.material_item_id || row.equipmentItemId || row.equipment_item_id || ''
  ).trim();
  const equipmentId = String(row.equipmentId || row.equipment_id || row.equipmentItemId || row.equipment_item_id || '').trim();
  let item = explicitItemId ? bundle.byItemId.get(explicitItemId) : null;
  let equipment = item?.itemType === 'equipment' ? bundle.equipmentByItemId.get(item.itemId) || null : null;
  if (!item && equipmentId) {
    equipment = bundle.equipmentById.get(equipmentId) || bundle.equipmentByItemId.get(equipmentId) || null;
    if (equipment?.itemId) item = bundle.byItemId.get(equipment.itemId) || null;
  }
  if (!equipment && item?.itemType === 'equipment') equipment = bundle.equipmentByItemId.get(item.itemId) || null;
  return {
    rewardType,
    requestedItemId: explicitItemId || equipmentId,
    item,
    equipment
  };
}

function buildCombatInventoryRewardRows(rewardGroupId) {
  const safeRewardGroupId = String(rewardGroupId || '').trim();
  if (!safeRewardGroupId) return [];
  return readCombatRewardData().filter((row) => (
    row.enabled
    && row.rewardGroupId === safeRewardGroupId
    && INVENTORY_COMBAT_REWARD_TYPES.has(String(row.rewardType || row.reward_type || row.type || '').trim().toLowerCase())
  ));
}

function formatInventoryRewardEntry(entry, options = {}, bundle = getInventoryMasterBundle()) {
  const item = bundle.byItemId.get(entry?.itemId) || null;
  const equipment = item?.itemType === 'equipment'
    ? bundle.equipmentByItemId.get(item.itemId) || null
    : null;
  return {
    inventoryItemId: entry?.id || '',
    itemId: entry?.itemId || '',
    itemType: item?.itemType || entry?.itemType || 'misc',
    name: item?.name || equipment?.name || entry?.itemId || '',
    grade: item?.grade || equipment?.grade || '',
    slot: equipment?.slot || '',
    quantity: Number(entry?.quantity || 1) || 1,
    rewardType: options.rewardType || item?.itemType || entry?.itemType || 'item',
    resultText: options.resultText || '',
    combatPower: Number(equipment?.modifiers?.combatPower || 0) || 0
  };
}

async function listInventoryRewardsForBattleRun(userId, battleId) {
  const safeBattleId = String(battleId || '').trim();
  if (!safeBattleId) return [];
  const bundle = getInventoryMasterBundle();
  return (await repo.listUserInventoryItems(userId))
    .filter((entry) => (
      String(entry.acquiredRunId || '') === safeBattleId
      && String(entry.acquiredSourceType || '') === 'combat_claim'
    ))
    .map((entry) => formatInventoryRewardEntry(entry, {}, bundle));
}

async function grantCombatInventoryRewards(userId, { battleId, missionId, rewardGroupId, seed }) {
  const rows = buildCombatInventoryRewardRows(rewardGroupId);
  if (!rows.length) return [];
  const bundle = getInventoryMasterBundle();
  const random = createDeterministicRandom(`${battleId || ''}|${missionId || ''}|${rewardGroupId || ''}|${seed || ''}`);
  const granted = [];
  for (const row of rows) {
    const dropRate = normalizeDropRate(row.dropRate ?? row.drop_rate);
    if (dropRate <= 0 || random() > dropRate) continue;
    const quantity = rollRewardQuantity(row, random);
    if (quantity <= 0) continue;
    const resolved = resolveCombatInventoryRewardItem(row, bundle);
    const item = resolved.item;
    if (!item?.itemId) {
      console.warn('[mercenary/combat-reward] inventory reward skipped: item master not found', {
        rewardGroupId,
        rewardType: resolved.rewardType,
        itemId: resolved.requestedItemId || ''
      });
      continue;
    }
    const itemType = item.itemType || (resolved.rewardType === 'equipment' ? 'equipment' : resolved.rewardType || 'misc');
    const perEntryQuantity = itemType === 'equipment' ? 1 : quantity;
    const grantCount = itemType === 'equipment' ? quantity : 1;
    for (let index = 0; index < grantCount; index += 1) {
      const entry = await repo.addInventoryItem({
        id: `inv_${randomUUID()}`,
        userId,
        itemId: item.itemId,
        itemType,
        quantity: perEntryQuantity,
        locked: false,
        acquiredSourceType: 'combat_claim',
        acquiredSourceId: missionId || rewardGroupId,
        acquiredRunId: battleId,
        stackable: false
      });
      granted.push({
        ...formatInventoryRewardEntry(entry, {
          rewardType: resolved.rewardType,
          resultText: row.resultText || ''
        }, bundle),
        rewardType: resolved.rewardType,
        resultText: row.resultText || ''
      });
    }
  }
  return granted;
}

function calculateBattleTreatmentCost({ injuryStatus, maxHp, level }) {
  const hp = Math.max(1, Number(maxHp || 1));
  const safeLevel = Math.max(1, Number(level || 1));
  if (injuryStatus === 'incapacitated' || injuryStatus === 'treatment_required') return Math.max(100, Math.floor(hp * 0.8 + safeLevel * 20));
  if (injuryStatus === 'injured_heavy') return Math.max(50, Math.floor(hp * 0.35 + safeLevel * 10));
  if (injuryStatus === 'injured_light') return Math.max(20, Math.floor(hp * 0.15 + safeLevel * 5));
  return 0;
}

function getBattleAllyFinalState(battleResult, ownedId) {
  const allies = Array.isArray(battleResult?.allies) ? battleResult.allies : [];
  return allies.find((unit) => String(unit?.sourceId || unit?.ownedId || unit?.mercenaryId || '') === String(ownedId)) || null;
}

function calculateBattleInjuryState(row, master, battleResult) {
  const allyState = getBattleAllyFinalState(battleResult, row.id);
  const beforeProgress = normalizeOwnedProgress(row, master);
  const maxHp = Math.max(1, Number(allyState?.maxHp || master?.baseStats?.hp || master?.stats?.HP || 1));
  const finalHp = Math.max(0, Number(allyState?.finalHp ?? allyState?.hp ?? maxHp) || 0);
  const ratio = finalHp / maxHp;
  const injuryStatus = finalHp <= 0
    ? 'treatment_required'
    : ratio <= 0.25
      ? 'injured_heavy'
      : ratio <= 0.5
        ? 'injured_light'
        : 'idle';
  return {
    ownedMercenaryId: String(row.id),
    mercenaryId: row.mercenaryId,
    name: master?.name || row.mercenaryId,
    finalHp,
    maxHp,
    hpRatio: ratio,
    injuryStatus,
    treatmentCost: calculateBattleTreatmentCost({ injuryStatus, maxHp, level: beforeProgress.currentLevel })
  };
}


function getInventoryMasterBundle() {
  const items = readItemMasterData();
  const equipment = readEquipmentMasterData();
  const imagePrompts = readEquipmentImagePromptData();
  return {
    items,
    equipment,
    imagePrompts,
    byItemId: new Map(items.map((item) => [item.itemId, item])),
    equipmentByItemId: new Map(equipment.map((item) => [item.itemId, item])),
    equipmentById: new Map(equipment.map((item) => [item.equipmentId, item])),
    imagePromptByKey: new Map(imagePrompts.map((item) => [item.imageKey, item]))
  };
}


function emptyEquipmentSlotMap() {
  return EQUIPMENT_SLOT_KEYS.reduce((acc, slot) => {
    acc[slot] = null;
    return acc;
  }, {});
}

function normalizeEquipmentSlotKey(slot) {
  const key = String(slot || '').trim();
  return EQUIPMENT_SLOT_KEYS.includes(key) ? key : '';
}

function enrichEquipmentSlot(slot, bundle = getInventoryMasterBundle(), ownedById = new Map()) {
  if (!slot) return null;
  const equipment = bundle.equipmentByItemId.get(slot.itemId) || bundle.equipmentById.get(slot.equipmentId) || null;
  const item = bundle.byItemId.get(slot.itemId) || null;
  const owner = ownedById.get(String(slot.userMercenaryId)) || null;
  return {
    ...slot,
    equipment,
    item,
    name: equipment?.name || item?.name || slot.itemId,
    grade: equipment?.grade || item?.grade || '',
    slot: normalizeEquipmentSlotKey(slot.slot) || slot.slot,
    equippedMercenaryName: owner?.name || owner?.mercenaryId || ''
  };
}

function calculateEquipmentBonus(slots = [], bundle = getInventoryMasterBundle()) {
  const bonus = {
    hp: 0,
    atk: 0,
    def: 0,
    spd: 0,
    tec: 0,
    sup: 0,
    accuracy: 0,
    evasion: 0,
    critical: 0,
    healing: 0,
    combatPower: 0
  };
  let flatCombatPowerBonus = 0;
  for (const rawSlot of Array.isArray(slots) ? slots : []) {
    const slot = rawSlot?.equipment ? rawSlot : enrichEquipmentSlot(rawSlot, bundle);
    const equipment = slot?.equipment;
    if (!equipment) continue;
    const stats = equipment.stats || {};
    const modifiers = equipment.modifiers || {};
    ['hp', 'atk', 'def', 'spd', 'tec', 'sup'].forEach((key) => {
      bonus[key] += Number(stats[key] || 0) || 0;
    });
    bonus.accuracy += Number(modifiers.accuracy || 0) || 0;
    bonus.evasion += Number(modifiers.evasion || 0) || 0;
    bonus.critical += Number(modifiers.critical || 0) || 0;
    bonus.healing += Number(modifiers.healing || 0) || 0;
    flatCombatPowerBonus += Number(modifiers.combatPower || 0) || 0;
  }
  bonus.combatPower = calculateCombatPowerFromStats(bonus) + flatCombatPowerBonus;
  return Object.fromEntries(Object.entries(bonus).map(([key, value]) => [key, Math.round(Number(value || 0) || 0)]));
}

function buildEquipmentSummary(slots = [], bundle = getInventoryMasterBundle(), ownedById = new Map()) {
  const enrichedSlots = (Array.isArray(slots) ? slots : []).map((slot) => enrichEquipmentSlot(slot, bundle, ownedById)).filter(Boolean);
  const slotMap = emptyEquipmentSlotMap();
  enrichedSlots.forEach((slot) => {
    const key = normalizeEquipmentSlotKey(slot.slot);
    if (key) slotMap[key] = slot;
  });
  return {
    slots: slotMap,
    items: enrichedSlots,
    equipmentBonus: calculateEquipmentBonus(enrichedSlots, bundle)
  };
}

function applyEquipmentSummaryToMercenary(item, summary) {
  if (!item || !summary) return item;
  const equipmentBonus = summary.equipmentBonus || calculateEquipmentBonus(summary.items || []);
  const baseCurrentStats = item.currentStats || {};
  const currentStatParts = calculateCurrentStatsFromParts(baseCurrentStats, {}, {}, equipmentBonus, {});
  const currentStats = {
    ...currentStatParts,
    combatPower: Math.max(0, Math.round(Number(baseCurrentStats.combatPower || item.combatPower || 0) + Number(equipmentBonus.combatPower || 0)))
  };
  const statBreakdown = {
    ...(item.statBreakdown || {}),
    equipmentBonus: {
      ...(item.statBreakdown?.equipmentBonus || emptyServerStatBlock()),
      ...equipmentBonus
    },
    currentStats
  };
  const baseCombatPowerWithoutEquipment = Number(baseCurrentStats.combatPower || item.combatPower || 0) || 0;
  return {
    ...item,
    equipmentSlots: summary.slots,
    equippedItems: summary.items,
    equipmentBonus,
    equipmentCombatPower: Number(equipmentBonus.combatPower || 0) || 0,
    baseCombatPowerWithoutEquipment,
    totalCombatPower: currentStats.combatPower,
    displayCombatPower: currentStats.combatPower,
    statBreakdown,
    currentStats,
    effectiveStats: normalizeBaseStats(currentStats),
    combatPower: currentStats.combatPower,
    power: currentStats.combatPower
  };
}

function attachEquipmentToMercenaryItems(items = [], slots = [], bundle = getInventoryMasterBundle()) {
  const itemsByOwnedId = new Map(items.map((item) => [String(item.ownedId), item]));
  const slotsByOwnedId = new Map();
  (Array.isArray(slots) ? slots : []).forEach((slot) => {
    const key = String(slot.userMercenaryId || '');
    if (!slotsByOwnedId.has(key)) slotsByOwnedId.set(key, []);
    slotsByOwnedId.get(key).push(slot);
  });
  return items.map((item) => {
    const summary = buildEquipmentSummary(slotsByOwnedId.get(String(item.ownedId)) || [], bundle, itemsByOwnedId);
    return applyEquipmentSummaryToMercenary(item, summary);
  });
}

function attachEquipmentStateToInventoryEntries(entries = [], slots = [], bundle = getInventoryMasterBundle(), ownedItems = []) {
  const ownedById = new Map(ownedItems.map((item) => [String(item.ownedId || item.id), item]));
  const slotByInventoryId = new Map((Array.isArray(slots) ? slots : []).map((slot) => [String(slot.inventoryItemId), enrichEquipmentSlot(slot, bundle, ownedById)]));
  return entries.map((entry) => {
    const equippedSlot = slotByInventoryId.get(String(entry.id)) || null;
    return {
      ...entry,
      equipped: Boolean(equippedSlot),
      equippedSlot: equippedSlot?.slot || null,
      equippedByMercenaryId: equippedSlot?.userMercenaryId || null,
      equippedByMercenaryName: equippedSlot?.equippedMercenaryName || null,
      equipmentSlot: equippedSlot
    };
  });
}

function assertMercenaryCanChangeEquipment(owned) {
  if (!owned) throw httpError(404, 'Owned mercenary not found.', 'OWNED_MERCENARY_NOT_FOUND');
  if (String(owned.operationalStatus || 'idle') !== 'idle') {
    throw httpError(409, 'Mercenary is not available for equipment changes.', 'MERCENARY_NOT_AVAILABLE');
  }
}


function enrichInventoryEntry(entry, bundle = getInventoryMasterBundle()) {
  const item = bundle.byItemId.get(entry.itemId) || null;
  const equipment = bundle.equipmentByItemId.get(entry.itemId) || null;
  const imagePrompt = equipment?.imageKey ? (bundle.imagePromptByKey.get(equipment.imageKey) || null) : null;
  return {
    ...entry,
    master: item,
    equipment,
    imagePrompt,
    slot: equipment?.slot || null,
    grade: equipment?.grade || item?.grade || null,
    name: equipment?.name || item?.name || entry.itemId,
    description: item?.description || equipment?.summary || '',
    effectSummary: item?.effectSummary || equipment?.summary || ''
  };
}

function matchesInventoryQuery(entry, filters = {}) {
  const itemType = String(filters.itemType || '').trim();
  const slot = String(filters.slot || '').trim();
  const grade = String(filters.grade || '').trim().toUpperCase();
  const q = String(filters.q || '').trim().toLowerCase();
  if (itemType && itemType !== 'all' && entry.itemType !== itemType) return false;
  if (slot && slot !== 'all' && entry.slot !== slot) return false;
  if (grade && grade !== 'ALL' && String(entry.grade || '').toUpperCase() !== grade) return false;
  if (q) {
    const haystack = [
      entry.itemId,
      entry.name,
      entry.description,
      entry.effectSummary,
      entry.equipment?.category,
      ...(entry.equipment?.tags || [])
    ].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function buildInventorySummary(entries = []) {
  const summary = {
    totalEntries: entries.length,
    totalQuantity: 0,
    byItemType: {},
    bySlot: { weapon: 0, armor: 0, accessory: 0, tool: 0 },
    byGrade: { N: 0, R: 0, SR: 0, SSR: 0, EX: 0 },
    lockedCount: 0
  };
  for (const entry of entries) {
    const quantity = Math.max(0, Number(entry.quantity || 0) || 0);
    summary.totalQuantity += quantity;
    summary.byItemType[entry.itemType] = (summary.byItemType[entry.itemType] || 0) + quantity;
    if (entry.slot) summary.bySlot[entry.slot] = (summary.bySlot[entry.slot] || 0) + quantity;
    if (entry.grade) summary.byGrade[entry.grade] = (summary.byGrade[entry.grade] || 0) + quantity;
    if (entry.locked) summary.lockedCount += 1;
  }
  return summary;
}

async function getUserInventory(userId, filters = {}) {
  const bundle = getInventoryMasterBundle();
  const [rawEntries, equipmentSlots, ownedRows] = await Promise.all([
    repo.listUserInventoryItems(userId),
    repo.listUserEquipmentSlots(userId),
    repo.listUserMercenaries(userId)
  ]);
  const lookup = masterById();
  const ownedItems = ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean);
  const entries = attachEquipmentStateToInventoryEntries(
    rawEntries.map((entry) => enrichInventoryEntry(entry, bundle)),
    equipmentSlots,
    bundle,
    ownedItems
  ).filter((entry) => matchesInventoryQuery(entry, filters));
  return {
    items: entries,
    summary: buildInventorySummary(entries)
  };
}

async function getUserInventorySummary(userId) {
  const bundle = getInventoryMasterBundle();
  const [rawEntries, equipmentSlots, ownedRows] = await Promise.all([
    repo.listUserInventoryItems(userId),
    repo.listUserEquipmentSlots(userId),
    repo.listUserMercenaries(userId)
  ]);
  const lookup = masterById();
  const ownedItems = ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean);
  const entries = attachEquipmentStateToInventoryEntries(rawEntries.map((entry) => enrichInventoryEntry(entry, bundle)), equipmentSlots, bundle, ownedItems);
  return {
    summary: buildInventorySummary(entries)
  };
}


async function listUserEquipmentSlots(userId) {
  const bundle = getInventoryMasterBundle();
  const [slots, ownedRows] = await Promise.all([
    repo.listUserEquipmentSlots(userId),
    repo.listUserMercenaries(userId)
  ]);
  const lookup = masterById();
  const ownedItems = ownedRows
    .map((row) => buildOwnedMercenaryItem(row, lookup.get(row.mercenaryId)))
    .filter(Boolean);
  const ownedById = new Map(ownedItems.map((item) => [String(item.ownedId), item]));
  const items = slots.map((slot) => enrichEquipmentSlot(slot, bundle, ownedById)).filter(Boolean);
  return {
    items,
    equipmentSlots: items,
    equipmentBonusByMercenaryId: Object.fromEntries(ownedItems.map((item) => {
      const summary = buildEquipmentSummary(items.filter((slot) => String(slot.userMercenaryId) === String(item.ownedId)), bundle, ownedById);
      return [String(item.ownedId), summary.equipmentBonus];
    }))
  };
}

async function getUserMercenaryEquipment(userId, userMercenaryId) {
  const owned = await repo.getUserMercenary(userId, userMercenaryId);
  if (!owned) throw httpError(404, 'Owned mercenary not found.', 'OWNED_MERCENARY_NOT_FOUND');
  const bundle = getInventoryMasterBundle();
  const slots = await repo.listEquipmentSlotsForMercenary(userId, userMercenaryId);
  const summary = buildEquipmentSummary(slots, bundle, new Map([[String(userMercenaryId), buildOwnedMercenaryItem(owned, masterById().get(owned.mercenaryId))]]));
  return {
    equipmentSlots: summary.slots,
    equipmentItems: summary.items,
    equipmentBonus: summary.equipmentBonus
  };
}

async function equipInventoryItem(userId, userMercenaryId, inventoryItemId) {
  const owned = await repo.getUserMercenary(userId, userMercenaryId);
  assertMercenaryCanChangeEquipment(owned);
  const inventoryEntry = await repo.getUserInventoryItem(userId, inventoryItemId);
  if (!inventoryEntry) throw httpError(404, 'Inventory item not found.', 'INVENTORY_ITEM_NOT_FOUND');
  if (inventoryEntry.itemType !== 'equipment') throw httpError(400, 'Only equipment items can be equipped.', 'NOT_EQUIPMENT_ITEM');
  const bundle = getInventoryMasterBundle();
  const equipment = bundle.equipmentByItemId.get(inventoryEntry.itemId);
  if (!equipment) throw httpError(404, 'Equipment master data not found.', 'EQUIPMENT_MASTER_NOT_FOUND');
  const slot = normalizeEquipmentSlotKey(equipment.slot);
  if (!slot) throw httpError(400, 'Invalid equipment slot.', 'INVALID_EQUIPMENT_SLOT');
  if (await repo.getEquipmentSlotByInventoryItemId(userId, inventoryItemId)) {
    throw httpError(409, 'Inventory item is already equipped.', 'EQUIPMENT_ALREADY_EQUIPPED');
  }
  if (await repo.getEquipmentSlot(userId, userMercenaryId, slot)) {
    throw httpError(409, 'Equipment slot is already occupied.', 'EQUIPMENT_SLOT_OCCUPIED');
  }
  await repo.equipInventoryItemSlot({
    id: `equip_${randomUUID()}`,
    userId,
    userMercenaryId,
    slot,
    inventoryItemId,
    itemId: inventoryEntry.itemId,
    equipmentId: equipment.equipmentId
  });
  return getUserMercenaryEquipment(userId, userMercenaryId);
}

async function unequipSlot(userId, userMercenaryId, slot) {
  const owned = await repo.getUserMercenary(userId, userMercenaryId);
  assertMercenaryCanChangeEquipment(owned);
  const safeSlot = normalizeEquipmentSlotKey(slot);
  if (!safeSlot) throw httpError(400, 'Invalid equipment slot.', 'INVALID_EQUIPMENT_SLOT');
  await repo.unequipInventoryItemSlot(userId, userMercenaryId, safeSlot);
  return getUserMercenaryEquipment(userId, userMercenaryId);
}


function normalizeInventoryPayload(payload = {}) {
  return {
    itemId: String(payload.itemId || payload.item_id || '').trim(),
    itemType: String(payload.itemType || payload.item_type || 'misc').trim() || 'misc',
    quantity: Math.max(1, Number(payload.quantity || 1) || 1),
    locked: Boolean(payload.locked),
    acquiredSourceType: payload.acquiredSourceType || payload.acquired_source_type || null,
    acquiredSourceId: payload.acquiredSourceId || payload.acquired_source_id || null,
    acquiredRunId: payload.acquiredRunId || payload.acquired_run_id || null
  };
}

async function addInventoryItem(userId, payload = {}) {
  const normalized = normalizeInventoryPayload(payload);
  if (!normalized.itemId) throw httpError(400, 'itemId is required.', 'ITEM_ID_REQUIRED');
  const item = getInventoryMasterBundle().byItemId.get(normalized.itemId);
  const stackable = Boolean(item?.stackable);
  return repo.addInventoryItem({
    id: `inv_${randomUUID()}`,
    userId,
    itemId: normalized.itemId,
    itemType: item?.itemType || normalized.itemType,
    quantity: normalized.quantity,
    locked: normalized.locked,
    acquiredSourceType: normalized.acquiredSourceType,
    acquiredSourceId: normalized.acquiredSourceId,
    acquiredRunId: normalized.acquiredRunId,
    stackable
  });
}

async function addInventoryItems(userId, items = [], sourceInfo = {}) {
  const results = [];
  for (const item of Array.isArray(items) ? items : []) {
    results.push(await addInventoryItem(userId, { ...sourceInfo, ...item }));
  }
  return results;
}

async function claimBattleResult(userId, payload = {}) {
  const normalized = normalizeBattleResultPayload(payload);
  const existing = await repo.getBattleRunByBattleId(userId, normalized.battleId);
  if (existing?.claimedAt) {
    const inventoryRewards = await listInventoryRewardsForBattleRun(userId, normalized.battleId);
    return {
      ok: true,
      claimed: true,
      alreadyClaimed: true,
      result: existing.result,
      rewards: existing.rewards || { gold: 0, officeExp: 0, mercenaryExp: 0, items: [] },
      injuries: existing.injuries || [],
      inventoryRewards,
      run: existing,
      message: 'Battle result already claimed.'
    };
  }
  const combatMission = getCombatMissionByOperationId(normalized.operationId);
  if (!combatMission) throw httpError(400, 'Unknown battle operation.', 'UNKNOWN_BATTLE_OPERATION');
  await assertCombatStageUnlocked(userId, combatMission);

  const ownedRows = await repo.listUserMercenaries(userId);
  const ownedById = new Map(ownedRows.map((row) => [String(row.id), row]));
  const selectedRows = normalized.participantIds.map((id) => ownedById.get(String(id)));
  if (selectedRows.some((row) => !row)) {
    throw httpError(403, 'Battle party contains a mercenary not owned by this user.', 'BATTLE_PARTY_OWNERSHIP_INVALID');
  }
  const unavailable = selectedRows.find((row) => !['idle'].includes(String(row.operationalStatus || 'idle')));
  if (unavailable) {
    throw httpError(409, 'Battle party contains a mercenary that is not currently available.', 'BATTLE_PARTY_NOT_AVAILABLE');
  }

  const lookup = masterById();
  const rewards = calculateBattleRewards(normalized.operationId, normalized.result);
  const injuries = selectedRows.map((row) => {
    const master = lookup.get(row.mercenaryId);
    if (!master) throw httpError(404, 'Battle party mercenary master data is missing.', 'BATTLE_MEMBER_NOT_FOUND');
    return calculateBattleInjuryState(row, master, normalized.battleResult);
  });

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    await repo.createBattleRun({
      id: `battle_run_${randomUUID()}`,
      userId,
      operationId: normalized.operationId,
      battleId: normalized.battleId,
      battleSeed: normalized.seed === null || normalized.seed === undefined ? null : String(normalized.seed),
      partySnapshot: { ownedMercenaryIds: normalized.participantIds },
      enemiesSnapshot: { enemies: normalized.battleResult?.enemies || [] },
      battleResult: normalized.battleResult,
      resultStatus: 'completed',
      result: normalized.result,
      startedAt: normalized.startedAt,
      completedAt: normalized.completedAt
    });
    const claimedAt = new Date().toISOString();
    const claimed = await repo.claimBattleRun(userId, normalized.battleId, {
      rewards,
      injuries,
      battleResult: normalized.battleResult,
      claimedAt
    });
    if (!claimed?.claimedAt) {
      const latest = await repo.getBattleRunByBattleId(userId, normalized.battleId);
      const inventoryRewards = await listInventoryRewardsForBattleRun(userId, normalized.battleId);
      if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        result: latest?.result || normalized.result,
        rewards: latest?.rewards || { gold: 0, officeExp: 0, mercenaryExp: 0, items: [] },
        injuries: latest?.injuries || [],
        inventoryRewards,
        run: latest,
        message: 'Battle result already claimed.'
      };
    }
    const inventoryRewards = await grantCombatInventoryRewards(userId, {
      battleId: normalized.battleId,
      missionId: combatMission.missionId || normalized.operationId,
      rewardGroupId: rewards.rewardGroupId || combatMission.rewardGroupId,
      seed: normalized.seed
    });
    let stageClear = null;
    if (normalized.result === 'victory' && (combatMission.stageId || combatMission.isStageMission)) {
      stageClear = await repo.upsertCombatStageClear({
        id: `stage_clear_${randomUUID()}`,
        userId,
        missionId: combatMission.missionId,
        stageId: combatMission.stageId,
        baseMissionId: combatMission.baseMissionId,
        result: 'victory',
        rounds: getBattleRoundCount(normalized.battleResult),
        clearedAt: claimedAt
      });
    }

    const profile = await getOrCreateMercenaryProfile(userId);
    const beforeProfile = publicMercenaryProfile(profile);
    const officeBefore = normalizeOfficeProgress(profile);
    const officeAfter = applyOfficeExpProgress(profile, rewards.officeExp);
    const officeGrowth = buildOfficeGrowthResult(officeBefore, officeAfter, rewards.officeExp);
    const updatedProfile = await repo.updateMercenaryProfileProgress(userId, {
      gold: Number(profile.gold || 0) + rewards.gold,
      officeLevel: officeAfter.officeLevel,
      officeExp: officeAfter.officeExp
    });

    const mercenaries = [];
    for (const row of selectedRows) {
      const master = lookup.get(row.mercenaryId);
      const injury = injuries.find((item) => item.ownedMercenaryId === String(row.id));
      const beforeProgress = normalizeOwnedProgress(row, master);
      const afterProgress = applyMercenaryExpProgress(row, rewards.mercenaryExp, master);
      const growthResult = buildMercenaryGrowthResult(row, master, beforeProgress, afterProgress, rewards.mercenaryExp);
      await repo.updateUserMercenaryProgress(userId, row.id, {
        currentLevel: afterProgress.currentLevel,
        currentExp: afterProgress.currentExp
      });
      const statusRow = await repo.updateUserMercenaryStatus(userId, row.id, {
        operationalStatus: injury?.injuryStatus || 'idle',
        currentActivityType: null,
        currentActivityId: null
      });
      const afterItem = buildOwnedMercenaryItem(statusRow, master);
      mercenaries.push({
        ...growthResult,
        status: afterItem.operationalStatus,
        statusLabel: afterItem.statusLabel,
        injury,
        treatmentCost: injury?.treatmentCost || 0
      });
    }

    if (rewards.gold > 0) {
      await repo.createRecruitLog({
        userId,
        action: 'battle_reward',
        mercenaryId: normalized.operationId,
        goldDelta: rewards.gold
      });
    }

    if (provider === 'sqlite') await run('COMMIT');
    const afterProfile = publicMercenaryProfile(updatedProfile);
    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      result: normalized.result,
      rewards,
      inventoryRewards,
      mercenaries,
      injuries,
      office: {
        ...officeGrowth
      },
      growth: {
        source: 'battle',
        gold: rewards.gold,
        office: officeGrowth,
        mercenaries
      },
      profile: {
        beforeGold: beforeProfile.gold,
        afterGold: afterProfile.gold,
        gainedGold: rewards.gold
      },
      mercenaryProfile: afterProfile,
      gold: afterProfile.gold,
      mercenaryGold: afterProfile.gold,
      communityPoints: await getCommunityPoints(userId),
      stageClear,
      run: claimed
    };
  } catch (error) {
    if (provider === 'sqlite') await run('ROLLBACK').catch(() => {});
    throw error;
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
  const officeEffects = await getOfficeEffectsForUser(userId);
  const gainedGold = succeeded ? runRow.rewardGold : runRow.failureRewardGold;
  const gainedOfficeExp = succeeded ? runRow.officeExp : runRow.failureOfficeExp;
  const gainedMercenaryExp = succeeded ? runRow.mercenaryExp : runRow.failureMercenaryExp;
  const injury = succeeded
    ? { occurred: false, chance: 0, injuredMember: null }
    : rollMissionInjury(mission, selectedRows.map((row) => {
      const master = lookup.get(row.mercenaryId);
      return {
        id: row.id,
        ownedId: row.id,
        name: master?.name || row.mercenaryId || '이름 없는 용병'
      };
    }), Math.random, officeEffects);
  const injuredOwnedId = injury.occurred ? String(injury.injuredMember?.ownedId || '') : '';
  const baseResultText = succeeded
    ? (mission.successText || '의뢰를 완료했습니다.')
    : (mission.failureText || '의뢰를 완수하지 못했습니다.');
  const resultText = injury.occurred && injury.injuredMember
    ? `${baseResultText} ${injury.injuredMember.name}가 부상당했습니다. 의무실에서 치료가 필요합니다.`
    : baseResultText;

  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const claimed = await repo.claimMercenaryRun(userId, runRow.id, {
      resultStatus,
      resultText,
      claimedAt: new Date().toISOString()
    });
    if (!claimed?.claimedAt) {
      throw httpError(409, '이미 수령한 의뢰 결과입니다.', 'RUN_ALREADY_CLAIMED');
    }

    const profile = await getOrCreateMercenaryProfile(userId);
    const officeBefore = normalizeOfficeProgress(profile);
    const officeProgress = applyOfficeExpProgress(profile, gainedOfficeExp);
    const officeGrowth = buildOfficeGrowthResult(officeBefore, officeProgress, gainedOfficeExp);
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
      const growthResult = buildMercenaryGrowthResult(row, master, beforeProgress, afterProgress, gainedMercenaryExp);
      await repo.updateUserMercenaryProgress(userId, row.id, {
        currentLevel: afterProgress.currentLevel,
        currentExp: afterProgress.currentExp
      });
      const nextOperationalStatus = !succeeded && injuredOwnedId === String(row.id) ? 'injured' : 'idle';
      const statusRow = await repo.updateUserMercenaryStatusIfCurrent(userId, row.id, {
        operationalStatus: 'dispatched',
        currentActivityType: 'mission',
        currentActivityId: runRow.id
      }, {
        operationalStatus: nextOperationalStatus,
        currentActivityType: null,
        currentActivityId: null
      });
      if (!statusRow) throw httpError(409, '파견 용병 상태가 변경되어 결과를 수령할 수 없습니다.', 'MERCENARY_NOT_AVAILABLE');
      const afterItem = buildOwnedMercenaryItem(statusRow, master);
      memberResults.push({
        ...growthResult,
        operationalStatus: afterItem.operationalStatus,
        statusLabel: afterItem.statusLabel,
        effectiveStats: afterItem.effectiveStats,
        workPower: afterItem.workPower,
        combatPower: afterItem.combatPower
      });
    }

    if (gainedGold > 0) {
      await repo.createRecruitLog({
        userId,
        action: 'mission_reward',
        mercenaryId: runRow.missionId,
        goldDelta: gainedGold
      });
    }
    if (provider === 'sqlite') await run('COMMIT');
    const caseProgress = await applyCaseProgressAfterRunClaim(userId, runRow.id, resultStatus);
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
        gainedMercenaryExp,
        injury
      },
      injury,
      caseProgress,
      officeEffects,
      office: officeGrowth,
      growth: {
        source: 'mission',
        gold: gainedGold,
        office: officeGrowth,
        mercenaries: memberResults
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
  setOwnedMercenaryLock,
  dismissOwnedMercenary,
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
  getNextOfficeUnlock,
  getOfficeUnlockMilestones,
  getMissionLockedReason,
  normalizeOfficeProgress,
  applyOfficeExpProgress,
  normalizeOwnedProgress,
  applyMercenaryExpProgress,
  getLevelStatGainTable,
  calculateUnifiedLevelBonus,
  calculateCurrentStatsFromParts,
  calculateEffectiveStat,
  calculateEffectiveStats,
  calculateCombatPowerFromStats,
  calculateBaseWorkPowerFromStats,
  calculateBaseWorkPower,
  getOfficeFacilitiesConfig,
  calculateOfficeFacilityPower,
  calculateOfficeFacilityEfficiency,
  buildMercenaryOfficeView,
  getOfficeEffectsForUser,
  assignMercenaryToOffice,
  unassignMercenaryFromOffice,
  calculateMissionWorkPower,
  calculateMissionSuccessRate,
  getMissionRiskPenalty,
  countMatchedMissionTags,
  countMatchedMissionPositions,
  decideMissionResult,
  getRecruitGradeRates,
  getInjuryChanceByRisk,
  rollMissionInjury,
  calculateTreatmentCost,
  calculateTreatmentDurationSeconds,
  summarizeSquad,
  getMissionOfferBoardLimit,
  getMissionOfferRefillIntervalSeconds,
  listMissions,
  listRuns,
  getInfirmaryState,
  startTreatment,
  claimTreatment,
  startMissionRun,
  rejectMissionOffer,
  claimBattleResult,
  listCombatStageClears,
  getUserInventory,
  getUserInventorySummary,
  listUserEquipmentSlots,
  getUserMercenaryEquipment,
  equipInventoryItem,
  unequipSlot,
  addInventoryItem,
  addInventoryItems,
  claimMissionRun,
  listCases,
  getCaseDetail,
  startCaseFile,
  startCaseStepRun,
  claimCaseStepRun,
  claimCaseReward,
  getUnlockedCaseIdsFromRumors,
  buildRumorSourceHint,
  listSquads,
  createSquad,
  updateSquad,
  deleteSquad
};
