const RARITIES = ['N', 'R', 'SR', 'SSR', 'EX'];
const PERFORMANCE_GRADES = ['N', 'R', 'SR', 'SSR'];
const ROLES = ['attacker', 'defender', 'supporter', 'scout', 'engineer', 'medic'];
const STAT_KEYS = ['attack', 'defense', 'support', 'tech', 'luck'];
const STATUSES = ['idle', 'deployed', 'injured', 'hospitalized', 'dead'];
const SOURCE_TYPES = ['hire_shop', 'special_contract', 'season_reward', 'event', 'achievement', 'admin_grant', 'mission_reward'];

const HIRE_CANDIDATE_COUNT = 3;
const HIRE_CANDIDATE_TTL_HOURS = 24;
const MAX_DEPLOY_MERCENARIES = 3;
const MIN_DEPLOY_MERCENARIES = 1;

const HIRE_RARITY_TABLE = [
  { rarity: 'N', performanceGrade: 'N', weight: 65 },
  { rarity: 'R', performanceGrade: 'R', weight: 35 }
];

const STAT_RANGES = {
  N: { min: 4, max: 9, cost: 80 },
  R: { min: 8, max: 14, cost: 180 },
  SR: { min: 14, max: 22, cost: 0 },
  SSR: { min: 22, max: 34, cost: 0 }
};

const RESCUE_SUBSCRIBE_COSTS = {
  N: 30,
  R: 60,
  SR: 150,
  SSR: 350
};

const TREATMENT_GRADE_COSTS = {
  N: 0,
  R: 20,
  SR: 60,
  SSR: 150
};

const ROLE_LABELS = {
  attacker: '공격수',
  defender: '방어수',
  supporter: '지원가',
  scout: '정찰병',
  engineer: '기술병',
  medic: '의무병'
};

const STATUS_LABELS = {
  idle: '대기',
  deployed: '임무 중',
  injured: '부상',
  hospitalized: '의무실',
  dead: '전사'
};

const TEMPLATE_POOLS = {
  N: [
    { templateKey: 'nr_n_rusty_guard', name: '녹슨 방패병' },
    { templateKey: 'nr_n_sleepy_scout', name: '졸린 정찰병' },
    { templateKey: 'nr_n_wire_engineer', name: '전선 만지는 기술병' },
    { templateKey: 'nr_n_bandage_medic', name: '붕대 담당 의무병' },
    { templateKey: 'nr_n_loud_attacker', name: '시끄러운 돌격수' },
    { templateKey: 'nr_n_snack_supporter', name: '간식 보급 지원가' }
  ],
  R: [
    { templateKey: 'nr_r_backalley_attacker', name: '뒷골목 해결사' },
    { templateKey: 'nr_r_gate_defender', name: '격리문 파수꾼' },
    { templateKey: 'nr_r_signal_scout', name: '신호 추적 정찰병' },
    { templateKey: 'nr_r_patch_medic', name: '응급패치 의무병' },
    { templateKey: 'nr_r_broken_radio_engineer', name: '고장난 무전 기술병' },
    { templateKey: 'nr_r_morale_supporter', name: '사기 충전 지원가' }
  ]
};

const MISSIONS = [
  {
    code: 'patrol',
    title: '격리소 순찰',
    description: '복도에 굴러다니는 소동을 주워 담습니다.',
    difficulty: 'easy',
    recommendedRoles: ['defender', 'scout'],
    baseRewardMin: 20,
    baseRewardMax: 40,
    baseSuccessRate: 70,
    injuryRisk: 5,
    deathRisk: 0,
    durationSeconds: 180
  },
  {
    code: 'mine_guard',
    title: '광산 경비',
    description: '광산 입구에서 잡석과 유저의 욕심을 감시합니다.',
    difficulty: 'normal',
    recommendedRoles: ['defender', 'engineer'],
    baseRewardMin: 35,
    baseRewardMax: 70,
    baseSuccessRate: 60,
    injuryRisk: 10,
    deathRisk: 0,
    durationSeconds: 300
  },
  {
    code: 'incident_suppression',
    title: '소동 진압',
    description: '격리소의 작은 난리를 큰 난리가 되기 전에 눌러둡니다.',
    difficulty: 'normal',
    recommendedRoles: ['supporter', 'medic'],
    baseRewardMin: 30,
    baseRewardMax: 65,
    baseSuccessRate: 62,
    injuryRisk: 8,
    deathRisk: 0,
    durationSeconds: 420
  },
  {
    code: 'closed_zone_scout',
    title: '폐쇄구역 정찰',
    description: '지도에 없는 문 너머를 확인합니다. 문이 먼저 확인할 수도 있습니다.',
    difficulty: 'hard',
    recommendedRoles: ['scout', 'attacker', 'engineer'],
    baseRewardMin: 70,
    baseRewardMax: 150,
    baseSuccessRate: 45,
    injuryRisk: 18,
    deathRisk: 2,
    durationSeconds: 720
  },
  {
    code: 'debt_collector',
    title: '카지노 채무자 추적',
    description: '카지노 근처에서 사라진 포인트의 행방을 묻습니다.',
    difficulty: 'dangerous',
    recommendedRoles: ['attacker', 'scout'],
    baseRewardMin: 100,
    baseRewardMax: 230,
    baseSuccessRate: 35,
    injuryRisk: 25,
    deathRisk: 4,
    durationSeconds: 900
  }
];

function isValidRarity(value) {
  return RARITIES.includes(value);
}

function isValidPerformanceGrade(value) {
  return PERFORMANCE_GRADES.includes(value);
}

function treatmentCost({ level = 1, performanceGrade = 'N', injuryLevel = 1 }) {
  return 20
    + Number(level || 1) * 5
    + (TREATMENT_GRADE_COSTS[performanceGrade] || 0)
    + Number(injuryLevel || 1) * 20;
}

module.exports = {
  RARITIES,
  PERFORMANCE_GRADES,
  ROLES,
  STAT_KEYS,
  STATUSES,
  SOURCE_TYPES,
  HIRE_CANDIDATE_COUNT,
  HIRE_CANDIDATE_TTL_HOURS,
  MAX_DEPLOY_MERCENARIES,
  MIN_DEPLOY_MERCENARIES,
  HIRE_RARITY_TABLE,
  STAT_RANGES,
  RESCUE_SUBSCRIBE_COSTS,
  ROLE_LABELS,
  STATUS_LABELS,
  TEMPLATE_POOLS,
  MISSIONS,
  isValidRarity,
  isValidPerformanceGrade,
  treatmentCost
};
