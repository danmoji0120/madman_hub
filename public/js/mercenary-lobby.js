const iconBasePath = '/assets/mercenary/ui/icons/';

const mercenaryIcons = {
  group: '01_mercenary_group.png',
  helmet: '02_helmet.png',
  medicalCross: '03_medical_cross.png',
  potion: '04_potion.png',
  scroll: '05_scroll.png',
  envelope: '06_envelope.png',
  eye: '07_eye.png',
  crossedSwords: '09_crossed_swords.png',
  report: '10_report_document.png',
  rumor: '11_rumor_flame.png',
  medicalBag: '12_medical_bag.png',
  contract: '13_contract_scroll.png',
  coin: '14_skull_coin.png',
  bell: '15_bell.png',
  calendar: '16_calendar.png',
  settings: '17_setting.png',
  point: '18_point.png',
  inventory: '13_contract_scroll.png'
};

const MERCENARY_BGM_TRACKS = [
  {
    id: 'lobby_01',
    title: '용병 대기실',
    src: '/assets/mercenary/bgm/lobby_01.mp3'
  },
  {
    id: 'lobby_02',
    title: '채용 게시판',
    src: '/assets/mercenary/bgm/lobby_02.mp3'
  },
  {
    id: 'lobby_03',
    title: '폐급 사무소 야근',
    src: '/assets/mercenary/bgm/lobby_03.mp3'
  },
  {
    id: 'lobby_04',
    title: '늦은 의뢰 접수',
    src: '/assets/mercenary/bgm/lobby_04.mp3'
  },
  {
    id: 'lobby_05',
    title: '장부와 촛불',
    src: '/assets/mercenary/bgm/lobby_05.mp3'
  },
  {
    id: 'lobby_06',
    title: '새벽의 작전 테이블',
    src: '/assets/mercenary/bgm/lobby_06.mp3'
  }
];

const MERCENARY_BGM_STORAGE_KEYS = {
  enabled: 'mercenary.bgm.enabled',
  volume: 'mercenary.bgm.volume',
  mode: 'mercenary.bgm.mode',
  currentTrackId: 'mercenary.bgm.currentTrackId'
};

const bgmState = {
  audio: null,
  enabled: true,
  volume: 0.35,
  mode: 'shuffle',
  currentTrackId: '',
  currentTrackIndex: -1,
  shuffleQueue: [],
  initialized: false,
  unlocked: false,
  failedTrackIds: new Set()
};

const mercenaryActionLocks = new Map();

const mercenaryLobbyState = {
  officeName: '폐급 용병단 사무소',
  level: 1,
  reputation: 'D급',
  expPercent: 0,
  officeExp: 0,
  officeExpToNext: 150,
  officeMaxLevel: 50,
  isOfficeMaxLevel: false,
  officeGrowth: null,
  gold: 0,
  points: 0,
  mailCount: 0,
  alertCount: 4,
  summary: {
    idleMercenaries: 24,
    onMission: 5,
    injured: 2,
    claimableReports: 1,
    activeRumors: 1
  },
  assistant: {
    name: '접수원 마렌',
    line: '소장님, 오늘도 정상적인 의뢰는 하나도 없습니다.'
  },
  hotspots: [
    {
      key: 'recruitment',
      label: '채용 게시판',
      badge: 'NEW',
      status: 'available',
      icon: 'group',
      description: '오늘도 수상한 인재들이 붙어 있습니다.'
    },
    {
      key: 'missions',
      label: '의뢰 접수 데스크',
      badge: 'REPORT',
      status: 'claimable',
      icon: 'contract',
      description: '완료 보고서가 도착했습니다.'
    },
    {
      key: 'infirmary',
      label: '의무실',
      badge: 'INJURED',
      status: 'warning',
      icon: 'medicalBag',
      description: '누군가 신음하고 있습니다. 무시할까요?'
    },
    {
      key: 'office',
      label: '사무실',
      badge: 'OPS',
      status: 'available',
      icon: 'settings',
      description: '책상에 사람을 앉히면 사무소가 조금 덜 망합니다.'
    },
    {
      key: 'cases',
      label: '사건 파일',
      badge: 'CASE',
      status: 'available',
      icon: 'report',
      description: '한 장으로 끝나지 않는 골치 아픈 의뢰 묶음입니다.'
    }
  ],
  logs: [
    '[채용] 채용 게시판에 새 후보 6명이 등록되었습니다.',
    '[부상] 방패병 마틸다가 경상 상태로 복귀했습니다.',
    '[보고] 완료 보고서 1건이 접수 데스크에 도착했습니다.'
  ],
  quickNav: [
    { label: '용병 목록', icon: 'group', action: 'roster' },
    { label: '의뢰 목록', icon: 'scroll', action: 'missions' },
    { label: '전투 작전', icon: 'crossedSwords', action: 'battle' },
    { label: '편성/파견', icon: 'crossedSwords', action: 'squads' },
    { label: '의무실', icon: 'medicalCross', action: 'infirmary' },
    { label: '사무실', icon: 'settings', action: 'office' },
    { label: '사건 파일', icon: 'report', action: 'cases' },
    { label: '보관함', icon: 'inventory', action: 'inventory' },
    { label: '소문 조사', icon: 'eye', action: 'ready' }
  ]
};

const fallbackMercenaryRosterData = [
  {
    id: 'slime-cleaner',
    imageKey: 'slime_cleaner',
    grade: 'N',
    name: '끈적한 슬라임 청소반',
    species: '슬라임',
    position: '특수',
    role: '청소반',
    level: 3,
    maxLevel: 20,
    exp: 168,
    nextExp: 400,
    status: '대기 중',
    hireMethod: 'N 일반 생성',
    contractDate: '2025-05-18',
    flaw: '바닥 청소는 잘하지만 바닥도 같이 먹을 수 있음',
    stats: { HP: 34, ATK: 12, DEF: 18, SPD: 9, TEC: 16, SUP: 22 },
    power: 128,
    skill: { name: '점액 청소', effect: '오염 피해 소폭 감소' },
    requestBonus: '하수도/오염 의뢰 성공률 소폭 증가',
    adminBonus: '청소 배치 시 오염 처리 비용 소폭 감소',
    commandBonus: '청소/오염 태그 용병 2명 이상 편성 시 사고율 소폭 감소',
    tags: ['슬라임', '청소', '오염', '하수도', 'N운용'],
    equipment: [
      { slot: '무기', icon: 'crossedSwords', name: '녹슨 단검', grade: 'N +0', effect: 'ATK +2' },
      { slot: '방어구', icon: 'helmet', name: '낡은 앞치마', grade: 'N +0', effect: '오염 저항 +1' },
      { slot: '장신구', icon: 'rumor', name: '금 간 부적', grade: 'N +0', effect: '사고율 -1%' },
      { slot: '보조 장비', icon: 'medicalBag', name: '청소용 양동이', grade: 'N +0', effect: '청소 태그 보정' }
    ]
  },
  {
    id: 'goblin-hammer',
    imageKey: 'goblin_hammer',
    grade: 'N',
    name: '고블린 망치꾼',
    species: '고블린',
    position: '전열',
    role: '파괴공',
    level: 5,
    maxLevel: 20,
    exp: 230,
    nextExp: 520,
    status: '대기 중',
    hireMethod: 'N 일반 생성',
    contractDate: '2025-06-02',
    flaw: '문을 열기보다 부수는 쪽을 선호함',
    stats: { HP: 48, ATK: 24, DEF: 16, SPD: 11, TEC: 10, SUP: 6 },
    power: 174,
    skill: { name: '삐걱 망치질', effect: '낡은 방어구 대상 피해 소폭 증가' },
    requestBonus: '철거/폐허 의뢰 성공률 소폭 증가',
    adminBonus: '수리비가 가끔 더 늘어남',
    commandBonus: '고블린 2명 이상 편성 시 전열 ATK 소폭 증가',
    tags: ['고블린', '망치', '철거', '전열', 'N운용'],
    equipment: [
      { slot: '무기', icon: 'crossedSwords', name: '찌그러진 망치', grade: 'N +1', effect: 'ATK +4' },
      { slot: '방어구', icon: 'helmet', name: '녹슨 투구', grade: 'N +0', effect: 'DEF +2' },
      { slot: '장신구', icon: 'rumor', name: '깨진 이빨 목걸이', grade: 'N +0', effect: '공포 저항 +1' },
      { slot: '보조 장비', icon: 'contract', name: '못 주머니', grade: 'N +0', effect: '철거 보정' }
    ]
  },
  {
    id: 'human-porter',
    imageKey: 'human_porter',
    grade: 'N',
    name: '인간 짐꾼',
    species: '인간',
    position: '지원',
    role: '보급 담당',
    level: 4,
    maxLevel: 20,
    exp: 80,
    nextExp: 430,
    status: '임무 중',
    hireMethod: 'N 일반 생성',
    contractDate: '2025-06-11',
    flaw: '무거운 짐은 잘 들지만 방향 감각이 낮음',
    stats: { HP: 42, ATK: 9, DEF: 15, SPD: 10, TEC: 12, SUP: 28 },
    power: 151,
    skill: { name: '비상 배낭', effect: '아군 1명의 소모품 효과 소폭 증가' },
    requestBonus: '장거리/보급 의뢰 보상 소폭 증가',
    adminBonus: '창고 정리 시간 소폭 감소',
    commandBonus: '지원 포지션 2명 이상 편성 시 보급 사고율 감소',
    tags: ['인간', '보급', '짐꾼', '지원', 'N운용'],
    equipment: [
      { slot: '무기', icon: 'scroll', name: '나무 지팡이', grade: 'N +0', effect: 'SUP +2' },
      { slot: '방어구', icon: 'helmet', name: '두꺼운 조끼', grade: 'N +0', effect: 'HP +4' },
      { slot: '장신구', icon: 'calendar', name: '낡은 나침반', grade: 'N +0', effect: '길찾기 보정' },
      { slot: '보조 장비', icon: 'medicalBag', name: '보급 배낭', grade: 'N +1', effect: '보급 태그 강화' }
    ]
  },
  {
    id: 'karoon-tracker',
    imageKey: 'karoon_tracker',
    grade: 'R',
    name: '늑대인간 추적자 카룬',
    species: '늑대인간',
    position: '전열',
    role: '추적자',
    level: 12,
    maxLevel: 40,
    exp: 1120,
    nextExp: 1900,
    status: '대기 중',
    hireMethod: 'R 추천 계약',
    contractDate: '2025-07-04',
    flaw: '달이 밝으면 회의 중에도 사냥 이야기를 함',
    stats: { HP: 76, ATK: 42, DEF: 28, SPD: 38, TEC: 31, SUP: 12 },
    power: 418,
    skill: { name: '핏자국 추적', effect: '출혈 대상 추적 피해 증가' },
    requestBonus: '수색/추적 의뢰 성공률 증가',
    adminBonus: '실종 보고 처리 시간이 감소',
    commandBonus: '추적 태그 편성 시 선제 발견 확률 증가',
    tags: ['늑대인간', '추적', '수색', '전열', 'R운용'],
    equipment: [
      { slot: '무기', icon: 'crossedSwords', name: '보급형 검', grade: 'R +2', effect: 'ATK +12' },
      { slot: '방어구', icon: 'helmet', name: '견고한 흉갑', grade: 'R +1', effect: 'DEF +8' },
      { slot: '장신구', icon: 'eye', name: '추적 부적', grade: 'R +0', effect: '추적 성공률 +3%' },
      { slot: '보조 장비', icon: 'contract', name: '현장 도구', grade: 'R +0', effect: '수색 보정' }
    ]
  },
  {
    id: 'erin-archer',
    imageKey: 'erin_archer',
    grade: 'R',
    name: '엘프 궁수 에린',
    species: '엘프',
    position: '화력',
    role: '궁수',
    level: 15,
    maxLevel: 40,
    exp: 1480,
    nextExp: 2100,
    status: '대기 중',
    hireMethod: 'R 추천 계약',
    contractDate: '2025-07-22',
    flaw: '조준은 정확하지만 농담 타이밍은 치명적으로 느림',
    stats: { HP: 52, ATK: 54, DEF: 18, SPD: 41, TEC: 46, SUP: 20 },
    power: 462,
    skill: { name: '침묵 화살', effect: '후열 대상 명중률과 약점 피해 증가' },
    requestBonus: '정찰/저격 의뢰 성공률 증가',
    adminBonus: '감시 초소 배치 효율 증가',
    commandBonus: '화력 포지션 2명 이상 편성 시 첫 공격 명중률 증가',
    tags: ['엘프', '궁수', '정찰', '화력', 'R운용'],
    equipment: [
      { slot: '무기', icon: 'crossedSwords', name: '휘어진 장궁', grade: 'R +2', effect: 'TEC +10' },
      { slot: '방어구', icon: 'helmet', name: '가죽 흉갑', grade: 'R +1', effect: 'SPD +5' },
      { slot: '장신구', icon: 'eye', name: '매의 렌즈', grade: 'R +0', effect: '명중률 +3%' },
      { slot: '보조 장비', icon: 'scroll', name: '바람깃 화살통', grade: 'R +1', effect: '저격 보정' }
    ]
  },
  {
    id: 'dwarf-medic',
    imageKey: 'dwarf_medic',
    grade: 'R',
    name: '드워프 야전의무관 브룬',
    species: '드워프',
    position: '지원',
    role: '의무관',
    level: 14,
    maxLevel: 40,
    exp: 900,
    nextExp: 1800,
    status: '치료 중',
    hireMethod: 'R 현장 구조',
    contractDate: '2025-08-03',
    flaw: '치료 전에 잔소리 시간이 조금 김',
    stats: { HP: 68, ATK: 24, DEF: 35, SPD: 14, TEC: 30, SUP: 52 },
    power: 430,
    skill: { name: '거친 봉합', effect: '아군 1명의 부상 누적을 완화' },
    requestBonus: '호위/구조 의뢰 부상률 감소',
    adminBonus: '의무실 치료 비용 소폭 감소',
    commandBonus: '고위험 의뢰 편성 시 생환율 증가',
    tags: ['드워프', '치료', '의무실', '지원', 'R운용'],
    equipment: [
      { slot: '무기', icon: 'medicalCross', name: '응급 망치', grade: 'R +1', effect: 'SUP +7' },
      { slot: '방어구', icon: 'helmet', name: '야전 앞치마', grade: 'R +1', effect: 'DEF +6' },
      { slot: '장신구', icon: 'medicalBag', name: '붕대 고리', grade: 'R +0', effect: '치료비 -2%' },
      { slot: '보조 장비', icon: 'medicalBag', name: '현장 의무가방', grade: 'R +2', effect: '부상률 감소' }
    ]
  },
  {
    id: 'seira-shadow',
    imageKey: 'seira_shadow',
    grade: 'SR',
    name: '그림자 사냥꾼 세이라',
    species: '인간',
    position: '화력',
    role: '암살자',
    level: 28,
    maxLevel: 60,
    exp: 3400,
    nextExp: 5200,
    status: '대기 중',
    hireMethod: 'SR 특수 계약',
    contractDate: '2025-09-13',
    flaw: '등 뒤에서 말을 걸어 모두를 놀라게 함',
    stats: { HP: 82, ATK: 88, DEF: 31, SPD: 78, TEC: 84, SUP: 24 },
    power: 826,
    skill: { name: '무음 처형', effect: '고립 대상에게 강한 치명 피해' },
    requestBonus: '암살/잠입 의뢰 성공률 크게 증가',
    adminBonus: '은밀 작전 보고 누락률 감소',
    commandBonus: '잠입 태그 편성 시 첫 피해량 증가',
    tags: ['그림자', '암살', '잠입', '화력', 'SR운용'],
    equipment: [
      { slot: '무기', icon: 'crossedSwords', name: '밤유리 단검', grade: 'SR +3', effect: '치명 피해 증가' },
      { slot: '방어구', icon: 'helmet', name: '그림자 망토', grade: 'SR +2', effect: '회피 +6%' },
      { slot: '장신구', icon: 'eye', name: '암시야 반지', grade: 'SR +1', effect: '잠입 성공률 +5%' },
      { slot: '보조 장비', icon: 'lock', name: '무음 갈고리', grade: 'SR +1', effect: '침투 보정' }
    ]
  },
  {
    id: 'lizard-guard',
    imageKey: 'lizard_guard',
    grade: 'SR',
    name: '붉은비늘 경비대장 라칸',
    species: '리자드맨',
    position: '전열',
    role: '방패병',
    level: 24,
    maxLevel: 60,
    exp: 2700,
    nextExp: 4800,
    status: '부상',
    hireMethod: 'SR 길드 이적',
    contractDate: '2025-10-01',
    flaw: '문지기 습관 때문에 대화도 검문처럼 시작함',
    stats: { HP: 122, ATK: 46, DEF: 92, SPD: 26, TEC: 38, SUP: 34 },
    power: 752,
    skill: { name: '비늘 방벽', effect: '전열 아군 피해를 크게 완화' },
    requestBonus: '호위/방어 의뢰 생환율 증가',
    adminBonus: '경비 배치 시 사고율 감소',
    commandBonus: '전열 2명 이상 편성 시 DEF 증가',
    tags: ['리자드맨', '방패', '호위', '전열', 'SR운용'],
    equipment: [
      { slot: '무기', icon: 'crossedSwords', name: '수문장 창', grade: 'SR +2', effect: 'DEF 기반 피해' },
      { slot: '방어구', icon: 'helmet', name: '붉은비늘 갑주', grade: 'SR +3', effect: 'DEF +18' },
      { slot: '장신구', icon: 'medicalCross', name: '재생 부적', grade: 'SR +1', effect: '부상률 -4%' },
      { slot: '보조 장비', icon: 'lock', name: '성문 방패', grade: 'SR +2', effect: '호위 보정' }
    ]
  },
  {
    id: 'maren-clerk',
    imageKey: 'maren_clerk',
    grade: 'R',
    name: '서류술사 마렌 대리',
    species: '인간',
    position: '특수',
    role: '행정관',
    level: 11,
    maxLevel: 40,
    exp: 760,
    nextExp: 1600,
    status: '대기 중',
    hireMethod: 'R 내부 추천',
    contractDate: '2025-08-29',
    flaw: '정상적인 서류만 보면 오히려 의심함',
    stats: { HP: 44, ATK: 10, DEF: 18, SPD: 22, TEC: 40, SUP: 58 },
    power: 392,
    skill: { name: '도장 난사', effect: '행정 태그 적에게 혼란 부여' },
    requestBonus: '계약/협상 의뢰 성공률 증가',
    adminBonus: '완료 보고 정산 시간이 감소',
    commandBonus: '특수 포지션 편성 시 보상 누락률 감소',
    tags: ['인간', '행정', '계약', '특수', 'R운용'],
    equipment: [
      { slot: '무기', icon: 'report', name: '붉은 도장', grade: 'R +2', effect: 'TEC +8' },
      { slot: '방어구', icon: 'scroll', name: '서류 방탄복', grade: 'R +1', effect: 'SUP +5' },
      { slot: '장신구', icon: 'contract', name: '계약 끈', grade: 'R +0', effect: '계약 보정' },
      { slot: '보조 장비', icon: 'envelope', name: '분류함', grade: 'R +1', effect: '정산 속도 증가' }
    ]
  }
];

let mercenaryMasterData = fallbackMercenaryRosterData.map(normalizeMercenaryForRoster);
let ownedMercenaryRoster = [];
let mercenaryMasterLoaded = false;
const ownedMercenaryLoadState = {
  loading: false,
  loaded: false,
  unauthorized: false,
  errorMessage: '',
  promise: null
};
let mercenaryCombatRulesLoaded = false;
const mercenaryCombatRules = {
  attackTypes: [],
  skills: [],
  statusEffects: [],
  combatMissions: [],
  enemyTemplates: [],
  encounters: [],
  encounterEnemies: [],
  combatRewards: [],
  combatRules: [],
  combatLogs: [],
  attackTypesById: new Map(),
  skillsById: new Map(),
  statusEffectsById: new Map(),
  enemyTemplatesById: new Map(),
  encountersById: new Map(),
  encounterEnemiesByEncounterId: new Map(),
  combatRewardsByGroupId: new Map(),
  combatRulesById: new Map()
};
const missingCombatRuleWarnings = new Set();
let mercenaryGold = mercenaryLobbyState.gold;
let communityPoints = mercenaryLobbyState.points;
const TREATABLE_MERCENARY_OPERATIONAL_STATUSES = new Set(['injured', 'injured_light', 'injured_heavy', 'treatment_required', 'incapacitated']);
// Keep this table in sync with server LEVEL_STAT_GAIN.
const DETAIL_LEVEL_STAT_GAIN = {
  hp: 3,
  atk: 2,
  def: 2,
  spd: 1,
  tec: 2,
  sup: 2
};

const mercenaryAuthState = {
  checked: false,
  authenticated: false,
  user: null
};

const rosterState = {
  selectedId: '',
  search: '',
  grade: '전체',
  position: '전체',
  status: '전체',
  species: '전체',
  sort: 'power',
  source: 'fallback',
  errorMessage: ''
};

const rosterSortOptions = [
  { value: 'power', label: '전투력 높은 순' },
  { value: 'level', label: '레벨 높은 순' },
  { value: 'grade', label: '등급 높은 순' },
  { value: 'name', label: '이름순' },
  { value: 'status', label: '상태순' },
  { value: 'species', label: '종족순' }
];

const RECRUIT_BOARD_SIZE = 5;
const RECRUIT_REFRESH_COST = 20000;
const RECRUIT_DAILY_REFRESH_LIMIT = 10;
const SQUAD_SLOT_LIMIT = 3;
const SQUAD_MEMBER_LIMIT = 3;
const RECRUIT_GRADE_RATES = [
  { grade: 'N', rate: 69.5 },
  { grade: 'R', rate: 30 },
  { grade: 'SR', rate: 0.5 }
];

const recruitmentState = {
  refreshIndex: 0,
  refreshCount: 0,
  refreshRemaining: RECRUIT_DAILY_REFRESH_LIMIT,
  maxRefresh: RECRUIT_DAILY_REFRESH_LIMIT,
  refreshCost: RECRUIT_REFRESH_COST,
  gold: mercenaryLobbyState.gold,
  gradeRates: RECRUIT_GRADE_RATES.map((item) => ({ ...item })),
  candidates: [],
  hiredCandidateIds: [],
  serverMode: false,
  pendingConfirm: null
};

const squadState = {
  slots: [],
  owned: [],
  selectedSlotIndex: 1,
  draft: null,
  rosterFilters: {
    search: '',
    availability: 'all',
    grade: 'all',
    role: 'all',
    sort: 'workPowerDesc'
  },
  loading: false,
  errorMessage: ''
};

const missionState = {
  missions: [],
  offers: [],
  lockedMissions: [],
  officeGrowth: null,
  board: null,
  squads: [],
  owned: [],
  runs: [],
  selectedMissionId: '',
  selectedOfferId: '',
  selectedLockedMissionId: '',
  selectedSquadId: '',
  activeRunCount: 0,
  maxActiveRuns: 1,
  loading: false,
  errorMessage: ''
};
let missionTimer = null;

const infirmaryState = {
  injured: [],
  treating: [],
  loading: false,
  errorMessage: ''
};
let infirmaryTimer = null;

const officeState = {
  facilities: [],
  availableMercenaries: [],
  assignedMercenaries: [],
  officeEffects: null,
  selectedFacilityKey: 'reception',
  loading: false,
  errorMessage: ''
};

const caseState = {
  cases: [],
  detail: null,
  selectedCaseId: '',
  selectedOwnedIds: [],
  filter: '전체',
  loading: false,
  errorMessage: ''
};
let caseTimer = null;


const inventoryState = {
  entries: [],
  summary: null,
  equipmentBundle: null,
  selectedEntryId: '',
  filters: {
    itemType: 'all',
    slot: 'all',
    grade: 'all',
    q: ''
  },
  loading: false,
  errorMessage: ''
};

const battleOperationState = {
  operations: [],
  baseOperations: [],
  stageGroups: new Map(),
  stageClears: [],
  stageClearLoadState: 'idle',
  selectedBaseMissionId: '',
  operationLoadError: '',
  selectedOperationId: '',
  parties: [],
  selectedPartyId: '',
  selectedEditorPartyId: '',
  selectedSlotKey: 'front_1',
  editorFilters: {
    search: '',
    grade: 'all',
    availableOnly: true
  },
  viewer: {
    operation: null,
    allies: [],
    enemies: [],
    logs: [],
    events: [],
    battleResult: null,
    currentRound: 1,
    currentEventIndex: -1,
    status: 'idle',
    speed: 1,
    paused: false,
    finished: false,
    floating: null,
    timer: null
  }
};

const MERCENARY_BATTLE_DEBUG = false;

/**
 * Client mock battleResult contract v1.
 *
 * battleResult = {
 *   battleId, schemaVersion, source, operationId, operationTitle,
 *   battlefield: { id, name, backgroundImage },
 *   seed, startedAt, endedAt, result, maxRounds, finalRound,
 *   allies: unit[], enemies: unit[],
 *   rounds: [{ round, actions, stateAfterRound }],
 *   rewards, injuries,
 *   summary: { totalAllyDamage, totalEnemyDamage, totalHealing, defeatedAllies, defeatedEnemies }
 * }
 *
 * unit = {
 *   id, sourceId, side, slot, depth, name, grade, level, role, image,
 *   maxHp, initialHp, finalHp, attack, defense, speed, healPower,
 *   critRate, status, tags
 * }
 *
 * action = {
 *   id, order, round, kind, type, attackerId, actorId, attackerSide,
 *   targetId, targetSide, amount, isCritical, beforeHp, afterHp,
 *   targetDefeated, logText, message
 * }
 */
const BATTLE_PARTY_STORAGE_KEY = 'mercenaryBattleParties.v1';
const BATTLE_PARTY_SELECTED_STORAGE_KEY = 'mercenarySelectedBattlePartyId.v1';
const BATTLE_PARTY_MAX_COUNT = 5;
const BATTLE_PARTY_SLOTS = [
  { key: 'front_1', label: '전열 1', row: 'front' },
  { key: 'front_2', label: '전열 2', row: 'front' },
  { key: 'middle_1', label: '중열 1', row: 'middle' },
  { key: 'middle_2', label: '중열 2', row: 'middle' },
  { key: 'back_1', label: '후열 1', row: 'back' }
];

const RECRUIT_STORAGE_KEYS = {
  date: 'mercenaryRecruitRefreshDate',
  count: 'mercenaryRecruitRefreshCount',
  seed: 'mercenaryRecruitBoardSeed'
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeClaimGrowthResult(response = {}) {
  const result = response.result || {};
  const rewards = response.rewards || {};
  const growth = response.growth || {};
  const office = growth.office || response.office || {};
  const mercenaries = Array.isArray(growth.mercenaries)
    ? growth.mercenaries
    : Array.isArray(response.mercenaries)
      ? response.mercenaries
      : Array.isArray(response.members)
        ? response.members
        : [];
  return {
    source: growth.source || response.source || (response.run ? 'mission' : 'battle'),
    alreadyClaimed: Boolean(response.alreadyClaimed),
    gold: Number(growth.gold ?? rewards.gold ?? result.gainedGold ?? response.profile?.gainedGold ?? 0) || 0,
    office: {
      beforeLevel: Number(office.beforeLevel || 1) || 1,
      afterLevel: Number(office.afterLevel ?? office.beforeLevel ?? 1) || 1,
      beforeExp: Number(office.beforeExp || 0) || 0,
      afterExp: Number(office.afterExp || 0) || 0,
      gainedExp: Number(office.gainedExp ?? rewards.officeExp ?? result.gainedOfficeExp ?? 0) || 0,
      requiredExpBefore: Number(office.requiredExpBefore || 0) || 0,
      requiredExpAfter: Number(office.requiredExpAfter ?? office.expToNext ?? 0) || 0,
      levelUps: Number(office.levelUps || 0) || 0,
      isMaxLevel: Boolean(office.isMaxLevel)
    },
    mercenaries,
    injuries: Array.isArray(response.injuries) ? response.injuries : []
  };
}

function formatGrowthExpProgress(currentExp, requiredExp, isMaxLevel = false) {
  if (isMaxLevel) return 'EXP MAX';
  const required = Number(requiredExp || 0) || 0;
  return required > 0
    ? `${formatNumber(currentExp)} / ${formatNumber(required)} EXP`
    : `${formatNumber(currentExp)} EXP`;
}

function renderStatDelta(delta = {}) {
  const rows = DETAIL_STAT_KEYS
    .map((key) => ({ key, value: Number(delta?.[key] || 0) || 0 }))
    .filter((item) => item.value !== 0);
  if (!rows.length) return '<span class="merc-growth-stat-up is-muted">능력치 변화 없음</span>';
  return rows.map(({ key, value }) => `
    <span class="merc-growth-stat-up">${escapeHtml(DETAIL_STAT_LABELS[key] || key)} ${value > 0 ? '+' : ''}${formatNumber(value)}</span>
  `).join('');
}

function renderOfficeExpResult(office = {}) {
  const leveled = Number(office.levelUps || 0) > 0;
  return `
    <article class="merc-growth-office ${leveled ? 'merc-growth-levelup' : ''}">
      <span>사무소 EXP +${formatNumber(office.gainedExp || 0)}</span>
      <strong>${leveled ? `사무소 Lv.${formatNumber(office.beforeLevel)} → Lv.${formatNumber(office.afterLevel)}` : `사무소 Lv.${formatNumber(office.afterLevel || office.beforeLevel || 1)}`}</strong>
      <em>${formatGrowthExpProgress(office.afterExp || 0, office.requiredExpAfter || 0, office.isMaxLevel)}</em>
      ${leveled ? '<p>해금 보상은 후속 단계에서 적용됩니다.</p>' : ''}
    </article>
  `;
}

function renderMercenaryExpResult(mercenaries = []) {
  if (!mercenaries.length) return '';
  return `
    <div class="merc-growth-merc-list">
      ${mercenaries.map((item) => {
        const leveled = Number(item.levelUps || 0) > 0;
        return `
          <article class="merc-growth-merc-card ${leveled ? 'merc-growth-levelup' : ''}">
            <div>
              <span>${escapeHtml(item.grade || '')}</span>
              <strong>${escapeHtml(item.name || item.ownedId || '')}</strong>
              <em>EXP +${formatNumber(item.gainedExp || 0)}</em>
            </div>
            <p>${leveled ? `Lv.${formatNumber(item.beforeLevel || 1)} → Lv.${formatNumber(item.afterLevel || item.beforeLevel || 1)}` : `Lv.${formatNumber(item.afterLevel || item.beforeLevel || 1)} · ${formatGrowthExpProgress(item.afterExp || 0, item.requiredExpAfter || item.expToNext || 0, item.isMaxLevel)}`}</p>
            <div class="merc-growth-stat-delta">${renderStatDelta(item.statDelta || {})}</div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderRewardGrowthSummary(response = {}) {
  const growth = normalizeClaimGrowthResult(response);
  return `
    <section class="merc-growth-summary">
      <div class="merc-growth-head">
        <div><span>골드</span><strong>+${formatNumber(growth.gold)}G</strong></div>
        ${renderOfficeExpResult(growth.office)}
      </div>
      ${renderMercenaryExpResult(growth.mercenaries)}
    </section>
  `;
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function createClientRequestId(prefix = 'mercenary') {
  const cryptoObject = window.crypto || window.msCrypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return `${prefix}:${cryptoObject.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function buildMercenaryActionKey(action, payload = {}) {
  const stablePayload = {
    action,
    id: payload.id || payload.runId || payload.offerId || payload.caseId || payload.treatmentId || payload.assignmentId || payload.squadId || '',
    missionId: payload.missionId || payload.missionCode || '',
    mercenaryId: payload.mercenaryId || payload.ownedMercenaryId || '',
    facilityKey: payload.facilityKey || '',
    slotIndex: payload.slotIndex ?? '',
    stepId: payload.stepId || '',
    ownedMercenaryIds: Array.isArray(payload.ownedMercenaryIds)
      ? payload.ownedMercenaryIds.slice().sort()
      : []
  };
  return JSON.stringify(stablePayload);
}

function isMercenaryActionPending(key) {
  return mercenaryActionLocks.has(key);
}

function lockMercenaryAction(key, button, label = '처리 중...') {
  if (mercenaryActionLocks.has(key)) return false;
  const originalText = button ? button.textContent : '';
  mercenaryActionLocks.set(key, { button, originalText });

  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.dataset.loading = 'true';
    button.textContent = label;
  }

  return true;
}

function unlockMercenaryAction(key) {
  const lock = mercenaryActionLocks.get(key);
  if (!lock) return;
  const { button, originalText } = lock;
  if (button && button.isConnected) {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    delete button.dataset.loading;
    button.textContent = originalText;
  }
  mercenaryActionLocks.delete(key);
}

async function runLockedMercenaryAction({ key, button = null, label = '처리 중...', task }) {
  if (!lockMercenaryAction(key, button, label)) return null;
  try {
    return await task();
  } finally {
    unlockMercenaryAction(key);
  }
}

function readBgmSettings() {
  let enabledRaw = null;
  let volumeRaw = null;
  let modeRaw = null;
  let currentTrackId = '';
  try {
    enabledRaw = localStorage.getItem(MERCENARY_BGM_STORAGE_KEYS.enabled);
    volumeRaw = localStorage.getItem(MERCENARY_BGM_STORAGE_KEYS.volume);
    modeRaw = localStorage.getItem(MERCENARY_BGM_STORAGE_KEYS.mode);
    currentTrackId = localStorage.getItem(MERCENARY_BGM_STORAGE_KEYS.currentTrackId) || '';
  } catch (error) {
    console.warn('[mercenary-bgm] localStorage unavailable:', error);
  }

  const enabled = enabledRaw === null ? true : enabledRaw === 'true';
  const volume = clampNumber(volumeRaw, 0, 1, 0.35);
  const mode = modeRaw === 'sequence' || modeRaw === 'shuffle' ? modeRaw : 'shuffle';
  const hasSavedTrack = MERCENARY_BGM_TRACKS.some((track) => track.id === currentTrackId);

  return {
    enabled,
    volume,
    mode,
    currentTrackId: hasSavedTrack ? currentTrackId : ''
  };
}

function saveBgmSettings() {
  try {
    localStorage.setItem(MERCENARY_BGM_STORAGE_KEYS.enabled, String(Boolean(bgmState.enabled)));
    localStorage.setItem(MERCENARY_BGM_STORAGE_KEYS.volume, String(bgmState.volume));
    localStorage.setItem(MERCENARY_BGM_STORAGE_KEYS.mode, bgmState.mode);
    localStorage.setItem(MERCENARY_BGM_STORAGE_KEYS.currentTrackId, bgmState.currentTrackId || '');
  } catch (error) {
    console.warn('[mercenary-bgm] failed to save settings:', error);
  }
}

function getAvailableBgmTracks() {
  return MERCENARY_BGM_TRACKS.filter((track) => (
    track
    && track.id
    && track.src
    && !bgmState.failedTrackIds.has(track.id)
  ));
}

function buildShuffleQueue() {
  const tracks = getAvailableBgmTracks();
  if (tracks.length <= 1) {
    bgmState.shuffleQueue = tracks.map((track) => track.id);
    return;
  }

  const ids = tracks.map((track) => track.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
  }

  if (ids[0] === bgmState.currentTrackId && ids.length > 1) {
    [ids[0], ids[1]] = [ids[1], ids[0]];
  }

  bgmState.shuffleQueue = ids;
}

function getNextBgmTrack() {
  const tracks = getAvailableBgmTracks();
  if (!tracks.length) return null;

  if (bgmState.mode === 'sequence') {
    const currentIndex = tracks.findIndex((track) => track.id === bgmState.currentTrackId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % tracks.length : 0;
    return tracks[nextIndex];
  }

  if (!bgmState.shuffleQueue.length) {
    buildShuffleQueue();
  }

  const nextId = bgmState.shuffleQueue.shift();
  return tracks.find((track) => track.id === nextId) || tracks[0] || null;
}

function updateBgmCurrentTrackLabel() {
  const currentTrackLabel = document.querySelector('[data-setting="bgm-current-track"]');
  if (!currentTrackLabel) return;
  const track = MERCENARY_BGM_TRACKS.find((item) => item.id === bgmState.currentTrackId);
  currentTrackLabel.textContent = `현재 재생 중인 곡: ${track ? track.title : '-'}`;
}

function getMercenaryBgmAudio() {
  if (bgmState.audio) return bgmState.audio;
  if (typeof Audio === 'undefined') return null;

  const audio = new Audio();
  audio.loop = false;
  audio.preload = 'auto';
  audio.volume = bgmState.volume;

  audio.addEventListener('ended', () => {
    if (!bgmState.enabled) return;
    const nextTrack = getNextBgmTrack();
    if (nextTrack) playBgmTrack(nextTrack);
  });

  audio.addEventListener('error', () => {
    const failedId = bgmState.currentTrackId;
    if (failedId) bgmState.failedTrackIds.add(failedId);
    console.warn('[mercenary-bgm] failed to load track:', failedId);

    if (!bgmState.enabled) return;
    const nextTrack = getNextBgmTrack();
    if (nextTrack) playBgmTrack(nextTrack);
  });

  bgmState.audio = audio;
  return audio;
}

function canPlayMercenaryBgm() {
  const audioSettings = window.MercenaryAudio;
  if (audioSettings?.isMuted?.() || audioSettings?.isBgmMuted?.()) return false;
  return Boolean(bgmState.enabled);
}

function getMercenaryBgmPlaybackVolume() {
  const audioSettings = window.MercenaryAudio?.getAudioSettings?.() || {};
  if (window.MercenaryAudio?.isMuted?.() || window.MercenaryAudio?.isBgmMuted?.()) return 0;
  return bgmState.volume * clampNumber(audioSettings.masterVolume ?? 1, 0, 1, 1);
}

function applyMercenaryBgmPlaybackVolume() {
  if (bgmState.audio) bgmState.audio.volume = getMercenaryBgmPlaybackVolume();
}

function loadBgmTrack(track) {
  const audio = getMercenaryBgmAudio();
  if (!audio || !track || !track.src) return null;
  bgmState.currentTrackId = track.id;
  bgmState.currentTrackIndex = MERCENARY_BGM_TRACKS.findIndex((item) => item.id === track.id);
  audio.src = track.src;
  audio.volume = getMercenaryBgmPlaybackVolume();
  saveBgmSettings();
  updateBgmCurrentTrackLabel();
  return audio;
}

function playBgmTrack(track) {
  if (!track || !track.src || !canPlayMercenaryBgm()) return;
  const audio = loadBgmTrack(track);
  if (!audio) return;

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Browser autoplay blocking is expected until the first user gesture.
    });
  }
}

function playMercenaryBgmSafely() {
  if (!canPlayMercenaryBgm() || !MERCENARY_BGM_TRACKS.length) return;
  const tracks = getAvailableBgmTracks();
  if (!tracks.length) return;

  const currentTrack = tracks.find((track) => track.id === bgmState.currentTrackId)
    || getNextBgmTrack()
    || tracks[0];
  playBgmTrack(currentTrack);
}

function pauseMercenaryBgm() {
  if (bgmState.audio) {
    bgmState.audio.pause();
  }
}

function pauseMercenaryBgmForBattle() {
  bgmState.pausedForBattle = Boolean(bgmState.enabled && bgmState.audio && !bgmState.audio.paused);
  pauseMercenaryBgm();
}

function resumeMercenaryBgmAfterBattle() {
  if (!bgmState.enabled) return;
  if (!bgmState.pausedForBattle && !bgmState.unlocked) return;
  bgmState.pausedForBattle = false;
  playMercenaryBgmSafely();
}

function unlockMercenaryBgmOnUserGesture() {
  if (bgmState.unlocked) return;
  bgmState.unlocked = true;
  if (canPlayMercenaryBgm()) playMercenaryBgmSafely();
}

function bindBgmUnlockEvents() {
  const pointerOptions = { once: true, passive: true };
  document.addEventListener('pointerdown', unlockMercenaryBgmOnUserGesture, pointerOptions);
  document.addEventListener('click', unlockMercenaryBgmOnUserGesture, pointerOptions);
  document.addEventListener('keydown', unlockMercenaryBgmOnUserGesture, { once: true });
}

function setMercenaryBgmEnabled(enabled) {
  bgmState.enabled = Boolean(enabled);
  saveBgmSettings();
  window.MercenaryAudio?.setBgmMuted?.(!bgmState.enabled);

  if (bgmState.enabled) {
    bgmState.unlocked = true;
    playMercenaryBgmSafely();
  } else {
    pauseMercenaryBgm();
  }
}

function setMercenaryBgmVolume(volume) {
  const nextVolume = clampNumber(volume, 0, 1, 0);
  bgmState.volume = nextVolume;
  if (bgmState.audio) {
    bgmState.audio.volume = getMercenaryBgmPlaybackVolume();
  }
  saveBgmSettings();
  window.MercenaryAudio?.setBgmVolume?.(nextVolume);
}

function setMercenaryBgmMode(mode) {
  bgmState.mode = mode === 'sequence' ? 'sequence' : 'shuffle';
  bgmState.shuffleQueue = [];
  saveBgmSettings();
}

function initMercenaryBgm() {
  if (bgmState.initialized) return;
  bgmState.initialized = true;

  const settings = readBgmSettings();
  bgmState.enabled = settings.enabled;
  bgmState.volume = settings.volume;
  bgmState.mode = settings.mode;
  bgmState.currentTrackId = settings.currentTrackId;

  getMercenaryBgmAudio();
  bindBgmUnlockEvents();

  document.addEventListener('visibilitychange', () => {
    if (!bgmState.audio) return;
    if (document.hidden) {
      bgmState.audio.pause();
      return;
    }
    if (bgmState.enabled) playMercenaryBgmSafely();
  });

  if (bgmState.enabled) {
    playMercenaryBgmSafely();
  }
}

function iconUrl(key) {
  return `${iconBasePath}${mercenaryIcons[key] || mercenaryIcons.scroll}`;
}

function renderIcon(key, size = '') {
  const className = ['merc-ui-icon', size].filter(Boolean).join(' ');
  return `<img class="${className}" src="${iconUrl(key)}" alt="" loading="lazy" />`;
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

function deterministicStatus(id) {
  const roll = deterministicNumber(id, 1, 100, 'status');
  if (roll <= 68) return '대기 중';
  if (roll <= 84) return '임무 중';
  if (roll <= 94) return '부상';
  return '치료 중';
}

function splitSkill(value) {
  const text = String(value || '').trim();
  if (!text) return { name: '전투 기술 미등록', effect: '시트에 전투 스킬 설명이 아직 없습니다.' };
  const separatorIndex = text.indexOf(':');
  if (separatorIndex < 0) return { name: text, effect: '상세 효과는 추후 정리 예정입니다.' };
  return {
    name: text.slice(0, separatorIndex).trim() || '전투 기술',
    effect: text.slice(separatorIndex + 1).trim() || '상세 효과는 추후 정리 예정입니다.'
  };
}

function makeDummyEquipment(mercenary) {
  const gradePrefix = mercenary.grade || 'N';
  const quality = { N: '+0', R: '+1', SR: '+2', SSR: '+3', EX: '+4' }[gradePrefix] || '+0';
  const positionName = mercenary.position || '특수';
  const weaponName = {
    전열: '전선용 검',
    화력: '집중 화기',
    지원: '보조 지팡이',
    특수: '현장 도구'
  }[positionName] || '보급 장비';

  return [
    { slot: '무기', icon: 'crossedSwords', name: `${gradePrefix} ${weaponName}`, grade: `${gradePrefix} ${quality}`, effect: '기준 전투력 보정' },
    { slot: '방어구', icon: 'helmet', name: `${gradePrefix} 사무소 갑주`, grade: `${gradePrefix} ${quality}`, effect: '생존 보정' },
    { slot: '장신구', icon: 'rumor', name: `${gradePrefix} 계약 부적`, grade: `${gradePrefix} ${quality}`, effect: '의뢰 보너스 보조' },
    { slot: '보조 장비', icon: 'medicalBag', name: `${positionName} 보조 장비`, grade: `${gradePrefix} ${quality}`, effect: `${positionName} 편성 보정` }
  ];
}

function getRecruitCost(mercenary) {
  if (Number.isFinite(Number(mercenary.recruitCost))) return Number(mercenary.recruitCost);
  const ranges = {
    N: [1000, 5000],
    R: [7000, 25000],
    SR: [60000, 150000]
  };
  const [min, max] = ranges[mercenary.grade] || ranges.N;
  const raw = deterministicNumber(mercenary.id, min, max, 'recruit-cost');
  return Math.round(raw / 100) * 100;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readRecruitmentStorage() {
  const today = getTodayKey();
  let savedDate = '';
  let savedCount = 0;

  try {
    savedDate = localStorage.getItem(RECRUIT_STORAGE_KEYS.date) || '';
    savedCount = Number(localStorage.getItem(RECRUIT_STORAGE_KEYS.count) || 0) || 0;
  } catch (error) {
    savedDate = '';
    savedCount = 0;
  }

  if (savedDate !== today) {
    savedCount = 0;
    writeRecruitmentStorage(savedCount);
  }

  recruitmentState.refreshCount = Math.min(Math.max(savedCount, 0), RECRUIT_DAILY_REFRESH_LIMIT);
  recruitmentState.refreshIndex = recruitmentState.refreshCount;
  recruitmentState.refreshRemaining = Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - recruitmentState.refreshCount);
}

function writeRecruitmentStorage(count) {
  const today = getTodayKey();
  try {
    localStorage.setItem(RECRUIT_STORAGE_KEYS.date, today);
    localStorage.setItem(RECRUIT_STORAGE_KEYS.count, String(count));
    localStorage.setItem(RECRUIT_STORAGE_KEYS.seed, `${today}:${count}`);
  } catch (error) {
    // localStorage is a convenience for 0.1 dummy state. Ignore quota/private-mode failures.
  }
}

function normalizeStats(item) {
  const baseStats = item.effectiveStats || item.baseStats || {};
  const oldStats = item.stats || {};
  return {
    HP: Number(baseStats.hp ?? oldStats.HP ?? 0) || 0,
    ATK: Number(baseStats.atk ?? oldStats.ATK ?? 0) || 0,
    DEF: Number(baseStats.def ?? oldStats.DEF ?? 0) || 0,
    SPD: Number(baseStats.spd ?? oldStats.SPD ?? 0) || 0,
    TEC: Number(baseStats.tec ?? oldStats.TEC ?? 0) || 0,
    SUP: Number(baseStats.sup ?? oldStats.SUP ?? 0) || 0
  };
}

function normalizeLowerStats(value = {}) {
  return {
    hp: Number(value.hp ?? value.HP ?? 0) || 0,
    atk: Number(value.atk ?? value.ATK ?? 0) || 0,
    def: Number(value.def ?? value.DEF ?? 0) || 0,
    spd: Number(value.spd ?? value.SPD ?? 0) || 0,
    tec: Number(value.tec ?? value.TEC ?? 0) || 0,
    sup: Number(value.sup ?? value.SUP ?? 0) || 0,
    combatPower: Number(value.combatPower ?? value.power ?? 0) || 0
  };
}

function pickMercenaryField(item, ...keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function normalizeArrayField(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRateField(value) {
  if (typeof value === 'number') return value;
  const text = String(value || '').replace(/,/g, '').trim();
  if (!text) return 0;
  if (text.endsWith('%')) return (Number(text.slice(0, -1)) || 0) / 100;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
}

function normalizeMercenaryForRoster(item) {
  const id = String(item.id || '').trim();
  const ownedId = item.ownedId !== undefined ? String(item.ownedId) : '';
  const maxLevel = Number(item.maxLevel || 20) || 20;
  const level = Math.max(1, Number(item.currentLevel ?? item.current_level ?? item.level ?? 1) || 1);
  const exp = Math.max(0, Number(item.currentExp ?? item.current_exp ?? item.exp ?? 0) || 0);
  const isMaxLevel = Boolean(item.isMaxLevel || level >= maxLevel);
  const expToNext = isMaxLevel ? 0 : Math.max(0, Number(item.expToNext ?? item.nextExp ?? Math.max(100, maxLevel * 40)) || 0);
  const expProgress = isMaxLevel
    ? 1
    : Math.max(0, Math.min(1, Number(item.expProgress ?? (expToNext > 0 ? exp / expToNext : 0)) || 0));
  const combatSkill = item.combatSkill || (item.skill ? `${item.skill.name}: ${item.skill.effect}` : '');
  const equipmentBonus = item.equipmentBonus || item.statBreakdown?.equipmentBonus || {};
  const equipmentSlots = item.equipmentSlots && typeof item.equipmentSlots === 'object' ? item.equipmentSlots : {};
  const equippedItems = Array.isArray(item.equippedItems) ? item.equippedItems : [];
  const equipmentCombatPower = Number(item.equipmentCombatPower ?? equipmentBonus.combatPower ?? 0) || 0;
  const totalCombatPower = Number(item.totalCombatPower ?? item.displayCombatPower ?? item.combatPower ?? item.power ?? 0) || 0;
  const baseCombatPowerWithoutEquipment = Number(
    item.baseCombatPowerWithoutEquipment
    ?? item.baseCombatPowerNoEquipment
    ?? item.baseCombatPower
    ?? (totalCombatPower > 0 ? Math.max(0, totalCombatPower - equipmentCombatPower) : 0)
    ?? 0
  ) || 0;
  const normalized = {
    id,
    ownedId,
    rosterId: ownedId || id,
    imageKey: String(item.imageKey || item.illustrationFileName || '').replace(/\.png$/i, '').trim(),
    grade: String(item.grade || 'N').trim(),
    name: String(item.name || '이름 없는 용병').trim(),
    species: String(item.species || '미상').trim(),
    job: String(item.job || item.role || '미분류').trim(),
    role: String(item.role || item.job || '미분류').trim(),
    position: String(item.position || '특수').trim(),
    level,
    currentLevel: level,
    maxLevel,
    exp,
    currentExp: exp,
    expToNext,
    expProgress,
    isMaxLevel,
    nextExp: expToNext,
    operationalStatus: item.operationalStatus || 'idle',
    statusLabel: item.statusLabel || item.status || deterministicStatus(id),
    status: item.statusLabel || item.status || deterministicStatus(id),
    available: item.available !== undefined ? Boolean(item.available) : (item.operationalStatus || 'idle') === 'idle',
    currentActivityType: item.currentActivityType || '',
    currentActivityId: item.currentActivityId || '',
    hireMethod: item.obtainMethod || item.hireMethod || '마스터 데이터',
    contractDate: item.contractDate || `2025-${String(deterministicNumber(id, 1, 12, 'month')).padStart(2, '0')}-${String(deterministicNumber(id, 1, 28, 'day')).padStart(2, '0')}`,
    flaw: item.memo || item.flaw || '특이사항 없음',
    baseStats: normalizeLowerStats(item.statBreakdown?.baseStats || item.baseStats || item.stats),
    currentStats: item.currentStats ? normalizeLowerStats(item.currentStats) : item.statBreakdown?.currentStats ? normalizeLowerStats(item.statBreakdown.currentStats) : null,
    effectiveStats: normalizeLowerStats(item.effectiveStats || item.currentStats || item.baseStats || item.stats),
    statBreakdown: item.statBreakdown || null,
    stats: normalizeStats(item),
    workPower: Number(item.workPower || 0) || 0,
    baseCombatPower: baseCombatPowerWithoutEquipment,
    baseCombatPowerWithoutEquipment,
    equipmentCombatPower,
    totalCombatPower: totalCombatPower || baseCombatPowerWithoutEquipment + equipmentCombatPower,
    displayCombatPower: totalCombatPower || baseCombatPowerWithoutEquipment + equipmentCombatPower,
    combatPower: totalCombatPower || baseCombatPowerWithoutEquipment + equipmentCombatPower,
    power: totalCombatPower || baseCombatPowerWithoutEquipment + equipmentCombatPower,
    equipmentBonus,
    equipmentSlots,
    equippedItems,
    skill: splitSkill(combatSkill),
    requestBonus: item.missionBonus || item.requestBonus || '의뢰 보너스 미등록',
    adminBonus: item.adminBonus || '행정 보너스 미등록',
    commandBonus: item.commandBonus || '지휘/편성 보너스 미등록',
    tags: Array.isArray(item.tags) ? item.tags : [],
    combatRole: String(pickMercenaryField(item, 'combatRole', 'combat_role')).trim(),
    recommendedSlot: String(pickMercenaryField(item, 'recommendedSlot', 'recommended_slot')).trim(),
    basicAttackId: String(pickMercenaryField(item, 'basicAttackId', 'basic_attack_id')).trim(),
    attackType: String(pickMercenaryField(item, 'attackType', 'attack_type')).trim(),
    combatTags: normalizeArrayField(pickMercenaryField(item, 'combatTags', 'combat_tags')),
    evasionRate: normalizeRateField(pickMercenaryField(item, 'evasionRate', 'evasion_rate')),
    accuracyRate: normalizeRateField(pickMercenaryField(item, 'accuracyRate', 'accuracy_rate')),
    critRate: normalizeRateField(pickMercenaryField(item, 'critRate', 'crit_rate')),
    healPower: Number(pickMercenaryField(item, 'healPower', 'heal_power')) || 0,
    missionTags: normalizeArrayField(pickMercenaryField(item, 'missionTags', 'mission_tags')),
    missionWeakTags: normalizeArrayField(pickMercenaryField(item, 'missionWeakTags', 'mission_weak_tags')),
    adminPower: Number(pickMercenaryField(item, 'adminPower', 'admin_power')) || 0,
    adminTags: normalizeArrayField(pickMercenaryField(item, 'adminTags', 'admin_tags')),
    formationTags: normalizeArrayField(pickMercenaryField(item, 'formationTags', 'formation_tags')),
    attackFormulaHint: String(pickMercenaryField(item, 'attackFormulaHint', 'attack_formula_hint')).trim(),
    activeSkillId: String(pickMercenaryField(item, 'activeSkillId', 'active_skill_id')).trim(),
    passiveSkillId: String(pickMercenaryField(item, 'passiveSkillId', 'passive_skill_id')).trim(),
    skillTags: normalizeArrayField(pickMercenaryField(item, 'skillTags', 'skill_tags')),
    dedicatedIllustration: Boolean(item.dedicatedIllustration),
    illustrationStatus: item.illustrationStatus || '',
    reviewStatus: item.reviewStatus || '',
    needsRegeneration: Boolean(item.needsRegeneration),
    extraNote: item.extraNote || ''
  };
  if (item.recruitCost !== undefined) normalized.recruitCost = Number(item.recruitCost) || 0;
  if (item.hired !== undefined) normalized.hired = Boolean(item.hired);
  if (item.locked !== undefined) normalized.locked = Boolean(item.locked);
  if (item.isLocked !== undefined) normalized.locked = Boolean(item.isLocked);
  if (item.treatmentCostGold !== undefined) normalized.treatmentCostGold = Number(item.treatmentCostGold) || 0;
  if (item.treatmentDurationSeconds !== undefined) normalized.treatmentDurationSeconds = Number(item.treatmentDurationSeconds) || 0;
  normalized.isLocked = Boolean(normalized.locked);
  normalized.equipment = equippedItems.length
    ? equippedItems.map((slot) => ({
      slot: getEquipmentSlotLabel(slot.slot),
      name: slot.name || slot.equipment?.name || slot.item?.name || slot.itemId || '',
      grade: slot.grade || slot.equipment?.grade || '',
      effect: formatEquipmentSummary(slot.equipment || slot),
      icon: getEquipmentSlotIcon(slot.slot),
      rawSlot: slot
    }))
    : makeDummyEquipment(normalized);
  return normalized;
}

async function loadMercenaryMasterData() {
  if (mercenaryMasterLoaded) return mercenaryMasterData;
  try {
    const loader = window.MercenaryDataLoader;
    if (!loader?.loadMercenaryMasterData) throw new Error('Mercenary data loader is not available.');
    const rows = await loader.loadMercenaryMasterData();
    const normalized = rows.map(normalizeMercenaryForRoster).filter((item) => item.id && item.grade);
    if (!normalized.length) throw new Error('Loaded mercenary master data is empty.');
    mercenaryMasterData = normalized;
    mercenaryMasterLoaded = true;
  } catch (error) {
    console.warn('[mercenary] using fallback master data', error);
    mercenaryMasterData = fallbackMercenaryRosterData.map(normalizeMercenaryForRoster);
    mercenaryMasterLoaded = true;
    showReadyNotice('용병 마스터 데이터 로드 실패: 채용 게시판 후보용 fallback 데이터를 사용합니다.');
  }
  return mercenaryMasterData;
}

function buildRuleMap(items, ...keys) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    for (const key of keys) {
      const id = String(item?.[key] || '').trim();
      if (id) map.set(id, item);
    }
  });
  return map;
}

function buildGroupedRuleMap(items, keyName) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = String(item?.[keyName] || '').trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

function normalizeCombatPositionKey(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'front' || text === '전열') return 'front';
  if (text === 'middle' || text === 'mid' || text === '중열') return 'middle';
  if (text === 'back' || text === 'rear' || text === '후열') return 'back';
  return text;
}

function parseEncounterEnemyComposition(composition = '', encounter = {}) {
  return String(composition || '')
    .split(',')
    .map((item, index) => {
      const [enemyId, countText] = item.split(':').map((part) => part.trim());
      if (!enemyId) return null;
      return {
        encounterId: encounter.encounterId || encounter.id || '',
        enabled: true,
        slot: `composition_${index + 1}`,
        order: index + 1,
        enemyId,
        count: Math.max(1, Number(countText || 1) || 1),
        enemyLevel: Number(encounter.enemyLevel || 1) || 1,
        positionKey: ''
      };
    })
    .filter(Boolean);
}

function getCombatRewardPreview(rewardGroupId) {
  const rows = mercenaryCombatRules.combatRewardsByGroupId.get(String(rewardGroupId || '').trim()) || [];
  return rows
    .filter((reward) => reward?.enabled !== false)
    .map((reward) => {
      const type = String(reward.rewardType || '').trim();
      const gold = Number(reward.gold || 0) || 0;
      const officeExp = Number(reward.officeExp || 0) || 0;
      const mercExp = Number(reward.mercExp || reward.mercenaryExp || 0) || 0;
      const resultText = reward.resultText || '';
      return {
        type,
        label: type === 'gold' ? '골드' : resultText || type || '보상',
        amount: gold || officeExp || mercExp || 0,
        gold,
        officeExp,
        mercExp,
        resultText,
        iconKey: reward.iconKey || '',
        previewOnly: type !== 'gold'
      };
    });
}

function resolveKnownSkillId(skillId) {
  const safeId = String(skillId || '').trim();
  if (!safeId) return '';
  if (mercenaryCombatRules.skillsById.has(safeId)) return safeId;
  console.debug?.('[mercenary/battle] enemy action skill fallback:', safeId);
  return '';
}

function resolveKnownBasicAttackId(basicAttackId) {
  const safeId = String(basicAttackId || '').trim();
  if (safeId && mercenaryCombatRules.attackTypesById.has(safeId)) return safeId;
  if (mercenaryCombatRules.attackTypesById.has('normal_strike')) return 'normal_strike';
  return safeId || 'normal_strike';
}

function resolveBattleBackgroundPath(backgroundKey = '', explicitPath = '') {
  const safePath = String(explicitPath || '').trim();
  if (safePath) return safePath.replace('/assets/mercenary/battle/backgrounds/', '/assets/mercenary/battle/battlefields/');
  const safeKey = String(backgroundKey || '').trim();
  return safeKey ? `/assets/mercenary/battle/battlefields/${safeKey}.png` : '';
}

function getBattlefieldBackgroundImage(battlefield = {}, operation = {}) {
  return battlefield?.backgroundImage ||
    battlefield?.backgroundUrl ||
    battlefield?.imagePath ||
    battlefield?.backgroundPath ||
    battlefield?.path ||
    operation?.battlefieldImage ||
    operation?.backgroundImage ||
    operation?.backgroundUrl ||
    operation?.imagePath ||
    operation?.backgroundPath ||
    operation?.path ||
    '';
}

function getStageStatMultiplier(modifiers, key) {
  const value = Number(modifiers?.[`${key}Multiplier`] || 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function applyStageEnemyStat(baseValue, modifiers, key, fallback = 0) {
  const value = Number(baseValue ?? fallback) || fallback;
  return Math.max(0, Math.round(value * getStageStatMultiplier(modifiers, key)));
}

function buildBattleEnemiesFromEncounter(encounter) {
  const encounterId = String(encounter?.encounterId || encounter?.id || '').trim();
  const explicitRows = (mercenaryCombatRules.encounterEnemiesByEncounterId.get(encounterId) || [])
    .filter((row) => row?.enabled !== false)
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  const rows = explicitRows.length ? explicitRows : parseEncounterEnemyComposition(encounter?.enemyComposition, encounter);
  const enemies = [];
  rows.forEach((row) => {
    const template = mercenaryCombatRules.enemyTemplatesById.get(String(row.enemyId || '').trim());
    if (!template) return;
    const count = Math.max(1, Number(row.count || row.enemyCount || 1) || 1);
    for (let index = 0; index < count; index += 1) {
      const baseStats = template.baseStats || {};
      const enemyLevel = Number(row.enemyLevel || encounter?.enemyLevel || template.level || 1) || 1;
      const stageModifiers = row.stageModifiers || encounter?.stageModifiers || null;
      const positionKey = normalizeCombatPositionKey(row.positionKey || template.positionKey || template.position);
      const activeSkillId = String(template.actionSkillId || template.skillId || '').trim();
      const basicAttackId = resolveKnownBasicAttackId(template.basicAttackId || 'normal_strike');
      enemies.push({
        id: `${encounterId}_${row.slot || row.enemyId}_${index + 1}`,
        sourceEnemyId: template.enemyId || template.id || row.enemyId,
        name: template.name || row.enemyId,
        role: row.role || template.role || '',
        element: Array.isArray(template.tags) ? template.tags[0] || '' : '',
        tags: Array.isArray(template.tags) ? template.tags : [],
        level: enemyLevel,
        hp: Math.max(1, applyStageEnemyStat(baseStats.hp || template.hp || 1, stageModifiers, 'hp', 1)),
        maxHp: Math.max(1, applyStageEnemyStat(baseStats.hp || template.hp || 1, stageModifiers, 'hp', 1)),
        attack: Math.max(1, applyStageEnemyStat(baseStats.atk || template.atk || 1, stageModifiers, 'atk', 1)),
        defense: applyStageEnemyStat(baseStats.def || template.def || 0, stageModifiers, 'def', 0),
        speed: Math.max(1, applyStageEnemyStat(baseStats.spd || template.spd || 1, stageModifiers, 'spd', 1)),
        tec: applyStageEnemyStat(baseStats.tec || template.tec || 0, stageModifiers, 'tec', 0),
        support: applyStageEnemyStat(baseStats.sup || template.sup || 0, stageModifiers, 'sup', 0),
        stageModifiers,
        image: template.imagePath || template.image || '',
        imageKey: template.imageKey || '',
        positionKey,
        enemySlot: row.slot || '',
        isBoss: Boolean(row.isBoss),
        basicAttackId,
        missingBasicAttackId: basicAttackId !== String(template.basicAttackId || '').trim() ? String(template.basicAttackId || '').trim() : '',
        activeSkillId: resolveKnownSkillId(activeSkillId),
        missingActiveSkillId: activeSkillId && !mercenaryCombatRules.skillsById.has(activeSkillId) ? activeSkillId : '',
        passiveSkillId: ''
      });
    }
  });
  return enemies;
}

function buildBattleOperationFromCombatMission(mission) {
  const encounter = mercenaryCombatRules.encountersById.get(String(mission?.encounterId || '').trim()) || null;
  const rewardGroupId = mission?.rewardGroupId || encounter?.rewardGroupId || '';
  const enemies = encounter ? buildBattleEnemiesFromEncounter(encounter) : [];
  const backgroundKey = encounter?.backgroundKey || mission?.battlefieldPreviewKey || mission?.backgroundKey || '';
  const backgroundPath = resolveBattleBackgroundPath(backgroundKey, encounter?.backgroundPath || mission?.backgroundPath || '');
  const battlefieldName = encounter?.backgroundLabel || mission?.battlefieldLabel || mission?.battlefieldPreviewKey || '전장';
  const battlefield = {
    key: backgroundKey,
    backgroundKey,
    imageKey: backgroundKey,
    path: backgroundPath,
    imagePath: backgroundPath,
    backgroundPath,
    backgroundImage: backgroundPath,
    backgroundUrl: backgroundPath,
    label: battlefieldName,
    name: battlefieldName,
    stageTint: encounter?.stageTint || '',
    weatherEffect: encounter?.weatherEffect || '',
    cameraLayout: encounter?.cameraLayout || 'front_stage',
    battleBgmKey: encounter?.battleBgmKey || ''
  };
  return {
    id: String(mission?.operationId || mission?.missionId || mission?.id || '').trim(),
    missionId: mission?.missionId || mission?.id || '',
    source: 'sheet_combat_mission',
    isStageMission: Boolean(mission?.isStageMission || mission?.stageId || mission?.baseMissionId),
    stageId: mission?.stageId || '',
    baseMissionId: mission?.baseMissionId || '',
    stageNumber: mission?.stageNumber || '',
    stageTier: mission?.stageTier || mission?.difficultyTier || '',
    unlockCondition: mission?.unlockCondition || '',
    generatedMissionId: mission?.generatedMissionId || mission?.missionId || mission?.id || '',
    generatedEncounterId: mission?.generatedEncounterId || encounter?.encounterId || mission?.encounterId || '',
    generatedRewardGroupId: mission?.generatedRewardGroupId || rewardGroupId,
    title: mission?.title || encounter?.title || '전투 작전',
    danger: mission?.danger || encounter?.danger || '',
    battlefield: battlefieldName,
    battlefieldInfo: battlefield,
    battlefieldImage: backgroundPath,
    backgroundImage: backgroundPath,
    backgroundUrl: backgroundPath,
    imagePath: backgroundPath,
    backgroundPath,
    backgroundKey,
    enemyFormation: encounter?.cameraLayout || '',
    recommendedPower: Number(mission?.recommendedPower || 0) || 1,
    requiredOfficeLevel: Number(mission?.requiredOfficeLevel || 1) || 1,
    minPartySize: Number(mission?.minPartySize || 1) || 1,
    maxPartySize: Number(mission?.maxPartySize || 5) || 5,
    status: mission?.enabled === false ? '잠김' : '개방',
    description: mission?.description || mission?.displayText || encounter?.introText || '',
    victoryCondition: encounter?.victoryText || mission?.successText || '적 제압',
    defeatCondition: encounter?.defeatText || mission?.failureText || '아군 전원 전투불능',
    injuryRisk: mission?.injuryProfile || `${Number(mission?.injuryRiskPercent || 0) || 0}%`,
    encounterId: encounter?.encounterId || mission?.encounterId || '',
    rewardGroupId,
    combatRuleId: encounter?.battleRuleId || '',
    rewards: getCombatRewardPreview(rewardGroupId),
    enemies
  };
}

function getBattleStageSortValue(operation) {
  const raw = String(operation?.stageNumber || '').trim().toUpperCase();
  if (raw === 'EX') return 999;
  const parsed = Number(raw || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rebuildBattleStageGroups() {
  const operations = battleOperationState.operations || [];
  const baseOperations = operations.filter((operation) => !operation.isStageMission);
  const groups = new Map();
  baseOperations.forEach((base) => groups.set(base.id, { base, stages: [] }));
  operations.filter((operation) => operation.isStageMission).forEach((stage) => {
    const baseId = stage.baseMissionId || stage.missionId;
    if (!groups.has(baseId)) {
      groups.set(baseId, { base: stage, stages: [] });
    }
    groups.get(baseId).stages.push(stage);
  });
  groups.forEach((group) => {
    group.stages.sort((left, right) => getBattleStageSortValue(left) - getBattleStageSortValue(right));
  });
  battleOperationState.baseOperations = [...groups.values()].map((group) => group.base);
  battleOperationState.stageGroups = groups;
}

function getSelectedBattleBaseId() {
  const selected = selectedBattleOperation();
  return selected?.baseMissionId || selected?.id || battleOperationState.selectedBaseMissionId || '';
}

function getStageGroup(baseId = getSelectedBattleBaseId()) {
  return battleOperationState.stageGroups.get(baseId) || null;
}

function applyCombatMissionOperations() {
  const sheetOperations = (mercenaryCombatRules.combatMissions || [])
    .filter((mission) => mission?.enabled !== false)
    .map(buildBattleOperationFromCombatMission)
    .filter((operation) => operation.id && operation.enemies.length);
  if (!sheetOperations.length) {
    battleOperationState.operations = [];
    battleOperationState.baseOperations = [];
    battleOperationState.stageGroups = new Map();
    battleOperationState.selectedOperationId = '';
    battleOperationState.selectedBaseMissionId = '';
    battleOperationState.operationLoadError = '전투 의뢰 데이터를 불러오지 못했습니다.';
    return;
  }
  battleOperationState.operationLoadError = '';
  battleOperationState.operations = sheetOperations;
  rebuildBattleStageGroups();
  const current = battleOperationState.operations.find((item) => item.id === battleOperationState.selectedOperationId);
  const firstBase = battleOperationState.baseOperations[0];
  const currentBaseId = current?.baseMissionId || current?.id || battleOperationState.selectedBaseMissionId || firstBase?.id || '';
  battleOperationState.selectedBaseMissionId = currentBaseId;
  const group = getStageGroup(currentBaseId);
  const fallbackStage = group?.stages?.[0] || group?.base || firstBase || battleOperationState.operations[0];
  if (!current || (current.isStageMission && current.baseMissionId !== currentBaseId)) {
    battleOperationState.selectedOperationId = fallbackStage?.id || '';
  } else if (!current.isStageMission && group?.stages?.length) {
    battleOperationState.selectedOperationId = group.stages[0].id;
  }
}

async function loadMercenaryCombatRuleData() {
  if (mercenaryCombatRulesLoaded) return mercenaryCombatRules;
  try {
    const loader = window.MercenaryDataLoader;
    if (!loader?.loadMercenaryCombatRuleData) throw new Error('Mercenary combat rule loader is not available.');
    const payload = await loader.loadMercenaryCombatRuleData();
    mercenaryCombatRules.attackTypes = Array.isArray(payload.attackTypes) ? payload.attackTypes : [];
    mercenaryCombatRules.skills = Array.isArray(payload.skills) ? payload.skills : [];
    mercenaryCombatRules.statusEffects = Array.isArray(payload.statusEffects) ? payload.statusEffects : [];
    mercenaryCombatRules.combatMissions = Array.isArray(payload.combatMissions) ? payload.combatMissions : [];
    mercenaryCombatRules.enemyTemplates = Array.isArray(payload.enemyTemplates) ? payload.enemyTemplates : [];
    mercenaryCombatRules.encounters = Array.isArray(payload.encounters) ? payload.encounters : [];
    mercenaryCombatRules.encounterEnemies = Array.isArray(payload.encounterEnemies) ? payload.encounterEnemies : [];
    mercenaryCombatRules.combatRewards = Array.isArray(payload.combatRewards) ? payload.combatRewards : [];
    mercenaryCombatRules.combatRules = Array.isArray(payload.combatRules) ? payload.combatRules : [];
    mercenaryCombatRules.combatLogs = Array.isArray(payload.combatLogs) ? payload.combatLogs : [];
    mercenaryCombatRules.attackTypesById = buildRuleMap(mercenaryCombatRules.attackTypes, 'basicAttackId', 'basic_attack_id');
    mercenaryCombatRules.skillsById = buildRuleMap(mercenaryCombatRules.skills, 'skillId', 'skill_id');
    mercenaryCombatRules.statusEffectsById = buildRuleMap(mercenaryCombatRules.statusEffects, 'statusId', 'status_id');
    mercenaryCombatRules.enemyTemplatesById = buildRuleMap(mercenaryCombatRules.enemyTemplates, 'enemyId', 'id');
    mercenaryCombatRules.encountersById = buildRuleMap(mercenaryCombatRules.encounters, 'encounterId', 'id');
    mercenaryCombatRules.encounterEnemiesByEncounterId = buildGroupedRuleMap(mercenaryCombatRules.encounterEnemies, 'encounterId');
    mercenaryCombatRules.combatRewardsByGroupId = buildGroupedRuleMap(mercenaryCombatRules.combatRewards, 'rewardGroupId');
    mercenaryCombatRules.combatRulesById = buildRuleMap(mercenaryCombatRules.combatRules, 'battleRuleId', 'id');
    applyCombatMissionOperations();
  } catch (error) {
    console.warn('[mercenary] combat rule data load failed:', error);
    battleOperationState.operations = [];
    battleOperationState.selectedOperationId = '';
    battleOperationState.operationLoadError = '전투 의뢰 데이터를 불러오지 못했습니다.';
  } finally {
    mercenaryCombatRulesLoaded = true;
  }
  return mercenaryCombatRules;
}

async function apiRequest(path, options = {}) {
  const apiClient = typeof API !== 'undefined' ? API : window.API;
  if (apiClient?.request) {
    return apiClient.request(path, { credentials: 'include', ...options });
  }

  const { perfScope, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {})
  };
  const token = apiClient?.token || window.localStorage?.getItem?.('madmen_token') || '';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    credentials: 'include',
    ...fetchOptions,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || '요청 실패');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function redirectToLoginWithReturnUrl() {
  const returnUrl = `${window.location.pathname}${window.location.search || ''}`;
  window.location.href = `/login.html?redirect=${encodeURIComponent(returnUrl)}`;
}

function showMercenaryLoginRequiredModal() {
  const overlay = document.querySelector('#mercenary-auth-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  document.body.classList.add('mercenary-auth-required');
  document.querySelector('#mercenary-auth-login')?.focus?.();
}

function hideMercenaryLoginRequiredModal() {
  if (!mercenaryAuthState.authenticated) {
    showMercenaryLoginRequiredModal();
    return;
  }
  document.querySelector('#mercenary-auth-overlay')?.setAttribute('hidden', '');
  document.body.classList.remove('mercenary-auth-required');
}

function requireMercenaryAuth() {
  if (mercenaryAuthState.authenticated) return true;
  showMercenaryLoginRequiredModal();
  return false;
}

async function checkMercenaryAuth() {
  try {
    const payload = await apiRequest('/api/me', { perfScope: 'mercenary-auth' });
    mercenaryAuthState.checked = true;
    mercenaryAuthState.authenticated = true;
    mercenaryAuthState.user = payload?.user || payload?.me || payload || null;
    hideMercenaryLoginRequiredModal();
    return true;
  } catch (error) {
    mercenaryAuthState.checked = true;
    mercenaryAuthState.authenticated = false;
    mercenaryAuthState.user = null;
    if (error.status === 401) {
      showMercenaryLoginRequiredModal();
      return false;
    }
    showReadyNotice('로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }
}

async function hydrateMercenaryOfficeProfile() {
  try {
    const payload = await apiRequest('/api/mercenary/my', { perfScope: 'mercenary-office-profile' });
    updateMercenaryCurrencyDisplay(payload);
    return true;
  } catch (error) {
    if (error.status === 401) {
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return false;
    }
    console.warn('[mercenary/office] profile load failed:', error);
    showReadyNotice('용병단 장부를 불러오지 못했습니다.');
    return false;
  }
}

function bindMercenaryAuthOverlay() {
  const loginButton = document.querySelector('#mercenary-auth-login');
  const homeButton = document.querySelector('#mercenary-auth-home');
  const closeButton = document.querySelector('#mercenary-auth-close');
  if (loginButton && loginButton.dataset.bound !== 'true') {
    loginButton.dataset.bound = 'true';
    loginButton.addEventListener('click', redirectToLoginWithReturnUrl);
  }
  if (homeButton && homeButton.dataset.bound !== 'true') {
    homeButton.dataset.bound = 'true';
    homeButton.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', showMercenaryLoginRequiredModal);
  }
}

function applyRecruitBoardPayload(payload) {
  const board = payload?.board;
  if (!board) return false;
  recruitmentState.serverMode = true;
  recruitmentState.refreshCount = Number(board.refreshCount || 0);
  recruitmentState.refreshIndex = recruitmentState.refreshCount;
  recruitmentState.refreshRemaining = Number(board.refreshRemaining ?? Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - recruitmentState.refreshCount));
  recruitmentState.maxRefresh = Number(board.maxRefresh || RECRUIT_DAILY_REFRESH_LIMIT);
  recruitmentState.refreshCost = Number(board.refreshCost || RECRUIT_REFRESH_COST);
  updateMercenaryCurrencyDisplay(payload);
  recruitmentState.gold = mercenaryGold;
  recruitmentState.hiredCandidateIds = Array.isArray(board.hiredCandidateIds) ? board.hiredCandidateIds : [];
  recruitmentState.gradeRates = extractRecruitGradeRates(payload, board);
  recruitmentState.candidates = (board.candidates || []).map(normalizeMercenaryForRoster);
  return true;
}

function normalizeRecruitGradeRates(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        grade: String(item?.grade || '').trim().toUpperCase(),
        rate: Number(item?.rate)
      }))
      .filter((item) => item.grade && Number.isFinite(item.rate));
  }

  if (value && typeof value === 'object') {
    return ['N', 'R', 'SR']
      .map((grade) => ({ grade, rate: Number(value[grade]) }))
      .filter((item) => Number.isFinite(item.rate));
  }

  return [];
}

function extractRecruitGradeRates(payload, board = payload?.board) {
  const candidates = [
    board?.gradeRates,
    board?.recruitGradeRates,
    payload?.gradeRates,
    payload?.recruitGradeRates,
    board?.rates,
    payload?.rates
  ];
  for (const candidate of candidates) {
    const rates = normalizeRecruitGradeRates(candidate);
    if (rates.length) return rates;
  }
  return RECRUIT_GRADE_RATES.map((item) => ({ ...item }));
}

async function loadRecruitBoardFromApi() {
  const payload = await apiRequest('/api/mercenary/recruit-board', { perfScope: 'mercenary-recruit' });
  if (!payload) return false;
  return applyRecruitBoardPayload(payload);
}

async function loadOwnedMercenariesFromApi() {
  console.log('[mercenary/owned] request /api/mercenary/my');
  const payload = await apiRequest('/api/mercenary/my', { perfScope: 'mercenary-roster' });
  console.log('[mercenary/owned] raw result:', payload);
  if (!payload) return false;
  const sourceItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.mercenaries)
      ? payload.mercenaries
      : [];
  const normalized = sourceItems.map(normalizeMercenaryForRoster).filter((item) => item.id && item.grade);
  ownedMercenaryRoster = normalized;
  rosterState.source = 'owned';
  rosterState.errorMessage = normalized.length
    ? ''
    : '아직 보유한 용병이 없습니다. 채용 게시판에서 용병을 영입해 보세요.';
  updateMercenaryCurrencyDisplay(payload);
  rosterState.selectedId = ownedMercenaryRoster[0]?.id || '';
  return true;
}

function getOwnedRosterKey(mercenary) {
  return String(mercenary?.ownedId || mercenary?.rosterId || '').trim();
}

function ensureOwnedMercenariesLoaded(options = {}) {
  const refreshBattleBoard = Boolean(options.refreshBattleBoard);
  if (ownedMercenaryRoster.length) {
    ownedMercenaryLoadState.loaded = true;
    ownedMercenaryLoadState.loading = false;
    ownedMercenaryLoadState.errorMessage = '';
    ownedMercenaryLoadState.unauthorized = false;
    return Promise.resolve(true);
  }
  if (ownedMercenaryLoadState.promise) return ownedMercenaryLoadState.promise;
  ownedMercenaryLoadState.loading = true;
  ownedMercenaryLoadState.loaded = false;
  ownedMercenaryLoadState.errorMessage = '';
  ownedMercenaryLoadState.unauthorized = false;
  if (refreshBattleBoard) renderBattleOperationBoard();
  ownedMercenaryLoadState.promise = loadOwnedMercenariesFromApi()
    .then((loaded) => {
      ownedMercenaryLoadState.loaded = Boolean(loaded);
      ownedMercenaryLoadState.errorMessage = loaded ? '' : '용병 정보를 불러오지 못했습니다.';
      return Boolean(loaded);
    })
    .catch((error) => {
      ownedMercenaryLoadState.loaded = false;
      ownedMercenaryLoadState.unauthorized = error.status === 401;
      ownedMercenaryLoadState.errorMessage = error.status === 401 ? '로그인이 필요합니다' : '용병 정보를 불러오지 못했습니다.';
      if (error.status === 401) {
        mercenaryAuthState.authenticated = false;
        showMercenaryLoginRequiredModal();
      }
      console.warn('[mercenary/battle] owned mercenary load failed:', error);
      return false;
    })
    .finally(() => {
      ownedMercenaryLoadState.loading = false;
      ownedMercenaryLoadState.promise = null;
      if (refreshBattleBoard) renderBattleOperationBoard();
    });
  return ownedMercenaryLoadState.promise;
}

function calculateBaseWorkPower(mercenary) {
  const stats = mercenary?.stats || {};
  const effective = mercenary?.effectiveStats || {};
  return Number(mercenary?.workPower || 0)
    || Number(effective.tec || 0) + Number(effective.sup || 0) + Number(effective.spd || 0)
    || Number(stats.TEC || 0) + Number(stats.SUP || 0) + Number(stats.SPD || 0);
}

function getMissionRiskPenalty(risk) {
  return { '낮음': 0, '보통': -5, '높음': -12, '위험': -20 }[String(risk || '')] ?? 0;
}

function calculateMissionWorkPower(members, mission) {
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
  const primaryStats = Array.isArray(mission?.primaryStats) ? mission.primaryStats : [];
  if (!primaryStats.length) {
    return safeMembers.reduce((sum, member) => sum + calculateBaseWorkPower(member), 0);
  }
  return safeMembers.reduce((sum, member) => {
    const effective = member.effectiveStats || {};
    const legacy = member.stats || {};
    return sum + primaryStats.reduce((statSum, stat) => {
      const lower = String(stat || '').toLowerCase();
      const upper = String(stat || '').toUpperCase();
      return statSum + Number(effective[lower] ?? legacy[upper] ?? 0);
    }, 0);
  }, 0);
}

function countMatchedMissionTags(members, mission) {
  const preferred = new Set((mission?.preferredTags || []).map((tag) => String(tag).trim()).filter(Boolean));
  if (!preferred.size) return 0;
  const tags = new Set();
  for (const member of members || []) {
    for (const tag of member.tags || []) {
      const normalized = String(tag || '').trim();
      if (normalized) tags.add(normalized);
    }
  }
  return [...preferred].filter((tag) => tags.has(tag)).length;
}

function countMatchedMissionPositions(members, mission) {
  const preferred = new Set((mission?.preferredPositions || []).map((item) => String(item).trim()).filter(Boolean));
  if (!preferred.size) return 0;
  const positions = new Set();
  for (const member of members || []) {
    [member.position, member.role, member.job].forEach((value) => {
      const normalized = String(value || '').trim();
      if (normalized) positions.add(normalized);
    });
  }
  return [...preferred].filter((position) => positions.has(position)).length;
}

function calculateMissionSuccessRate(members, mission, officeEffects = null) {
  const recommended = Math.max(50, Number(mission?.recommendedWorkPower || 0) || 50);
  const partyWorkPower = calculateMissionWorkPower(members, mission);
  const baseRate = 45 + ((partyWorkPower - recommended) / recommended) * 35;
  const matchedTagCount = countMatchedMissionTags(members, mission);
  const matchedPositionCount = countMatchedMissionPositions(members, mission);
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

function summarizeSquadMembers(members) {
  const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
  const tagCounts = new Map();
  safeMembers.forEach((member) => {
    (member.tags || []).forEach((tag) => {
      const key = String(tag || '').trim();
      if (!key) return;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    });
  });
  const mainTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .slice(0, 4)
    .map(([tag]) => tag);

  return {
    memberCount: safeMembers.length,
    totalWorkPower: safeMembers.reduce((sum, member) => sum + calculateBaseWorkPower(member), 0),
    averageLevel: safeMembers.length
      ? Math.round((safeMembers.reduce((sum, member) => sum + Number(member.level || 0), 0) / safeMembers.length) * 10) / 10
      : 0,
    availableCount: safeMembers.filter((member) => member.available).length,
    mainTags
  };
}

function normalizeSquadSlot(slot, slotIndex) {
  const ownedMercenaryIds = Array.isArray(slot?.ownedMercenaryIds)
    ? slot.ownedMercenaryIds.map((id) => String(id))
    : [];
  const members = Array.isArray(slot?.members)
    ? slot.members.map(normalizeMercenaryForRoster)
    : [];
  return {
    id: slot?.id || null,
    name: slot?.name || `파견조 ${slotIndex}`,
    slotIndex: Number(slot?.slotIndex || slotIndex),
    ownedMercenaryIds,
    leaderOwnedMercenaryId: slot?.leaderOwnedMercenaryId ? String(slot.leaderOwnedMercenaryId) : ownedMercenaryIds[0] || null,
    members,
    summary: slot?.summary || summarizeSquadMembers(members),
    empty: Boolean(slot?.empty || !slot?.id)
  };
}

function makeSquadDraft(slot) {
  const normalized = normalizeSquadSlot(slot, slot?.slotIndex || squadState.selectedSlotIndex || 1);
  return {
    id: normalized.id,
    name: normalized.name,
    slotIndex: normalized.slotIndex,
    ownedMercenaryIds: [...normalized.ownedMercenaryIds],
    leaderOwnedMercenaryId: normalized.leaderOwnedMercenaryId || normalized.ownedMercenaryIds[0] || null
  };
}

function getSquadDraftMembers() {
  const ownedById = new Map(squadState.owned.map((item) => [getOwnedRosterKey(item), item]));
  return (squadState.draft?.ownedMercenaryIds || []).map((id) => ownedById.get(String(id))).filter(Boolean);
}

async function loadSquadData() {
  console.log('[mercenary/squads] request /api/mercenary/squads');
  const [squadPayload] = await Promise.all([
    apiRequest('/api/mercenary/squads', { perfScope: 'mercenary-squads' }),
    loadOwnedMercenariesFromApi()
  ]);
  console.log('[mercenary/squads] raw result:', squadPayload);
  updateMercenaryCurrencyDisplay(squadPayload);
  const slotsSource = Array.isArray(squadPayload?.slots) ? squadPayload.slots : [];
  squadState.slots = Array.from({ length: SQUAD_SLOT_LIMIT }, (_, index) => {
    const slotIndex = index + 1;
    const source = slotsSource.find((slot) => Number(slot.slotIndex) === slotIndex);
    return normalizeSquadSlot(source, slotIndex);
  });
  squadState.owned = [...ownedMercenaryRoster];
  const selected = squadState.slots.find((slot) => slot.slotIndex === squadState.selectedSlotIndex) || squadState.slots[0];
  squadState.selectedSlotIndex = selected?.slotIndex || 1;
  squadState.draft = makeSquadDraft(selected || { slotIndex: 1 });
  squadState.errorMessage = '';
}

async function openSquadView() {
  if (!requireMercenaryAuth()) return;
  const screen = document.querySelector('#mercenary-squad-view');
  if (!screen) return;
  screen.hidden = false;
  document.body.classList.add('squad-open');
  squadState.loading = true;
  squadState.errorMessage = '';
  renderSquadLoading();

  let authFailed = false;
  try {
    await loadSquadData();
  } catch (error) {
    console.warn('[mercenary/squads] load failed', error);
    if (error.status === 401) {
      authFailed = true;
      closeSquadView();
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    squadState.errorMessage = '편성 정보를 불러오지 못했습니다.';
  } finally {
    squadState.loading = false;
    if (authFailed) return;
    bindSquadControls();
    renderSquadView();
  }
}

function closeSquadView() {
  document.querySelector('#mercenary-squad-view')?.setAttribute('hidden', '');
  document.body.classList.remove('squad-open');
}

function renderSquadLoading() {
  const list = document.querySelector('#squad-slot-list');
  const detail = document.querySelector('#squad-member-grid');
  const roster = document.querySelector('#squad-roster-grid');
  if (list) list.innerHTML = '<p class="squad-empty">편성 슬롯을 불러오는 중입니다.</p>';
  if (detail) detail.innerHTML = '<p class="squad-empty">작전 테이블을 정리하는 중입니다.</p>';
  if (roster) roster.innerHTML = '<p class="squad-empty">보유 용병 목록을 확인하는 중입니다.</p>';
}

function renderSquadView() {
  if (squadState.errorMessage) {
    renderSquadError(squadState.errorMessage);
    return;
  }
  renderSquadSlots();
  renderSquadDetail();
  renderSquadOwnedRoster();
}

function renderSquadError(message) {
  const list = document.querySelector('#squad-slot-list');
  const detail = document.querySelector('#squad-member-grid');
  const roster = document.querySelector('#squad-roster-grid');
  if (list) list.innerHTML = '<p class="squad-empty">편성 슬롯 없음</p>';
  if (detail) detail.innerHTML = `<p class="squad-empty">${escapeHtml(message)}</p>`;
  if (roster) roster.innerHTML = '<p class="squad-empty">보유 용병 목록을 표시할 수 없습니다.</p>';
}

function renderSquadSlots() {
  const list = document.querySelector('#squad-slot-list');
  const count = document.querySelector('#squad-slot-count');
  if (!list) return;
  if (count) count.textContent = `${SQUAD_SLOT_LIMIT}/${SQUAD_SLOT_LIMIT}`;

  list.innerHTML = squadState.slots.map((slot) => {
    const selected = slot.slotIndex === squadState.selectedSlotIndex;
    const summary = slot.slotIndex === squadState.selectedSlotIndex && squadState.draft
      ? summarizeSquadMembers(getSquadDraftMembers())
      : slot.summary || summarizeSquadMembers(slot.members || []);
    const portraits = (slot.members || []).slice(0, 3).map((member) => `
      <span class="squad-slot-portrait">${renderImageWithPlaceholder(member, 'squad-mini-portrait')}</span>
    `).join('');
    return `
      <button class="squad-slot-card ${selected ? 'is-selected' : ''} ${slot.empty ? 'is-empty' : ''}" type="button" data-squad-slot="${slot.slotIndex}">
        <span class="squad-slot-number">#${slot.slotIndex}</span>
        <strong>${escapeHtml(slot.name)}</strong>
        <span class="squad-slot-portraits">${portraits || '<em>빈 슬롯</em>'}</span>
        <span>총 작업력 ${formatNumber(summary.totalWorkPower)}</span>
        ${slot.slotIndex === 1 ? '<small>기본 편성</small>' : ''}
      </button>
    `;
  }).join('');

  list.querySelectorAll('[data-squad-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      const slotIndex = Number(button.dataset.squadSlot);
      const slot = squadState.slots.find((item) => item.slotIndex === slotIndex);
      squadState.selectedSlotIndex = slotIndex;
      squadState.draft = makeSquadDraft(slot || { slotIndex });
      renderSquadView();
    });
  });
}

function renderSquadDetail() {
  const title = document.querySelector('#squad-detail-name');
  const subtitle = document.querySelector('#squad-detail-subtitle');
  const grid = document.querySelector('#squad-member-grid');
  const summaryPanel = document.querySelector('#squad-summary-panel');
  const deleteButton = document.querySelector('#squad-delete-button');
  if (!squadState.draft || !grid || !summaryPanel) return;

  const members = getSquadDraftMembers();
  const summary = summarizeSquadMembers(members);
  if (title) title.textContent = squadState.draft.name;
  if (subtitle) {
    subtitle.textContent = `${members.length}/${SQUAD_MEMBER_LIMIT} · ${summary.mainTags.length ? summary.mainTags.join(', ') : '주요 태그 없음'}`;
  }
  if (deleteButton) deleteButton.disabled = !squadState.draft.id;

  const cards = members.map((member) => {
    const ownedId = getOwnedRosterKey(member);
    const isLeader = squadState.draft.leaderOwnedMercenaryId === ownedId;
    return `
      <article class="squad-member-card ${getGradeClass(member.grade)} ${isLeader ? 'is-leader' : ''}">
        <div class="squad-member-portrait">${renderImageWithPlaceholder(member, 'squad-card-portrait')}</div>
        <div class="squad-member-info">
          <span class="merc-grade-badge ${getGradeClass(member.grade)}">${escapeHtml(member.grade)}</span>
          <h4>${escapeHtml(member.name)}</h4>
          <p>${member.isMaxLevel ? 'Lv.MAX' : `Lv. ${formatNumber(member.level)} / ${formatNumber(member.maxLevel)}`} · ${escapeHtml(member.statusLabel || member.status)}</p>
          <p>작업력 ${formatNumber(calculateBaseWorkPower(member))}</p>
          <p>${(member.tags || []).slice(0, 3).map(escapeHtml).join(' · ') || '태그 없음'}</p>
        </div>
        <div class="squad-member-actions">
          <button type="button" data-squad-leader="${escapeHtml(ownedId)}">${isLeader ? '리더' : '리더 지정'}</button>
          <button type="button" data-squad-remove="${escapeHtml(ownedId)}">제거</button>
        </div>
      </article>
    `;
  });
  while (cards.length < SQUAD_MEMBER_LIMIT) {
    cards.push('<div class="squad-empty-member">보유 용병 목록에서 추가하세요</div>');
  }
  grid.innerHTML = cards.join('');
  summaryPanel.innerHTML = `
    <div><span>총 작업력</span><strong>${formatNumber(summary.totalWorkPower)}</strong></div>
    <div><span>평균 레벨</span><strong>${summary.averageLevel}</strong></div>
    <div><span>사용 가능 인원</span><strong>${summary.availableCount}/${members.length}</strong></div>
    <div><span>주요 태그</span><strong>${summary.mainTags.join(', ') || '없음'}</strong></div>
    <div class="squad-bonus-note"><span>편성 보너스</span><strong>0.1 기준 미적용</strong></div>
  `;

  grid.querySelectorAll('[data-squad-remove]').forEach((button) => {
    button.addEventListener('click', () => removeSquadMember(button.dataset.squadRemove));
  });
  grid.querySelectorAll('[data-squad-leader]').forEach((button) => {
    button.addEventListener('click', () => setSquadLeader(button.dataset.squadLeader));
  });
}

function getSquadRosterRoleBucket(member) {
  const text = [
    member.role,
    member.job,
    member.position,
    ...(Array.isArray(member.tags) ? member.tags : [])
  ].filter(Boolean).join(' ').toLowerCase();
  if (/tank|탱|방어|기사|방패/.test(text)) return 'tank';
  if (/deal|딜|공격|검|사격|마법|암살/.test(text)) return 'dealer';
  if (/heal|힐|치료|의무|회복|응급/.test(text)) return 'healer';
  if (/support|지원|보조|정화/.test(text)) return 'support';
  if (/admin|행정|회계|장부|서류|접수|협상/.test(text)) return 'admin';
  return 'other';
}

function getSquadRosterGradeRank(grade) {
  return ({ EX: 5, SSR: 4, SR: 3, R: 2, N: 1 })[String(grade || '').toUpperCase()] || 0;
}

function getFilteredSquadRosterMembers() {
  const filters = squadState.rosterFilters;
  const selectedIds = new Set(squadState.draft?.ownedMercenaryIds || []);
  const search = String(filters.search || '').trim().toLowerCase();
  const filtered = squadState.owned.filter((member) => {
    const ownedId = getOwnedRosterKey(member);
    const selected = selectedIds.has(ownedId);
    const available = member.available !== false;
    if (search && !String(member.name || '').toLowerCase().includes(search)) return false;
    if (filters.availability === 'available' && !available) return false;
    if (filters.availability === 'unavailable' && available) return false;
    if (filters.availability === 'selected' && !selected) return false;
    if (filters.grade !== 'all' && String(member.grade || '').toUpperCase() !== filters.grade) return false;
    if (filters.role !== 'all' && getSquadRosterRoleBucket(member) !== filters.role) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    if (filters.sort === 'levelDesc') return Number(b.level || 0) - Number(a.level || 0);
    if (filters.sort === 'gradeDesc') return getSquadRosterGradeRank(b.grade) - getSquadRosterGradeRank(a.grade) || calculateBaseWorkPower(b) - calculateBaseWorkPower(a);
    if (filters.sort === 'nameAsc') return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
    return calculateBaseWorkPower(b) - calculateBaseWorkPower(a);
  });
}

function renderSquadRosterFilters(totalCount, visibleCount) {
  const root = document.querySelector('#squad-roster-filterbar');
  if (!root) return;
  const filters = squadState.rosterFilters;
  root.innerHTML = `
    <label class="squad-roster-search">
      <span>이름 검색</span>
      <input type="search" data-squad-roster-filter="search" placeholder="용병 이름" value="${escapeHtml(filters.search)}" />
    </label>
    <div class="squad-roster-filter-row">
      <select data-squad-roster-filter="availability" aria-label="상태 필터">
        ${[
    ['all', '상태 전체'],
    ['available', '사용 가능'],
    ['unavailable', '사용 불가'],
    ['selected', '현재 편성됨']
  ].map(([value, label]) => `<option value="${value}" ${filters.availability === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      <select data-squad-roster-filter="grade" aria-label="등급 필터">
        ${['all', 'N', 'R', 'SR', 'SSR', 'EX'].map((value) => `<option value="${value}" ${filters.grade === value ? 'selected' : ''}>${value === 'all' ? '등급 전체' : value}</option>`).join('')}
      </select>
      <select data-squad-roster-filter="role" aria-label="역할 필터">
        ${[
    ['all', '역할 전체'],
    ['tank', '탱커'],
    ['dealer', '딜러'],
    ['support', '지원'],
    ['healer', '힐러'],
    ['admin', '행정'],
    ['other', '기타']
  ].map(([value, label]) => `<option value="${value}" ${filters.role === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      <select data-squad-roster-filter="sort" aria-label="정렬">
        ${[
    ['workPowerDesc', '작업력 높은순'],
    ['levelDesc', '레벨 높은순'],
    ['gradeDesc', '등급 높은순'],
    ['nameAsc', '이름순']
  ].map(([value, label]) => `<option value="${value}" ${filters.sort === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
    </div>
    <p class="squad-roster-filter-result">표시 ${formatNumber(visibleCount)}명 / 전체 ${formatNumber(totalCount)}명</p>
  `;
  root.querySelectorAll('[data-squad-roster-filter]').forEach((control) => {
    const update = () => {
      squadState.rosterFilters[control.dataset.squadRosterFilter] = control.value;
      renderSquadOwnedRoster();
    };
    control.addEventListener('input', update);
    control.addEventListener('change', update);
  });
}

function renderSquadOwnedRoster() {
  const roster = document.querySelector('#squad-roster-grid');
  const count = document.querySelector('#squad-roster-count');
  if (!roster) return;
  const visibleMembers = getFilteredSquadRosterMembers();
  if (count) count.textContent = `${visibleMembers.length}/${squadState.owned.length}명`;
  renderSquadRosterFilters(squadState.owned.length, visibleMembers.length);
  if (!squadState.owned.length) {
    roster.innerHTML = '<p class="squad-empty">아직 보유한 용병이 없습니다. 채용 게시판에서 용병을 영입해 보세요.</p>';
    return;
  }
  if (!visibleMembers.length) {
    roster.innerHTML = '<p class="squad-empty">조건에 맞는 용병이 없습니다.</p>';
    return;
  }

  const selectedIds = new Set(squadState.draft?.ownedMercenaryIds || []);
  roster.innerHTML = visibleMembers.map((member) => {
    const ownedId = getOwnedRosterKey(member);
    const selected = selectedIds.has(ownedId);
    const unavailable = member.available === false;
    return `
      <article class="squad-roster-card ${getGradeClass(member.grade)} ${selected ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}" data-owned-id="${escapeHtml(ownedId)}">
        <button type="button" class="squad-add-button" data-squad-add="${escapeHtml(ownedId)}" ${selected || unavailable ? 'disabled' : ''}>${selected ? '✓' : '+'}</button>
        <div class="squad-roster-portrait">${renderImageWithPlaceholder(member, 'squad-roster-portrait-img')}</div>
        <div class="squad-roster-card-main">
          <span class="merc-grade-badge ${getGradeClass(member.grade)}">${escapeHtml(member.grade)}</span>
          <h4>${escapeHtml(member.name)}</h4>
          <p class="squad-roster-meta">${member.isMaxLevel ? 'Lv.MAX' : `Lv. ${formatNumber(member.level)} / ${formatNumber(member.maxLevel)}`} · 작업력 ${formatNumber(calculateBaseWorkPower(member))}</p>
          <p class="squad-roster-status-row"><span class="squad-status-badge status-${escapeHtml(member.operationalStatus || 'idle')}">${escapeHtml(member.statusLabel || member.status)}</span>${member.isLocked ? '<span class="squad-lock-mark">잠금</span>' : ''}</p>
          ${selected ? '<em class="squad-roster-note">현재 편성됨</em>' : unavailable ? '<em class="squad-roster-note">사용 불가</em>' : ''}
        </div>
      </article>
    `;
  }).join('');

  roster.querySelectorAll('[data-squad-add]').forEach((button) => {
    button.addEventListener('click', () => addSquadMember(button.dataset.squadAdd));
  });
}

function addSquadMember(ownedId) {
  if (!squadState.draft) return;
  const id = String(ownedId || '').trim();
  const member = squadState.owned.find((item) => getOwnedRosterKey(item) === id);
  if (!member) {
    showReadyNotice('보유 용병 목록에서 찾을 수 없습니다.');
    return;
  }
  if (member.available === false) {
    showReadyNotice('파견할 수 없는 상태의 용병입니다.');
    return;
  }
  if (squadState.draft.ownedMercenaryIds.includes(id)) {
    showReadyNotice('이미 현재 편성에 포함된 용병입니다.');
    return;
  }
  if (squadState.draft.ownedMercenaryIds.length >= SQUAD_MEMBER_LIMIT) {
    showReadyNotice('편성은 최대 3명까지 가능합니다.');
    return;
  }
  squadState.draft.ownedMercenaryIds.push(id);
  if (!squadState.draft.leaderOwnedMercenaryId) squadState.draft.leaderOwnedMercenaryId = id;
  renderSquadView();
}

function removeSquadMember(ownedId) {
  if (!squadState.draft) return;
  const id = String(ownedId || '').trim();
  squadState.draft.ownedMercenaryIds = squadState.draft.ownedMercenaryIds.filter((item) => item !== id);
  if (squadState.draft.leaderOwnedMercenaryId === id) {
    squadState.draft.leaderOwnedMercenaryId = squadState.draft.ownedMercenaryIds[0] || null;
  }
  renderSquadView();
}

function setSquadLeader(ownedId) {
  if (!squadState.draft) return;
  const id = String(ownedId || '').trim();
  if (!squadState.draft.ownedMercenaryIds.includes(id)) return;
  squadState.draft.leaderOwnedMercenaryId = id;
  renderSquadView();
}

function renameCurrentSquad() {
  if (!squadState.draft) return;
  const nextName = window.prompt('편성 이름을 입력하세요.', squadState.draft.name);
  if (nextName === null) return;
  const trimmed = nextName.trim();
  squadState.draft.name = trimmed || `파견조 ${squadState.draft.slotIndex}`;
  renderSquadView();
}

async function saveCurrentSquad(button = null) {
  if (!squadState.draft) return;
  if (!squadState.draft.ownedMercenaryIds.length) {
    showReadyNotice('편성에는 최소 1명의 용병이 필요합니다.');
    return;
  }
  const payload = {
    name: squadState.draft.name,
    slotIndex: squadState.draft.slotIndex,
    ownedMercenaryIds: squadState.draft.ownedMercenaryIds,
    leaderOwnedMercenaryId: squadState.draft.leaderOwnedMercenaryId || squadState.draft.ownedMercenaryIds[0]
  };
  const actionKey = buildMercenaryActionKey('squad-save', {
    squadId: squadState.draft.id || '',
    id: squadState.draft.id || `slot-${squadState.draft.slotIndex}`,
    ownedMercenaryIds: payload.ownedMercenaryIds
  });
  const path = squadState.draft.id
    ? `/api/mercenary/squads/${encodeURIComponent(squadState.draft.id)}`
    : '/api/mercenary/squads';
  const method = squadState.draft.id ? 'PATCH' : 'POST';

  try {
    const result = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '저장 중...',
      task: () => apiRequest(path, {
        method,
        body: JSON.stringify({ ...payload, clientRequestId: createClientRequestId('squad-save') }),
        perfScope: 'mercenary-squads-save'
      })
    });
    if (!result) return;
    updateMercenaryCurrencyDisplay(result);
    await loadSquadData();
    renderSquadView();
    showReadyNotice('편성이 저장되었습니다.');
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '편성 저장에 실패했습니다.');
  }
}

async function deleteCurrentSquad(button = null) {
  if (!squadState.draft?.id) {
    showReadyNotice('삭제할 저장 편성이 없습니다.');
    return;
  }
  if (!window.confirm('이 편성을 삭제하시겠습니까?')) return;
  const actionKey = buildMercenaryActionKey('squad-delete', { squadId: squadState.draft.id, id: squadState.draft.id });
  try {
    const result = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '삭제 중...',
      task: () => apiRequest(`/api/mercenary/squads/${encodeURIComponent(squadState.draft.id)}`, {
        method: 'DELETE',
        body: JSON.stringify({ clientRequestId: createClientRequestId('squad-delete') }),
        perfScope: 'mercenary-squads-delete'
      })
    });
    if (!result) return;
    updateMercenaryCurrencyDisplay(result);
    await loadSquadData();
    renderSquadView();
    showReadyNotice('편성이 삭제되었습니다.');
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '편성 삭제에 실패했습니다.');
  }
}

function bindSquadControls() {
  const closeButton = document.querySelector('#squad-close-button');
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeSquadView);
  }
  const saveButton = document.querySelector('#squad-save-button');
  if (saveButton && saveButton.dataset.bound !== 'true') {
    saveButton.dataset.bound = 'true';
    saveButton.addEventListener('click', () => saveCurrentSquad(saveButton));
  }
  const renameButton = document.querySelector('#squad-rename-button');
  if (renameButton && renameButton.dataset.bound !== 'true') {
    renameButton.dataset.bound = 'true';
    renameButton.addEventListener('click', renameCurrentSquad);
  }
  const deleteButton = document.querySelector('#squad-delete-button');
  if (deleteButton && deleteButton.dataset.bound !== 'true') {
    deleteButton.dataset.bound = 'true';
    deleteButton.addEventListener('click', () => deleteCurrentSquad(deleteButton));
  }
  const expandButton = document.querySelector('#squad-expand-button');
  if (expandButton && expandButton.dataset.bound !== 'true') {
    expandButton.dataset.bound = 'true';
    expandButton.addEventListener('click', () => showReadyNotice('슬롯 확장 기능은 준비 중입니다.'));
  }
  const filterButton = document.querySelector('#squad-filter-button');
  if (filterButton && filterButton.dataset.bound !== 'true') {
    filterButton.dataset.bound = 'true';
    filterButton.addEventListener('click', () => showReadyNotice('편성 필터는 준비 중입니다.'));
  }
}

function formatMissionDuration(seconds) {
  const value = Math.max(0, Number(seconds || 0) || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  if (!minutes) return `${rest}초`;
  return `${minutes}분 ${String(rest).padStart(2, '0')}초`;
}

function formatMissionCountdown(seconds) {
  const value = Math.max(0, Number(seconds || 0) || 0);
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function normalizeMissionRun(run) {
  return {
    ...run,
    selectedMercenaryIds: Array.isArray(run?.selectedMercenaryIds) ? run.selectedMercenaryIds.map(String) : [],
    members: Array.isArray(run?.members) ? run.members.map(normalizeMercenaryForRoster) : [],
    remainingSeconds: Math.max(0, Number(run?.remainingSeconds || 0) || 0),
    readyToClaim: Boolean(run?.readyToClaim)
  };
}

function selectedMission() {
  if (missionState.selectedLockedMissionId) {
    return missionState.lockedMissions.find((mission) => mission.missionId === missionState.selectedLockedMissionId)
      || null;
  }
  return missionState.offers.find((offer) => offer.offerId === missionState.selectedOfferId)
    || missionState.offers[0]
    || null;
}

function selectedMissionSquad() {
  return missionState.squads.find((squad) => String(squad.id || '') === String(missionState.selectedSquadId || '')) || null;
}

async function loadMissionData() {
  const [missionPayload, squadPayload, myPayload, runPayload] = await Promise.all([
    apiRequest('/api/mercenary/missions', { perfScope: 'mercenary-missions' }),
    apiRequest('/api/mercenary/squads', { perfScope: 'mercenary-mission-squads' }),
    apiRequest('/api/mercenary/my', { perfScope: 'mercenary-mission-owned' }),
    apiRequest('/api/mercenary/runs', { perfScope: 'mercenary-runs' })
  ]);
  updateMercenaryCurrencyDisplay(missionPayload);
  updateMercenaryCurrencyDisplay(squadPayload);
  updateMercenaryCurrencyDisplay(myPayload);
  updateMercenaryCurrencyDisplay(runPayload);

  const offers = Array.isArray(missionPayload?.offers)
    ? missionPayload.offers
    : Array.isArray(missionPayload?.missions)
      ? missionPayload.missions
      : [];
  missionState.offers = offers;
  missionState.missions = offers;
  missionState.lockedMissions = Array.isArray(missionPayload?.lockedMissions) ? missionPayload.lockedMissions : [];
  missionState.officeGrowth = missionPayload?.officeGrowth || null;
  missionState.board = missionPayload?.board || null;
  missionState.owned = Array.isArray(myPayload?.items)
    ? myPayload.items.map(normalizeMercenaryForRoster)
    : [];
  const slotsSource = Array.isArray(squadPayload?.slots) ? squadPayload.slots : [];
  missionState.squads = slotsSource
    .map((slot, index) => normalizeSquadSlot(slot, Number(slot?.slotIndex || index + 1)))
    .filter((slot) => slot.id && slot.ownedMercenaryIds.length);
  missionState.runs = Array.isArray(runPayload?.runs) ? runPayload.runs.map(normalizeMissionRun) : [];
  missionState.activeRunCount = Number(runPayload?.activeRunCount || missionState.runs.length) || 0;
  missionState.maxActiveRuns = Number(runPayload?.maxActiveRuns || missionPayload?.mercenaryProfile?.maxActiveRuns || 1) || 1;

  if (!missionState.selectedOfferId || !missionState.offers.some((offer) => offer.offerId === missionState.selectedOfferId)) {
    missionState.selectedOfferId = missionState.offers[0]?.offerId || '';
  }
  if (missionState.selectedLockedMissionId && !missionState.lockedMissions.some((mission) => mission.missionId === missionState.selectedLockedMissionId)) {
    missionState.selectedLockedMissionId = '';
  }
  missionState.selectedMissionId = selectedMission()?.missionId || '';
  if (!missionState.selectedSquadId || !missionState.squads.some((squad) => String(squad.id) === String(missionState.selectedSquadId))) {
    missionState.selectedSquadId = missionState.squads[0]?.id || '';
  }
  missionState.errorMessage = '';
}

async function openMissionView() {
  if (!requireMercenaryAuth()) return;
  const screen = document.querySelector('#mercenary-mission-view');
  if (!screen) return;
  screen.hidden = false;
  document.body.classList.add('mission-open');
  missionState.loading = true;
  missionState.errorMessage = '';
  renderMissionLoading();

  let authFailed = false;
  try {
    await loadMissionData();
  } catch (error) {
    console.warn('[mercenary/missions] load failed', error);
    if (error.status === 401) {
      authFailed = true;
      closeMissionView();
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    missionState.errorMessage = '의뢰 정보를 불러오지 못했습니다.';
  } finally {
    missionState.loading = false;
    if (authFailed) return;
    bindMissionControls();
    renderMissionView();
    startMissionTimer();
  }
}

function closeMissionView() {
  document.querySelector('#mercenary-mission-view')?.setAttribute('hidden', '');
  document.body.classList.remove('mission-open');
  stopMissionTimer();
  closeMissionResult();
}

function renderMissionLoading() {
  document.querySelector('#mission-list') && (document.querySelector('#mission-list').innerHTML = '<p class="mission-empty">의뢰 목록을 확인하는 중입니다.</p>');
  document.querySelector('#mission-detail') && (document.querySelector('#mission-detail').innerHTML = '<p class="mission-empty">접수 서류를 펼치는 중입니다.</p>');
  document.querySelector('#mission-squad-list') && (document.querySelector('#mission-squad-list').innerHTML = '<p class="mission-empty">편성 목록을 불러오는 중입니다.</p>');
  document.querySelector('#mission-run-list') && (document.querySelector('#mission-run-list').innerHTML = '<p class="mission-empty">진행 중 의뢰를 확인하는 중입니다.</p>');
}

function renderMissionView() {
  if (missionState.errorMessage) {
    renderMissionError(missionState.errorMessage);
    return;
  }
  renderMissionList();
  renderMissionDetail();
  renderMissionSquads();
  renderMissionRuns();
}

function renderMissionError(message) {
  document.querySelector('#mission-list') && (document.querySelector('#mission-list').innerHTML = '<p class="mission-empty">의뢰 없음</p>');
  document.querySelector('#mission-detail') && (document.querySelector('#mission-detail').innerHTML = `<p class="mission-empty">${escapeHtml(message)}</p>`);
  document.querySelector('#mission-squad-list') && (document.querySelector('#mission-squad-list').innerHTML = '<p class="mission-empty">편성 목록을 표시할 수 없습니다.</p>');
  document.querySelector('#mission-run-list') && (document.querySelector('#mission-run-list').innerHTML = '<p class="mission-empty">진행 중 의뢰를 표시할 수 없습니다.</p>');
}

function renderMissionOfficeGrowth() {
  const growth = missionState.officeGrowth || {};
  const effects = growth.currentEffects || {};
  const nextUnlock = growth.nextUnlock;
  const milestones = Array.isArray(growth.milestones) ? growth.milestones : [];
  const level = Number(mercenaryLobbyState.level || 1) || 1;
  const exp = Number(mercenaryLobbyState.officeExp || 0) || 0;
  const expToNext = Number(mercenaryLobbyState.officeExpToNext || 0) || 0;
  const expText = mercenaryLobbyState.isOfficeMaxLevel ? 'MAX' : `${formatNumber(exp)} / ${formatNumber(expToNext)} EXP`;
  return `
    <section class="mission-office-growth">
      <div>
        <span>사무소 Lv.${formatNumber(level)}</span>
        <strong>${expText}</strong>
      </div>
      <p>${nextUnlock ? `다음 해금: Lv.${formatNumber(nextUnlock.level)} ${escapeHtml(nextUnlock.title)}` : '모든 0.1 해금 효과를 달성했습니다.'}</p>
      <ul>
        <li>게시판 ${formatNumber(effects.maxMissionOffers || missionState.board?.maxMissionOffers || 0)}칸</li>
        <li>동시 파견 ${formatNumber(effects.maxActiveRuns || missionState.maxActiveRuns || 0)}개</li>
        <li>편성 슬롯 ${formatNumber(effects.maxSquadSlots || 0)}개</li>
        <li>${(effects.unlockedRiskLevels || ['낮음']).map(escapeHtml).join(', ')} 위험도</li>
      </ul>
      <details class="mission-growth-milestones">
        <summary>사무소 성장표 보기</summary>
        <div>
          ${milestones.map((item) => `
            <p class="${item.unlocked ? 'is-unlocked' : 'is-locked'}">
              <strong>Lv.${formatNumber(item.level)} ${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.description)}</span>
            </p>
          `).join('')}
        </div>
      </details>
    </section>
  `;
}

function renderMissionList() {
  const list = document.querySelector('#mission-list');
  const count = document.querySelector('#mission-count');
  if (!list) return;
  const board = missionState.board || {};
  const activeCount = Number(board.activeOfferCount ?? missionState.offers.length) || 0;
  const maxOffers = Number(board.maxMissionOffers || activeCount || 0) || 0;
  if (count) count.textContent = maxOffers ? `${activeCount}/${maxOffers}` : `${missionState.offers.length}건`;
  const boardHtml = `
    <div class="mission-board-state" id="mission-board-state">
      <strong>의뢰 게시판 ${formatNumber(activeCount)}${maxOffers ? ` / ${formatNumber(maxOffers)}` : ''}</strong>
      <span>빈 슬롯 ${formatNumber(board.emptySlots ?? Math.max(0, maxOffers - activeCount))}</span>
      <em>${activeCount >= maxOffers && maxOffers ? '게시판이 가득 찼습니다' : '다음 의뢰 대기 중'} · ${board.nextOfferAt ? `보충까지 ${formatMissionCountdown(board.secondsUntilNextOffer)}` : '보충 시간 계산 중'}</em>
    </div>
  `;
  const offerHtml = missionState.offers.length
    ? missionState.offers.map((mission) => `
    <button class="mission-card ${mission.offerId === missionState.selectedOfferId ? 'is-selected' : ''}" type="button" data-offer-id="${escapeHtml(mission.offerId)}">
      <span class="mission-badge">비전투</span>
      <strong>${escapeHtml(mission.title)}</strong>
      <small>${escapeHtml(mission.type)} · 위험도 ${escapeHtml(mission.risk)}</small>
      <span>권장 작업력 ${formatNumber(mission.recommendedWorkPower)}</span>
      <span>보상 ${formatNumber(mission.rewardGold)}G · ${formatMissionDuration(mission.durationSeconds)}</span>
      <em>접수 ${mission.generatedAt ? new Date(mission.generatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</em>
    </button>
  `).join('')
    : '<p class="mission-empty">현재 게시판에 붙은 의뢰가 없습니다. 다음 보충 시간을 기다려 주세요.</p>';
  const lockedHtml = missionState.lockedMissions.length
    ? `
      <div class="mission-locked-section">
        <strong>잠긴 의뢰</strong>
        ${missionState.lockedMissions.map((mission) => `
          <button class="mission-card mission-locked-card ${mission.missionId === missionState.selectedLockedMissionId ? 'is-selected' : ''}" type="button" data-locked-mission-id="${escapeHtml(mission.missionId)}">
            <span class="mission-badge is-locked">잠김</span>
            <strong>${escapeHtml(mission.title)}</strong>
            <small>${escapeHtml(mission.risk)} · 보상 ${formatNumber(mission.rewardGold)}G</small>
            <span>해금 조건: ${escapeHtml(mission.lockedReason || '해금 조건 미충족')}</span>
          </button>
        `).join('')}
      </div>
    `
    : '';
  list.innerHTML = boardHtml + offerHtml + lockedHtml;

  list.querySelectorAll('[data-offer-id]').forEach((button) => {
    button.addEventListener('click', () => {
      missionState.selectedOfferId = button.dataset.offerId;
      missionState.selectedLockedMissionId = '';
      missionState.selectedMissionId = selectedMission()?.missionId || '';
      renderMissionView();
    });
  });
  list.querySelectorAll('[data-locked-mission-id]').forEach((button) => {
    button.addEventListener('click', () => {
      missionState.selectedLockedMissionId = button.dataset.lockedMissionId;
      missionState.selectedOfferId = '';
      missionState.selectedMissionId = selectedMission()?.missionId || '';
      renderMissionView();
    });
  });
}

function missionPreviewForSelection() {
  const mission = selectedMission();
  const squad = selectedMissionSquad();
  const members = squad?.members || [];
  if (!mission || !members.length) return null;
  return calculateMissionSuccessRate(members, mission);
}

function missionStartBlockReason() {
  const mission = selectedMission();
  const squad = selectedMissionSquad();
  if (!mission) return '의뢰를 선택하세요.';
  if (!mission.offerId || mission.locked) return mission.lockedReason || '해금이 필요한 의뢰입니다.';
  if (!squad) return '파견할 편성을 선택하세요.';
  const members = squad.members || [];
  if (members.length < Number(mission.minMembers || 1)) return `최소 ${mission.minMembers}명이 필요합니다.`;
  if (members.length > Number(mission.maxMembers || 3)) return `최대 ${mission.maxMembers}명까지 가능합니다.`;
  if (members.some((member) => member.available === false)) return '사용 불가 상태의 용병이 포함되어 있습니다.';
  if (missionState.activeRunCount >= missionState.maxActiveRuns) return '동시 진행 의뢰 한도에 도달했습니다.';
  return '';
}

function renderMissionDetail() {
  const root = document.querySelector('#mission-detail');
  if (!root) return;
  const mission = selectedMission();
  if (!mission) {
    root.innerHTML = '<p class="mission-empty">의뢰를 선택하세요.</p>';
    return;
  }
  const preview = missionPreviewForSelection();
  const locked = Boolean(mission.locked || !mission.offerId);
  root.innerHTML = `
    <div class="mission-detail-heading">
      <span class="mission-badge ${locked ? 'is-locked' : ''}">${locked ? '잠김' : '비전투'} · ${escapeHtml(mission.type)}</span>
      <h3>${escapeHtml(mission.title)}</h3>
      <p>${escapeHtml(locked ? `${mission.description || ''} ${mission.lockedReason ? `(${mission.lockedReason})` : ''}`.trim() : mission.description)}</p>
    </div>
    <div class="mission-detail-grid">
      <div><span>위험도</span><strong>${escapeHtml(mission.risk)}</strong></div>
      <div><span>주요 스탯</span><strong>${(mission.primaryStats || []).map(escapeHtml).join(', ') || '기본 작업력'}</strong></div>
      <div><span>권장 작업력</span><strong>${formatNumber(mission.recommendedWorkPower)}</strong></div>
      <div><span>인원</span><strong>${mission.minMembers}~${mission.maxMembers}명</strong></div>
      <div><span>소요 시간</span><strong>${formatMissionDuration(mission.durationSeconds)}</strong></div>
      <div><span>예상 성공률</span><strong>${locked ? '해금 필요' : preview ? `${preview.successRate}%` : '편성 선택 필요'}</strong></div>
    </div>
    <div class="mission-reward-grid">
      <article>
        <strong>성공 보상</strong>
        <p>${formatNumber(mission.rewardGold)}G · 사무소 EXP ${formatNumber(mission.officeExp)} · 용병 EXP ${formatNumber(mission.mercenaryExp)}</p>
      </article>
      <article>
        <strong>실패 보상</strong>
        <p>${formatNumber(mission.failureRewardGold)}G · 사무소 EXP ${formatNumber(mission.failureOfficeExp)} · 용병 EXP ${formatNumber(mission.failureMercenaryExp)}</p>
      </article>
    </div>
    <div class="mission-factor-box">
      <strong>${locked ? '해금 조건' : '성공률 영향'}</strong>
      <p>${locked ? escapeHtml(mission.lockedReason || '해금 조건 미충족') : preview ? `현재 작업력 ${formatNumber(preview.partyWorkPower)} / 태그 보너스 ${preview.matchedTagCount}개 / 포지션 보너스 ${preview.matchedPositionCount}개 / 위험도 보정 ${preview.riskPenalty}` : '편성을 선택하면 예상 성공률이 계산됩니다.'}</p>
    </div>
    ${locked ? `
      <div class="mission-detail-actions is-locked">
        <button class="mission-start-button" id="mission-start-button" type="button" disabled>의뢰 시작</button>
        <button class="mission-reject-button" type="button" disabled>해금 필요</button>
        <span>잠긴 의뢰는 게시판 재고가 아니므로 시작하거나 거부할 수 없습니다.</span>
      </div>
    ` : `<div class="mission-detail-actions">
      <button class="mission-start-button" id="mission-start-button" type="button" disabled>의뢰 시작</button>
      <button class="mission-reject-button" type="button" data-mission-reject="${escapeHtml(mission.offerId)}">의뢰 거부</button>
      <span>거부한 의뢰는 즉시 보충되지 않습니다.</span>
    </div>`}
  `;
  root.querySelector('[data-mission-reject]')?.addEventListener('click', (event) => rejectSelectedMissionOffer(event.currentTarget));
  root.querySelector('#mission-start-button')?.addEventListener('click', (event) => startSelectedMission(event.currentTarget));
  renderMissionStartState();
}

function renderMissionSquads() {
  const list = document.querySelector('#mission-squad-list');
  if (!list) return;
  if (!missionState.squads.length) {
    list.innerHTML = '<p class="mission-empty">저장된 편성이 없습니다. 편성 화면에서 파견조를 저장해 주세요.</p>';
    renderMissionStartState();
    return;
  }
  list.innerHTML = missionState.squads.map((squad) => {
    const selected = String(squad.id) === String(missionState.selectedSquadId);
    const summary = summarizeSquadMembers(squad.members || []);
    const unavailable = (squad.members || []).some((member) => member.available === false);
    return `
      <button class="mission-squad-card ${selected ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}" type="button" data-mission-squad="${escapeHtml(squad.id)}">
        <strong>${escapeHtml(squad.name)}</strong>
        <span>${summary.memberCount}명 · 작업력 ${formatNumber(summary.totalWorkPower)}</span>
        <span>${summary.mainTags.join(', ') || '태그 없음'}</span>
        <div class="mission-squad-portraits">
          ${(squad.members || []).slice(0, 3).map((member) => renderImageWithPlaceholder(member, 'mission-mini-portrait')).join('')}
        </div>
        ${unavailable ? '<em>사용 불가 용병 포함</em>' : ''}
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-mission-squad]').forEach((button) => {
    button.addEventListener('click', () => {
      missionState.selectedSquadId = button.dataset.missionSquad;
      renderMissionView();
    });
  });
  renderMissionStartState();
}

function renderMissionStartState() {
  const summary = document.querySelector('#mission-dispatch-summary');
  const button = document.querySelector('#mission-start-button');
  const runLimit = document.querySelector('#mission-run-limit');
  const mission = selectedMission();
  const squad = selectedMissionSquad();
  const locked = Boolean(mission?.locked || (mission && !mission.offerId));
  const preview = locked ? null : missionPreviewForSelection();
  const blockReason = missionStartBlockReason();
  if (runLimit) runLimit.textContent = `${missionState.activeRunCount}/${missionState.maxActiveRuns}`;
  if (summary) {
    summary.innerHTML = `
      <strong>${squad ? escapeHtml(squad.name) : '편성 미선택'}</strong>
      <p>${mission ? escapeHtml(mission.title) : '의뢰를 선택하세요.'}</p>
      <p>${locked ? '잠긴 의뢰는 성장 목표로만 표시됩니다.' : preview ? `예상 성공률 ${preview.successRate}% · 작업력 ${formatNumber(preview.partyWorkPower)}` : '편성을 선택하면 성공률이 표시됩니다.'}</p>
      ${blockReason ? `<em>${escapeHtml(blockReason)}</em>` : '<em class="is-ready">파견 준비 완료</em>'}
    `;
  }
  if (button) {
    button.disabled = Boolean(blockReason);
    button.textContent = blockReason ? '의뢰 시작 불가' : '의뢰 시작';
  }
}

function renderMissionRuns() {
  const list = document.querySelector('#mission-run-list');
  const active = document.querySelector('#mission-active-count');
  if (!list) return;
  if (active) active.textContent = `${missionState.activeRunCount}/${missionState.maxActiveRuns}`;
  if (!missionState.runs.length) {
    list.innerHTML = '<p class="mission-empty">진행 중인 의뢰가 없습니다.</p>';
    return;
  }
  list.innerHTML = missionState.runs.map((runItem) => `
    <article class="mission-run-card ${runItem.readyToClaim ? 'is-ready' : ''}">
      <div>
        <strong>${escapeHtml(runItem.missionTitle)}</strong>
        <span>성공률 ${formatNumber(runItem.successRate)}% · ${runItem.readyToClaim ? '완료 대기' : `남은 시간 ${formatMissionDuration(runItem.remainingSeconds)}`}</span>
      </div>
      <div class="mission-run-members">
        ${(runItem.members || []).map((member) => renderImageWithPlaceholder(member, 'mission-mini-portrait')).join('')}
      </div>
      <button type="button" data-mission-claim="${escapeHtml(runItem.id)}" ${runItem.readyToClaim ? '' : 'disabled'}>${runItem.readyToClaim ? '결과 받기' : '진행 중'}</button>
    </article>
  `).join('');
  list.querySelectorAll('[data-mission-claim]').forEach((button) => {
    button.addEventListener('click', () => claimMissionRun(button.dataset.missionClaim, button));
  });
}

async function startSelectedMission(button = null) {
  const mission = selectedMission();
  const squad = selectedMissionSquad();
  const blockReason = missionStartBlockReason();
  if (blockReason) {
    showReadyNotice(blockReason);
    renderMissionStartState();
    return;
  }
  const actionKey = buildMercenaryActionKey('mission-start', {
    offerId: mission.offerId,
    squadId: squad.id,
    ownedMercenaryIds: (squad.ownedMercenaryIds || []).map(String)
  });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '파견 중...',
      task: () => apiRequest('/api/mercenary/runs/start', {
        method: 'POST',
        body: JSON.stringify({
          offerId: mission.offerId,
          squadId: squad.id,
          clientRequestId: createClientRequestId('run-start')
        }),
        perfScope: 'mercenary-run-start'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice('의뢰를 시작했습니다. 용병들이 파견 중 상태가 됩니다.');
    await loadMissionData();
    renderMissionView();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '의뢰 시작에 실패했습니다.');
  }
}

async function rejectSelectedMissionOffer(button = null) {
  const mission = selectedMission();
  if (!mission?.offerId) {
    showReadyNotice('거부할 의뢰를 선택하세요.');
    return;
  }
  const confirmed = window.confirm('이 의뢰를 거부하시겠습니까? 거부한 의뢰는 게시판에서 사라지고, 새 의뢰는 다음 보충 시간에 들어옵니다.');
  if (!confirmed) return;

  const actionKey = buildMercenaryActionKey('mission-reject', { offerId: mission.offerId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '거부 중...',
      task: () => apiRequest('/api/mercenary/mission-offers/reject', {
        method: 'POST',
        body: JSON.stringify({
          offerId: mission.offerId,
          clientRequestId: createClientRequestId('mission-reject')
        }),
        perfScope: 'mercenary-mission-reject'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    if (missionState.selectedOfferId === mission.offerId) {
      missionState.selectedOfferId = '';
      missionState.selectedMissionId = '';
    }
    showReadyNotice('의뢰를 거부했습니다. 새 의뢰는 다음 보충 시간에 들어옵니다.');
    await loadMissionData();
    renderMissionView();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '의뢰 거부에 실패했습니다.');
  }
}

async function claimMissionRun(runId, button = null) {
  const actionKey = buildMercenaryActionKey('mission-claim', { runId, id: runId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '수령 중...',
      task: () => apiRequest('/api/mercenary/runs/claim', {
        method: 'POST',
        body: JSON.stringify({
          runId,
          clientRequestId: createClientRequestId('run-claim')
        }),
        perfScope: 'mercenary-run-claim'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    renderMissionResult(payload);
    await loadMissionData();
    renderMissionView();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '의뢰 결과 수령에 실패했습니다.');
  }
}

function renderMissionResult(payload) {
  const modal = document.querySelector('#mission-result-modal');
  const title = document.querySelector('#mission-result-title');
  const content = document.querySelector('#mission-result-content');
  if (!modal || !title || !content) return;
  const result = payload?.result || {};
  const injury = payload?.injury || result.injury || {};
  title.textContent = result.status === 'success' ? '의뢰 성공' : '의뢰 실패';
  content.innerHTML = `
    <p>${escapeHtml(result.resultText || '')}</p>
    ${injury.occurred ? `
      <div class="mission-injury-alert">
        <strong>부상 발생</strong>
        <p>${escapeHtml(injury.injuredMember?.name || '참여 용병 1명')}가 부상당했습니다. 의무실에서 치료가 필요합니다.</p>
        <button type="button" id="mission-infirmary-open">의무실로 이동</button>
      </div>
    ` : ''}
    ${renderRewardGrowthSummary(payload)}
  `;
  modal.hidden = false;
  document.querySelector('#mission-infirmary-open')?.addEventListener('click', () => {
    closeMissionResult();
    closeMissionView();
    openInfirmaryView();
  });
}

function closeMissionResult() {
  document.querySelector('#mission-result-modal')?.setAttribute('hidden', '');
}

function normalizeInfirmaryTreatment(item) {
  return {
    ...item,
    ownedId: String(item?.ownedId || ''),
    treatmentId: String(item?.treatmentId || ''),
    level: Number(item?.level || 1) || 1,
    costGold: Number(item?.costGold || 0) || 0,
    durationSeconds: Number(item?.durationSeconds || 0) || 0,
    remainingSeconds: Math.max(0, Number(item?.remainingSeconds || 0) || 0),
    readyToClaim: Boolean(item?.readyToClaim)
  };
}

async function loadInfirmaryData() {
  const payload = await apiRequest('/api/mercenary/infirmary', { perfScope: 'mercenary-infirmary' });
  updateMercenaryCurrencyDisplay(payload);
  infirmaryState.injured = Array.isArray(payload?.injured)
    ? payload.injured.map(normalizeMercenaryForRoster)
    : [];
  infirmaryState.treating = Array.isArray(payload?.treating)
    ? payload.treating.map(normalizeInfirmaryTreatment)
    : [];
  infirmaryState.errorMessage = '';
}

async function openInfirmaryView() {
  if (!requireMercenaryAuth()) return;
  const screen = document.querySelector('#mercenary-infirmary-view');
  if (!screen) return;
  screen.hidden = false;
  document.body.classList.add('infirmary-open');
  infirmaryState.loading = true;
  infirmaryState.errorMessage = '';
  renderInfirmaryLoading();

  try {
    await loadInfirmaryData();
  } catch (error) {
    console.warn('[mercenary/infirmary] load failed', error);
    if (error.status === 401) {
      closeInfirmaryView();
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    infirmaryState.errorMessage = '의무실 정보를 불러오지 못했습니다.';
  } finally {
    infirmaryState.loading = false;
  }
  renderInfirmaryView();
  bindInfirmaryControls();
  startInfirmaryTimer();
}

function closeInfirmaryView() {
  document.querySelector('#mercenary-infirmary-view')?.setAttribute('hidden', '');
  document.body.classList.remove('infirmary-open');
  stopInfirmaryTimer();
}

function renderInfirmaryLoading() {
  const injured = document.querySelector('#infirmary-injured-list');
  const treating = document.querySelector('#infirmary-treating-list');
  if (injured) injured.innerHTML = '<p class="infirmary-empty">부상자 명단을 불러오는 중입니다.</p>';
  if (treating) treating.innerHTML = '<p class="infirmary-empty">치료 기록을 불러오는 중입니다.</p>';
}

function renderInfirmaryError(message) {
  const injured = document.querySelector('#infirmary-injured-list');
  const treating = document.querySelector('#infirmary-treating-list');
  if (injured) injured.innerHTML = `<p class="infirmary-empty">${escapeHtml(message)}</p>`;
  if (treating) treating.innerHTML = '<p class="infirmary-empty">다시 시도해 주세요.</p>';
}

function renderInfirmaryView() {
  if (infirmaryState.errorMessage) {
    renderInfirmaryError(infirmaryState.errorMessage);
    return;
  }
  const gold = document.querySelector('#infirmary-gold');
  const injuredCount = document.querySelector('#infirmary-injured-count');
  const treatingCount = document.querySelector('#infirmary-treating-count');
  if (gold) gold.textContent = `${formatNumber(mercenaryLobbyState.gold)}G`;
  if (injuredCount) injuredCount.textContent = `${formatNumber(infirmaryState.injured.length)}명`;
  if (treatingCount) treatingCount.textContent = `${formatNumber(infirmaryState.treating.length)}명`;
  renderInfirmaryInjured();
  renderInfirmaryTreating();
}

function renderInfirmaryInjured() {
  const list = document.querySelector('#infirmary-injured-list');
  if (!list) return;
  if (!infirmaryState.injured.length) {
    list.innerHTML = '<p class="infirmary-empty">부상자가 없습니다.</p>';
    return;
  }
  list.innerHTML = infirmaryState.injured.map((item) => {
    const cost = Number(item.treatmentCostGold || 0) || 0;
    const canAfford = mercenaryLobbyState.gold >= cost;
    return `
      <article class="infirmary-card is-injured">
        ${renderImageWithPlaceholder(item, 'infirmary-portrait')}
        <div class="infirmary-card-body">
          <span class="infirmary-grade ${getGradeClass(item.grade)}">${escapeHtml(item.grade)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>Lv.${formatNumber(item.level)} · ${escapeHtml(item.species || item.role || '용병')}</p>
          <em>상태: ${escapeHtml(item.statusLabel || item.status || '부상')}</em>
        </div>
        <div class="infirmary-card-action">
          <span>치료비 ${formatNumber(cost)}G</span>
          <span>${formatMissionDuration(item.treatmentDurationSeconds || 0)}</span>
          <button type="button" data-treatment-start="${escapeHtml(item.ownedId)}" ${canAfford ? '' : 'disabled'}>${canAfford ? '치료 시작' : '골드 부족'}</button>
        </div>
      </article>
    `;
  }).join('');
  list.querySelectorAll('[data-treatment-start]').forEach((button) => {
    button.addEventListener('click', () => startInfirmaryTreatment(button.dataset.treatmentStart, button));
  });
}

function renderInfirmaryTreating() {
  const list = document.querySelector('#infirmary-treating-list');
  if (!list) return;
  if (!infirmaryState.treating.length) {
    list.innerHTML = '<p class="infirmary-empty">치료 중인 용병이 없습니다.</p>';
    return;
  }
  list.innerHTML = infirmaryState.treating.map((item) => `
    <article class="infirmary-card is-treating">
      ${renderImageWithPlaceholder(item, 'infirmary-portrait')}
      <div class="infirmary-card-body">
        <span class="infirmary-grade ${getGradeClass(item.grade)}">${escapeHtml(item.grade)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <p>Lv.${formatNumber(item.level)} · 치료비 ${formatNumber(item.costGold)}G</p>
        <em>${item.readyToClaim ? '치료 완료 대기' : `남은 시간 ${formatMissionDuration(item.remainingSeconds)}`}</em>
      </div>
      <div class="infirmary-card-action">
        <span>${item.readyToClaim ? '복귀 가능' : '치료 진행 중'}</span>
        <button type="button" data-treatment-claim="${escapeHtml(item.treatmentId)}" ${item.readyToClaim ? '' : 'disabled'}>${item.readyToClaim ? '치료 완료' : '대기'}</button>
      </div>
    </article>
  `).join('');
  list.querySelectorAll('[data-treatment-claim]').forEach((button) => {
    button.addEventListener('click', () => claimInfirmaryTreatment(button.dataset.treatmentClaim, button));
  });
}

async function startInfirmaryTreatment(ownedMercenaryId, button = null) {
  const actionKey = buildMercenaryActionKey('treatment-start', { ownedMercenaryId, mercenaryId: ownedMercenaryId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '치료 중...',
      task: () => apiRequest('/api/mercenary/infirmary/treat/start', {
        method: 'POST',
        body: JSON.stringify({
          ownedMercenaryId,
          clientRequestId: createClientRequestId('treatment-start')
        }),
        perfScope: 'mercenary-treatment-start'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    infirmaryState.injured = Array.isArray(payload?.injured) ? payload.injured.map(normalizeMercenaryForRoster) : infirmaryState.injured;
    infirmaryState.treating = Array.isArray(payload?.treating) ? payload.treating.map(normalizeInfirmaryTreatment) : infirmaryState.treating;
    renderInfirmaryView();
    showReadyNotice('치료를 시작했습니다. 용병단 골드가 차감되었습니다.');
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '치료 시작에 실패했습니다.');
  }
}

async function claimInfirmaryTreatment(treatmentId, button = null) {
  const actionKey = buildMercenaryActionKey('treatment-claim', { treatmentId, id: treatmentId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '완료 중...',
      task: () => apiRequest('/api/mercenary/infirmary/treat/claim', {
        method: 'POST',
        body: JSON.stringify({
          treatmentId,
          clientRequestId: createClientRequestId('treatment-claim')
        }),
        perfScope: 'mercenary-treatment-claim'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    infirmaryState.injured = Array.isArray(payload?.injured) ? payload.injured.map(normalizeMercenaryForRoster) : infirmaryState.injured;
    infirmaryState.treating = Array.isArray(payload?.treating) ? payload.treating.map(normalizeInfirmaryTreatment) : infirmaryState.treating;
    renderInfirmaryView();
    showReadyNotice('치료가 완료되었습니다. 용병이 대기 중으로 복귀했습니다.');
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '치료 완료 처리에 실패했습니다.');
  }
}

function startInfirmaryTimer() {
  stopInfirmaryTimer();
  infirmaryTimer = window.setInterval(() => {
    if (document.querySelector('#mercenary-infirmary-view')?.hidden) {
      stopInfirmaryTimer();
      return;
    }
    let changed = false;
    infirmaryState.treating = infirmaryState.treating.map((item) => {
      if (item.readyToClaim || item.remainingSeconds <= 0) return item;
      changed = true;
      const nextRemaining = Math.max(0, item.remainingSeconds - 1);
      return { ...item, remainingSeconds: nextRemaining, readyToClaim: nextRemaining <= 0 };
    });
    if (changed) renderInfirmaryTreating();
  }, 1000);
}

function stopInfirmaryTimer() {
  if (infirmaryTimer) {
    window.clearInterval(infirmaryTimer);
    infirmaryTimer = null;
  }
}

function bindInfirmaryControls() {
  const closeButton = document.querySelector('#infirmary-close-button');
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeInfirmaryView);
  }
}

function selectedOfficeFacility() {
  return officeState.facilities.find((facility) => facility.key === officeState.selectedFacilityKey)
    || officeState.facilities[0]
    || null;
}

function formatOfficeEffectValue(key, value) {
  const number = Number(value || 0);
  if (key === 'missionSuccessBonusPoints' || key === 'injuryChanceReductionPoints') {
    return `${number > 0 ? '+' : ''}${Math.round(number * 10) / 10}%p`;
  }
  return `${Math.round(number * 100)}%`;
}

function officeEffectLabel(key) {
  return {
    offerRefillReductionPct: '의뢰 보충 시간 감소',
    rewardGoldBonusPct: '의뢰 성공 보상 증가',
    treatmentCostReductionPct: '치료비 감소',
    treatmentTimeReductionPct: '치료 시간 감소',
    missionSuccessBonusPoints: '의뢰 성공률 보너스',
    missionDurationReductionPct: '의뢰 소요 시간 감소',
    injuryChanceReductionPoints: '부상 확률 감소'
  }[key] || key;
}

async function loadOfficeData() {
  officeState.loading = true;
  officeState.errorMessage = '';
  renderOfficeView();
  try {
    const payload = await apiRequest('/api/mercenary/office', { perfScope: 'mercenary-office' });
    updateMercenaryCurrencyDisplay(payload);
    officeState.facilities = Array.isArray(payload.facilities) ? payload.facilities : [];
    officeState.availableMercenaries = Array.isArray(payload.availableMercenaries) ? payload.availableMercenaries : [];
    officeState.assignedMercenaries = Array.isArray(payload.assignedMercenaries) ? payload.assignedMercenaries : [];
    officeState.officeEffects = payload.officeEffects || null;
    if (!officeState.facilities.some((facility) => facility.key === officeState.selectedFacilityKey)) {
      officeState.selectedFacilityKey = officeState.facilities[0]?.key || 'reception';
    }
  } catch (error) {
    if (error.status === 401 || error.data?.error === 'UNAUTHORIZED') {
      showMercenaryLoginRequiredModal();
      closeOfficeView();
      return;
    }
    officeState.errorMessage = error.data?.message || error.message || '사무실 정보를 불러오지 못했습니다.';
  } finally {
    officeState.loading = false;
    renderOfficeView();
  }
}

async function openOfficeView() {
  const screen = document.querySelector('#mercenary-office-view');
  if (!screen) return;
  screen.removeAttribute('hidden');
  await loadOfficeData();
}

function closeOfficeView() {
  document.querySelector('#mercenary-office-view')?.setAttribute('hidden', '');
}

function renderOfficeFacilities() {
  const list = document.querySelector('#office-facility-list');
  const count = document.querySelector('#office-facility-count');
  if (!list) return;
  if (count) count.textContent = `${officeState.facilities.length}개`;
  if (!officeState.facilities.length) {
    list.innerHTML = '<p class="office-empty">시설 정보를 불러오지 못했습니다.</p>';
    return;
  }
  list.innerHTML = officeState.facilities.map((facility) => {
    const assignedCount = (facility.slots || []).filter((slot) => slot.assignment).length;
    const selected = facility.key === selectedOfficeFacility()?.key;
    return `
      <button class="office-facility-card ${selected ? 'is-selected' : ''}" type="button" data-office-facility="${escapeHtml(facility.key)}">
        <strong>${escapeHtml(facility.label)}</strong>
        <span>${formatNumber(assignedCount)} / ${formatNumber(facility.maxSlots)}명 · 효율 ${formatNumber(Math.round(Number(facility.efficiency || 0) * 100))}%</span>
        <em>${(facility.effectLabels || []).map(escapeHtml).join(' · ')}</em>
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-office-facility]').forEach((button) => {
    button.addEventListener('click', () => {
      officeState.selectedFacilityKey = button.dataset.officeFacility;
      renderOfficeView();
    });
  });
}

function renderOfficeDetail() {
  const root = document.querySelector('#office-detail');
  const facility = selectedOfficeFacility();
  if (!root) return;
  if (officeState.loading) {
    root.innerHTML = '<p class="office-empty">사무실 장부를 펼치는 중입니다.</p>';
    return;
  }
  if (officeState.errorMessage) {
    root.innerHTML = `<p class="office-empty">${escapeHtml(officeState.errorMessage)}</p>`;
    return;
  }
  if (!facility) {
    root.innerHTML = '<p class="office-empty">선택된 시설이 없습니다.</p>';
    return;
  }
  const effects = Object.entries(facility.effects || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([key, value]) => `<span>${escapeHtml(officeEffectLabel(key))} ${escapeHtml(formatOfficeEffectValue(key, value))}</span>`)
    .join('');
  root.innerHTML = `
    <div class="office-detail-head">
      <span class="office-kicker">선택 시설</span>
      <h3>${escapeHtml(facility.label)}</h3>
      <p>${escapeHtml(facility.description || '')}</p>
    </div>
    <div class="office-detail-grid">
      <div><span>주요 스탯</span><strong>${(facility.primaryStats || []).map(escapeHtml).join(', ')}</strong></div>
      <div><span>권장 작업력</span><strong>${formatNumber(facility.recommendedPower)}</strong></div>
      <div><span>현재 작업력</span><strong>${formatNumber(facility.workPower)}</strong></div>
      <div><span>효율</span><strong>${formatNumber(Math.round(Number(facility.efficiency || 0) * 100))}%</strong></div>
    </div>
    <div class="office-efficiency-meter" aria-label="시설 효율"><span style="width: ${Math.min(100, Math.round(Number(facility.efficiency || 0) * 100))}%"></span></div>
    <div class="office-tag-line">${(facility.preferredTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="office-effect-chips">${effects || '<span>효과 없음</span>'}</div>
    <div class="office-slot-list">
      ${(facility.slots || []).map((slot) => {
        const mercenary = slot.mercenary;
        return `
          <article class="office-slot-card ${mercenary ? 'is-filled' : ''}">
            <div class="office-slot-label">슬롯 ${formatNumber(Number(slot.slotIndex) + 1)}</div>
            ${mercenary ? `
              ${renderImageWithPlaceholder(mercenary, 'office-slot-portrait')}
              <div>
                <strong>${escapeHtml(mercenary.name)}</strong>
                <p>${mercenary.isMaxLevel ? 'Lv.MAX' : `Lv. ${formatNumber(mercenary.level)} / ${formatNumber(mercenary.maxLevel)}`} · 작업력 ${formatNumber(mercenary.workPower)}</p>
                <p>${(mercenary.tags || []).slice(0, 3).map(escapeHtml).join(' · ') || '태그 없음'}</p>
              </div>
              <button type="button" data-office-unassign="${escapeHtml(slot.assignment?.id || '')}">배치 해제</button>
            ` : '<div class="office-empty-slot">오른쪽 목록에서 용병을 배치하세요.</div>'}
          </article>
        `;
      }).join('')}
    </div>
  `;
  root.querySelectorAll('[data-office-unassign]').forEach((button) => {
    button.addEventListener('click', () => unassignOfficeMercenary(button.dataset.officeUnassign, button));
  });
}

function renderOfficeRoster() {
  const list = document.querySelector('#office-roster-list');
  const count = document.querySelector('#office-roster-count');
  const facility = selectedOfficeFacility();
  if (!list) return;
  if (count) count.textContent = `${officeState.availableMercenaries.length}명`;
  if (officeState.loading) {
    list.innerHTML = '<p class="office-empty">배치 가능한 용병을 확인 중입니다.</p>';
    return;
  }
  if (!officeState.availableMercenaries.length) {
    list.innerHTML = '<p class="office-empty">대기 중인 용병이 없습니다. 파견/치료/사무실 배치 중인 용병은 사용할 수 없습니다.</p>';
    return;
  }
  const hasEmptySlot = Boolean((facility?.slots || []).some((slot) => !slot.assignment));
  list.innerHTML = officeState.availableMercenaries.map((mercenary) => `
    <article class="office-roster-card ${getGradeClass(mercenary.grade)}">
      ${renderImageWithPlaceholder(mercenary, 'office-roster-portrait')}
      <div>
        <span class="office-grade">${escapeHtml(mercenary.grade)}</span>
        <strong>${escapeHtml(mercenary.name)}</strong>
        <p>${mercenary.isMaxLevel ? 'Lv.MAX' : `Lv. ${formatNumber(mercenary.level)} / ${formatNumber(mercenary.maxLevel)}`} · 작업력 ${formatNumber(mercenary.workPower)}</p>
        <p>${(mercenary.tags || []).slice(0, 4).map(escapeHtml).join(' · ') || '태그 없음'}</p>
      </div>
      <button type="button" data-office-assign="${escapeHtml(mercenary.ownedId)}" ${hasEmptySlot ? '' : 'disabled'}>배치</button>
    </article>
  `).join('');
  list.querySelectorAll('[data-office-assign]').forEach((button) => {
    button.addEventListener('click', () => assignOfficeMercenary(button.dataset.officeAssign, button));
  });
}

function renderOfficeEffectsSummary() {
  const root = document.querySelector('#office-effects-panel');
  if (!root) return;
  const effects = officeState.officeEffects || {};
  const items = Object.entries(effects)
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([key, value]) => `<span><b>${escapeHtml(officeEffectLabel(key))}</b> ${escapeHtml(formatOfficeEffectValue(key, value))}</span>`);
  root.innerHTML = `<strong>현재 사무실 총 효과</strong>${items.length ? items.join('') : '<span>배치 효과 없음</span>'}`;
}

function renderOfficeView() {
  renderOfficeFacilities();
  renderOfficeDetail();
  renderOfficeRoster();
  renderOfficeEffectsSummary();
}

async function assignOfficeMercenary(ownedMercenaryId, button = null) {
  const facility = selectedOfficeFacility();
  const slot = (facility?.slots || []).find((item) => !item.assignment);
  if (!facility || !slot) {
    showReadyNotice('빈 사무실 슬롯이 없습니다.');
    return;
  }
  const actionKey = buildMercenaryActionKey('office-assign', {
    ownedMercenaryId,
    facilityKey: facility.key,
    slotIndex: slot.slotIndex
  });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '배치 중...',
      task: () => apiRequest('/api/mercenary/office/assign', {
        method: 'POST',
        body: JSON.stringify({
          facilityKey: facility.key,
          slotIndex: slot.slotIndex,
          ownedMercenaryId,
          clientRequestId: createClientRequestId('office-assign')
        }),
        perfScope: 'mercenary-office-assign'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice('용병을 사무실에 배치했습니다.');
    await loadOfficeData();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사무실 배치에 실패했습니다.');
  }
}

async function unassignOfficeMercenary(assignmentId, button = null) {
  if (!assignmentId) return;
  const actionKey = buildMercenaryActionKey('office-unassign', { assignmentId, id: assignmentId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '해제 중...',
      task: () => apiRequest('/api/mercenary/office/unassign', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId,
          clientRequestId: createClientRequestId('office-unassign')
        }),
        perfScope: 'mercenary-office-unassign'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice('사무실 배치를 해제했습니다.');
    await loadOfficeData();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '배치 해제에 실패했습니다.');
  }
}

function bindOfficeControls() {
  const closeButton = document.querySelector('#office-close-button');
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeOfficeView);
  }
}

function selectedCaseSummary() {
  return caseState.cases.find((item) => item.caseId === caseState.selectedCaseId) || caseState.cases[0] || null;
}

function selectedCaseStep() {
  const steps = caseState.detail?.steps || [];
  return steps.find((step) => ['available', 'running'].includes(step.status))
    || steps.find((step) => step.status === 'completed')
    || steps[0]
    || null;
}

function caseStatusLabel(status) {
  return {
    locked: '잠김',
    available: '진행 가능',
    in_progress: '진행 중',
    completed: '완료',
    reward_claimed: '보상 수령'
  }[status] || '확인 필요';
}

async function loadCaseList() {
  const payload = await apiRequest('/api/mercenary/cases', { perfScope: 'mercenary-cases' });
  updateMercenaryCurrencyDisplay(payload);
  caseState.cases = Array.isArray(payload.cases) ? payload.cases : [];
  if (!caseState.selectedCaseId || !caseState.cases.some((item) => item.caseId === caseState.selectedCaseId)) {
    caseState.selectedCaseId = caseState.cases[0]?.caseId || '';
  }
}

async function loadCaseDetail(caseId = caseState.selectedCaseId) {
  if (!caseId) {
    caseState.detail = null;
    return;
  }
  const payload = await apiRequest(`/api/mercenary/cases/${encodeURIComponent(caseId)}`, { perfScope: 'mercenary-case-detail' });
  updateMercenaryCurrencyDisplay(payload);
  caseState.detail = payload;
  caseState.selectedCaseId = payload.case?.caseId || caseId;
  const availableIds = new Set((payload.availableMercenaries || []).map((item) => String(item.ownedId)));
  caseState.selectedOwnedIds = caseState.selectedOwnedIds.filter((id) => availableIds.has(String(id)));
}

async function openCaseView() {
  const screen = document.querySelector('#mercenary-case-view');
  if (!screen) return;
  screen.removeAttribute('hidden');
  caseState.loading = true;
  caseState.errorMessage = '';
  renderCaseView();
  try {
    await loadCaseList();
    await loadCaseDetail();
  } catch (error) {
    if (error.status === 401 || error.data?.error === 'UNAUTHORIZED') {
      showMercenaryLoginRequiredModal();
      closeCaseView();
      return;
    }
    caseState.errorMessage = error.data?.message || error.message || '사건 파일을 불러오지 못했습니다.';
  } finally {
    caseState.loading = false;
    renderCaseView();
    startCaseTimer();
  }
}

function closeCaseView() {
  document.querySelector('#mercenary-case-view')?.setAttribute('hidden', '');
  stopCaseTimer();
}

function filteredCaseList() {
  if (caseState.filter === '전체') return caseState.cases;
  const map = {
    '진행 가능': 'available',
    '진행 중': 'in_progress',
    '완료': 'completed',
    '잠김': 'locked'
  };
  const status = map[caseState.filter] || '';
  return caseState.cases.filter((item) => item.status === status || (caseState.filter === '완료' && item.status === 'reward_claimed'));
}

function renderCaseFilters() {
  const root = document.querySelector('#case-filter-row');
  if (!root) return;
  const filters = ['전체', '진행 가능', '진행 중', '완료', '잠김'];
  root.innerHTML = filters.map((filter) => `
    <button type="button" class="${caseState.filter === filter ? 'is-active' : ''}" data-case-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>
  `).join('');
  root.querySelectorAll('[data-case-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      caseState.filter = button.dataset.caseFilter;
      renderCaseView();
    });
  });
}

function renderCaseList() {
  const list = document.querySelector('#case-list');
  const count = document.querySelector('#case-count');
  if (!list) return;
  const items = filteredCaseList();
  if (count) count.textContent = `${formatNumber(items.length)}건`;
  if (caseState.loading) {
    list.innerHTML = '<p class="case-empty">사건 파일 장을 넘기는 중입니다.</p>';
    return;
  }
  if (!items.length) {
    list.innerHTML = '<p class="case-empty">표시할 사건 파일이 없습니다.</p>';
    return;
  }
  list.innerHTML = items.map((item) => `
    <button class="case-card ${item.caseId === caseState.selectedCaseId ? 'is-selected' : ''} status-${escapeHtml(item.status)}" type="button" data-case-id="${escapeHtml(item.caseId)}">
      <span>${escapeHtml(caseStatusLabel(item.status))} · 위험도 ${escapeHtml(item.risk)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.subtitle || '')}</small>
      <em>${formatNumber(item.completedSteps || 0)} / ${formatNumber(item.totalSteps || 0)} 단계</em>
      ${item.lockedReason ? `<i>${escapeHtml(item.lockedReason)}</i>` : ''}
      <b>보상 ${formatNumber(item.finalRewards?.mercenaryGold || 0)}G · 사무소 EXP ${formatNumber(item.finalRewards?.officeExp || 0)}</b>
    </button>
  `).join('');
  list.querySelectorAll('[data-case-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      caseState.selectedCaseId = button.dataset.caseId;
      caseState.selectedOwnedIds = [];
      caseState.loading = true;
      renderCaseView();
      try {
        await loadCaseDetail(caseState.selectedCaseId);
      } catch (error) {
        caseState.errorMessage = error.data?.message || error.message || '사건 파일 상세를 불러오지 못했습니다.';
      } finally {
        caseState.loading = false;
        renderCaseView();
      }
    });
  });
}

function casePreviewForSelection() {
  const step = selectedCaseStep();
  const mission = step?.missionPreview;
  if (!mission) return null;
  const members = (caseState.detail?.availableMercenaries || []).filter((item) => caseState.selectedOwnedIds.includes(String(item.ownedId)));
  return calculateMissionSuccessRate(members, mission, caseState.detail?.officeEffects);
}

function renderCaseDetail() {
  const root = document.querySelector('#case-detail');
  if (!root) return;
  if (caseState.errorMessage) {
    root.innerHTML = `<p class="case-empty">${escapeHtml(caseState.errorMessage)}</p>`;
    return;
  }
  const detail = caseState.detail;
  const caseFile = detail?.case || selectedCaseSummary();
  if (!caseFile) {
    root.innerHTML = '<p class="case-empty">사건 파일을 선택하세요.</p>';
    return;
  }
  const steps = detail?.steps || [];
  const currentStep = selectedCaseStep();
  const preview = casePreviewForSelection();
  root.innerHTML = `
    <div class="case-detail-head">
      <span class="case-kicker">연쇄 의뢰</span>
      <h3>${escapeHtml(caseFile.title)}</h3>
      <p>${escapeHtml(caseFile.description || caseFile.subtitle || '')}</p>
    </div>
    <div class="case-detail-grid">
      <div><span>상태</span><strong>${escapeHtml(caseStatusLabel(caseFile.status))}</strong></div>
      <div><span>위험도</span><strong>${escapeHtml(caseFile.risk)}</strong></div>
      <div><span>필요 레벨</span><strong>사무소 Lv.${formatNumber(caseFile.requiredOfficeLevel)}</strong></div>
      <div><span>진행도</span><strong>${formatNumber(caseFile.completedSteps || 0)} / ${formatNumber(caseFile.totalSteps || 0)}</strong></div>
    </div>
    <div class="case-tag-line">${(caseFile.recommendedTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    ${caseFile.lockedReason ? `<p class="case-lock-message">${escapeHtml(caseFile.lockedReason)}</p>` : ''}
    <div class="case-step-timeline">
      ${steps.map((step) => `
        <article class="case-step-card status-${escapeHtml(step.status)}">
          <span>${formatNumber(step.order)}단계 · ${escapeHtml(step.status === 'running' ? '파견 중' : step.status === 'completed' ? '완료' : step.status === 'available' ? '진행 가능' : '잠김')}</span>
          <strong>${escapeHtml(step.title)}</strong>
          <p>${escapeHtml(step.introText || '')}</p>
          ${step.runningRun ? `<em>${step.runningRun.readyToClaim ? '결과 수령 가능' : `남은 시간 ${formatMissionDuration(step.runningRun.remainingSeconds)}`}</em>` : ''}
        </article>
      `).join('')}
    </div>
    <div class="case-current-panel">
      <strong>${currentStep ? escapeHtml(currentStep.title) : '현재 단계 없음'}</strong>
      <p>${currentStep?.missionPreview ? `권장 작업력 ${formatNumber(currentStep.missionPreview.recommendedWorkPower)} · ${formatNumber(currentStep.missionPreview.minMembers)}~${formatNumber(currentStep.missionPreview.maxMembers)}명 · 성공 보상 ${formatNumber(currentStep.missionPreview.rewardGold)}G` : '사건 파일을 시작하면 현재 단계가 표시됩니다.'}</p>
      <p>${preview ? `예상 성공률 ${formatNumber(preview.successRate)}% · 작업력 ${formatNumber(preview.partyWorkPower)} · 사무실 보너스 +${Math.round((preview.officeBonusPoints || 0) * 10) / 10}%p` : '용병을 선택하면 예상 성공률이 표시됩니다.'}</p>
      <div class="case-action-row">
        ${caseFile.status === 'available' ? '<button type="button" id="case-start-button">사건 시작</button>' : ''}
        ${currentStep?.status === 'available' ? '<button type="button" id="case-step-start-button">현재 단계 파견</button>' : ''}
        ${currentStep?.status === 'running' ? `<button type="button" id="case-step-claim-button" ${currentStep.canClaim ? '' : 'disabled'}>${currentStep.canClaim ? '단계 결과 수령' : '진행 중'}</button>` : ''}
        ${caseFile.status === 'completed' ? '<button type="button" id="case-reward-button">최종 보상 수령</button>' : ''}
      </div>
    </div>
  `;
  document.querySelector('#case-start-button')?.addEventListener('click', (event) => startSelectedCase(event.currentTarget));
  document.querySelector('#case-step-start-button')?.addEventListener('click', (event) => startSelectedCaseStep(event.currentTarget));
  document.querySelector('#case-step-claim-button')?.addEventListener('click', (event) => claimSelectedCaseStep(event.currentTarget));
  document.querySelector('#case-reward-button')?.addEventListener('click', (event) => claimSelectedCaseReward(event.currentTarget));
}

function renderCaseDispatch() {
  const summary = document.querySelector('#case-dispatch-summary');
  const list = document.querySelector('#case-roster-list');
  const count = document.querySelector('#case-member-count');
  const step = selectedCaseStep();
  const mission = step?.missionPreview;
  const available = caseState.detail?.availableMercenaries || [];
  const selected = available.filter((item) => caseState.selectedOwnedIds.includes(String(item.ownedId)));
  const preview = casePreviewForSelection();
  if (count) count.textContent = `${formatNumber(selected.length)}명`;
  if (summary) {
    summary.innerHTML = `
      <strong>${step ? escapeHtml(step.title) : '단계 미선택'}</strong>
      <p>${mission ? `${formatNumber(mission.minMembers)}~${formatNumber(mission.maxMembers)}명 필요` : '사건 진행 단계가 없습니다.'}</p>
      <p>${preview ? `예상 성공률 ${formatNumber(preview.successRate)}%` : '대기 중 용병을 선택하세요.'}</p>
    `;
  }
  if (!list) return;
  if (!available.length) {
    list.innerHTML = '<p class="case-empty">대기 중인 용병이 없습니다. 사무실 배치/부상/치료/파견 중인 용병은 사용할 수 없습니다.</p>';
    return;
  }
  const maxMembers = Number(mission?.maxMembers || 3) || 3;
  list.innerHTML = available.map((member) => {
    const ownedId = String(member.ownedId);
    const isSelected = caseState.selectedOwnedIds.includes(ownedId);
    const disabled = !isSelected && caseState.selectedOwnedIds.length >= maxMembers;
    return `
      <button class="case-roster-card ${isSelected ? 'is-selected' : ''}" type="button" data-case-member="${escapeHtml(ownedId)}" ${disabled ? 'disabled' : ''}>
        ${renderImageWithPlaceholder(member, 'case-roster-portrait')}
        <span>
          <b>${escapeHtml(member.grade)} · ${escapeHtml(member.name)}</b>
          <em>${member.isMaxLevel ? 'Lv.MAX' : `Lv. ${formatNumber(member.level)} / ${formatNumber(member.maxLevel)}`} · 작업력 ${formatNumber(member.workPower)}</em>
          <small>${(member.tags || []).slice(0, 3).map(escapeHtml).join(' · ') || '태그 없음'}</small>
        </span>
        <strong>${isSelected ? '선택됨' : '선택'}</strong>
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-case-member]').forEach((button) => {
    button.addEventListener('click', () => {
      const ownedId = button.dataset.caseMember;
      if (caseState.selectedOwnedIds.includes(ownedId)) {
        caseState.selectedOwnedIds = caseState.selectedOwnedIds.filter((id) => id !== ownedId);
      } else {
        caseState.selectedOwnedIds.push(ownedId);
      }
      renderCaseView();
    });
  });
}

function renderCaseView() {
  renderCaseFilters();
  renderCaseList();
  renderCaseDetail();
  renderCaseDispatch();
}

async function refreshSelectedCase() {
  await loadCaseList();
  await loadCaseDetail(caseState.selectedCaseId);
  renderCaseView();
}

async function startSelectedCase(button = null) {
  const item = selectedCaseSummary();
  if (!item) return;
  const actionKey = buildMercenaryActionKey('case-start', { caseId: item.caseId, id: item.caseId });
  try {
    const result = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '시작 중...',
      task: () => apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/start`, {
        method: 'POST',
        body: JSON.stringify({ clientRequestId: createClientRequestId('case-start') }),
        perfScope: 'mercenary-case-start'
      })
    });
    if (!result) return;
    showReadyNotice('사건 파일을 시작했습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 시작에 실패했습니다.');
  }
}

async function startSelectedCaseStep(button = null) {
  const item = selectedCaseSummary();
  const step = selectedCaseStep();
  if (!item || !step) return;
  if (!caseState.selectedOwnedIds.length) {
    showReadyNotice('파견할 용병을 선택하세요.');
    return;
  }
  const actionKey = buildMercenaryActionKey('case-step-start', {
    caseId: item.caseId,
    stepId: step.stepId,
    ownedMercenaryIds: caseState.selectedOwnedIds
  });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '파견 중...',
      task: () => apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/steps/${encodeURIComponent(step.stepId)}/start`, {
        method: 'POST',
        body: JSON.stringify({
          ownedMercenaryIds: caseState.selectedOwnedIds,
          clientRequestId: createClientRequestId('case-step-start')
        }),
        perfScope: 'mercenary-case-step-start'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    caseState.selectedOwnedIds = [];
    showReadyNotice('사건 단계 의뢰를 시작했습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 단계 시작에 실패했습니다.');
  }
}

async function claimSelectedCaseStep(button = null) {
  const item = selectedCaseSummary();
  const step = selectedCaseStep();
  if (!item || !step) return;
  const actionKey = buildMercenaryActionKey('case-step-claim', { caseId: item.caseId, stepId: step.stepId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '수령 중...',
      task: () => apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/steps/${encodeURIComponent(step.stepId)}/claim`, {
        method: 'POST',
        body: JSON.stringify({ clientRequestId: createClientRequestId('case-step-claim') }),
        perfScope: 'mercenary-case-step-claim'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice(payload?.result?.status === 'success' ? '사건 단계 결과를 수령했습니다.' : '사건 단계는 실패했지만 다음 단서로 이어졌습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 단계 결과 수령에 실패했습니다.');
  }
}

async function claimSelectedCaseReward(button = null) {
  const item = selectedCaseSummary();
  if (!item) return;
  const actionKey = buildMercenaryActionKey('case-reward-claim', { caseId: item.caseId, id: item.caseId });
  try {
    const payload = await runLockedMercenaryAction({
      key: actionKey,
      button,
      label: '수령 중...',
      task: () => apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/reward/claim`, {
        method: 'POST',
        body: JSON.stringify({ clientRequestId: createClientRequestId('case-reward') }),
        perfScope: 'mercenary-case-reward'
      })
    });
    if (!payload) return;
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice(payload.completionText || '사건 최종 보상을 수령했습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 최종 보상 수령에 실패했습니다.');
  }
}

function startCaseTimer() {
  stopCaseTimer();
  caseTimer = window.setInterval(() => {
    if (document.querySelector('#mercenary-case-view')?.hidden) {
      stopCaseTimer();
      return;
    }
    let changed = false;
    if (caseState.detail?.steps) {
      caseState.detail.steps = caseState.detail.steps.map((step) => {
        if (!step.runningRun || step.runningRun.readyToClaim || step.runningRun.remainingSeconds <= 0) return step;
        const remainingSeconds = Math.max(0, Number(step.runningRun.remainingSeconds || 0) - 1);
        changed = true;
        return {
          ...step,
          canClaim: remainingSeconds <= 0,
          runningRun: {
            ...step.runningRun,
            remainingSeconds,
            readyToClaim: remainingSeconds <= 0
          }
        };
      });
    }
    if (changed) renderCaseView();
  }, 1000);
}

function stopCaseTimer() {
  if (caseTimer) {
    window.clearInterval(caseTimer);
    caseTimer = null;
  }
}

function bindCaseControls() {
  const closeButton = document.querySelector('#case-close-button');
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeCaseView);
  }
}

function startMissionTimer() {
  stopMissionTimer();
  missionTimer = window.setInterval(() => {
    if (document.querySelector('#mercenary-mission-view')?.hidden) {
      stopMissionTimer();
      return;
    }
    let changed = false;
    missionState.runs = missionState.runs.map((runItem) => {
      if (runItem.readyToClaim || runItem.remainingSeconds <= 0) return runItem;
      changed = true;
      const nextRemaining = Math.max(0, runItem.remainingSeconds - 1);
      return { ...runItem, remainingSeconds: nextRemaining, readyToClaim: nextRemaining <= 0 };
    });
    if (missionState.board?.secondsUntilNextOffer > 0) {
      missionState.board = {
        ...missionState.board,
        secondsUntilNextOffer: Math.max(0, missionState.board.secondsUntilNextOffer - 1)
      };
      changed = true;
    }
    if (changed) renderMissionRuns();
    if (changed) renderMissionList();
  }, 1000);
}

function stopMissionTimer() {
  if (missionTimer) {
    window.clearInterval(missionTimer);
    missionTimer = null;
  }
}

function bindMissionControls() {
  const closeButton = document.querySelector('#mission-close-button');
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeMissionView);
  }
  const startButton = document.querySelector('#mission-start-button');
  if (startButton && startButton.dataset.bound !== 'true') {
    startButton.dataset.bound = 'true';
    startButton.addEventListener('click', () => startSelectedMission(startButton));
  }
  const resultClose = document.querySelector('#mission-result-close');
  if (resultClose && resultClose.dataset.bound !== 'true') {
    resultClose.dataset.bound = 'true';
    resultClose.addEventListener('click', closeMissionResult);
  }
}

function setRosterErrorState(message, source = 'error') {
  ownedMercenaryRoster = [];
  rosterState.selectedId = '';
  rosterState.source = source;
  rosterState.errorMessage = message;
}

function showReadyNotice(message = '준비 중입니다.') {
  const notice = document.querySelector('#lobby-notice');
  if (!notice) return;
  notice.textContent = typeof message === 'string' ? message : '준비 중입니다.';
  notice.hidden = false;
  window.clearTimeout(showReadyNotice.timer);
  showReadyNotice.timer = window.setTimeout(() => {
    notice.hidden = true;
  }, 1800);
}

function renderBgmSettingsControls(container) {
  if (!container) return;
  const audio = window.MercenaryAudio || null;
  const settings = audio?.getAudioSettings?.() || {
    muted: false,
    bgmMuted: !bgmState.enabled,
    sfxMuted: false,
    masterVolume: 0.8,
    bgmVolume: bgmState.volume,
    sfxVolume: 0.75
  };
  const percent = (value) => Math.round(clampNumber(value, 0, 1, 0) * 100);
  const bgmEnabled = audio ? !settings.bgmMuted : bgmState.enabled;
  const bgmVolumeValue = audio ? settings.bgmVolume : bgmState.volume;
  const currentTrack = MERCENARY_BGM_TRACKS.find((track) => track.id === bgmState.currentTrackId);
  container.innerHTML = `
    <section class="setting-section mercenary-audio-settings">
      <div class="setting-section-heading">
        <h3>사운드</h3>
        <p>기존 사무소 BGM 설정을 유지하면서 전투 BGM/SFX를 함께 조절합니다.</p>
      </div>
      <label class="setting-row">
        <span>사운드 전체 끄기</span>
        <input type="checkbox" data-audio-muted-toggle ${settings.muted ? 'checked' : ''} ${audio ? '' : 'disabled'} />
      </label>
      <label class="setting-row">
        <span>BGM 사용</span>
        <input type="checkbox" data-audio-bgm-enabled-toggle ${bgmEnabled ? 'checked' : ''} />
      </label>
      <label class="setting-row">
        <span>SFX 사용</span>
        <input type="checkbox" data-audio-sfx-enabled-toggle ${settings.sfxMuted ? '' : 'checked'} ${audio ? '' : 'disabled'} />
      </label>
      <label class="setting-row setting-row-column">
        <span>마스터 볼륨 <b data-audio-master-volume-label>${percent(settings.masterVolume)}%</b></span>
        <input type="range" min="0" max="100" step="1" value="${percent(settings.masterVolume)}" data-audio-master-volume ${audio ? '' : 'disabled'} />
      </label>
      <label class="setting-row setting-row-column">
        <span>BGM 볼륨 <b data-audio-bgm-volume-label>${percent(bgmVolumeValue)}%</b></span>
        <input type="range" min="0" max="100" step="1" value="${percent(bgmVolumeValue)}" data-audio-bgm-volume />
      </label>
      <label class="setting-row setting-row-column">
        <span>SFX 볼륨 <b data-audio-sfx-volume-label>${percent(settings.sfxVolume)}%</b></span>
        <input type="range" min="0" max="100" step="1" value="${percent(settings.sfxVolume)}" data-audio-sfx-volume ${audio ? '' : 'disabled'} />
      </label>
      <label class="setting-row">
        <span>BGM 재생 순서</span>
        <select data-audio-bgm-mode>
          <option value="shuffle" ${bgmState.mode === 'shuffle' ? 'selected' : ''}>무작위</option>
          <option value="sequence" ${bgmState.mode === 'sequence' ? 'selected' : ''}>순차 재생</option>
        </select>
      </label>
      <p class="setting-hint">현재 BGM: <span data-setting="bgm-current-track">${escapeHtml(currentTrack?.label || '아직 선택되지 않음')}</span></p>
      <button type="button" class="audio-test-button" data-audio-test-sfx ${audio ? '' : 'disabled'}>SFX 테스트</button>
      <p class="setting-hint">
        전투 중에는 기존 BGM을 잠시 멈추고 battle_01 / battle_02를 재생한 뒤, 작전판 복귀 시 기존 BGM 설정을 다시 따릅니다.
      </p>
    </section>
  `;

  const mutedInput = container.querySelector('[data-audio-muted-toggle]');
  const bgmEnabledInput = container.querySelector('[data-audio-bgm-enabled-toggle]');
  const sfxEnabledInput = container.querySelector('[data-audio-sfx-enabled-toggle]');
  const masterInput = container.querySelector('[data-audio-master-volume]');
  const bgmInput = container.querySelector('[data-audio-bgm-volume]');
  const sfxInput = container.querySelector('[data-audio-sfx-volume]');
  const bgmModeInput = container.querySelector('[data-audio-bgm-mode]');
  const masterLabel = container.querySelector('[data-audio-master-volume-label]');
  const bgmLabel = container.querySelector('[data-audio-bgm-volume-label]');
  const sfxLabel = container.querySelector('[data-audio-sfx-volume-label]');
  const testButton = container.querySelector('[data-audio-test-sfx]');

  mutedInput?.addEventListener('change', () => {
    audio?.setMuted?.(mutedInput.checked);
    if (mutedInput.checked) pauseMercenaryBgm();
    else if (canPlayMercenaryBgm()) playMercenaryBgmSafely();
  });

  bgmEnabledInput?.addEventListener('change', () => {
    setMercenaryBgmEnabled(bgmEnabledInput.checked);
    audio?.setBgmMuted?.(!bgmEnabledInput.checked);
  });

  sfxEnabledInput?.addEventListener('change', () => {
    audio?.setSfxMuted?.(!sfxEnabledInput.checked);
  });

  masterInput?.addEventListener('input', () => {
    const value = Number(masterInput.value) || 0;
    if (masterLabel) masterLabel.textContent = `${value}%`;
    audio?.setMasterVolume?.(value / 100);
    applyMercenaryBgmPlaybackVolume();
  });

  bgmInput?.addEventListener('input', () => {
    const value = Number(bgmInput.value) || 0;
    if (bgmLabel) bgmLabel.textContent = `${value}%`;
    setMercenaryBgmVolume(value / 100);
    audio?.setBgmVolume?.(value / 100);
  });

  sfxInput?.addEventListener('input', () => {
    const value = Number(sfxInput.value) || 0;
    if (sfxLabel) sfxLabel.textContent = `${value}%`;
    audio?.setSfxVolume?.(value / 100);
  });

  bgmModeInput?.addEventListener('change', () => {
    setMercenaryBgmMode(bgmModeInput.value);
  });

  testButton?.addEventListener('click', () => {
    audio?.unlockAudio?.();
    audio?.playSfx?.('ui_click', { cooldownMs: 0 });
  });
}

function openMercenarySettingsModal() {
  const modal = document.querySelector('#mercenary-settings-modal');
  const body = document.querySelector('#mercenary-settings-body');
  if (!modal || !body) return;
  renderBgmSettingsControls(body);
  modal.hidden = false;
}

function closeMercenarySettingsModal() {
  document.querySelector('#mercenary-settings-modal')?.setAttribute('hidden', '');
}

function bindMercenarySettingsModal() {
  const modal = document.querySelector('#mercenary-settings-modal');
  const closeButton = document.querySelector('#mercenary-settings-close');
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeMercenarySettingsModal);
  }
  if (modal && modal.dataset.bound !== 'true') {
    modal.dataset.bound = 'true';
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeMercenarySettingsModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMercenarySettingsModal();
    });
  }
}


const INVENTORY_TYPE_TABS = [
  { value: 'all', label: '전체' },
  { value: 'equipment', label: '장비' },
  { value: 'material', label: '재료' },
  { value: 'consumable', label: '소모품' },
  { value: 'clue', label: '단서' },
  { value: 'misc', label: '기타' }
];

const INVENTORY_SLOT_OPTIONS = [
  { value: 'all', label: '전체 장비' },
  { value: 'weapon', label: '무기' },
  { value: 'armor', label: '방어구' },
  { value: 'accessory', label: '장신구' },
  { value: 'tool', label: '보조 도구' }
];

const INVENTORY_GRADE_OPTIONS = ['all', 'N', 'R', 'SR', 'SSR', 'EX'];

const failedEquipmentImageKeys = new Set();
const READY_EQUIPMENT_IMAGE_STATUSES = new Set(['ready', 'generated', 'complete', 'completed', 'approved', 'done']);

function getInventoryEntryItemId(entry = {}) {
  return String(entry.itemId || entry.item_id || entry.item?.itemId || entry.item?.item_id || entry.item?.id || '').trim();
}

function getInventoryEquipmentForEntry(entry = {}) {
  const itemId = getInventoryEntryItemId(entry);
  const bundle = inventoryState.equipmentBundle || {};
  if (entry?.equipment) return entry.equipment;
  if (entry?.equipmentId && bundle.equipmentById?.[entry.equipmentId]) return bundle.equipmentById[entry.equipmentId];
  if (entry?.equipment_id && bundle.equipmentById?.[entry.equipment_id]) return bundle.equipmentById[entry.equipment_id];
  if (itemId && bundle.equipmentById?.[itemId]) return bundle.equipmentById[itemId];
  if (!itemId) return null;
  const item = bundle.byItemId?.[itemId] || bundle.itemsById?.[itemId] || null;
  const equipmentId = item?.equipmentId || item?.equipment_id || item?.refId || item?.ref_id || '';
  if (equipmentId && bundle.equipmentById?.[equipmentId]) return bundle.equipmentById[equipmentId];
  return (bundle.equipment || []).find((equipment) => {
    const equipmentItemId = String(equipment.itemId || equipment.item_id || equipment.item?.id || '').trim();
    return equipmentItemId === itemId;
  }) || null;
}

function getInventoryEntryEquipment(entry = {}) {
  return getInventoryEquipmentForEntry(entry);
}

function getInventoryItemMasterForEntry(entry = {}) {
  const itemId = getInventoryEntryItemId(entry);
  const bundle = inventoryState.equipmentBundle || {};
  return entry?.master || (itemId ? bundle.byItemId?.[itemId] || bundle.itemsById?.[itemId] : null) || null;
}

function getInventoryImagePromptForEntry(entry) {
  const equipment = getInventoryEquipmentForEntry(entry);
  return entry?.imagePrompt || (equipment?.imageKey ? inventoryState.equipmentBundle?.imagePromptByKey?.[equipment.imageKey] : null) || null;
}

function isEquipmentImageReady(prompt = {}) {
  const generationStatus = String(prompt.generationStatus || prompt.generation_status || '').trim().toLowerCase();
  const reviewStatus = String(prompt.reviewStatus || prompt.review_status || '').trim().toLowerCase();
  return READY_EQUIPMENT_IMAGE_STATUSES.has(generationStatus) || READY_EQUIPMENT_IMAGE_STATUSES.has(reviewStatus);
}

function getEquipmentImageSrc(entryOrEquipment = {}) {
  const equipment = entryOrEquipment.equipment || entryOrEquipment;
  const prompt = entryOrEquipment.imagePrompt || getInventoryImagePromptForEntry(entryOrEquipment) || {};
  const imageKey = String(equipment.imageKey || equipment.image_key || prompt.imageKey || prompt.image_key || '').trim();
  const fileName = String(prompt.fileName || prompt.file_name || (imageKey ? `${imageKey}.png` : '')).trim();
  if (!fileName || !isEquipmentImageReady(prompt)) return '';
  const cacheKey = imageKey || fileName;
  if (failedEquipmentImageKeys.has(cacheKey)) return '';
  return `/assets/mercenary/equipment/${fileName}`;
}

function bindEquipmentImageFallback(root = document) {
  root.querySelectorAll('[data-equipment-image-key]').forEach((image) => {
    image.addEventListener('error', () => {
      const key = image.dataset.equipmentImageKey || image.getAttribute('src') || '';
      if (key) failedEquipmentImageKeys.add(key);
      image.hidden = true;
      image.closest('.inventory-item-art, .mercenary-equipment-art')?.classList.add('is-missing');
    }, { once: true });
  });
}

function normalizeInventoryEntryForUi(entry = {}) {
  const item = getInventoryItemMasterForEntry(entry);
  const equipment = getInventoryEquipmentForEntry(entry);
  const imagePrompt = getInventoryImagePromptForEntry(entry);
  return {
    ...entry,
    item,
    equipment,
    imagePrompt,
    itemId: entry.itemId || item?.itemId || '',
    itemType: entry.itemType || item?.itemType || 'misc',
    name: entry.name || equipment?.name || item?.name || entry.itemId || '알 수 없는 아이템',
    grade: entry.grade || equipment?.grade || item?.grade || '',
    description: entry.description || item?.description || equipment?.summary || '',
    effectSummary: entry.effectSummary || item?.effectSummary || equipment?.summary || '',
    slot: entry.slot || equipment?.slot || '',
    category: equipment?.category || '',
    quantity: Math.max(0, Number(entry.quantity || 0) || 0)
  };
}

function filterInventoryEntries(entries = inventoryState.entries) {
  const filters = inventoryState.filters;
  const q = String(filters.q || '').trim().toLowerCase();
  return entries.map(normalizeInventoryEntryForUi).filter((entry) => {
    if (filters.itemType !== 'all' && entry.itemType !== filters.itemType) return false;
    if (filters.slot !== 'all' && entry.slot !== filters.slot) return false;
    if (filters.grade !== 'all' && String(entry.grade || '').toUpperCase() !== filters.grade) return false;
    if (q) {
      const haystack = [
        entry.itemId,
        entry.name,
        entry.description,
        entry.effectSummary,
        entry.category,
        ...(entry.equipment?.tags || [])
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

async function ensureInventoryEquipmentBundle() {
  if (inventoryState.equipmentBundle) return inventoryState.equipmentBundle;
  const loader = window.MercenaryDataLoader;
  if (!loader?.loadMercenaryEquipmentBundle) {
    inventoryState.equipmentBundle = {
      items: [],
      equipment: [],
      equipmentImagePrompts: [],
      byItemId: {},
      equipmentById: {},
      imagePromptByKey: {},
      equipmentBySlot: { weapon: [], armor: [], accessory: [], tool: [] }
    };
    return inventoryState.equipmentBundle;
  }
  inventoryState.equipmentBundle = await loader.loadMercenaryEquipmentBundle();
  return inventoryState.equipmentBundle;
}

async function loadInventoryData() {
  inventoryState.loading = true;
  inventoryState.errorMessage = '';
  renderInventoryView();
  try {
    await ensureInventoryEquipmentBundle();
    const payload = await apiRequest('/api/mercenary/inventory', { perfScope: 'mercenary-inventory' });
    inventoryState.entries = Array.isArray(payload?.items) ? payload.items : [];
    inventoryState.summary = payload?.summary || null;
    inventoryState.selectedEntryId = inventoryState.entries[0]?.id || '';
  } catch (error) {
    console.warn('[mercenary/inventory] load failed', error);
    if (error.status === 401 || error.data?.code === 'AUTH_REQUIRED') showMercenaryLoginRequiredModal();
    inventoryState.entries = [];
    inventoryState.summary = null;
    inventoryState.errorMessage = error.data?.message || error.message || '보관함을 불러오지 못했습니다.';
  } finally {
    inventoryState.loading = false;
    renderInventoryView();
  }
}

function openInventoryView() {
  document.querySelector('#mercenary-inventory-view')?.removeAttribute('hidden');
  document.body.classList.add('inventory-open');
  loadInventoryData();
}

function closeInventoryView() {
  document.querySelector('#mercenary-inventory-view')?.setAttribute('hidden', '');
  document.body.classList.remove('inventory-open');
}

function renderInventoryTabs() {
  const root = document.querySelector('#inventory-type-tabs');
  if (!root) return;
  root.innerHTML = INVENTORY_TYPE_TABS.map((tab) => `
    <button type="button" class="${inventoryState.filters.itemType === tab.value ? 'is-active' : ''}" data-inventory-type="${escapeHtml(tab.value)}">${escapeHtml(tab.label)}</button>
  `).join('');
  root.querySelectorAll('[data-inventory-type]').forEach((button) => {
    button.addEventListener('click', () => {
      inventoryState.filters.itemType = button.dataset.inventoryType || 'all';
      renderInventoryView();
    });
  });
}

function renderInventoryFilters() {
  const slot = document.querySelector('#inventory-slot-filter');
  const grade = document.querySelector('#inventory-grade-filter');
  const search = document.querySelector('#inventory-search-input');
  if (slot) {
    slot.innerHTML = INVENTORY_SLOT_OPTIONS.map((item) => `<option value="${escapeHtml(item.value)}" ${inventoryState.filters.slot === item.value ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
    slot.onchange = (event) => {
      inventoryState.filters.slot = event.target.value || 'all';
      renderInventoryView();
    };
  }
  if (grade) {
    grade.innerHTML = INVENTORY_GRADE_OPTIONS.map((item) => `<option value="${escapeHtml(item)}" ${inventoryState.filters.grade === item ? 'selected' : ''}>${item === 'all' ? '전체' : escapeHtml(item)}</option>`).join('');
    grade.onchange = (event) => {
      inventoryState.filters.grade = event.target.value || 'all';
      renderInventoryView();
    };
  }
  if (search) {
    search.value = inventoryState.filters.q;
    search.oninput = (event) => {
      inventoryState.filters.q = event.target.value || '';
      renderInventoryView();
    };
  }
}

function renderInventoryCard(entry) {
  const equipment = entry.equipment || {};
  const img = getEquipmentImageSrc(entry);
  const imageKey = equipment.imageKey || entry.imagePrompt?.imageKey || entry.itemId || '';
  return `
    <button type="button" class="inventory-item-card ${inventoryState.selectedEntryId === entry.id ? 'is-selected' : ''}" data-inventory-entry="${escapeHtml(entry.id)}">
      <span class="inventory-item-art ${img ? 'has-image' : 'is-missing'}">
        ${img ? `<img src="${escapeHtml(img)}" alt="" data-equipment-image-key="${escapeHtml(imageKey)}" />` : ''}
        <b>${escapeHtml(entry.grade || '?')}</b>
      </span>
      <span class="inventory-item-copy">
        <strong>${escapeHtml(entry.name)}</strong>
        <em>${escapeHtml(entry.itemType)}${entry.slot ? ` · ${escapeHtml(entry.slot)}` : ''} · x${formatNumber(entry.quantity)}</em>
        <small>${escapeHtml(entry.effectSummary || entry.description || '효과 정보 없음')}</small>
      </span>
      ${entry.equipped ? `<i class="is-equipped">\uC7A5\uCC29 \uC911</i>` : entry.locked ? '<i>\uC7A0\uAE08</i>' : ''}
    </button>
  `;
}

function renderInventoryDetail(entry) {
  const root = document.querySelector('#inventory-detail-panel');
  if (!root) return;
  if (!entry) {
    root.innerHTML = `
      <div class="inventory-empty-detail">
        <h3>보관함이 텅 비었습니다.</h3>
        <p>전투 보상이나 의뢰 보상으로 장비를 얻으면 여기에 쌓입니다.</p>
        <em>마렌: 창고 열쇠는 있는데, 아직 넣을 물건이 없네요.</em>
      </div>
    `;
    return;
  }
  const stats = entry.equipment?.stats || {};
  const modifiers = entry.equipment?.modifiers || {};
  const statRows = Object.entries({ ...stats, ...modifiers }).filter(([, value]) => Number(value || 0) !== 0);
  root.innerHTML = `
    <article class="inventory-detail-card">
      <span class="inventory-grade-badge ${getGradeClass(entry.grade)}">${escapeHtml(entry.grade || '?')}</span>
      <h3>${escapeHtml(entry.name)}</h3>
      <p>${escapeHtml(entry.description || '설명 없음')}</p>
      ${entry.equipment?.flavorText ? `<blockquote>${escapeHtml(entry.equipment.flavorText)}</blockquote>` : ''}
      <dl>
        <div><dt>itemId</dt><dd>${escapeHtml(entry.itemId)}</dd></div>
        <div><dt>종류</dt><dd>${escapeHtml(entry.itemType)}</dd></div>
        <div><dt>슬롯</dt><dd>${escapeHtml(entry.slot || '해당 없음')}</dd></div>
        <div><dt>분류</dt><dd>${escapeHtml(entry.category || '없음')}</dd></div>
        <div><dt>수량</dt><dd>${formatNumber(entry.quantity)}</dd></div>
        <div><dt>획득 출처</dt><dd>${escapeHtml(entry.acquiredSourceType || '기록 없음')}</dd></div>
        <div><dt>생성일</dt><dd>${escapeHtml(entry.createdAt || '-')}</dd></div>
      </dl>
      <section class="inventory-stat-list">
        <h4>능력치</h4>
        ${statRows.length ? statRows.map(([key, value]) => `<span>${escapeHtml(key.toUpperCase())} ${Number(value) > 0 ? '+' : ''}${formatNumber(value)}</span>`).join('') : '<p>능력치 보정 없음</p>'}
      </section>
      <section class="inventory-tag-list">
        ${(entry.equipment?.recommendedPositions || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        ${(entry.equipment?.recommendedRoles || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        ${(entry.equipment?.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
      </section>
      ${entry.equipped ? `
        <section class="inventory-equipped-state">
          <strong>\uC7A5\uCC29 \uC911</strong>
          <span>${escapeHtml(entry.equippedByMercenaryName || entry.equippedByMercenaryId || '\uC6A9\uBCD1')}</span>
          <button type="button" data-inventory-unequip="${escapeHtml(entry.equippedByMercenaryId || '')}" data-equipment-slot="${escapeHtml(entry.equippedSlot || entry.slot || '')}">\uD574\uC81C</button>
        </section>
      ` : ''}
      ${entry.itemType === 'equipment' && !entry.equipped ? `
        <section class="inventory-equip-panel">
          <label>
            <span>\uC7A5\uCC29 \uB300\uC0C1</span>
            <select data-inventory-equip-target>
              <option value="">\uC6A9\uBCD1 \uC120\uD0DD</option>
              ${getInventoryEquipOptions(entry).map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} · ${escapeHtml(member.grade)} Lv.${formatNumber(member.level)} · ${formatNumber(member.power)}</option>`).join('')}
            </select>
          </label>
          <button type="button" data-inventory-equip="${escapeHtml(entry.id)}">\uC7A5\uCC29</button>
          ${getInventoryEquipOptions(entry).length ? '' : '<p>\uD574\uB2F9 \uC2AC\uB86F\uC774 \uBE44\uC5B4 \uC788\uB294 \uB300\uAE30 \uC6A9\uBCD1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p>'}
        </section>
      ` : ''}
      <div class="inventory-disabled-actions">
        <button type="button" disabled>\uC0AC\uC6A9 · \uB2E4\uC74C \uC5C5\uB370\uC774\uD2B8</button>
        <button type="button" disabled>\uD310\uB9E4 · \uB2E4\uC74C \uC5C5\uB370\uC774\uD2B8</button>
        <button type="button" disabled>\uC7A0\uAE08/\uD574\uC81C · \uB2E4\uC74C \uC5C5\uB370\uC774\uD2B8</button>
      </div>
    </article>
  `;
  root.querySelector('[data-inventory-equip]')?.addEventListener('click', (event) => {
    const target = root.querySelector('[data-inventory-equip-target]');
    equipInventoryEntryToMercenary(event.currentTarget.dataset.inventoryEquip, target?.value || '');
  });
  root.querySelector('[data-inventory-unequip]')?.addEventListener('click', (event) => {
    unequipMercenaryEquipmentSlot(event.currentTarget.dataset.inventoryUnequip, event.currentTarget.dataset.equipmentSlot);
  });
}

function renderInventoryView() {
  const summaryLine = document.querySelector('#inventory-summary-line');
  const list = document.querySelector('#inventory-item-list');
  if (!list) return;
  renderInventoryTabs();
  renderInventoryFilters();
  if (summaryLine) {
    const summary = inventoryState.summary || {};
    summaryLine.textContent = `총 ${formatNumber(summary.totalEntries || inventoryState.entries.length)}칸 · 수량 ${formatNumber(summary.totalQuantity || 0)}개`;
  }
  if (inventoryState.loading) {
    list.innerHTML = '<p class="inventory-empty">보관함 장부를 펼치는 중입니다.</p>';
    renderInventoryDetail(null);
    return;
  }
  if (inventoryState.errorMessage) {
    list.innerHTML = `<p class="inventory-empty">${escapeHtml(inventoryState.errorMessage)}</p>`;
    renderInventoryDetail(null);
    return;
  }
  const entries = filterInventoryEntries();
  if (!entries.length) {
    list.innerHTML = '<p class="inventory-empty">보관함이 텅 비었습니다.<br />전투 보상이나 의뢰 보상으로 장비를 얻으면 여기에 쌓입니다.</p>';
    renderInventoryDetail(null);
    return;
  }
  if (!entries.some((entry) => entry.id === inventoryState.selectedEntryId)) inventoryState.selectedEntryId = entries[0].id;
  list.innerHTML = entries.map(renderInventoryCard).join('');
  bindEquipmentImageFallback(list);
  list.querySelectorAll('[data-inventory-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      inventoryState.selectedEntryId = button.dataset.inventoryEntry || '';
      renderInventoryView();
    });
  });
  renderInventoryDetail(entries.find((entry) => entry.id === inventoryState.selectedEntryId) || entries[0]);
}

function bindInventoryView() {
  document.querySelector('#inventory-close-button')?.addEventListener('click', closeInventoryView);
  document.querySelector('#mercenary-inventory-view')?.addEventListener('click', (event) => {
    if (event.target?.id === 'mercenary-inventory-view') closeInventoryView();
  });
}

function renderTopActions(state) {
  const topActions = document.querySelector('#top-actions');
  if (!topActions) return;

  const actions = [
    { title: '골드', label: `${formatNumber(state.gold)}G`, icon: 'coin', showLabel: true, action: 'ready' },
    { title: '포인트', label: `${formatNumber(state.points)}P`, icon: 'point', showLabel: true, action: 'ready' },
    { title: '우편', label: state.mailCount ? String(state.mailCount) : '', icon: 'envelope', showLabel: false, action: 'ready' },
    { title: '알림', label: String(state.alertCount), icon: 'bell', showLabel: false, badge: state.alertCount, action: 'ready' },
    { title: '설정', label: '', icon: 'settings', showLabel: false, action: 'settings' }
  ];

  topActions.innerHTML = actions.map((action) => `
    <button class="top-action" type="button" title="${action.title}" aria-label="${action.title}" data-top-action="${action.action}">
      ${renderIcon(action.icon, 'medium')}
      ${action.showLabel ? `<span>${action.label}</span>` : ''}
      ${action.badge ? `<em class="count-badge">${action.badge}</em>` : ''}
    </button>
  `).join('');

  topActions.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.topAction === 'settings') {
        openMercenarySettingsModal();
        return;
      }
      showReadyNotice();
    });
  });
}

function updateMercenaryCurrencyDisplay(payload = {}) {
  const profile = payload.mercenaryProfile || payload.officeProfile || {};
  const nextOfficeGrowth = payload.officeGrowth || profile.officeGrowth;
  const nextMercenaryGold = payload.mercenaryGold ?? profile.mercenaryGold ?? payload.gold ?? profile.gold;
  const nextCommunityPoints = payload.communityPoints;
  const nextOfficeLevel = profile.officeLevel ?? payload.officeLevel;
  const nextOfficeExp = profile.officeExp ?? payload.officeExp;
  const nextOfficeExpToNext = profile.officeExpToNext ?? payload.officeExpToNext;
  const nextOfficeExpProgress = profile.officeExpProgress ?? payload.officeExpProgress;
  const nextOfficeReputation = profile.officeReputation ?? payload.officeReputation ?? profile.rank;
  const nextOfficeMaxLevel = profile.officeMaxLevel ?? payload.officeMaxLevel;
  const nextIsOfficeMaxLevel = profile.isOfficeMaxLevel ?? payload.isOfficeMaxLevel;
  if (nextMercenaryGold !== undefined && nextMercenaryGold !== null) {
    mercenaryGold = Number(nextMercenaryGold) || 0;
    mercenaryLobbyState.gold = mercenaryGold;
    recruitmentState.gold = mercenaryGold;
  }
  if (nextCommunityPoints !== undefined && nextCommunityPoints !== null) {
    communityPoints = Number(nextCommunityPoints) || 0;
    mercenaryLobbyState.points = communityPoints;
  }
  if (nextOfficeLevel !== undefined && nextOfficeLevel !== null) {
    mercenaryLobbyState.level = Math.max(1, Number(nextOfficeLevel) || 1);
  }
  if (nextOfficeExp !== undefined && nextOfficeExp !== null) {
    mercenaryLobbyState.officeExp = Math.max(0, Number(nextOfficeExp) || 0);
  }
  if (nextOfficeExpToNext !== undefined && nextOfficeExpToNext !== null) {
    mercenaryLobbyState.officeExpToNext = Math.max(0, Number(nextOfficeExpToNext) || 0);
  }
  if (nextOfficeMaxLevel !== undefined && nextOfficeMaxLevel !== null) {
    mercenaryLobbyState.officeMaxLevel = Math.max(1, Number(nextOfficeMaxLevel) || 50);
  }
  if (nextOfficeExpProgress !== undefined && nextOfficeExpProgress !== null) {
    const progress = Math.max(0, Math.min(1, Number(nextOfficeExpProgress) || 0));
    mercenaryLobbyState.expPercent = Math.round(progress * 100);
  } else if (mercenaryLobbyState.officeExpToNext > 0) {
    const progress = Math.max(0, Math.min(1, mercenaryLobbyState.officeExp / mercenaryLobbyState.officeExpToNext));
    mercenaryLobbyState.expPercent = Math.round(progress * 100);
  }
  if (nextOfficeReputation) {
    const reputation = String(nextOfficeReputation);
    mercenaryLobbyState.reputation = reputation.endsWith('급') ? reputation : `${reputation}급`;
  }
  if (nextIsOfficeMaxLevel !== undefined && nextIsOfficeMaxLevel !== null) {
    mercenaryLobbyState.isOfficeMaxLevel = Boolean(nextIsOfficeMaxLevel);
    if (mercenaryLobbyState.isOfficeMaxLevel) {
      mercenaryLobbyState.expPercent = 100;
    }
  }
  if (nextOfficeGrowth) {
    mercenaryLobbyState.officeGrowth = nextOfficeGrowth;
  }
  renderTopActions(mercenaryLobbyState);
  renderLobbyProgress(mercenaryLobbyState);
  renderOfficeGrowthPopover();
}

function renderStatusPanel(summary) {
  const statusList = document.querySelector('#status-list');
  if (!statusList) return;

  const items = [
    { label: '대기 중 용병', value: `${summary.idleMercenaries}명`, icon: 'group' },
    { label: '임무 중', value: `${summary.onMission}명`, icon: 'crossedSwords' },
    { label: '부상자', value: `${summary.injured}명`, icon: 'medicalCross' },
    { label: '완료 대기 보고서', value: `${summary.claimableReports}건`, icon: 'report' },
    { label: '소문 조사', value: `${summary.activeRumors}건`, icon: 'rumor' }
  ];

  statusList.innerHTML = items.map((item) => `
    <div class="status-item">
      ${renderIcon(item.icon)}
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

function makeEmptyBattleParty(index = 1) {
  const now = new Date().toISOString();
  return {
    id: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${index}번 전투 파티`,
    slots: BATTLE_PARTY_SLOTS.reduce((acc, slot) => {
      acc[slot.key] = '';
      return acc;
    }, {}),
    createdAt: now,
    updatedAt: now
  };
}

function normalizeBattleParty(raw, index = 1) {
  const fallback = makeEmptyBattleParty(index);
  const slots = BATTLE_PARTY_SLOTS.reduce((acc, slot) => {
    acc[slot.key] = String(raw?.slots?.[slot.key] || '').trim();
    return acc;
  }, {});
  return {
    id: String(raw?.id || fallback.id),
    name: String(raw?.name || fallback.name),
    slots,
    createdAt: raw?.createdAt || fallback.createdAt,
    updatedAt: raw?.updatedAt || fallback.updatedAt
  };
}

function getStoredBattleParties() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BATTLE_PARTY_STORAGE_KEY) || '{}');
    const parties = Array.isArray(parsed?.parties) ? parsed.parties : [];
    return parties.map(normalizeBattleParty);
  } catch (error) {
    showReadyNotice('전투 파티 저장 데이터를 읽지 못해 빈 파티로 복구했습니다.');
    return [];
  }
}

function saveStoredBattleParties(parties) {
  try {
    localStorage.setItem(BATTLE_PARTY_STORAGE_KEY, JSON.stringify({ parties }));
    return true;
  } catch (error) {
    showReadyNotice('전투 파티를 브라우저 저장소에 저장하지 못했습니다.');
    return false;
  }
}

function getSelectedBattlePartyId() {
  try {
    return localStorage.getItem(BATTLE_PARTY_SELECTED_STORAGE_KEY) || '';
  } catch (error) {
    return '';
  }
}

function setSelectedBattlePartyId(id) {
  battleOperationState.selectedPartyId = String(id || '');
  battleOperationState.selectedEditorPartyId = battleOperationState.selectedPartyId;
  try {
    localStorage.setItem(BATTLE_PARTY_SELECTED_STORAGE_KEY, battleOperationState.selectedPartyId);
  } catch (error) {
    showReadyNotice('선택한 전투 파티를 저장하지 못했습니다.');
  }
}

function ensureDefaultBattleParty() {
  let parties = getStoredBattleParties();
  if (!parties.length) {
    parties = [makeEmptyBattleParty(1)];
    saveStoredBattleParties(parties);
  }
  battleOperationState.parties = parties;
  const storedId = getSelectedBattlePartyId();
  const selected = parties.find((party) => party.id === storedId) || parties[0];
  setSelectedBattlePartyId(selected.id);
  return selected;
}

function selectedBattleParty() {
  if (!battleOperationState.parties.length) ensureDefaultBattleParty();
  return battleOperationState.parties.find((party) => party.id === battleOperationState.selectedPartyId)
    || battleOperationState.parties[0]
    || null;
}

function selectedEditorBattleParty() {
  if (!battleOperationState.parties.length) ensureDefaultBattleParty();
  return battleOperationState.parties.find((party) => party.id === battleOperationState.selectedEditorPartyId)
    || selectedBattleParty();
}

function updateBattleParty(nextParty) {
  battleOperationState.parties = battleOperationState.parties.map((party) => (
    party.id === nextParty.id ? { ...nextParty, updatedAt: new Date().toISOString() } : party
  ));
  saveStoredBattleParties(battleOperationState.parties);
}

function battlePartyMemberIds(party) {
  return BATTLE_PARTY_SLOTS.map((slot) => String(party?.slots?.[slot.key] || '').trim()).filter(Boolean);
}

function getBattlePartyMemberMap() {
  const roster = getBattleOperationRoster();
  return new Map(roster
    .map((member) => [getOwnedRosterKey(member) || member.rosterId, member])
    .filter(([key]) => key));
}

function calculateMockMercenaryBattlePower(member) {
  if (!member) return 0;
  const direct = Number(member.totalCombatPower ?? member.displayCombatPower ?? member.combatPower ?? member.power ?? 0);
  if (direct > 0) return direct;
  const gradeBonus = ({ N: 80, R: 150, SR: 260, SSR: 420, EX: 520 })[String(member.grade || 'N').toUpperCase()] || 80;
  return gradeBonus + Number(member.level || 1) * 24;
}

function calculateBattlePartyPower(party) {
  const memberMap = getBattlePartyMemberMap();
  return BATTLE_PARTY_SLOTS.reduce((sum, slot) => {
    const member = memberMap.get(String(party?.slots?.[slot.key] || ''));
    return sum + calculateMockMercenaryBattlePower(member);
  }, 0);
}

function isBattleMercenaryAvailable(member) {
  if (!member || member.isLocked) return false;
  const status = String(member.operationalStatus || member.status || 'idle').toLowerCase();
  return member.available !== false && (status === 'idle' || status === '대기 중' || status === '대기중');
}

function getStageClearMapsForClient() {
  const clears = Array.isArray(battleOperationState.stageClears) ? battleOperationState.stageClears : [];
  return {
    byMissionId: new Map(clears.map((item) => [String(item.missionId || ''), item])),
    byStageId: new Map(clears.map((item) => [String(item.stageId || ''), item]))
  };
}

function splitStageUnlockConditions(unlockCondition) {
  const text = String(unlockCondition || '').trim();
  if (!text || text === 'default') return [];
  return text.split(';').map((item) => item.trim()).filter(Boolean);
}

function getClientStageUnlockReasons(operation) {
  if (!operation?.isStageMission) return [];
  const reasons = [];
  const officeLevel = Number(mercenaryLobbyState.level || 1) || 1;
  const requiredOfficeLevel = Math.max(1, Number(operation.requiredOfficeLevel || 1) || 1);
  if (officeLevel < requiredOfficeLevel) reasons.push(`사무소 Lv.${requiredOfficeLevel} 필요`);
  const maps = getStageClearMapsForClient();
  splitStageUnlockConditions(operation.unlockCondition).forEach((condition) => {
    if (condition === 'default') return;
    if (condition.startsWith('clear:')) {
      const requiredMissionId = condition.slice('clear:'.length).trim();
      if (!maps.byMissionId.has(requiredMissionId) && !maps.byStageId.has(requiredMissionId)) reasons.push('이전 Stage 클리어 필요');
      return;
    }
    const officeMatch = condition.match(/^office_level\s*>=\s*(\d+)$/i);
    if (officeMatch) {
      const required = Number(officeMatch[1] || 0);
      if (officeLevel < required) reasons.push(`사무소 Lv.${required} 필요`);
      return;
    }
    if (condition.startsWith('rumor_seed:')) {
      reasons.push('소문 조건 미충족');
      return;
    }
    if (condition.startsWith('case_or_rumor:')) {
      reasons.push('사건/소문 조건 미충족');
      return;
    }
    reasons.push('해금 조건 미충족');
  });
  return [...new Set(reasons)];
}

function isBattleStageUnlocked(operation) {
  return getClientStageUnlockReasons(operation).length === 0;
}

async function loadBattleStageClears(options = {}) {
  const force = Boolean(options.force);
  if (!force && battleOperationState.stageClearLoadState === 'loading') return;
  battleOperationState.stageClearLoadState = 'loading';
  try {
    const payload = await apiRequest('/api/mercenary/combat-stage-clears', { perfScope: 'mercenary-combat-stage-clears' });
    battleOperationState.stageClears = Array.isArray(payload?.clears) ? payload.clears : [];
    battleOperationState.stageClearLoadState = 'loaded';
  } catch (error) {
    battleOperationState.stageClears = [];
    battleOperationState.stageClearLoadState = error.status === 401 ? 'unauthorized' : 'failed';
    if (error.status !== 401) console.warn('[mercenary/combat-stage-clears] load failed', error);
  }
}

function getBattlePartyValidation(party, operation = selectedBattleOperation()) {
  const memberMap = getBattlePartyMemberMap();
  if (ownedMercenaryLoadState.loading) return { ok: false, reason: '용병 정보 불러오는 중...' };
  if (ownedMercenaryLoadState.unauthorized) return { ok: false, reason: '로그인이 필요합니다' };
  if (ownedMercenaryLoadState.errorMessage) return { ok: false, reason: ownedMercenaryLoadState.errorMessage };
  if (!getBattleOperationRoster().length) return { ok: false, reason: '편성 필요' };
  const ids = battlePartyMemberIds(party);
  const minPartySize = Math.max(1, Number(operation?.minPartySize || 1) || 1);
  const maxPartySize = Math.max(minPartySize, Number(operation?.maxPartySize || BATTLE_PARTY_SLOTS.length) || BATTLE_PARTY_SLOTS.length);
  if (ids.length < minPartySize) return { ok: false, reason: `최소 인원 부족 (${ids.length}/${minPartySize})` };
  if (ids.length > maxPartySize) return { ok: false, reason: `최대 인원 초과 (${ids.length}/${maxPartySize})` };
  const duplicated = ids.some((id, index) => ids.indexOf(id) !== index);
  if (duplicated) return { ok: false, reason: '같은 용병이 중복 배치되어 있습니다.' };
  const missing = ids.some((id) => !memberMap.has(id));
  if (missing) return { ok: false, reason: '용병 정보를 불러오지 못했습니다.' };
  const unavailable = ids.some((id) => !isBattleMercenaryAvailable(memberMap.get(id)));
  if (unavailable) return { ok: false, reason: '전투 불가 용병 포함' };
  const stageReasons = getClientStageUnlockReasons(operation);
  if (stageReasons.length) return { ok: false, reason: stageReasons[0] };
  return { ok: true, reason: '' };
}

function selectedBattlePartyMembers(party = selectedBattleParty()) {
  const memberMap = getBattlePartyMemberMap();
  return BATTLE_PARTY_SLOTS.map((slot) => memberMap.get(String(party?.slots?.[slot.key] || ''))).filter(Boolean);
}

function selectedBattleOperation() {
  return battleOperationState.operations.find((item) => item.id === battleOperationState.selectedOperationId)
    || battleOperationState.operations[0]
    || null;
}

function getBattleOperationRoster() {
  return Array.isArray(ownedMercenaryRoster) ? ownedMercenaryRoster : [];
}

function getBattleOperationParty() {
  return selectedBattlePartyMembers();
}

function battlePowerJudgement(totalPower, recommendedPower) {
  const safeTotal = Number(totalPower || 0) || 0;
  const safeRecommended = Math.max(1, Number(recommendedPower || 1) || 1);
  if (safeTotal <= 0) return '편성 필요';
  const ratio = safeTotal / safeRecommended;
  if (ratio >= 1.2) return '우세';
  if (ratio >= 0.9) return '적정';
  return '위험';
}

function summarizeBattleRewards(rewards = []) {
  return rewards.reduce((summary, reward) => {
    summary.gold += Number(reward?.gold || 0) || 0;
    summary.officeExp += Number(reward?.officeExp || 0) || 0;
    summary.mercExp += Number(reward?.mercExp || reward?.mercenaryExp || 0) || 0;
    const type = String(reward?.type || '').trim();
    if (type && type !== 'gold' && !Number(reward?.gold || reward?.officeExp || reward?.mercExp || 0)) summary.extraCount += 1;
    if (reward?.resultText) summary.resultTexts.push(reward.resultText);
    return summary;
  }, { gold: 0, officeExp: 0, mercExp: 0, extraCount: 0, resultTexts: [] });
}

const EQUIPMENT_SLOT_LABELS = {
  weapon: '\uBB34\uAE30',
  armor: '\uBC29\uC5B4\uAD6C',
  accessory: '\uC7A5\uC2E0\uAD6C',
  tool: '\uBCF4\uC870 \uB3C4\uAD6C'
};

const EQUIPMENT_SLOT_ORDER = ['weapon', 'armor', 'accessory', 'tool'];

const EQUIPMENT_STAT_LABELS = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  spd: 'SPD',
  tec: 'TEC',
  sup: 'SUP',
  accuracy: '\uBA85\uC911',
  evasion: '\uD68C\uD53C',
  critical: '\uCE58\uBA85',
  healing: '\uD68C\uBCF5',
  combatPower: '\uC804\uD22C\uB825'
};

function getEquipmentSlotLabel(slot) {
  return EQUIPMENT_SLOT_LABELS[String(slot || '').trim()] || String(slot || '\uC7A5\uBE44').trim();
}

function getEquipmentSlotIcon(slot) {
  const key = String(slot || '').trim();
  if (key === 'weapon') return 'sword';
  if (key === 'armor') return 'shield';
  if (key === 'accessory') return 'spark';
  return 'briefcase';
}

function formatEquipmentSummary(equipment = {}) {
  const stats = equipment.stats || {};
  const modifiers = equipment.modifiers || {};
  const rows = Object.entries({ ...stats, ...modifiers })
    .filter(([, value]) => Number(value || 0) !== 0)
    .slice(0, 4)
    .map(([key, value]) => `${EQUIPMENT_STAT_LABELS[key] || key.toUpperCase()} ${Number(value) > 0 ? '+' : ''}${formatNumber(value)}`);
  return rows.join(' / ') || equipment.summary || equipment.effectSummary || '\uB2A5\uB825\uCE58 \uBCF4\uC815 \uC5C6\uC74C';
}

function normalizeEquipmentSlotMap(slots = {}) {
  return EQUIPMENT_SLOT_ORDER.reduce((acc, slot) => {
    acc[slot] = slots?.[slot] || null;
    return acc;
  }, {});
}

function getInventoryEntryById(entryId) {
  return inventoryState.entries.find((entry) => String(entry.id) === String(entryId)) || null;
}

function getOwnedMercenaryByOwnedId(ownedId) {
  return ownedMercenaryRoster.find((member) => String(getOwnedRosterKey(member) || member.ownedId || member.id) === String(ownedId)) || null;
}

function getInventoryEquipOptions(entry) {
  if (!entry || entry.itemType !== 'equipment' || entry.equipped) return [];
  const slot = String(entry.slot || entry.equipment?.slot || '').trim();
  return (ownedMercenaryRoster || [])
    .filter((member) => isBattleMercenaryAvailable(member))
    .filter((member) => !slot || !member.equipmentSlots?.[slot])
    .map((member) => ({
      id: getOwnedRosterKey(member) || member.ownedId || member.id,
      name: member.name,
      grade: member.grade,
      level: member.level,
      power: calculateMockMercenaryBattlePower(member)
    }))
    .filter((item) => item.id);
}

async function refreshMercenaryEquipmentState(options = {}) {
  await Promise.allSettled([
    loadOwnedMercenariesFromApi(),
    loadInventoryData({ force: true })
  ]);
  if (options.renderInventory !== false) renderInventoryView();
  if (options.renderRoster) renderMercenaryRoster(ownedMercenaryRoster, { source: 'owned' });
  if (options.renderBattleBoard !== false) renderBattleOperationBoard();
  const manageLayer = document.querySelector('#mercenary-equipment-manage-modal:not([hidden])');
  const selected = getSelectedOwnedMercenary();
  if (manageLayer && selected) renderMercenaryEquipmentManageModal(selected);
}

async function equipInventoryEntryToMercenary(entryId, ownedId) {
  const entry = getInventoryEntryById(entryId);
  if (!entry) {
    showReadyNotice('\uC7A5\uCC29\uD560 \uC7A5\uBE44\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
    return;
  }
  if (!ownedId) {
    showReadyNotice('\uC7A5\uCC29 \uB300\uC0C1 \uC6A9\uBCD1\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.');
    return;
  }
  try {
    await apiRequest(`/api/mercenary/my/${encodeURIComponent(ownedId)}/equipment/equip`, {
      method: 'POST',
      body: JSON.stringify({ inventoryItemId: entry.id }),
      perfScope: 'mercenary-equipment-equip'
    });
    showReadyNotice('\uC7A5\uBE44\uB97C \uC7A5\uCC29\uD588\uC2B5\uB2C8\uB2E4.');
    await refreshMercenaryEquipmentState({ renderRoster: true });
  } catch (error) {
    if (error.status === 401) {
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    showReadyNotice(error?.data?.message || error?.message || '\uC7A5\uCC29\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
  }
}

async function unequipMercenaryEquipmentSlot(ownedId, slot) {
  if (!ownedId || !slot) return;
  try {
    await apiRequest(`/api/mercenary/my/${encodeURIComponent(ownedId)}/equipment/${encodeURIComponent(slot)}`, {
      method: 'DELETE',
      perfScope: 'mercenary-equipment-unequip'
    });
    showReadyNotice('\uC7A5\uBE44\uB97C \uD574\uC81C\uD588\uC2B5\uB2C8\uB2E4.');
    await refreshMercenaryEquipmentState({ renderRoster: true });
  } catch (error) {
    if (error.status === 401) {
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    showReadyNotice(error?.data?.message || error?.message || '\uC7A5\uBE44 \uD574\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
  }
}


function getSelectedOwnedMercenary() {
  return ownedMercenaryRoster.find((item) => item.rosterId === rosterState.selectedId)
    || ownedMercenaryRoster.find((item) => String(getOwnedRosterKey(item)) === String(rosterState.selectedId))
    || null;
}

function isMercenaryIdleForManagement(mercenary) {
  return String(mercenary?.operationalStatus || 'idle') === 'idle';
}

function ensureMercenaryActionLayer(id, className) {
  let layer = document.querySelector(`#${id}`);
  if (!layer) {
    layer = document.createElement('div');
    layer.id = id;
    layer.className = className;
    layer.hidden = true;
    document.body.appendChild(layer);
  }
  return layer;
}

function closeMercenaryIllustrationLightbox() {
  const layer = document.querySelector('#mercenary-illustration-lightbox');
  if (layer) {
    layer.hidden = true;
    layer.innerHTML = '';
  }
  document.body.classList.remove('mercenary-lightbox-open');
}

function openMercenaryIllustrationLightbox(mercenary) {
  const layer = ensureMercenaryActionLayer('mercenary-illustration-lightbox', 'mercenary-illustration-lightbox');
  const imagePath = getMercenaryImagePath(mercenary);
  layer.innerHTML = `
    <div class="mercenary-action-backdrop" data-mercenary-lightbox-close></div>
    <section class="mercenary-lightbox-card ${getGradeClass(mercenary.grade)}" role="dialog" aria-modal="true" aria-label="일러스트 확대">
      <button type="button" class="mercenary-modal-close" data-mercenary-lightbox-close aria-label="닫기">×</button>
      <div class="mercenary-lightbox-art">
        ${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(mercenary.name || '용병')}" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />` : ''}
        <p class="mercenary-lightbox-placeholder" ${imagePath ? 'hidden' : ''}>일러스트 없음</p>
      </div>
      <footer>
        <strong>${escapeHtml(mercenary.name || '이름 없는 용병')}</strong>
        <span>${escapeHtml(mercenary.grade || 'N')} · ${escapeHtml(mercenary.species || '')}</span>
      </footer>
    </section>
  `;
  layer.hidden = false;
  document.body.classList.add('mercenary-lightbox-open');
  layer.querySelectorAll('[data-mercenary-lightbox-close]').forEach((button) => {
    button.addEventListener('click', closeMercenaryIllustrationLightbox);
  });
}

function closeMercenaryEquipmentManageModal() {
  const layer = document.querySelector('#mercenary-equipment-manage-modal');
  if (layer) {
    layer.hidden = true;
    layer.innerHTML = '';
  }
}

function getEquipmentManageCandidates(slot, ownedId) {
  const safeSlot = String(slot || '').trim();
  const safeOwnedId = String(ownedId || '');
  return (inventoryState.entries || [])
    .map(normalizeInventoryEntryForUi)
    .filter((entry) => entry.itemType === 'equipment')
    .map((entry) => ({ entry, equipment: getInventoryEntryEquipment(entry) }))
    .filter(({ entry, equipment }) => {
      const entrySlot = String(equipment?.slot || equipment?.equipmentSlot || entry.slot || '').trim();
      return entrySlot === safeSlot;
    })
    .map(({ entry, equipment }) => ({
      entry,
      equipment: equipment || {},
      missingEquipmentMaster: !equipment,
      isEquippedBySelected: entry.equipped && String(entry.equippedByMercenaryId || '') === safeOwnedId,
      isEquippedElsewhere: entry.equipped && String(entry.equippedByMercenaryId || '') !== safeOwnedId
    }));
}

function renderMercenaryEquipmentManageModal(mercenary, selectedSlot = 'weapon') {
  const layer = ensureMercenaryActionLayer('mercenary-equipment-manage-modal', 'mercenary-equipment-manage-modal');
  const ownedId = getOwnedRosterKey(mercenary) || mercenary.ownedId || '';
  const slots = normalizeEquipmentSlotMap(mercenary.equipmentSlots || {});
  const activeSlot = EQUIPMENT_SLOT_ORDER.includes(selectedSlot) ? selectedSlot : 'weapon';
  const currentSlot = slots[activeSlot];
  const blocked = !isMercenaryIdleForManagement(mercenary);
  const candidates = getEquipmentManageCandidates(activeSlot, ownedId);
  const candidateHtml = candidates.length
    ? candidates.map(({ entry, equipment, missingEquipmentMaster, isEquippedBySelected, isEquippedElsewhere }) => {
      const occupied = Boolean(currentSlot) && !isEquippedBySelected;
      const disabled = blocked || isEquippedElsewhere || occupied || isEquippedBySelected || Boolean(missingEquipmentMaster);
      const ownerName = entry.equippedByMercenaryName || '다른 용병';
      return `
        <article class="mercenary-equipment-candidate ${disabled ? 'is-disabled' : ''}">
          <div>
            <strong>${escapeHtml(entry.name || equipment.name || entry.itemId)}</strong>
            <span>${escapeHtml(entry.grade || equipment.grade || '')} · ${escapeHtml(formatEquipmentSummary(equipment || entry))}</span>
            ${missingEquipmentMaster ? '<em>장비 마스터 정보 없음</em>' : isEquippedBySelected ? '<em>현재 장착 중</em>' : isEquippedElsewhere ? `<em>${escapeHtml(ownerName)} 장착 중</em>` : occupied ? '<em>먼저 현재 슬롯을 비워주세요</em>' : ''}
          </div>
          <button type="button" data-equipment-manage-equip="${escapeHtml(entry.id)}" ${disabled ? 'disabled' : ''}>장착</button>
        </article>
      `;
    }).join('')
    : '<p class="mercenary-action-empty">이 슬롯에 장착할 수 있는 보관함 장비가 없습니다.</p>';

  layer.innerHTML = `
    <div class="mercenary-action-backdrop" data-equipment-manage-close></div>
    <section class="mercenary-equipment-manage-card" role="dialog" aria-modal="true" aria-label="장비 변경">
      <header>
        <div>
          <span>장비 변경</span>
          <h3>${escapeHtml(mercenary.name || '용병')}</h3>
        </div>
        <button type="button" class="mercenary-modal-close" data-equipment-manage-close aria-label="닫기">×</button>
      </header>
      ${blocked ? `<p class="mercenary-action-warning">진행 중인 활동이 있어 장비를 변경할 수 없습니다.</p>` : ''}
      <div class="mercenary-equipment-manage-grid">
        <aside>
          ${EQUIPMENT_SLOT_ORDER.map((slotKey) => {
            const slot = slots[slotKey];
            const equipment = slot?.equipment || {};
            const name = slot?.name || equipment.name || slot?.item?.name || '비어 있음';
            return `
              <button type="button" class="${slotKey === activeSlot ? 'is-active' : ''}" data-equipment-manage-slot="${escapeHtml(slotKey)}">
                <span>${escapeHtml(getEquipmentSlotLabel(slotKey))}</span>
                <strong>${escapeHtml(name)}</strong>
              </button>
            `;
          }).join('')}
        </aside>
        <main>
          <div class="mercenary-current-equipment">
            <span>${escapeHtml(getEquipmentSlotLabel(activeSlot))}</span>
            <strong>${escapeHtml(currentSlot?.name || currentSlot?.equipment?.name || currentSlot?.item?.name || '비어 있음')}</strong>
            <p>${currentSlot ? escapeHtml(formatEquipmentSummary(currentSlot.equipment || currentSlot)) : '장착 중인 장비가 없습니다.'}</p>
            ${currentSlot ? `<button type="button" data-equipment-manage-unequip="${escapeHtml(activeSlot)}" ${blocked ? 'disabled' : ''}>해제</button>` : ''}
          </div>
          <div class="mercenary-equipment-candidate-list">${candidateHtml}</div>
        </main>
      </div>
    </section>
  `;
  layer.hidden = false;
  layer.querySelectorAll('[data-equipment-manage-close]').forEach((button) => {
    button.addEventListener('click', closeMercenaryEquipmentManageModal);
  });
  layer.querySelectorAll('[data-equipment-manage-slot]').forEach((button) => {
    button.addEventListener('click', () => renderMercenaryEquipmentManageModal(getOwnedMercenaryByOwnedId(ownedId) || mercenary, button.dataset.equipmentManageSlot));
  });
  layer.querySelectorAll('[data-equipment-manage-equip]').forEach((button) => {
    button.addEventListener('click', async () => {
      await equipInventoryEntryToMercenary(button.dataset.equipmentManageEquip, ownedId);
      const refreshed = getOwnedMercenaryByOwnedId(ownedId) || mercenary;
      renderMercenaryEquipmentManageModal(refreshed, activeSlot);
    });
  });
  layer.querySelectorAll('[data-equipment-manage-unequip]').forEach((button) => {
    button.addEventListener('click', async () => {
      await unequipMercenaryEquipmentSlot(ownedId, button.dataset.equipmentManageUnequip);
      const refreshed = getOwnedMercenaryByOwnedId(ownedId) || mercenary;
      renderMercenaryEquipmentManageModal(refreshed, activeSlot);
    });
  });
}

async function openMercenaryEquipmentManageModal(mercenary) {
  if (!mercenary) return;
  if (!isMercenaryIdleForManagement(mercenary)) {
    showReadyNotice('진행 중인 활동이 있어 장비를 변경할 수 없습니다.');
  }
  await Promise.allSettled([
    ensureOwnedMercenariesLoaded(),
    loadInventoryData()
  ]);
  const ownedId = getOwnedRosterKey(mercenary) || mercenary.ownedId || '';
  renderMercenaryEquipmentManageModal(getOwnedMercenaryByOwnedId(ownedId) || mercenary);
}

async function setMercenaryLockState(mercenary, locked) {
  const ownedId = getOwnedRosterKey(mercenary) || mercenary.ownedId || '';
  if (!ownedId) return;
  try {
    await apiRequest(`/api/mercenary/my/${encodeURIComponent(ownedId)}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ locked: Boolean(locked) }),
      perfScope: 'mercenary-lock'
    });
    showReadyNotice(locked ? '용병을 잠갔습니다.' : '용병 잠금을 해제했습니다.');
    await loadOwnedMercenariesFromApi();
    renderMercenaryRoster(ownedMercenaryRoster, { source: 'owned' });
  } catch (error) {
    if (error.status === 401) {
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    showReadyNotice(error?.data?.message || error?.message || '잠금 상태를 변경하지 못했습니다.');
  }
}

function closeMercenaryDismissModal() {
  const layer = document.querySelector('#mercenary-dismiss-modal');
  if (layer) {
    layer.hidden = true;
    layer.innerHTML = '';
  }
}

function openMercenaryDismissModal(mercenary) {
  if (!mercenary) return;
  if (mercenary.isLocked) {
    showReadyNotice('잠금 상태인 용병은 해고할 수 없습니다.');
    return;
  }
  if (!isMercenaryIdleForManagement(mercenary)) {
    showReadyNotice('진행 중인 활동이 있어 해고할 수 없습니다.');
    return;
  }
  const layer = ensureMercenaryActionLayer('mercenary-dismiss-modal', 'mercenary-dismiss-modal');
  const equippedCount = Object.values(normalizeEquipmentSlotMap(mercenary.equipmentSlots || {})).filter(Boolean).length;
  layer.innerHTML = `
    <div class="mercenary-action-backdrop" data-dismiss-close></div>
    <section class="mercenary-dismiss-card" role="dialog" aria-modal="true" aria-label="용병 해고">
      <header>
        <div>
          <span>용병 해고</span>
          <h3>${escapeHtml(mercenary.name || '용병')}</h3>
        </div>
        <button type="button" class="mercenary-modal-close" data-dismiss-close aria-label="닫기">×</button>
      </header>
      <p>해고는 목록에서 숨겨지는 soft delete로 처리됩니다. 과거 전투 기록은 유지됩니다.</p>
      ${equippedCount ? `<p class="mercenary-action-warning">장착 장비 ${formatNumber(equippedCount)}개는 자동 해제되어 보관함으로 돌아갑니다.</p>` : ''}
      <label>
        <span>확인을 위해 용병명을 입력하세요.</span>
        <input type="text" data-dismiss-confirm-input autocomplete="off" placeholder="${escapeHtml(mercenary.name || '')}" />
      </label>
      <div class="mercenary-dismiss-actions">
        <button type="button" data-dismiss-close>취소</button>
        <button type="button" class="is-danger" data-dismiss-submit disabled>해고</button>
      </div>
    </section>
  `;
  layer.hidden = false;
  const input = layer.querySelector('[data-dismiss-confirm-input]');
  const submit = layer.querySelector('[data-dismiss-submit]');
  input?.addEventListener('input', () => {
    submit.disabled = String(input.value || '').trim() !== String(mercenary.name || '').trim();
  });
  layer.querySelectorAll('[data-dismiss-close]').forEach((button) => {
    button.addEventListener('click', closeMercenaryDismissModal);
  });
  submit?.addEventListener('click', async () => {
    await dismissMercenary(mercenary, input?.value || '');
  });
}

async function dismissMercenary(mercenary, confirmName) {
  const ownedId = getOwnedRosterKey(mercenary) || mercenary.ownedId || '';
  if (!ownedId) return;
  try {
    const payload = await apiRequest(`/api/mercenary/my/${encodeURIComponent(ownedId)}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ confirmName, reason: 'user_dismiss' }),
      perfScope: 'mercenary-dismiss'
    });
    const unequipped = Number(payload?.unequippedItemsCount || 0) || 0;
    showReadyNotice(unequipped ? `용병을 해고했습니다. 장착 장비 ${formatNumber(unequipped)}개를 보관함으로 돌려보냈습니다.` : '용병을 해고했습니다.');
    closeMercenaryDismissModal();
    closeMercenaryEquipmentManageModal();
    await Promise.allSettled([
      loadOwnedMercenariesFromApi(),
      loadInventoryData()
    ]);
    rosterState.selectedId = ownedMercenaryRoster[0]?.rosterId || ownedMercenaryRoster[0]?.id || '';
    renderMercenaryRoster(ownedMercenaryRoster, { source: 'owned' });
    renderInventoryView();
    renderBattleOperationBoard();
  } catch (error) {
    if (error.status === 401) {
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    showReadyNotice(error?.data?.message || error?.message || '용병 해고에 실패했습니다.');
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMercenaryIllustrationLightbox();
    closeMercenaryEquipmentManageModal();
    closeMercenaryDismissModal();
  }
});



function formatBattleRewardLine(operation) {
  const summary = summarizeBattleRewards(operation?.rewards || []);
  const parts = [];
  if (summary.gold) parts.push(`골드 ${formatNumber(summary.gold)}`);
  if (summary.mercExp) parts.push(`EXP ${formatNumber(summary.mercExp)}`);
  if (!parts.length && summary.officeExp) parts.push(`사무소 EXP ${formatNumber(summary.officeExp)}`);
  return parts.length ? `보상: ${parts.join(' / ')}` : '보상 정보 없음';
}

function renderBattleRewardPreview(operation) {
  const summary = summarizeBattleRewards(operation?.rewards || []);
  const items = [
    summary.gold ? `<li><span>골드</span><strong>+${formatNumber(summary.gold)}</strong></li>` : '',
    summary.officeExp ? `<li><span>사무소 EXP</span><strong>+${formatNumber(summary.officeExp)}</strong></li>` : '',
    summary.mercExp ? `<li><span>용병 EXP</span><strong>+${formatNumber(summary.mercExp)}</strong></li>` : ''
  ].filter(Boolean).join('');
  const note = summary.resultTexts[0] || '';
  return `
    <section class="battle-reward-preview" aria-label="보상">
      <h4>보상</h4>
      ${items ? `<ul>${items}</ul>` : '<p>표시할 보상 정보가 없습니다.</p>'}
      ${summary.extraCount ? `<p class="battle-reward-extra">추가 보상 ${formatNumber(summary.extraCount)}종은 후속 시스템에서 처리됩니다.</p>` : ''}
      ${note ? `<small>${escapeHtml(note)}</small>` : ''}
    </section>
  `;
}

function renderBattlePowerSummary(operation) {
  const party = selectedBattleParty();
  const totalPower = calculateBattlePartyPower(party);
  const recommendedPower = Number(operation?.recommendedPower || 0) || 0;
  const judgement = battlePowerJudgement(totalPower, recommendedPower);
  return `
    <dl class="battle-power-summary">
      <div><dt>총 전투력</dt><dd>${totalPower > 0 ? formatNumber(totalPower) : '편성 필요'}</dd></div>
      <div><dt>권장 전투력</dt><dd>${formatNumber(recommendedPower)}</dd></div>
      <div><dt>전력 판정</dt><dd>${escapeHtml(judgement)}</dd></div>
    </dl>
  `;
}

function renderBattleOperationBoard() {
  renderBattleOperationList();
  renderBattleOperationDetail(selectedBattleOperation());
  renderBattlePartyReadiness();
}

async function openBattleOperationView() {
  if (!requireMercenaryAuth()) return;
  const screen = document.querySelector('#mercenary-battle-view');
  if (!screen) return;
  screen.hidden = false;
  document.body.classList.add('battle-board-open');
  ensureDefaultBattleParty();
  const loadPromise = ensureOwnedMercenariesLoaded({ refreshBattleBoard: true });
  const stageClearPromise = loadBattleStageClears().then(() => renderBattleOperationBoard());
  renderBattleOperationBoard();
  await Promise.all([loadPromise, stageClearPromise]);
}

function closeBattleOperationView() {
  document.querySelector('#mercenary-battle-view')?.setAttribute('hidden', '');
  document.body.classList.remove('battle-board-open');
}

function formatStageLabel(operation) {
  const number = String(operation?.stageNumber || '').trim();
  return number ? `Stage ${number}` : 'Stage';
}

function renderBattleOperationList() {
  const list = document.querySelector('#battle-operation-list');
  const count = document.querySelector('#battle-operation-count');
  if (!list) return;
  const baseOperations = battleOperationState.baseOperations.length ? battleOperationState.baseOperations : battleOperationState.operations;
  if (count) count.textContent = `${formatNumber(baseOperations.length)}개 테마`;
  if (!baseOperations.length) {
    list.innerHTML = `
      <article class="battle-operation-empty">
        <strong>전투 의뢰 데이터 없음</strong>
        <p>${escapeHtml(battleOperationState.operationLoadError || '전투 의뢰 JSON을 불러오지 못했습니다.')}</p>
        <em>public/data/mercenary.combat-missions.master.json export 상태를 확인해 주세요.</em>
        <button type="button" data-battle-operation-reload>새로고침</button>
      </article>
    `;
    list.querySelector('[data-battle-operation-reload]')?.addEventListener('click', async () => {
      mercenaryCombatRulesLoaded = false;
      await loadMercenaryCombatRuleData();
      await loadBattleStageClears();
      renderBattleOperationBoard();
    });
    return;
  }
  list.innerHTML = baseOperations.map((base) => {
    const group = getStageGroup(base.id);
    const selected = getSelectedBattleBaseId() === base.id;
    const stages = group?.stages || [];
    const unlockedCount = stages.filter(isBattleStageUnlocked).length;
    const durationText = base.durationSec ? formatMissionDuration(base.durationSec) : `${formatNumber(stages.length || base.enemies.length)}개 Stage`;
    return `
      <button class="battle-operation-card ${selected ? 'is-selected' : ''} status-${escapeHtml(base.status)}" type="button" data-battle-base-operation="${escapeHtml(base.id)}">
        <span>${escapeHtml(base.status)}</span>
        <strong>${escapeHtml(base.title)}</strong>
        <em>${escapeHtml(base.danger)} · ${escapeHtml(durationText)}</em>
        <small>${formatNumber(unlockedCount)}/${formatNumber(stages.length || 1)} Stage 개방</small>
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-battle-base-operation]').forEach((button) => {
    button.addEventListener('click', () => {
      const baseId = button.dataset.battleBaseOperation;
      battleOperationState.selectedBaseMissionId = baseId;
      const group = getStageGroup(baseId);
      battleOperationState.selectedOperationId = group?.stages?.[0]?.id || group?.base?.id || baseId;
      renderBattleOperationBoard();
    });
  });
}

function renderBattleStageSelector(baseId) {
  const group = getStageGroup(baseId);
  const stages = group?.stages || [];
  if (!stages.length) return '<p class="battle-board-note">스테이지 데이터가 없습니다.</p>';
  return `
    <section class="battle-stage-selector" aria-label="전투 스테이지 선택">
      ${stages.map((stage) => {
        const selected = stage.id === battleOperationState.selectedOperationId;
        const reasons = getClientStageUnlockReasons(stage);
        const locked = reasons.length > 0;
        return `
          <button type="button" class="${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}" data-battle-stage-operation="${escapeHtml(stage.id)}" title="${escapeHtml(reasons.join(' / '))}" ${locked ? 'disabled' : ''}>
            <strong>${escapeHtml(formatStageLabel(stage))}</strong>
            <span>${escapeHtml(stage.stageTier || stage.danger || '')} · ${formatNumber(stage.recommendedPower || 0)}${locked ? ' · 잠김' : ''}</span>
          </button>
        `;
      }).join('')}
    </section>
  `;
}

function renderSelectedStageMeta(operation) {
  const reasons = getClientStageUnlockReasons(operation);
  const bossCount = (operation.enemies || []).filter((enemy) => enemy.isBoss).length;
  return `
    <dl class="battle-stage-meta">
      <div><dt>난이도</dt><dd>${escapeHtml(operation.stageTier || operation.danger || '-')}</dd></div>
      <div><dt>필요 사무소</dt><dd>Lv.${formatNumber(operation.requiredOfficeLevel || 1)}</dd></div>
      <div><dt>적 수</dt><dd>${formatNumber((operation.enemies || []).length)}</dd></div>
      <div><dt>보스</dt><dd>${bossCount ? `${formatNumber(bossCount)}체` : '없음'}</dd></div>
      <div><dt>부상 위험</dt><dd>${escapeHtml(operation.injuryRisk || '-')}</dd></div>
      <div><dt>해금 상태</dt><dd>${reasons.length ? escapeHtml(reasons.join(' / ')) : '개방'}</dd></div>
    </dl>
  `;
}

function formatStageModifierSummary(modifiers = {}) {
  const parts = [];
  [['hp', 'HP'], ['atk', 'ATK'], ['def', 'DEF']].forEach(([key, label]) => {
    const value = Number(modifiers?.[`${key}Multiplier`] || 1);
    if (Number.isFinite(value) && value > 1) parts.push(`${label} x${value.toFixed(value % 1 ? 1 : 0)}`);
  });
  return parts.join(' / ');
}

function renderBattleEnemySummary(operation) {
  const enemies = Array.isArray(operation?.enemies) ? operation.enemies : [];
  if (!enemies.length) return '';
  const groups = new Map();
  enemies.forEach((enemy) => {
    const key = [
      enemy.sourceEnemyId || enemy.name,
      enemy.level,
      enemy.role,
      enemy.positionKey,
      enemy.isBoss ? 'boss' : 'normal'
    ].join('|');
    if (!groups.has(key)) {
      groups.set(key, { ...enemy, count: 0 });
    }
    groups.get(key).count += 1;
  });
  return `
    <section class="battle-enemy-summary" aria-label="적 구성">
      <h4>적 구성</h4>
      <div class="battle-enemy-summary-list">
        ${[...groups.values()].map((enemy) => {
          const modifierText = formatStageModifierSummary(enemy.stageModifiers);
          return `
            <article class="${enemy.isBoss ? 'is-boss' : ''}">
              <strong>${escapeHtml(enemy.isBoss ? `보스: ${enemy.name}` : enemy.name)}</strong>
              <span>×${formatNumber(enemy.count)} / Lv.${formatNumber(enemy.level || 1)} / ${escapeHtml(enemy.role || '-')} / ${escapeHtml(enemy.positionKey || '-')}</span>
              ${modifierText ? `<em>${escapeHtml(modifierText)}</em>` : ''}
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function getBattleEnemyPreviewGroups(operation) {
  const groups = new Map();
  (operation?.enemies || []).forEach((enemy) => {
    const modifierKey = formatStageModifierSummary(enemy.stageModifiers);
    const key = [enemy.enemyId || enemy.id || enemy.name, enemy.level, enemy.role, enemy.positionKey, enemy.isBoss ? 'boss' : '', modifierKey].join('|');
    const existing = groups.get(key);
    if (existing) existing.count += Number(enemy.count || 1) || 1;
    else groups.set(key, { ...enemy, count: Number(enemy.count || 1) || 1, modifierText: modifierKey });
  });
  return [...groups.values()];
}

function renderBattleEnemyPreview(operation) {
  const enemies = getBattleEnemyPreviewGroups(operation);
  return `
    <section class="battlefield-preview" style="--battle-bg: url('${escapeHtml(operation.battlefieldImage)}')">
      <div class="battle-enemy-preview-strip" aria-label="\uC801 \uD504\uB9AC\uBDF0">
        ${enemies.map((enemy) => `
          <article class="battle-enemy-preview-card ${enemy.isBoss ? 'is-boss' : ''}">
            ${enemy.isBoss ? '<b>Boss</b>' : ''}
            <img src="${escapeHtml(enemy.image || '')}" alt="" onerror="this.hidden=true" />
            <strong>${escapeHtml(enemy.name)}</strong>
            <span>×${formatNumber(enemy.count)} · Lv.${formatNumber(enemy.level || 1)}</span>
            <em>${escapeHtml(enemy.role || '-')} · ${escapeHtml(enemy.positionKey || enemy.element || '-')}</em>
            ${enemy.modifierText ? `<i>${escapeHtml(enemy.modifierText)}</i>` : ''}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderBattleOperationDetail(operation) {
  const root = document.querySelector('#battle-operation-detail');
  if (!root) return;
  if (!operation) {
    root.innerHTML = `
      <article class="battle-operation-brief battle-operation-empty">
        <header>
          <span class="battle-board-kicker">작전 브리프</span>
          <h3>전투 의뢰 데이터 없음</h3>
          <p>전투 의뢰 JSON을 불러오지 못했습니다.</p>
        </header>
        <section class="battle-operation-copy">
          <p>public/data/mercenary.combat-missions.master.json export 상태를 확인해 주세요.</p>
        </section>
      </article>
    `;
    return;
  }
  const baseId = operation.baseMissionId || operation.id;
  const group = getStageGroup(baseId);
  const base = group?.base || operation;
  root.innerHTML = `
    <article class="battle-operation-brief">
      <header>
        <span class="battle-board-kicker">작전 브리프</span>
        <h3>${escapeHtml(base.title)}</h3>
        <p>${escapeHtml(operation.title)} · ${escapeHtml(operation.battlefield)} · 위험도 ${escapeHtml(operation.danger)}</p>
      </header>
      ${renderBattleStageSelector(baseId)}
      ${renderBattleEnemyPreview(operation)}
      <section class="battle-operation-copy">
        <p>${escapeHtml(operation.description)}</p>
        ${renderSelectedStageMeta(operation)}
        ${renderBattleEnemySummary(operation)}
        ${renderBattlePowerSummary(operation)}
        ${renderBattleRewardPreview(operation)}
      </section>
    </article>
  `;
  root.querySelectorAll('[data-battle-stage-operation]').forEach((button) => {
    button.addEventListener('click', () => {
      battleOperationState.selectedOperationId = button.dataset.battleStageOperation;
      renderBattleOperationBoard();
    });
  });
}

function renderBattlePartyReadiness() {
  const root = document.querySelector('#battle-party-readiness');
  const operation = selectedBattleOperation();
  if (!root) return;
  if (!operation) {
    root.innerHTML = `
      <p class="battle-party-ready-message">전투 의뢰 데이터를 불러오지 못했습니다.</p>
      <div class="battle-party-actions">
        <button type="button" disabled>전투 개시</button>
        <button type="button" id="battle-open-squad-button">전투 파티 편성</button>
      </div>
      <p class="battle-board-note">시트 export JSON을 확인해 주세요.</p>
    `;
    root.querySelector('#battle-open-squad-button')?.addEventListener('click', openBattlePartyEditor);
    return;
  }
  ensureDefaultBattleParty();
  const party = selectedBattleParty();
  const memberMap = getBattlePartyMemberMap();
  const lanes = [
    ['front', '전열', ['front_1', 'front_2']],
    ['middle', '중열', ['middle_1', 'middle_2']],
    ['back', '후열', ['back_1']]
  ];
  const validation = getBattlePartyValidation(party, operation);
  const locked = operation.status === '\uc7a0\uae40';
  root.innerHTML = `
    <div class="battle-party-select-row">
      <label>
        <span>선택 파티</span>
        <select id="battle-party-select">
          ${battleOperationState.parties.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === party.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="battle-party-lanes">
      ${lanes.map(([key, label, slotKeys]) => `
        <section class="battle-party-lane battle-party-lane-${key}">
          <strong>${label} ${slotKeys.filter((slotKey) => party?.slots?.[slotKey]).length}/${slotKeys.length}</strong>
          <div class="battle-party-slot-row">
            ${slotKeys.map((slotKey) => {
              const storedMemberId = String(party?.slots?.[slotKey] || '');
              const member = memberMap.get(storedMemberId);
              if (!member && storedMemberId && ownedMercenaryLoadState.loading) return '<div class="battle-party-slot is-empty">용병 정보 불러오는 중...</div>';
              if (!member && storedMemberId) return '<div class="battle-party-slot is-empty is-unavailable">용병 정보를 불러오지 못했습니다.</div>';
              if (!member) return '<div class="battle-party-slot is-empty">용병 배치</div>';
              return `
                <article class="battle-party-slot ${!isBattleMercenaryAvailable(member) ? 'is-unavailable' : ''}">
                  ${renderImageWithPlaceholder(member, 'battle-party-portrait')}
                  <div>
                    <b>${escapeHtml(member.name)}</b>
                    <span>${escapeHtml(member.grade)} · Lv.${formatNumber(member.level)} · 전투력 ${formatNumber(calculateMockMercenaryBattlePower(member))}</span>
                    <em>${escapeHtml(member.statusLabel || member.status || '대기 중')}</em>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>
      `).join('')}
    </div>
    ${validation.ok ? '<p class="battle-party-ready-message is-ready">출격 준비 완료</p>' : `<p class="battle-party-ready-message">${escapeHtml(validation.reason)}</p>`}
    <div class="battle-party-actions">
      <button type="button" id="battle-start-button" ${!validation.ok || locked ? 'disabled' : ''}>전투 개시</button>
      <button type="button" id="battle-open-squad-button">전투 파티 편성</button>
    </div>
    <p class="battle-board-note">전투 종료 후 결과와 보상은 자동으로 정산됩니다.</p>
  `;
  root.querySelector('#battle-party-select')?.addEventListener('change', (event) => {
    setSelectedBattlePartyId(event.target.value);
    renderBattleOperationBoard();
  });
  root.querySelector('#battle-start-button')?.addEventListener('click', () => openBattleViewer(operation, party));
  root.querySelector('#battle-open-squad-button')?.addEventListener('click', openBattlePartyEditor);
}

function openBattlePartyEditor() {
  ensureDefaultBattleParty();
  battleOperationState.selectedEditorPartyId = battleOperationState.selectedPartyId || battleOperationState.parties[0]?.id || '';
  battleOperationState.selectedSlotKey = BATTLE_PARTY_SLOTS.find((slot) => !selectedEditorBattleParty()?.slots?.[slot.key])?.key || 'front_1';
  document.querySelector('#battle-party-editor-modal')?.removeAttribute('hidden');
  renderBattlePartyEditor();
}

function closeBattlePartyEditor() {
  document.querySelector('#battle-party-editor-modal')?.setAttribute('hidden', '');
}

function renderBattlePartyEditor() {
  renderBattlePartyEditorList();
  renderBattlePartyFormationBoard();
  renderBattlePartyEditorRoster();
  renderBattlePartyEditorFooter();
}

function renderBattlePartyEditorList() {
  const root = document.querySelector('#battle-party-editor-list');
  if (!root) return;
  root.innerHTML = battleOperationState.parties.map((party) => `
    <button type="button" class="battle-party-editor-list-card ${party.id === battleOperationState.selectedEditorPartyId ? 'is-selected' : ''}" data-editor-party="${escapeHtml(party.id)}">
      <strong>${escapeHtml(party.name)}</strong>
      <span>${formatNumber(battlePartyMemberIds(party).length)}/5 · 전투력 ${formatNumber(calculateBattlePartyPower(party))}</span>
    </button>
  `).join('');
  root.querySelectorAll('[data-editor-party]').forEach((button) => {
    button.addEventListener('click', () => {
      battleOperationState.selectedEditorPartyId = button.dataset.editorParty;
      battleOperationState.selectedSlotKey = BATTLE_PARTY_SLOTS.find((slot) => !selectedEditorBattleParty()?.slots?.[slot.key])?.key || 'front_1';
      renderBattlePartyEditor();
    });
  });
}

function createBattleParty() {
  if (battleOperationState.parties.length >= BATTLE_PARTY_MAX_COUNT) {
    showReadyNotice('전투 파티는 최대 5개까지 만들 수 있습니다.');
    return;
  }
  const nextParty = makeEmptyBattleParty(battleOperationState.parties.length + 1);
  battleOperationState.parties.push(nextParty);
  saveStoredBattleParties(battleOperationState.parties);
  battleOperationState.selectedEditorPartyId = nextParty.id;
  setSelectedBattlePartyId(nextParty.id);
  renderBattlePartyEditor();
  renderBattlePartyReadiness();
}

function deleteEditorBattleParty() {
  if (battleOperationState.parties.length <= 1) {
    showReadyNotice('전투 파티는 최소 1개가 필요합니다.');
    return;
  }
  battleOperationState.parties = battleOperationState.parties.filter((party) => party.id !== battleOperationState.selectedEditorPartyId);
  saveStoredBattleParties(battleOperationState.parties);
  const nextParty = battleOperationState.parties[0];
  battleOperationState.selectedEditorPartyId = nextParty.id;
  setSelectedBattlePartyId(nextParty.id);
  renderBattlePartyEditor();
  renderBattlePartyReadiness();
}

function renameEditorBattleParty(value) {
  const party = selectedEditorBattleParty();
  if (!party) return;
  updateBattleParty({ ...party, name: String(value || '').trim() || party.name });
  renderBattlePartyEditorList();
  renderBattlePartyReadiness();
}

function renderBattlePartyFormationBoard() {
  const root = document.querySelector('#battle-party-editor-board');
  const party = selectedEditorBattleParty();
  if (!root || !party) return;
  const memberMap = getBattlePartyMemberMap();
  const rows = [
    ['front', '전열 Front', ['front_1', 'front_2']],
    ['middle', '중열 Middle', ['middle_1', 'middle_2']],
    ['back', '후열 Back', ['back_1']]
  ];
  root.innerHTML = `
    <label class="battle-party-name-field">
      <span>파티 이름</span>
      <input type="text" id="battle-party-name-input" value="${escapeHtml(party.name)}" maxlength="24" />
    </label>
    <div class="battle-party-editor-board">
      ${rows.map(([rowKey, rowLabel, slotKeys]) => `
        <section class="battle-party-editor-row battle-party-editor-row-${rowKey}">
          <strong>${rowLabel}</strong>
          <div class="battle-party-editor-slots">
            ${slotKeys.map((slotKey) => renderBattlePartyEditorSlot(slotKey, memberMap.get(String(party.slots[slotKey] || '')))).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;
  root.querySelector('#battle-party-name-input')?.addEventListener('change', (event) => renameEditorBattleParty(event.target.value));
  root.querySelectorAll('[data-editor-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      battleOperationState.selectedSlotKey = button.dataset.editorSlot;
      renderBattlePartyFormationBoard();
      renderBattlePartyEditorRoster();
    });
  });
  root.querySelectorAll('[data-editor-remove-slot]').forEach((button) => {
    button.addEventListener('click', () => removeMercenaryFromBattleSlot(button.dataset.editorRemoveSlot));
  });
}

function renderBattlePartyEditorSlot(slotKey, member) {
  const selected = battleOperationState.selectedSlotKey === slotKey;
  const label = BATTLE_PARTY_SLOTS.find((slot) => slot.key === slotKey)?.label || slotKey;
  if (!member) {
    return `
      <button type="button" class="battle-party-editor-slot is-empty ${selected ? 'is-selected' : ''}" data-editor-slot="${escapeHtml(slotKey)}">
        <span>+</span>
        <b>${escapeHtml(label)}</b>
        <em>용병 배치</em>
      </button>
    `;
  }
  return `
    <article class="battle-party-editor-slot is-filled ${selected ? 'is-selected' : ''}">
      <button type="button" class="battle-party-slot-pick" data-editor-slot="${escapeHtml(slotKey)}">
        ${renderImageWithPlaceholder(member, 'battle-party-editor-portrait')}
        <div>
          <b>${escapeHtml(member.name)}</b>
          <span>${escapeHtml(member.grade)} · Lv.${formatNumber(member.level)} · 전투력 ${formatNumber(calculateMockMercenaryBattlePower(member))}</span>
          <em>${escapeHtml(member.statusLabel || member.status || '대기 중')}</em>
        </div>
      </button>
      <button type="button" class="battle-party-slot-remove" data-editor-remove-slot="${escapeHtml(slotKey)}">제거</button>
    </article>
  `;
}

function filterBattlePartyRoster() {
  const filters = battleOperationState.editorFilters;
  const search = String(filters.search || '').trim().toLowerCase();
  return getBattleOperationRoster().filter((member) => {
    if (search && !String(member.name || '').toLowerCase().includes(search)) return false;
    if (filters.grade !== 'all' && String(member.grade || '').toUpperCase() !== filters.grade) return false;
    if (filters.availableOnly && !isBattleMercenaryAvailable(member)) return false;
    return true;
  }).sort((a, b) => calculateMockMercenaryBattlePower(b) - calculateMockMercenaryBattlePower(a));
}

function renderBattlePartyEditorRoster() {
  const filterRoot = document.querySelector('#battle-party-editor-filters');
  const rosterRoot = document.querySelector('#battle-party-editor-roster');
  const count = document.querySelector('#battle-party-roster-count');
  const party = selectedEditorBattleParty();
  if (!filterRoot || !rosterRoot || !party) return;
  const filters = battleOperationState.editorFilters;
  const members = filterBattlePartyRoster();
  const selectedIds = new Set(battlePartyMemberIds(party));
  if (count) count.textContent = `${formatNumber(members.length)}명`;
  filterRoot.innerHTML = `
    <input type="search" data-battle-roster-filter="search" placeholder="이름 검색" value="${escapeHtml(filters.search)}" />
    <select data-battle-roster-filter="grade">
      ${['all', 'N', 'R', 'SR', 'SSR', 'EX'].map((grade) => `<option value="${grade}" ${filters.grade === grade ? 'selected' : ''}>${grade === 'all' ? '등급 전체' : grade}</option>`).join('')}
    </select>
    <label><input type="checkbox" data-battle-roster-filter="availableOnly" ${filters.availableOnly ? 'checked' : ''} /> 사용 가능만</label>
  `;
  filterRoot.querySelectorAll('[data-battle-roster-filter]').forEach((control) => {
    control.addEventListener('input', updateBattleRosterFilter);
    control.addEventListener('change', updateBattleRosterFilter);
  });
  rosterRoot.innerHTML = members.length
    ? members.map((member) => renderBattlePartyRosterCard(member, selectedIds)).join('')
    : `<p class="battle-board-note">${getBattleOperationRoster().length ? '조건에 맞는 용병이 없습니다.' : '보유 용병 정보를 불러오지 못했습니다.'}</p>`;
  rosterRoot.querySelectorAll('[data-battle-assign]').forEach((button) => {
    button.addEventListener('click', () => assignMercenaryToBattleSlot(button.dataset.battleAssign));
  });
}

function renderBattlePartyRosterCard(member, selectedIds) {
  const id = getOwnedRosterKey(member) || member.rosterId;
  const assigned = selectedIds.has(id);
  const available = isBattleMercenaryAvailable(member);
  return `
    <article class="battle-party-editor-roster-card ${assigned ? 'is-assigned' : ''} ${!available ? 'is-unavailable' : ''}">
      ${renderImageWithPlaceholder(member, 'battle-party-editor-roster-portrait')}
      <div>
        <b>${escapeHtml(member.name)}</b>
        <span>${escapeHtml(member.grade)} · Lv.${formatNumber(member.level)} · ${escapeHtml(member.role || member.position || '역할 없음')}</span>
        <em>전투력 ${formatNumber(calculateMockMercenaryBattlePower(member))} · ${escapeHtml(member.statusLabel || member.status || '대기 중')}</em>
        ${assigned ? '<small>배치됨</small>' : ''}
      </div>
      <button type="button" data-battle-assign="${escapeHtml(id)}" ${!available ? 'disabled' : ''}>${assigned ? '이동' : '배치'}</button>
    </article>
  `;
}

function updateBattleRosterFilter(event) {
  const key = event.target.dataset.battleRosterFilter;
  if (key === 'availableOnly') battleOperationState.editorFilters.availableOnly = Boolean(event.target.checked);
  else battleOperationState.editorFilters[key] = event.target.value;
  renderBattlePartyEditorRoster();
}

function renderBattlePartyEditorFooter() {
  const root = document.querySelector('#battle-party-editor-footer');
  const party = selectedEditorBattleParty();
  if (!root || !party) return;
  const count = battlePartyMemberIds(party).length;
  root.innerHTML = `
    <div><span>총 전투력</span><strong>${formatNumber(calculateBattlePartyPower(party))}</strong></div>
    <div><span>배치 인원</span><strong>${formatNumber(count)}/5</strong></div>
    <button type="button" id="battle-party-delete-button">삭제</button>
    <button type="button" id="battle-party-save-button">저장</button>
    <button type="button" id="battle-party-cancel-button">닫기</button>
  `;
  root.querySelector('#battle-party-delete-button')?.addEventListener('click', deleteEditorBattleParty);
  root.querySelector('#battle-party-save-button')?.addEventListener('click', () => {
    const partyToSelect = selectedEditorBattleParty();
    if (partyToSelect) setSelectedBattlePartyId(partyToSelect.id);
    renderBattleOperationBoard();
    showReadyNotice('전투 파티를 브라우저에 저장했습니다.');
  });
  root.querySelector('#battle-party-cancel-button')?.addEventListener('click', closeBattlePartyEditor);
}

function assignMercenaryToBattleSlot(mercenaryId, slotKey = battleOperationState.selectedSlotKey) {
  const party = selectedEditorBattleParty();
  if (!party) return;
  const id = String(mercenaryId || '').trim();
  const member = getBattlePartyMemberMap().get(id);
  if (!isBattleMercenaryAvailable(member)) {
    showReadyNotice('사용할 수 없는 용병은 전투 파티에 배치할 수 없습니다.');
    return;
  }
  const targetSlot = slotKey || BATTLE_PARTY_SLOTS.find((slot) => !party.slots[slot.key])?.key || 'front_1';
  const nextSlots = { ...party.slots };
  Object.keys(nextSlots).forEach((key) => {
    if (nextSlots[key] === id) nextSlots[key] = '';
  });
  nextSlots[targetSlot] = id;
  updateBattleParty({ ...party, slots: nextSlots });
  battleOperationState.selectedSlotKey = targetSlot;
  renderBattlePartyEditor();
  renderBattleOperationBoard();
}

function removeMercenaryFromBattleSlot(slotKey) {
  const party = selectedEditorBattleParty();
  if (!party) return;
  updateBattleParty({ ...party, slots: { ...party.slots, [slotKey]: '' } });
  battleOperationState.selectedSlotKey = slotKey;
  renderBattlePartyEditor();
  renderBattleOperationBoard();
}

function hashBattleSeed(input) {
  let hash = 2166136261;
  const text = String(input || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeSeededBattleRandom(seed) {
  let value = Number(seed || 1) >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function getMockBattleRole(value) {
  const haystack = String(value || '').toLowerCase();
  if (/tank|shield|guard|front|방패|수비|탱|전열/.test(haystack)) return 'tank';
  if (/heal|healer|medical|medic|priest|cleric|의료|힐|의무|사제|성직/.test(haystack)) return 'healer';
  if (/support|buffer|assist|지원|보조/.test(haystack)) return 'support';
  if (/dealer|attack|damage|dps|striker|딜|공격|추적/.test(haystack)) return 'dealer';
  return 'unknown';
}

function getBattleDifficultyLabel(powerRatio) {
  const ratio = Number(powerRatio || 0);
  if (ratio >= 1.35) return '압도적 우세';
  if (ratio >= 1.1) return '우세';
  if (ratio >= 0.9) return '호각';
  if (ratio >= 0.7) return '열세';
  if (ratio >= 0.5) return '위험';
  return '압도적 열세';
}

function getBattleDifficultyModifiers(powerRatio) {
  const ratio = Number(powerRatio || 0);
  if (ratio >= 1.35) {
    return {
      enemyHpMultiplier: 0.75,
      enemyAttackMultiplier: 0.7,
      allyDamageTakenMultiplier: 0.7,
      allyDamageDealtMultiplier: 1.25,
      enemyMinDamage: 40,
      allowFinisher: true
    };
  }
  if (ratio >= 1.1) {
    return {
      enemyHpMultiplier: 0.9,
      enemyAttackMultiplier: 0.85,
      allyDamageTakenMultiplier: 0.85,
      allyDamageDealtMultiplier: 1.12,
      enemyMinDamage: 55,
      allowFinisher: true
    };
  }
  if (ratio >= 0.9) {
    return {
      enemyHpMultiplier: 1,
      enemyAttackMultiplier: 1,
      allyDamageTakenMultiplier: 1,
      allyDamageDealtMultiplier: 1,
      enemyMinDamage: 75,
      allowFinisher: false
    };
  }
  if (ratio >= 0.7) {
    return {
      enemyHpMultiplier: 1.22,
      enemyAttackMultiplier: 1.35,
      allyDamageTakenMultiplier: 1.32,
      allyDamageDealtMultiplier: 0.84,
      enemyMinDamage: 130,
      allowFinisher: false
    };
  }
  if (ratio >= 0.5) {
    return {
      enemyHpMultiplier: 1.35,
      enemyAttackMultiplier: 1.55,
      allyDamageTakenMultiplier: 1.45,
      allyDamageDealtMultiplier: 0.72,
      enemyMinDamage: 150,
      allowFinisher: false
    };
  }
  return {
    enemyHpMultiplier: 1.6,
    enemyAttackMultiplier: 1.9,
    allyDamageTakenMultiplier: 1.75,
    allyDamageDealtMultiplier: 0.6,
    enemyMinDamage: 190,
    allowFinisher: false
  };
}

const BASIC_ATTACK_FORMULAS = {
  normal_strike: { multiplier: 1 },
  guard_strike: { multiplier: 0.85, defenseScale: 0.25 },
  heavy_smash: { multiplier: 1.35, accuracyBonus: -0.08 },
  speed_cut: { multiplier: 0.8, speedScale: 1 / 220 },
  pierce_thrust: { multiplier: 0.95, defenseIgnore: 0.3 },
  ranged_shot: { multiplier: 1.05, accuracyScale: 0.2 },
  magic_bolt: { multiplier: 1.15, tecScale: 0.15, defenseIgnore: 0.2 },
  support_staff: { multiplier: 0.55, supportScale: 0.25 },
  elite_strike: { multiplier: 1.18 },
  shadow_cut: { multiplier: 0.9, speedScale: 1 / 200 },
  arcane_bolt: { multiplier: 1.15, tecScale: 0.3, defenseIgnore: 0.25 },
  lightning_lance: { multiplier: 1.05, speedFlatScale: 0.45 },
  precision_shot: { multiplier: 1.15, accuracyScale: 0.35 },
  command_strike: { multiplier: 0.85, supportScale: 0.45 },
  aegis_bash: { multiplier: 0.8, defenseScale: 0.55 },
  frost_control: { multiplier: 0.75, tecScale: 0.3, supportScale: 0.2 },
  venom_thread: { multiplier: 0.85, tecScale: 0.25 },
  curse_weave: { multiplier: 0.75, tecScale: 0.4, supportScale: 0.25 },
  dragon_flame: { multiplier: 1.25, tecScale: 0.25 },
  siege_cannon: { multiplier: 1.45, accuracyBonus: -0.12 },
  moonlight_stage: { multiplier: 0.9, supportScale: 0.5 },
  rescue_burst: { multiplier: 0.75, supportScale: 0.7 },
  byte_glitch: { multiplier: 0, tecScale: 1.2, supportScale: 0.35, defenseIgnore: 0.2 },
  cardboard_dragon_bonk: { multiplier: 1.1, defenseScale: 0.2 },
  bb_mooncancer_hack: { multiplier: 1.2, tecScale: 0.7, supportScale: 0.55, defenseIgnore: 0.25, accuracyBonus: 0.05 }
};

const STATUS_DOT_FORMULAS = {
  poison: { stat: 'attack', multiplier: 0.18 },
  burn: { stat: 'attack', multiplier: 0.16 },
  bleed: { stat: 'attack', multiplier: 0.12 },
  curse: { stat: 'tec', multiplier: 0.12 },
  corrosion: { stat: 'attack', multiplier: 0.1 },
  elemental: { stat: 'attack', multiplier: 0.08 },
  bb_hacked: { stat: 'tec', multiplier: 0.1 }
};

const CONTROL_SKIP_CHANCES = {
  stun: 1,
  sleep: 1,
  freeze: 0.35
};

function getMercField(source, camelKey, snakeKey, fallback = null) {
  if (!source) return fallback;
  if (camelKey && source[camelKey] !== undefined && source[camelKey] !== null && source[camelKey] !== '') return source[camelKey];
  if (snakeKey && source[snakeKey] !== undefined && source[snakeKey] !== null && source[snakeKey] !== '') return source[snakeKey];
  return fallback;
}

function normalizeBattleRate(value, fallback = 0) {
  const rate = normalizeRateField(value);
  return Number.isFinite(rate) ? rate : fallback;
}

function clampBattleValue(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function getBattleRuleId(rule, camelKey, snakeKey) {
  return String(getMercField(rule, camelKey, snakeKey, '') || '').trim();
}

function getBattleRuleName(rule, fallback = '') {
  return String(getMercField(rule, 'displayName', 'display_name', fallback) || fallback || '').trim();
}

function warnMissingBattleRule(kind, id) {
  const key = `${kind}:${id || 'empty'}`;
  if (missingCombatRuleWarnings.has(key)) return;
  missingCombatRuleWarnings.add(key);
  console.warn(`[mercenary/battle] Missing ${kind}:`, id);
}

function getAttackTypeById(id) {
  const safeId = String(id || '').trim();
  if (!safeId) return null;
  const rule = mercenaryCombatRules.attackTypesById.get(safeId) || null;
  if (!rule && safeId !== 'normal_strike') warnMissingBattleRule('basicAttackId', safeId);
  return rule;
}

function getSkillById(id) {
  const safeId = String(id || '').trim();
  if (!safeId || safeId === 'none') return null;
  const skill = mercenaryCombatRules.skillsById.get(safeId) || null;
  if (!skill) warnMissingBattleRule('skillId', safeId);
  return skill;
}

function getStatusEffectById(id) {
  const safeId = String(id || '').trim();
  if (!safeId || safeId === 'none') return null;
  const status = mercenaryCombatRules.statusEffectsById.get(safeId) || null;
  if (!status) warnMissingBattleRule('statusId', safeId);
  return status;
}

function hasFinalConsonantKorean(text) {
  const chars = Array.from(String(text || '').trim());
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const code = chars[index].charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return ((code - 0xac00) % 28) !== 0;
    if (/[A-Za-z0-9]/.test(chars[index])) return /[013678LMNRlmnr]$/.test(chars[index]);
  }
  return false;
}

function withJosa(text, pair) {
  const safeText = String(text || '').trim();
  const [withBatchim, withoutBatchim] = String(pair || '').split('/');
  if (!safeText || !withBatchim || !withoutBatchim) return safeText;
  return `${safeText}${hasFinalConsonantKorean(safeText) ? withBatchim : withoutBatchim}`;
}

function subjectName(name) {
  return withJosa(name, '이/가');
}

function objectName(name) {
  return withJosa(name, '을/를');
}

function topicName(name) {
  return withJosa(name, '은/는');
}

function directionName(name) {
  return withJosa(name, '으로/로');
}

function fillBattleTemplate(template, actor, target, extra = {}) {
  const fallback = extra.fallback || '';
  const text = String(template || fallback || '');
  const actorName = actor?.name || 'Actor';
  const targetName = target?.name || 'Target';
  return text
    .replaceAll('{actor}이', subjectName(actorName))
    .replaceAll('{actor}가', subjectName(actorName))
    .replaceAll('{actor}을', objectName(actorName))
    .replaceAll('{actor}를', objectName(actorName))
    .replaceAll('{actor}은', topicName(actorName))
    .replaceAll('{actor}는', topicName(actorName))
    .replaceAll('{actor}으로', directionName(actorName))
    .replaceAll('{actor}로', directionName(actorName))
    .replaceAll('{target}이', subjectName(targetName))
    .replaceAll('{target}가', subjectName(targetName))
    .replaceAll('{target}을', objectName(targetName))
    .replaceAll('{target}를', objectName(targetName))
    .replaceAll('{target}은', topicName(targetName))
    .replaceAll('{target}는', topicName(targetName))
    .replaceAll('{target}으로', directionName(targetName))
    .replaceAll('{target}로', directionName(targetName))
    .replaceAll('{actorSubject}', subjectName(actorName))
    .replaceAll('{actorObject}', objectName(actorName))
    .replaceAll('{actorTopic}', topicName(actorName))
    .replaceAll('{targetSubject}', subjectName(targetName))
    .replaceAll('{targetObject}', objectName(targetName))
    .replaceAll('{targetTopic}', topicName(targetName))
    .replaceAll('{actor}', actorName)
    .replaceAll('{target}', targetName)
    .replaceAll('{skill}', extra.skillName || '')
    .replaceAll('{status}', extra.statusName || '');
}

function getMockBattleTags(source) {
  const tags = [];
  ['tags', 'traits', 'keywords'].forEach((key) => {
    if (Array.isArray(source?.[key])) tags.push(...source[key]);
  });
  return tags.map((tag) => String(tag || '')).filter(Boolean);
}

function getBattlePartySlotDepth(slotKey) {
  if (String(slotKey || '').startsWith('front')) return 'ally_front';
  if (String(slotKey || '').startsWith('middle')) return 'ally_middle';
  return 'ally_back';
}


const BATTLE_EQUIPMENT_STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'tec', 'sup'];

function normalizeBattleEquipmentBonus(member = {}) {
  const source = member.equipmentBonus || member.statBreakdown?.equipmentBonus || {};
  const bonus = {
    hp: Number(source.hp || 0) || 0,
    atk: Number(source.atk || 0) || 0,
    def: Number(source.def || 0) || 0,
    spd: Number(source.spd || 0) || 0,
    tec: Number(source.tec || 0) || 0,
    sup: Number(source.sup || 0) || 0,
    accuracy: Number(source.accuracy || 0) || 0,
    evasion: Number(source.evasion || 0) || 0,
    critical: Number(source.critical || 0) || 0,
    healing: Number(source.healing || 0) || 0,
    combatPower: Number(member.equipmentCombatPower ?? source.combatPower ?? 0) || 0
  };
  return bonus;
}

function getMemberCurrentCombatStats(member = {}) {
  return normalizeLowerStats(member.currentStats || member.effectiveStats || member.statBreakdown?.currentStats || member.baseStats || member.stats || {});
}

function getMemberBaseCombatStatsWithoutEquipment(member = {}, equipmentBonus = normalizeBattleEquipmentBonus(member)) {
  const current = getMemberCurrentCombatStats(member);
  const fallback = normalizeLowerStats(member.baseStats || member.stats || {});
  const base = {};
  BATTLE_EQUIPMENT_STAT_KEYS.forEach((key) => {
    const currentValue = Number(current[key]);
    const fallbackValue = Number(fallback[key] || 0) || 0;
    const value = Number.isFinite(currentValue) && currentValue > 0
      ? currentValue - Number(equipmentBonus[key] || 0)
      : fallbackValue;
    base[key] = Math.max(key === 'hp' || key === 'atk' || key === 'spd' ? 1 : 0, Math.round(Number(value || 0) || 0));
  });
  return base;
}

function buildMercenaryBattleEquipmentSnapshot(member = {}) {
  const equipmentBonus = normalizeBattleEquipmentBonus(member);
  const baseStats = getMemberBaseCombatStatsWithoutEquipment(member, equipmentBonus);
  const finalStats = {
    hp: Math.max(1, Math.round(baseStats.hp + equipmentBonus.hp)),
    atk: Math.max(1, Math.round(baseStats.atk + equipmentBonus.atk)),
    def: Math.max(0, Math.round(baseStats.def + equipmentBonus.def)),
    spd: Math.max(1, Math.round(baseStats.spd + equipmentBonus.spd)),
    tec: Math.max(0, Math.round(baseStats.tec + equipmentBonus.tec)),
    sup: Math.max(0, Math.round(baseStats.sup + equipmentBonus.sup))
  };
  const slots = normalizeEquipmentSlotMap(member.equipmentSlots || {});
  const equipmentSlots = Object.fromEntries(EQUIPMENT_SLOT_ORDER.map((slotKey) => {
    const slot = slots[slotKey];
    if (!slot) return [slotKey, null];
    return [slotKey, {
      slot: slotKey,
      inventoryItemId: slot.inventoryItemId || slot.inventory_item_id || '',
      itemId: slot.itemId || slot.item_id || '',
      equipmentId: slot.equipmentId || slot.equipment_id || slot.equipment?.equipmentId || '',
      name: slot.name || slot.equipment?.name || slot.item?.name || '',
      grade: slot.grade || slot.equipment?.grade || slot.item?.grade || ''
    }];
  }));
  const equippedNames = Object.values(equipmentSlots).filter(Boolean).map((slot) => slot.name || slot.equipmentId || slot.itemId).filter(Boolean);
  const baseCombatPower = Number(member.baseCombatPowerWithoutEquipment ?? member.baseCombatPowerNoEquipment ?? member.baseCombatPower ?? calculateDetailCombatPower(baseStats)) || 0;
  const equipmentCombatPower = Number(equipmentBonus.combatPower || 0) || 0;
  const totalCombatPower = Number(member.totalCombatPower ?? member.displayCombatPower ?? member.combatPower ?? member.power ?? (baseCombatPower + equipmentCombatPower)) || 0;
  return {
    userMercenaryId: String(getOwnedRosterKey(member) || member.ownedId || member.id || ''),
    name: member.name || '',
    level: Number(member.level || member.currentLevel || 1) || 1,
    baseStats,
    equipmentSlots,
    equipmentBonus,
    finalStats,
    baseCombatPower,
    equipmentCombatPower,
    totalCombatPower,
    equippedNames,
    applied: equipmentCombatPower > 0 || BATTLE_EQUIPMENT_STAT_KEYS.some((key) => Number(equipmentBonus[key] || 0) !== 0)
  };
}

function summarizeBattleEquipmentSnapshots(snapshots = []) {
  const rows = (Array.isArray(snapshots) ? snapshots : []).filter(Boolean);
  const appliedRows = rows.filter((snapshot) => snapshot.applied);
  return {
    applied: appliedRows.length > 0,
    appliedCount: appliedRows.length,
    totalEquipmentPower: appliedRows.reduce((sum, snapshot) => sum + (Number(snapshot.equipmentCombatPower || snapshot.equipmentBonus?.combatPower || 0) || 0), 0),
    members: rows
  };
}

function buildBattlePartyMembersWithEquipmentSnapshot(party = selectedBattleParty(), roster = getBattleOperationRoster()) {
  const memberMap = new Map((Array.isArray(roster) ? roster : []).map((member) => [String(getOwnedRosterKey(member) || member.rosterId || member.id || ''), member]));
  return BATTLE_PARTY_SLOTS
    .map((slot) => {
      const sourceId = String(party?.slots?.[slot.key] || '');
      const member = memberMap.get(sourceId);
      if (!member) return null;
      const equipmentSnapshot = buildMercenaryBattleEquipmentSnapshot(member);
      return {
        ...member,
        equipmentSnapshot,
        battleBaseStats: equipmentSnapshot.baseStats,
        battleFinalStats: equipmentSnapshot.finalStats
      };
    })
    .filter(Boolean);
}

function getEnemyDepthForPattern(pattern, index, count) {
  const itemNumber = Number(index || 0) + 1;
  if (pattern === 'single_boss') return 'enemy_mid';
  if (pattern === 'swarm') return itemNumber <= Math.max(1, count - 2) ? 'enemy_back' : 'enemy_front';
  if (pattern === 'vanguard') return itemNumber <= 2 ? 'enemy_front' : 'enemy_mid';
  if (pattern === 'backline_support') return itemNumber <= 2 ? 'enemy_front' : itemNumber === 3 ? 'enemy_back' : 'enemy_mid';
  if (pattern === 'flank') return itemNumber === 3 ? 'enemy_back' : itemNumber <= 2 ? 'enemy_mid' : 'enemy_front';
  if (pattern === 'boss_minions') return itemNumber === 4 ? 'enemy_mid' : itemNumber === 2 || itemNumber === 3 ? 'enemy_front' : 'enemy_back';
  if (count <= 1) return 'enemy_mid';
  return itemNumber <= 2 ? 'enemy_front' : 'enemy_back';
}

function calculateMockBattleStatsFromMercenary(member, slot) {
  const equipmentSnapshot = member?.equipmentSnapshot || buildMercenaryBattleEquipmentSnapshot(member);
  const level = Math.max(1, Number(member?.level || member?.lv || 1));
  const displayPower = Number(equipmentSnapshot.totalCombatPower ?? member?.totalCombatPower ?? member?.displayCombatPower ?? member?.combatPower ?? member?.power ?? member?.battlePower ?? 0) || 0;
  const simulationPower = Number(displayPower || equipmentSnapshot.baseCombatPower + equipmentSnapshot.equipmentCombatPower || 0) || 0;
  const grade = String(member?.grade || 'N').toUpperCase();
  const tags = [
    ...getMockBattleTags(member),
    ...(Array.isArray(member?.combatTags) ? member.combatTags : []),
    ...(Array.isArray(member?.skillTags) ? member.skillTags : [])
  ].filter(Boolean);
  const roleText = [member?.role, member?.job, member?.class, member?.position, member?.name, ...tags].join(' ');
  const role = getMockBattleRole(roleText);
  const slotKey = slot?.key || '';
  const combatPower = Math.max(0, simulationPower);
  const baseStats = equipmentSnapshot.finalStats || member?.battleFinalStats || member?.currentStats || member?.baseStats || member?.stats || {};
  const sheetHp = Number(baseStats.hp || member?.hp || 0);
  const sheetAtk = Number(baseStats.atk || member?.atk || 0);
  const sheetDef = Number(baseStats.def || member?.def || 0);
  const sheetSpd = Number(baseStats.spd || member?.spd || 0);
  const sheetTec = Number(baseStats.tec || member?.tec || 0);
  const sheetSup = Number(baseStats.sup || member?.sup || 0);
  let maxHp = Math.round((700 + level * 45 + sheetHp * 2.2) * (role === 'tank' ? 1.18 : 1));
  let attack = Math.round((80 + level * 8 + sheetAtk * 0.82 + combatPower * 0.025) * (role === 'dealer' ? 1.18 : role === 'healer' ? 0.82 : 1));
  let defense = Math.round((20 + level * 3 + sheetDef * 0.5) * (role === 'tank' ? 1.24 : 1));
  let speed = Math.round(10 + level * 0.5 + sheetSpd * 0.05 + (role === 'dealer' ? 4 : role === 'support' || role === 'healer' ? 2 : 0));
  const tec = Math.round(20 + level * 2 + sheetTec * 0.65);
  const support = Math.round(20 + level * 2 + sheetSup * 0.65);
  let healPower = Number(member?.healPower || 0) || (role === 'healer' || role === 'support' ? Math.round(90 + level * 7 + support * 0.35) : 0);

  if (slotKey.startsWith('front')) {
    maxHp = Math.round(maxHp * 1.1);
    defense = Math.round(defense * 1.16);
  } else if (slotKey.startsWith('middle')) {
    attack = Math.round(attack * 1.08);
    speed += 2;
  } else {
    healPower = Math.round(healPower * 1.16);
    speed += 3;
  }

  return {
    level,
    grade,
    role,
    tags,
    maxHp,
    attack,
    defense,
    speed,
    tec,
    support,
    healPower,
    accuracy: clampBattleValue(normalizeBattleRate(getMercField(member, 'accuracyRate', 'accuracy_rate'), 0.9 + (role === 'dealer' ? 0.02 : 0)), 0.6, 0.98),
    evasionRate: clampBattleValue(normalizeBattleRate(getMercField(member, 'evasionRate', 'evasion_rate'), 0.04), 0, 0.35),
    critRate: clampBattleValue(normalizeBattleRate(getMercField(member, 'critRate', 'crit_rate'), 0.055), 0, 0.35),
    baseStats: equipmentSnapshot.baseStats,
    equipmentBonus: equipmentSnapshot.equipmentBonus,
    finalStats: equipmentSnapshot.finalStats,
    equipmentSnapshot,
    equipmentCombatPower: equipmentSnapshot.equipmentCombatPower,
    baseCombatPower: equipmentSnapshot.baseCombatPower,
    totalCombatPower: equipmentSnapshot.totalCombatPower
  };
}

function getEnemyRoleStatModifiers(enemy, role, depth) {
  const haystack = [enemy?.id, enemy?.name, enemy?.role, enemy?.element, ...(Array.isArray(enemy?.tags) ? enemy.tags : [])]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');
  const modifiers = {
    hp: 1,
    attack: 1,
    defense: 1,
    speed: 1,
    critRate: 1,
    accuracy: 1,
    healPower: 0
  };

  if (/slime|brute|tank|guard|vanguard|grunt|front|captain|슬라임|브루저|전열|행동대|대장|방패|수비/.test(haystack) || role === 'tank') {
    modifiers.hp *= 1.16;
    modifiers.defense *= 1.16;
    modifiers.attack *= 0.96;
    modifiers.speed *= 0.92;
  }
  if (/assassin|rogue|scout|thief|chaser|ambush|rat|기습|도둑|추적|매복|쥐/.test(haystack) || role === 'dealer') {
    modifiers.hp *= 0.9;
    modifiers.attack *= 1.12;
    modifiers.defense *= 0.88;
    modifiers.speed *= 1.18;
    modifiers.critRate *= 1.45;
    modifiers.accuracy *= 1.04;
  }
  if (/mage|caster|wizard|abyss|servant|dark|magic|후열|마법|심연|암흑|하수인/.test(haystack)) {
    modifiers.hp *= 0.94;
    modifiers.attack *= 1.18;
    modifiers.defense *= 0.86;
    modifiers.speed *= 1.04;
    modifiers.critRate *= 1.35;
  }
  if (/healer|support|medic|priest|cleric|heal|지원|힐|의무|사제|성직/.test(haystack) || role === 'healer' || role === 'support') {
    modifiers.hp *= 1.04;
    modifiers.attack *= 0.82;
    modifiers.defense *= 1.04;
    modifiers.speed *= 1.06;
    modifiers.healPower = 80;
  }
  if (depth === 'enemy_front') {
    modifiers.hp *= 1.04;
    modifiers.defense *= 1.08;
  } else if (depth === 'enemy_back') {
    modifiers.attack *= 1.04;
    modifiers.speed *= 1.03;
  }
  return modifiers;
}

function calculateMockBattleStatsFromEnemy(enemy, operation, index, pattern) {
  const danger = String(operation?.danger || '').trim();
  const dangerMultiplier = danger === '높음' ? 1.28 : danger === '보통' ? 1.08 : 0.92;
  const depth = getEnemyDepthForPattern(pattern, index, operation?.enemies?.length || 1);
  const isBoss = /boss|captain|대장|보스|큰|거대|심연|abyss/i.test([enemy?.id, enemy?.name, enemy?.role].join(' '));
  const level = Math.max(1, Number(enemy?.level || 1) || 1);
  const enemyBaseStats = {
    hp: Number(enemy?.maxHp || enemy?.hp || 520),
    atk: Number(enemy?.attack || 90) + 34,
    def: Number(enemy?.defense || 18) + 12,
    spd: Number(enemy?.speed || 10),
    tec: Number(enemy?.tec || 25) + 12,
    sup: Number(enemy?.support || 12) + 8
  };
  // Level bonus is shared by allies, enemies, and every rarity. Difficulty modifiers stay separate below.
  const enemyCurrentStats = addUnifiedLevelBonusToStats(enemyBaseStats, level);
  const depthAttackBonus = depth === 'enemy_front' ? 1.08 : depth === 'enemy_back' ? 0.92 : 1;
  const bossBonus = isBoss ? 1.14 : 1;
  const role = getMockBattleRole([enemy?.role, enemy?.name].join(' '));
  const roleModifiers = getEnemyRoleStatModifiers(enemy, role, depth);
  const baseAttack = enemyCurrentStats.atk * dangerMultiplier * depthAttackBonus * bossBonus;
  const baseDefense = enemyCurrentStats.def * dangerMultiplier * (depth === 'enemy_front' ? 1.12 : 1);
  const baseSpeed = enemyCurrentStats.spd + (depth === 'enemy_back' ? 1 : depth === 'enemy_front' ? 2 : 3);
  return {
    level,
    grade: null,
    role,
    tags: [enemy?.role, enemy?.element].map((item) => String(item || '')).filter(Boolean),
    maxHp: Math.max(1, Math.round(enemyCurrentStats.hp * dangerMultiplier * bossBonus * roleModifiers.hp)),
    attack: Math.max(1, Math.round(baseAttack * roleModifiers.attack)),
    defense: Math.max(0, Math.round(baseDefense * roleModifiers.defense)),
    speed: Math.max(1, Math.round(baseSpeed * roleModifiers.speed)),
    healPower: Math.round(roleModifiers.healPower * dangerMultiplier),
    tec: Math.max(1, Math.round(enemyCurrentStats.tec * dangerMultiplier * (role === 'dealer' ? 1.1 : 1))),
    support: Math.max(0, Math.round(enemyCurrentStats.sup * dangerMultiplier * (role === 'support' || role === 'healer' ? 1.4 : 1))),
    accuracy: Math.min(0.98, Math.max(0.72, 0.88 * roleModifiers.accuracy + (isBoss ? 0.03 : 0))),
    evasionRate: Math.min(0.28, Math.max(0.02, (role === 'dealer' ? 0.08 : 0.04) * roleModifiers.speed)),
    critRate: Math.min(0.24, (isBoss ? 0.08 : 0.04) * roleModifiers.critRate),
    depth
  };
}

function buildAllyBattleUnits(battleParty, roster) {
  const memberMap = new Map((Array.isArray(roster) ? roster : []).map((member) => [String(getOwnedRosterKey(member) || member.rosterId || member.id || ''), member]));
  return BATTLE_PARTY_SLOTS
    .map((slot, index) => {
      const sourceId = String(battleParty?.slots?.[slot.key] || '');
      const member = memberMap.get(sourceId);
      if (!member) return null;
      const stats = calculateMockBattleStatsFromMercenary(member, slot);
      const unitId = `unit_ally_${slot.key}_${sourceId}`;
      return {
        id: unitId,
        sourceId,
        side: 'ally',
        slot: slot.key,
        slotKey: slot.key,
        depth: getBattlePartySlotDepth(slot.key),
        name: member.name || `아군 ${index + 1}`,
        grade: stats.grade,
        level: stats.level,
        role: stats.role,
        image: member.imagePath || member.image || member.portrait || '',
        imageKey: member.imageKey,
        maxHp: stats.maxHp,
        initialHp: stats.maxHp,
        finalHp: stats.maxHp,
        hp: stats.maxHp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        tec: stats.tec,
        support: stats.support,
        healPower: stats.healPower,
        accuracy: stats.accuracy,
        evasionRate: stats.evasionRate,
        critRate: stats.critRate,
        baseStats: stats.baseStats,
        equipmentBonus: stats.equipmentBonus,
        finalStats: stats.finalStats,
        equipmentSnapshot: stats.equipmentSnapshot,
        equipmentCombatPower: stats.equipmentCombatPower,
        baseCombatPower: stats.baseCombatPower,
        totalCombatPower: stats.totalCombatPower,
        basicAttackId: String(getMercField(member, 'basicAttackId', 'basic_attack_id', 'normal_strike') || 'normal_strike').trim(),
        attackType: String(getMercField(member, 'attackType', 'attack_type', '') || '').trim(),
        activeSkillId: String(getMercField(member, 'activeSkillId', 'active_skill_id', '') || '').trim(),
        passiveSkillId: String(getMercField(member, 'passiveSkillId', 'passive_skill_id', '') || '').trim(),
        activeCooldowns: {},
        statuses: [],
        passiveApplied: false,
        status: 'alive',
        tags: stats.tags,
        member
      };
    })
    .filter(Boolean);
}

function buildEnemyBattleUnits(operation) {
  const pattern = getBattleEnemyFormationPattern(operation, operation?.enemies || []);
  return (operation?.enemies || []).map((enemy, index) => {
    const stats = calculateMockBattleStatsFromEnemy(enemy, operation, index, pattern);
    const sourceId = String(enemy?.id || `enemy_${index + 1}`);
    return {
      id: `unit_enemy_${sourceId}`,
      sourceId,
      side: 'enemy',
      slot: null,
      depth: stats.depth,
      name: enemy?.name || `적 ${index + 1}`,
      grade: null,
      level: stats.level,
      role: stats.role,
      image: enemy?.image || '',
      maxHp: stats.maxHp,
      initialHp: stats.maxHp,
      finalHp: stats.maxHp,
      hp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      tec: stats.tec,
      support: stats.support,
      healPower: stats.healPower,
      accuracy: stats.accuracy,
      evasionRate: stats.evasionRate,
      critRate: stats.critRate,
      basicAttackId: String(enemy?.basicAttackId || enemy?.basic_attack_id || 'normal_strike'),
      attackType: String(enemy?.attackType || enemy?.attack_type || ''),
      activeSkillId: String(enemy?.activeSkillId || enemy?.active_skill_id || ''),
      passiveSkillId: String(enemy?.passiveSkillId || enemy?.passive_skill_id || ''),
      activeCooldowns: {},
      statuses: [],
      passiveApplied: false,
      status: 'alive',
      tags: stats.tags
    };
  });
}

function cloneBattleUnitForState(unit) {
  return {
    ...unit,
    hp: Number(unit.initialHp || unit.maxHp || unit.hp || 1),
    status: 'alive',
    activeCooldowns: { ...(unit?.activeCooldowns || {}) },
    statuses: Array.isArray(unit?.statuses) ? unit.statuses.map((status) => ({ ...status })) : [],
    passiveApplied: Boolean(unit?.passiveApplied)
  };
}

function makeMockBattleUnits(operation, party = selectedBattleParty()) {
  const roster = getBattleOperationRoster();
  const allies = buildAllyBattleUnits(party, roster).map(cloneBattleUnitForState);
  const enemies = buildEnemyBattleUnits(operation).map(cloneBattleUnitForState);
  return { allies, enemies };
}

function getBattleEnemyFormationPattern(operation, enemies = []) {
  const explicitPattern = String(operation?.enemyFormation || operation?.enemyPattern || '').trim();
  const knownPatterns = new Set(['single_boss', 'swarm', 'vanguard', 'backline_support', 'flank', 'boss_minions']);
  if (knownPatterns.has(explicitPattern)) return explicitPattern;

  const enemyCount = Array.isArray(enemies) ? enemies.length : 0;
  const hasBossLikeEnemy = (enemies || []).some((enemy) => /boss|captain|대장|보스|큰|거대|심연|abyss/i.test([
    enemy?.id,
    enemy?.name,
    enemy?.role
  ].map((value) => String(value || '')).join(' ')));

  if (enemyCount <= 1) return 'single_boss';
  if (hasBossLikeEnemy && enemyCount >= 3) return 'boss_minions';
  if (enemyCount >= 4) return 'swarm';
  if (hasBossLikeEnemy) return 'backline_support';
  return 'vanguard';
}

function areAllBattleUnitsDefeated(units = []) {
  return units.length > 0 && units.every(isUnitDefeated);
}

function areAllEnemiesDefeated(viewer = battleOperationState.viewer) {
  return areAllBattleUnitsDefeated(viewer.enemies || []);
}

function areAllAlliesDefeated(viewer = battleOperationState.viewer) {
  return areAllBattleUnitsDefeated(viewer.allies || []);
}

function getBattleMockOutcome(viewer = battleOperationState.viewer) {
  const hasStartedReplay = Number(viewer?.currentEventIndex ?? -1) >= 0 || Boolean(viewer?.finished);
  if (!hasStartedReplay) return 'ongoing';
  if (areAllEnemiesDefeated(viewer)) return 'victory';
  if (areAllAlliesDefeated(viewer)) return 'defeat';
  return 'ongoing';
}

function isMockHealerMercenary(unit) {
  const member = unit?.member || unit || {};
  const haystack = [
    member.role,
    member.job,
    member.class,
    member.position,
    member.name,
    ...(Array.isArray(member.tags) ? member.tags : []),
    ...(Array.isArray(member.traits) ? member.traits : [])
  ].map((value) => String(value || '').toLowerCase()).join(' ');
  return /heal|healer|support|medic|priest|cleric|의무|치료|힐|지원|사제|성직|응급/.test(haystack);
}

function makeMockBattleAction({ round, kind, attacker, attackerSide, target, targetSide, amount, logText }) {
  const safeKind = kind === 'heal' ? 'heal' : 'damage';
  const type = safeKind === 'heal' ? 'heal' : 'attack';
  return {
    id: `mock_${round}_${attackerSide}_${attacker?.id || 'actor'}_${targetSide}_${target?.id || 'target'}_${safeKind}_${amount}`,
    round,
    kind: safeKind,
    type,
    attackerId: attacker?.id,
    actorId: attacker?.id,
    attackerSide,
    targetId: target?.id,
    targetSide,
    amount,
    logText,
    message: logText
  };
}

function sortBattleUnitsByTurnOrder(allies, enemies, random) {
  return [...allies, ...enemies]
    .filter(isUnitAlive)
    .sort((left, right) => {
      const speedDelta = Number(getEffectiveBattleStats(right).speed || 0) - Number(getEffectiveBattleStats(left).speed || 0);
      if (speedDelta) return speedDelta;
      return random() > 0.5 ? 1 : -1;
    });
}

function clampHp(value, maxHp = 1) {
  return Math.max(0, Math.min(Math.max(1, Number(maxHp || 1)), Number(value || 0)));
}

function isUnitDefeated(unit) {
  if (!unit) return true;
  return unit.defeated === true
    || unit.knockedOut === true
    || Number(unit.currentHp ?? unit.hp ?? unit.finalHp ?? 0) <= 0;
}

function isUnitAlive(unit) {
  return !isUnitDefeated(unit);
}

function markUnitDefeated(unit, round = 0) {
  if (!unit) return null;
  unit.hp = 0;
  unit.currentHp = 0;
  unit.finalHp = 0;
  unit.status = 'defeated';
  unit.defeated = true;
  unit.knockedOut = true;
  unit.alreadyDefeated = true;
  if (!unit.defeatedAtRound && round) unit.defeatedAtRound = round;
  return unit;
}

function normalizeBattleStateDefeats(state, round = 0) {
  [...(state?.allies || []), ...(state?.enemies || [])].forEach((unit) => {
    unit.hp = clampHp(unit.hp ?? unit.currentHp ?? unit.finalHp ?? unit.maxHp, unit.maxHp);
    unit.currentHp = unit.hp;
    unit.finalHp = unit.hp;
    if (unit.hp <= 0) {
      markUnitDefeated(unit, round);
      if (state?.defeatedUnitIds && unit.id) state.defeatedUnitIds.add(unit.id);
    } else {
      unit.status = 'alive';
      unit.defeated = false;
      unit.knockedOut = false;
    }
  });
}

function selectMockTarget(attacker, candidates, context = {}) {
  const alive = (candidates || []).filter(isUnitAlive);
  if (!alive.length) return null;
  const depthOrder = attacker?.side === 'enemy'
    ? ['ally_front', 'ally_middle', 'ally_back']
    : ['enemy_front', 'enemy_mid', 'enemy_back'];
  for (const depth of depthOrder) {
    const depthTargets = alive.filter((unit) => unit.depth === depth);
    if (depthTargets.length) {
      const sorted = depthTargets.slice().sort((left, right) => {
        const hpDelta = (Number(left.hp || 0) / Math.max(1, Number(left.maxHp || 1))) - (Number(right.hp || 0) / Math.max(1, Number(right.maxHp || 1)));
        if (Math.abs(hpDelta) > 0.22) return hpDelta;
        return (context.random?.() || 0) > 0.5 ? 1 : -1;
      });
      return sorted[0];
    }
  }
  return alive[0];
}

function selectMockHealTarget(allies) {
  return (allies || [])
    .filter((unit) => isUnitAlive(unit) && Number(unit.hp || 0) / Math.max(1, Number(unit.maxHp || 1)) <= 0.65)
    .sort((left, right) => (Number(left.hp || 0) / Math.max(1, Number(left.maxHp || 1))) - (Number(right.hp || 0) / Math.max(1, Number(right.maxHp || 1))))[0] || null;
}

function getUnitTextProfile(unit) {
  const member = unit?.member || {};
  return [
    unit?.role,
    unit?.name,
    unit?.slot,
    unit?.slotKey,
    unit?.depth,
    ...(Array.isArray(unit?.tags) ? unit.tags : []),
    member.role,
    member.job,
    member.class,
    member.position,
    member.name,
    ...(Array.isArray(member.tags) ? member.tags : []),
    ...(Array.isArray(member.traits) ? member.traits : [])
  ].map((value) => String(value || '').toLowerCase()).join(' ');
}

function getUnitCombatRole(unit) {
  const haystack = getUnitTextProfile(unit);
  if (/boss|captain|대장|보스|거대|심연/.test(haystack)) return 'boss';
  if (/heal|healer|medical|medic|priest|cleric|의료|힐|의무|사제|성직|치유/.test(haystack)) return 'healer';
  if (/support|buffer|assist|assistant|지원|보조|서포터/.test(haystack)) return 'support';
  if (/assassin|rogue|scout|thief|chaser|ambush|암살|기습|도둑|추적|매복|정찰/.test(haystack)) return 'assassin';
  if (/mage|caster|wizard|archer|ranger|magic|마법|궁수|사수|원거리/.test(haystack)) return 'dealer';
  if (/tank|shield|guard|defender|front|방어|탱커|수호|기사|전열|방패/.test(haystack)) return 'tank';
  if (/brute|fighter|warrior|striker|검사|전사|브루저|돌격/.test(haystack)) return 'bruiser';
  if (/dealer|attack|damage|dps|딜러|공격/.test(haystack)) return 'dealer';
  if (String(unit?.slot || unit?.slotKey || '').startsWith('front')) return 'bruiser';
  return unit?.role && unit.role !== 'unknown' ? unit.role : 'unknown';
}

function getUnitAiProfile(unit) {
  const haystack = getUnitTextProfile(unit);
  const role = getUnitCombatRole(unit);
  return {
    role,
    isHealer: role === 'healer',
    isSupport: role === 'support',
    isTankLike: role === 'tank' || role === 'bruiser' || /slime|brute|guard|vanguard|grunt|슬라임|브루저|행동대|전열/.test(haystack),
    isAssassin: role === 'assassin',
    isCaster: /mage|caster|wizard|magic|abyss|마법|심연|암흑/.test(haystack),
    isRanged: /archer|ranger|shooter|궁수|사수|원거리/.test(haystack),
    isBoss: role === 'boss'
  };
}

function getUnitHpRatio(unit) {
  return clampHp(unit?.hp ?? unit?.currentHp ?? unit?.finalHp ?? 0, unit?.maxHp || 1) / Math.max(1, Number(unit?.maxHp || 1));
}

function depthPriority(depth, order) {
  const index = order.indexOf(depth);
  return index < 0 ? 0 : (order.length - index) * 20;
}

function createAiDecisionLog(actor, action, reason, targetPriority = 0) {
  return {
    policy: action,
    reason,
    actorRole: getUnitCombatRole(actor),
    targetPriority: Math.round(targetPriority)
  };
}

function selectHealTarget(actor, allies, rng, context = {}) {
  const candidates = (allies || []).filter((unit) => isUnitAlive(unit) && getUnitHpRatio(unit) < 1);
  if (!candidates.length) return null;
  const scored = candidates.map((target) => {
    const hpRatio = getUnitHpRatio(target);
    const isSelf = target.id === actor?.id;
    const frontBonus = target.depth === 'ally_front' ? 10 : target.depth === 'ally_middle' ? 4 : 0;
    const emergencyBonus = hpRatio <= 0.35 ? 20 : hpRatio <= 0.55 ? 8 : 0;
    const selfAdjust = isSelf ? (hpRatio <= 0.35 ? 4 : -8) : 0;
    const targetPriority = (1 - hpRatio) * 100 + frontBonus + emergencyBonus + selfAdjust + (rng() * 0.01);
    return { target, targetPriority, hpRatio };
  }).sort((left, right) => right.targetPriority - left.targetPriority);
  return scored[0] || null;
}

function shouldUseHealAction(actor, allies, enemies, context = {}) {
  const profile = getUnitAiProfile(actor);
  const rng = context.random || makeSeededBattleRandom(1);
  const healPower = Number(actor?.healPower || 0);
  if ((!profile.isHealer && !profile.isSupport) || healPower <= 0) return { use: false };
  const healTarget = selectHealTarget(actor, allies, rng, context);
  if (!healTarget) return { use: false };
  const threshold = profile.isHealer ? 0.55 : 0.45;
  if (healTarget.hpRatio > threshold) return { use: false };
  const isEmergency = healTarget.hpRatio <= 0.35;
  const chance = profile.isHealer
    ? (isEmergency ? 0.85 : 0.65)
    : (isEmergency ? 0.48 : 0.35);
  if (rng() > chance) return { use: false };
  const sidePrefix = actor?.side === 'enemy' ? 'enemy' : 'ally';
  return {
    use: true,
    target: healTarget.target,
    targetPriority: healTarget.targetPriority,
    aiDecision: createAiDecisionLog(
      actor,
      profile.isHealer ? `${sidePrefix}_healer_emergency_heal` : `${sidePrefix}_support_assist_heal`,
      isEmergency ? 'lowest_ally_hp_critical' : 'lowest_ally_hp_below_threshold',
      healTarget.targetPriority
    )
  };
}

function getTargetPriorityScore(actor, target, context = {}) {
  if (!target || isUnitDefeated(target)) return -Infinity;
  const actorProfile = getUnitAiProfile(actor);
  const targetProfile = getUnitAiProfile(target);
  const hpRatio = getUnitHpRatio(target);
  let score = 0;

  if (actor?.side === 'ally') {
    score += depthPriority(target.depth, ['enemy_front', 'enemy_mid', 'enemy_back']);
    score += (1 - hpRatio) * (actorProfile.role === 'dealer' || actorProfile.isCaster || actorProfile.isRanged ? 34 : 18);
    if (actorProfile.role === 'tank' || actorProfile.role === 'bruiser') score += target.depth === 'enemy_front' ? 18 : 0;
    if ((actorProfile.isCaster || actorProfile.isRanged) && context.backlineProbe) score += target.depth === 'enemy_front' ? -10 : 18;
    if (targetProfile.isHealer || targetProfile.isSupport) score += actorProfile.role === 'dealer' ? 8 : 3;
  } else {
    score += depthPriority(target.depth, ['ally_front', 'ally_middle', 'ally_back']);
    if (actorProfile.isAssassin && context.flankProbe) score += target.depth === 'ally_front' ? -18 : 36;
    if ((actorProfile.isCaster || actorProfile.isRanged) && context.backlineProbe) {
      score += (1 - Number(target.defense || 0) / Math.max(1, Number(target.maxHp || 1))) * 18;
      score += target.depth === 'ally_front' ? -8 : 20;
    }
    if (actorProfile.isBoss && context.bossThreatProbe) score += (1 - hpRatio) * 26;
    if (actorProfile.isTankLike) score += target.depth === 'ally_front' ? 18 : 0;
    score += (1 - hpRatio) * 14;
  }
  return score;
}

function selectAttackTarget(actor, enemies, rng, context = {}) {
  const alive = (enemies || []).filter(isUnitAlive);
  if (!alive.length) return null;
  const profile = getUnitAiProfile(actor);
  const policyContext = {
    ...context,
    backlineProbe: (profile.isCaster || profile.isRanged) && rng() < 0.32
  };
  return alive
    .map((target) => ({
      target,
      targetPriority: getTargetPriorityScore(actor, target, policyContext) + rng() * 0.01
    }))
    .sort((left, right) => right.targetPriority - left.targetPriority)[0] || null;
}

function selectEnemyAttackTarget(actor, allies, rng, context = {}) {
  const alive = (allies || []).filter(isUnitAlive);
  if (!alive.length) return null;
  const profile = getUnitAiProfile(actor);
  const policyContext = {
    ...context,
    flankProbe: profile.isAssassin && rng() < 0.6,
    backlineProbe: (profile.isCaster || profile.isRanged) && rng() < 0.5,
    bossThreatProbe: profile.isBoss && rng() < 0.22
  };
  return alive
    .map((target) => ({
      target,
      targetPriority: getTargetPriorityScore(actor, target, policyContext) + rng() * 0.01
    }))
    .sort((left, right) => right.targetPriority - left.targetPriority)[0] || null;
}

function getStatusIdFromRule(rule) {
  return String(getMercField(rule, 'statusId', 'status_id', '') || '').trim();
}

function getStatusDuration(statusRule, skillRule = null) {
  const skillDuration = getMercField(skillRule, 'statusDuration', 'status_duration', '');
  const directDuration = skillDuration !== '' ? skillDuration : getMercField(skillRule, 'duration', 'duration', '');
  const statusDuration = directDuration !== '' ? directDuration : getMercField(statusRule, 'durationDefault', 'duration_default', 0);
  const text = String(statusDuration ?? '').trim();
  if (!text || text === 'instant' || text === 'none') return 0;
  if (text === 'battle' || text === 'while_low_hp') return 'battle';
  return Math.max(0, Number(text) || 0);
}

function getEffectiveBattleStats(unit) {
  const stats = {
    maxHp: Number(unit?.maxHp || 1),
    attack: Number(unit?.attack || 1),
    defense: Number(unit?.defense || 0),
    speed: Number(unit?.speed || 1),
    tec: Number(unit?.tec || 0),
    support: Number(unit?.support || unit?.healPower || 0),
    healPower: Number(unit?.healPower || 0),
    accuracy: clampBattleValue(Number(unit?.accuracy || 0.88), 0.6, 0.98),
    evasionRate: clampBattleValue(Number(unit?.evasionRate || 0), 0, 0.35),
    critRate: clampBattleValue(Number(unit?.critRate || 0), 0, 0.35),
    incomingDamageMultiplier: 1,
    outgoingDamageMultiplier: 1,
    healMultiplier: 1,
    activeSkillDisabled: false,
    skipChance: 0
  };

  (unit?.statuses || []).forEach((status) => {
    const id = String(status?.statusId || '').trim();
    const stacks = Math.max(1, Number(status?.stacks || 1));
    if (id === 'attack_up') stats.attack *= 1 + 0.12 * stacks;
    if (id === 'defense_up') stats.defense *= 1 + 0.12 * stacks;
    if (id === 'accuracy_up') stats.accuracy += 0.1;
    if (id === 'evasion_up') stats.evasionRate += 0.1;
    if (id === 'morale_up') {
      stats.attack *= 1.06;
      stats.accuracy += 0.06;
    }
    if (id === 'haste') stats.speed *= 1.12;
    if (id === 'support_up') stats.support *= 1.1;
    if (id === 'magic_up') {
      stats.tec *= 1.08;
      stats.attack *= 1.05;
    }
    if (id === 'defense_down') stats.defense *= Math.max(0.2, 1 - 0.15 * stacks);
    if (id === 'attack_down') stats.attack *= Math.max(0.25, 1 - 0.12 * stacks);
    if (id === 'accuracy_down') stats.accuracy -= 0.12;
    if (id === 'vulnerability') stats.incomingDamageMultiplier *= 1 + 0.12 * stacks;
    if (id === 'armor_break') stats.defense *= Math.max(0.15, 1 - 0.2 * stacks);
    if (id === 'slow') stats.speed *= 0.85;
    if (id === 'bb_hacked') {
      stats.attack *= 0.92;
      stats.defense *= 0.92;
      stats.accuracy -= 0.08;
    }
    if (id === 'bb_channel') {
      if (unit?.side === 'ally') {
        stats.attack *= 1.12;
        stats.defense *= 1.12;
        stats.accuracy += 0.08;
        stats.support *= 1.12;
      } else {
        stats.attack *= 0.92;
        stats.defense *= 0.92;
        stats.accuracy -= 0.08;
      }
    }
    if (id === 'shield') stats.incomingDamageMultiplier *= 0.8;
    if (id === 'guard_up') {
      stats.defense *= 1.15;
      stats.incomingDamageMultiplier *= 0.92;
    }
    if (id === 'grit' && getUnitHpRatio(unit) <= 0.35) stats.incomingDamageMultiplier *= 0.92;
    if (id === 'heal_up') stats.healMultiplier *= 1.12;
    if (id === 'silence') stats.activeSkillDisabled = true;
    if (CONTROL_SKIP_CHANCES[id]) stats.skipChance = Math.max(stats.skipChance, CONTROL_SKIP_CHANCES[id]);
    if (id === 'bind') {
      stats.speed *= 0.85;
      stats.evasionRate -= 0.08;
    }
  });

  stats.attack = Math.max(1, Math.round(stats.attack));
  stats.defense = Math.max(0, Math.round(stats.defense));
  stats.speed = Math.max(1, Math.round(stats.speed));
  stats.tec = Math.max(0, Math.round(stats.tec));
  stats.support = Math.max(0, Math.round(stats.support));
  stats.healPower = Math.max(0, Math.round(stats.healPower * stats.healMultiplier));
  stats.accuracy = clampBattleValue(stats.accuracy, 0.6, 0.98);
  stats.evasionRate = clampBattleValue(stats.evasionRate, 0, 0.35);
  stats.critRate = clampBattleValue(stats.critRate, 0, 0.35);
  return stats;
}

function calculateDamageFromFormula(actor, target, formula, rng, modifiers = {}, options = {}) {
  const actorStats = getEffectiveBattleStats(actor);
  const targetStats = getEffectiveBattleStats(target);
  const safeFormula = formula || BASIC_ATTACK_FORMULAS.normal_strike;
  const attackComponent = actorStats.attack * Number(safeFormula.multiplier ?? 1);
  const speedRatioComponent = Number(safeFormula.speedScale || 0) ? actorStats.attack * actorStats.speed * Number(safeFormula.speedScale || 0) : 0;
  const rawBase = attackComponent
    + speedRatioComponent
    + actorStats.speed * Number(safeFormula.speedFlatScale || 0)
    + actorStats.defense * Number(safeFormula.defenseScale || 0)
    + actorStats.tec * Number(safeFormula.tecScale || 0)
    + actorStats.support * Number(safeFormula.supportScale || 0)
    + actorStats.attack * Math.max(0, actorStats.accuracy - 0.8) * Number(safeFormula.accuracyScale || 0);
  const finalAccuracy = clampBattleValue(actorStats.accuracy + Number(safeFormula.accuracyBonus || 0) - targetStats.evasionRate, 0.6, 0.98);
  const isMiss = rng() > finalAccuracy;
  const isCritical = !isMiss && rng() < clampBattleValue(actorStats.critRate, 0, 0.35);
  const variance = 0.86 + rng() * 0.28;
  const defenseIgnore = clampBattleValue(Number(options.defenseIgnore ?? safeFormula.defenseIgnore ?? 0), 0, 0.8);
  const damageMultiplier = actor?.side === 'ally'
    ? Number(modifiers.allyDamageDealtMultiplier || 1)
    : Number(modifiers.enemyAttackMultiplier || 1) * Number(modifiers.allyDamageTakenMultiplier || 1);
  const adjustedDefense = targetStats.defense * (1 - defenseIgnore);
  const rawDamage = (rawBase * variance * (isCritical ? 1.5 : 1) - adjustedDefense * 0.45)
    * damageMultiplier
    * Number(targetStats.incomingDamageMultiplier || 1)
    * Number(actorStats.outgoingDamageMultiplier || 1)
    * Number(options.multiplier || 1);
  const minDamage = actor?.side === 'enemy' ? Number(modifiers.enemyMinDamage || 40) : 1;
  return {
    amount: isMiss ? 0 : Math.max(minDamage, Math.round(rawDamage)),
    isMiss,
    isCritical,
    attackStats: actorStats,
    targetStats
  };
}

function resolveBasicAttackDamage(actor, target, rng, modifiers = {}) {
  const attackTypeId = String(actor?.basicAttackId || 'normal_strike').trim() || 'normal_strike';
  const attackRule = getAttackTypeById(attackTypeId);
  const formula = BASIC_ATTACK_FORMULAS[attackTypeId] || BASIC_ATTACK_FORMULAS.normal_strike;
  if (!BASIC_ATTACK_FORMULAS[attackTypeId]) warnMissingBattleRule('basicAttackFormula', attackTypeId);
  const resolved = calculateDamageFromFormula(actor, target, formula, rng, modifiers);
  return {
    ...resolved,
    attackTypeId,
    attackTypeName: getBattleRuleName(attackRule, actor?.attackType || attackTypeId)
  };
}

function getSkillGradeMultiplier(skill, actor) {
  const skillId = String(getBattleRuleId(skill, 'skillId', 'skill_id') || '').toLowerCase();
  const grade = String(actor?.grade || '').toUpperCase();
  if (skillId.includes('mooncancer_bb_chan')) return 1.55;
  if (skillId.startsWith('active_ex_') || grade === 'EX') return 1.45;
  if (skillId.startsWith('active_ssr_') || grade === 'SSR') return 1.35;
  if (skillId.startsWith('active_sr_') || grade === 'SR') return 1.2;
  return 1.08;
}

function getActiveSkillTargets(actor, state, skill, rng) {
  const targetRule = String(getMercField(skill, 'targetRule', 'target_rule', 'front_enemy') || '').trim();
  const allies = actor.side === 'ally' ? state.allies : state.enemies;
  const enemies = actor.side === 'ally' ? state.enemies : state.allies;
  const aliveAllies = allies.filter(isUnitAlive);
  const aliveEnemies = enemies.filter(isUnitAlive);
  const byHpRatio = (left, right) => getUnitHpRatio(left) - getUnitHpRatio(right);
  if (targetRule === 'self') return isUnitAlive(actor) ? [actor] : [];
  if (targetRule === 'lowest_hp_ally') return aliveAllies.slice().sort(byHpRatio).slice(0, 1);
  if (targetRule === 'front_ally') return aliveAllies.filter((unit) => unit.depth === (actor.side === 'ally' ? 'ally_front' : 'enemy_front')).slice(0, 1);
  if (targetRule === 'all_allies') return aliveAllies;
  if (targetRule === 'all_allies_and_enemies') return [...aliveAllies, ...aliveEnemies];
  if (targetRule === 'all_enemies') return aliveEnemies;
  if (targetRule === 'lowest_hp_enemy') return aliveEnemies.slice().sort(byHpRatio).slice(0, 1);
  if (targetRule === 'front_enemy' || targetRule === 'front_to_back') {
    const frontDepth = actor.side === 'ally' ? 'enemy_front' : 'ally_front';
    const middleDepth = actor.side === 'ally' ? 'enemy_mid' : 'ally_middle';
    const backDepth = actor.side === 'ally' ? 'enemy_back' : 'ally_back';
    return aliveEnemies.filter((unit) => unit.depth === frontDepth).slice(0, 1)
      .concat(aliveEnemies.filter((unit) => unit.depth === middleDepth).slice(0, 1))
      .concat(aliveEnemies.filter((unit) => unit.depth === backDepth).slice(0, 1))
      .slice(0, 1);
  }
  if (targetRule === 'highest_threat_enemy') return aliveEnemies.slice().sort((left, right) => Number(right.attack || 0) - Number(left.attack || 0)).slice(0, 1);
  if (targetRule === 'weak_or_back_enemy') {
    return aliveEnemies.slice().sort((left, right) => {
      const leftBack = /back|mid/.test(String(left.depth || '')) ? -0.2 : 0;
      const rightBack = /back|mid/.test(String(right.depth || '')) ? -0.2 : 0;
      return (getUnitHpRatio(left) + leftBack) - (getUnitHpRatio(right) + rightBack);
    }).slice(0, 1);
  }
  if (targetRule === 'enemy_cluster') {
    return aliveEnemies
      .slice()
      .sort((left, right) => getUnitHpRatio(left) - getUnitHpRatio(right) || (rng() > 0.5 ? 1 : -1))
      .slice(0, Math.min(3, Math.max(2, aliveEnemies.length)));
  }
  const fallbackTarget = selectAttackTarget(actor, aliveEnemies, rng, {})?.target;
  return fallbackTarget ? [fallbackTarget] : aliveEnemies.slice(0, 1);
}

function triggerAllowsActiveSkill(actor, state, skill, round) {
  const trigger = String(getMercField(skill, 'trigger', 'trigger', 'turn_ready') || '').trim();
  const allies = actor.side === 'ally' ? state.allies : state.enemies;
  const enemies = actor.side === 'ally' ? state.enemies : state.allies;
  if (trigger === 'turn_ready' || trigger === 'round_start') return true;
  const allyMatch = trigger.match(/^ally_hp_below_(\d+)$/);
  if (allyMatch) {
    const limit = Number(allyMatch[1]) / 100;
    return allies.some((unit) => isUnitAlive(unit) && getUnitHpRatio(unit) <= limit);
  }
  const enemyMatch = trigger.match(/^enemy_hp_below_(\d+)$/);
  if (enemyMatch) {
    const limit = Number(enemyMatch[1]) / 100;
    return enemies.some((unit) => isUnitAlive(unit) && getUnitHpRatio(unit) <= limit);
  }
  warnMissingBattleRule('unsupportedTrigger', trigger);
  return false;
}

function decideActiveSkillAction(actor, state, rng, context = {}) {
  if (isUnitDefeated(actor)) return null;
  const stats = getEffectiveBattleStats(actor);
  if (stats.activeSkillDisabled) return null;
  const skillId = String(actor?.activeSkillId || '').trim();
  if (!skillId) return null;
  const skill = getSkillById(skillId);
  if (!skill || getMercField(skill, 'useInCombat', 'use_in_combat', true) === false) return null;
  const cooldowns = actor.activeCooldowns || {};
  if (Number(cooldowns[skillId] || 0) > 0) return null;
  if (!triggerAllowsActiveSkill(actor, state, skill, context.round || 1)) return null;
  const targets = getActiveSkillTargets(actor, state, skill, rng).filter(Boolean);
  if (!targets.length) return null;
  return {
    kind: 'active_skill',
    actor,
    targets,
    skill,
    skillId,
    skillName: getBattleRuleName(skill, skillId),
    effectType: String(getMercField(skill, 'effectType', 'effect_type', 'damage') || 'damage').trim(),
    statusId: getStatusIdFromRule(skill),
    aiDecision: createAiDecisionLog(actor, 'active_skill_ready', `trigger_${getMercField(skill, 'trigger', 'trigger', 'turn_ready')}`, 100)
  };
}

function decideMockBattleAction(actor, battleState, rng, context = {}) {
  if (!actor || isUnitDefeated(actor)) return null;
  const effectiveStats = getEffectiveBattleStats(actor);
  if (effectiveStats.skipChance > 0 && rng() < effectiveStats.skipChance) {
    return {
      kind: 'skip',
      actor,
      aiDecision: createAiDecisionLog(actor, 'control_skip', 'control_status', 0)
    };
  }
  const allies = actor.side === 'ally' ? battleState.allies : battleState.enemies;
  const enemies = actor.side === 'ally' ? battleState.enemies : battleState.allies;
  if (!enemies.some(isUnitAlive)) return null;

  const activeDecision = decideActiveSkillAction(actor, battleState, rng, context);
  if (activeDecision) return activeDecision;

  const healDecision = shouldUseHealAction(actor, allies, enemies, { ...context, random: rng });
  if (healDecision.use) {
    return {
      kind: 'heal',
      actor,
      target: healDecision.target,
      aiDecision: healDecision.aiDecision
    };
  }

  const targetInfo = actor.side === 'ally'
    ? selectAttackTarget(actor, enemies, rng, context)
    : selectEnemyAttackTarget(actor, enemies, rng, context);
  if (!targetInfo?.target) return null;
  const profile = getUnitAiProfile(actor);
  const reason = actor.side === 'ally'
    ? 'enemy_line_priority_and_finish'
    : profile.isAssassin
      ? 'assassin_flank_priority'
      : profile.isCaster || profile.isRanged
        ? 'caster_vulnerable_target_priority'
        : 'frontline_pressure_priority';
  const enemyPolicyRole = profile.isAssassin ? 'assassin' : profile.isCaster ? 'caster' : profile.isRanged ? 'ranged' : profile.isBoss ? 'boss' : profile.role;
  return {
    kind: 'damage',
    actor,
    target: targetInfo.target,
    aiDecision: createAiDecisionLog(
      actor,
      actor.side === 'ally' ? 'ally_attack_priority_target' : `enemy_${enemyPolicyRole}_attack_priority`,
      reason,
      targetInfo.targetPriority
    )
  };
}

function createBattleActionLogText(round, decision, amount, isCritical, afterHp) {
  const actor = decision?.actor;
  const target = decision?.target;
  const policy = decision?.aiDecision?.policy || '';
  if (decision?.kind === 'heal') {
    const emergency = /emergency/.test(policy);
    return `라운드 ${round}: ${subjectName(actor?.name || '지원 담당')} ${emergency ? '긴급히 ' : ''}${objectName(target?.name || '아군')} ${emergency ? '응급 처치해' : '지원해'} ${formatNumber(amount)} 회복`;
  }
  if (actor?.side === 'enemy') {
    const targetLine = target?.depth === 'ally_back' ? '후열의 ' : target?.depth === 'ally_middle' ? '중열의 ' : '전열의 ';
    const verb = /assassin|rogue|scout|flank/.test(policy) ? '찔러' : /caster|mage/.test(policy) ? '교란해' : '공격해';
    return `라운드 ${round}: ${subjectName(actor?.name || '적')} ${targetLine}${objectName(target?.name || '아군')} ${verb} ${formatNumber(amount)} 피해${isCritical ? ' (치명타)' : ''}`;
  }
  const finishText = Number(afterHp || 0) <= 0 ? '제압해' : '공격해';
  return `라운드 ${round}: ${subjectName(actor?.name || '용병')} ${objectName(target?.name || '대상')} ${finishText} ${formatNumber(amount)} 피해${isCritical ? ' (치명타)' : ''}`;
}

function applyStatusToUnit(target, statusId, source, context = {}, options = {}) {
  const safeStatusId = String(statusId || '').trim();
  if (!target || !safeStatusId || safeStatusId === 'none') return null;
  if (isUnitDefeated(target)) return null;
  const statusRule = getStatusEffectById(safeStatusId);
  if (!statusRule) return null;
  const chance = options.chance !== undefined ? Number(options.chance || 0) : Number(getMercField(options.skill, 'statusChance', 'status_chance', 1) || 1);
  if (chance > 0 && chance < 1 && context.random && context.random() > chance) return null;
  const duration = options.duration !== undefined ? options.duration : getStatusDuration(statusRule, options.skill || null);
  const stackRule = String(getMercField(statusRule, 'stackRule', 'stack_rule', 'refresh') || 'refresh').trim();
  const maxStack = Math.max(1, Number(getMercField(statusRule, 'maxStack', 'max_stack', 1) || 1));
  if (stackRule === 'none') return null;
  if (!Array.isArray(target.statuses)) target.statuses = [];
  const existing = target.statuses.find((item) => item.statusId === safeStatusId);
  if (existing) {
    if (stackRule === 'stack') existing.stacks = Math.min(maxStack, Number(existing.stacks || 1) + 1);
    if (stackRule === 'refresh' || stackRule === 'stack') existing.duration = duration;
    return existing;
  }
  const status = {
    statusId: safeStatusId,
    statusName: getBattleRuleName(statusRule, safeStatusId),
    statusType: String(getMercField(statusRule, 'statusType', 'status_type', '') || ''),
    sourceUnitId: source?.id || '',
    sourceSide: source?.side || '',
    duration,
    stacks: 1,
    power: Number(options.power || getMercField(options.skill, 'statusPower', 'status_power', 0) || 0),
    appliedRound: Number(context.round || 1),
    sourceAttack: Number(source?.attack || 0),
    sourceTec: Number(source?.tec || 0),
    sourceSupport: Number(source?.support || source?.healPower || 0)
  };
  target.statuses.push(status);
  return status;
}

function createStatusApplyAction({ round, order, actor, target, status, skill = null, actionType = 'status_apply' }) {
  const statusRule = getStatusEffectById(status?.statusId);
  const skillName = getBattleRuleName(skill, '');
  const statusName = status?.statusName || getBattleRuleName(statusRule, status?.statusId || '');
  const logTemplate = getMercField(statusRule, 'logApply', 'log_apply', '');
  const logText = fillBattleTemplate(logTemplate, actor, target, {
    statusName,
    skillName,
    fallback: `${target?.name || 'Target'} gains ${statusName || status?.statusId || 'status'}`
  });
  return createBattleAction({
    round,
    order,
    kind: actionType === 'passive_apply' ? 'passive_apply' : 'status_apply',
    attacker: actor,
    target,
    amount: 0,
    beforeHp: Number(target?.hp || 0),
    afterHp: Number(target?.hp || 0),
    actionType,
    skillId: getBattleRuleId(skill, 'skillId', 'skill_id'),
    skillName,
    statusId: status?.statusId || '',
    statusName,
    statusApplied: true,
    statusDuration: status?.duration ?? 0,
    statusStacks: status?.stacks || 1,
    logText
  });
}

function resolveSkillLogText(skill, actor, target, fallback) {
  return fillBattleTemplate(getMercField(skill, 'logTemplate', 'log_template', ''), actor, target, {
    skillName: getBattleRuleName(skill, ''),
    fallback
  });
}

function createActiveSkillActions(decision, state, rng, context = {}) {
  const actor = decision.actor;
  if (isUnitDefeated(actor)) return [];
  const skill = decision.skill;
  const effectType = decision.effectType;
  const skillId = decision.skillId;
  const skillName = decision.skillName;
  const statusId = decision.statusId;
  const modifiers = context.modifiers || {};
  const actions = [];
  let order = context.order || 1;
  const skillMultiplier = getSkillGradeMultiplier(skill, actor);
  const statusChance = Number(getMercField(skill, 'statusChance', 'status_chance', statusId ? 1 : 0) || 0);
  const actionGroupId = `active_${context.round || 0}_${order}_${actor?.id || 'actor'}_${skillId || 'skill'}`;
  const pushAction = (action) => {
    if (!action) return null;
    actions.push(action);
    if (typeof context.applyAction === 'function') {
      context.applyAction(action);
      action.appliedToState = true;
    }
    return action;
  };

  pushAction(createBattleAction({
    round: context.round,
    order,
    kind: 'status_apply',
    attacker: actor,
    target: actor,
    amount: 0,
    beforeHp: Number(actor?.hp || 0),
    afterHp: Number(actor?.hp || 0),
    actionType: 'active_skill',
    actionRole: 'skill_cast',
    actionGroupId,
    skillId,
    skillName,
    statusId,
    statusName: getBattleRuleName(getStatusEffectById(statusId), statusId),
    aiDecision: decision.aiDecision,
    logText: `라운드 ${context.round}: ${subjectName(actor?.name || '용병')} [${skillName || skillId}]을 전개했다.`
  }));
  order += 1;

  decision.targets.forEach((target) => {
    if (!target || isUnitDefeated(target)) return;
    const beforeHp = Number(target.hp || 0);
    const isHeal = effectType === 'heal' || effectType === 'heal_shield';
    const isStatusOnly = ['shield', 'self_buff', 'buff', 'debuff'].includes(effectType);
    if (isHeal) {
      const actorStats = getEffectiveBattleStats(actor);
      const amount = Math.min(
        Number(target.maxHp || 1) - beforeHp,
        Math.max(1, Math.round((actorStats.healPower + actorStats.support * 0.65 + actorStats.defense * (effectType === 'heal_shield' ? 0.2 : 0)) * skillMultiplier * (0.86 + rng() * 0.2)))
      );
      if (amount > 0) {
        pushAction(createBattleAction({
          round: context.round,
          order,
          kind: 'heal',
          attacker: actor,
          target,
          amount,
          beforeHp,
          afterHp: clampHp(beforeHp + amount, target.maxHp),
          actionType: 'active_skill_effect',
          actionRole: 'skill_effect',
          actionGroupId,
          skillId,
          skillName,
          statusId,
          statusName: getBattleRuleName(getStatusEffectById(statusId), statusId),
          aiDecision: decision.aiDecision,
          logText: `${subjectName(actor?.name || '용병')} ${objectName(target?.name || '아군')} ${formatNumber(amount)} 회복시켰다.`
        }));
        order += 1;
      }
    } else if (!isStatusOnly) {
      const defenseIgnore = effectType === 'damage_pierce' ? 0.35 : effectType === 'damage_magic' || effectType === 'hack_damage_debuff' ? 0.25 : 0;
      const bbFormula = skillId === 'active_ex_mooncancer_bb_chan'
        ? { multiplier: 1.35, tecScale: 0.75, supportScale: 0.65, defenseIgnore: 0.35, accuracyBonus: 0.08 }
        : BASIC_ATTACK_FORMULAS[actor.basicAttackId] || BASIC_ATTACK_FORMULAS.normal_strike;
      const damage = calculateDamageFromFormula(actor, target, bbFormula, rng, modifiers, { multiplier: skillMultiplier, defenseIgnore });
      const rawDamage = Number(damage.amount || 0);
      const appliedDamage = damage.isMiss ? 0 : Math.min(rawDamage, beforeHp);
      const afterHp = Math.max(0, beforeHp - appliedDamage);
      pushAction(createBattleAction({
        round: context.round,
        order,
        kind: damage.isMiss ? 'miss' : 'damage',
        attacker: actor,
        target,
        amount: appliedDamage,
        rawDamage,
        appliedDamage,
        beforeHp,
        afterHp,
        isCritical: damage.isCritical,
        isMiss: damage.isMiss,
        targetDefeated: !damage.isMiss && beforeHp > 0 && afterHp <= 0,
        actionType: 'active_skill_effect',
        actionRole: 'skill_effect',
        actionGroupId,
        skillId,
        skillName,
        statusId,
        statusName: getBattleRuleName(getStatusEffectById(statusId), statusId),
        aiDecision: decision.aiDecision,
        logText: damage.isMiss
          ? `라운드 ${context.round}: ${subjectName(actor?.name || '용병')} ${objectName(target?.name || '대상')} 노렸지만 빗나갔다.`
          : `${subjectName(actor?.name || '용병')} ${objectName(target?.name || '대상')} ${formatNumber(appliedDamage)} 피해${damage.isCritical ? ' (치명타)' : ''}${afterHp <= 0 ? '로 제압했다.' : '를 줬다.'}`
      }));
      order += 1;
      if (afterHp <= 0) return;
    }

    if (statusId && statusId !== 'none' && isUnitAlive(target)) {
      const status = applyStatusToUnit(target, statusId, actor, { ...context, random: rng }, { skill, chance: statusChance });
      if (status) {
        const action = createStatusApplyAction({ round: context.round, order, actor, target, status, skill });
        action.actionType = 'active_skill_effect';
        action.actionRole = 'skill_effect';
        action.actionGroupId = actionGroupId;
        action.skillId = skillId;
        action.skillName = skillName;
        pushAction(action);
        order += 1;
      }
    }
  });

  actor.activeCooldowns = actor.activeCooldowns || {};
  actor.activeCooldowns[skillId] = Math.max(0, Number(getMercField(skill, 'cooldown', 'cooldown', 0) || 0));
  return actions;
}

function createBasicAttackAction(decision, target, round, order, rng, modifiers) {
  if (!target || isUnitDefeated(target)) return null;
  const resolved = resolveBasicAttackDamage(decision.actor, target, rng, modifiers);
  const beforeHp = Number(target.hp || 0);
  if (beforeHp <= 0) return null;
  const rawDamage = Number(resolved.amount || 0);
  const appliedDamage = resolved.isMiss ? 0 : Math.min(rawDamage, beforeHp);
  const afterHp = Math.max(0, beforeHp - appliedDamage);
  return createBattleAction({
    round,
    order,
    kind: resolved.isMiss ? 'miss' : 'damage',
    attacker: decision.actor,
    target,
    amount: appliedDamage,
    rawDamage,
    appliedDamage,
    beforeHp,
    afterHp,
    isCritical: resolved.isCritical,
    isMiss: resolved.isMiss,
    targetDefeated: !resolved.isMiss && beforeHp > 0 && afterHp <= 0,
    actionType: 'basic_attack',
    attackTypeId: resolved.attackTypeId,
    attackTypeName: resolved.attackTypeName,
    aiDecision: decision.aiDecision,
    logText: resolved.isMiss
      ? `Round ${round}: ${decision.actor?.name || 'Actor'} misses with ${resolved.attackTypeName || resolved.attackTypeId}`
      : `${createBattleActionLogText(round, decision, appliedDamage, resolved.isCritical, afterHp)} (${resolved.attackTypeName || resolved.attackTypeId})`
  });
}

function decrementBattleCooldowns(units = []) {
  units.forEach((unit) => {
    Object.keys(unit.activeCooldowns || {}).forEach((skillId) => {
      unit.activeCooldowns[skillId] = Math.max(0, Number(unit.activeCooldowns[skillId] || 0) - 1);
    });
  });
}

function tickBattleStatuses(state, round, orderStart, modifiers = {}) {
  const actions = [];
  let order = orderStart;
  [...state.allies, ...state.enemies].forEach((unit) => {
    if (isUnitDefeated(unit)) {
      markUnitDefeated(unit, round);
      return;
    }
    if (!Array.isArray(unit.statuses)) unit.statuses = [];
    unit.statuses.slice().forEach((status) => {
      const dot = STATUS_DOT_FORMULAS[status.statusId];
      if (dot && isUnitAlive(unit)) {
        const sourceStat = dot.stat === 'tec' ? Number(status.sourceTec || 0) : Number(status.sourceAttack || 0);
        const targetStats = getEffectiveBattleStats(unit);
        const rawAmount = Math.max(1, Math.round(sourceStat * dot.multiplier * Math.max(1, Number(status.stacks || 1)) * Number(targetStats.incomingDamageMultiplier || 1)));
        const beforeHp = Number(unit.hp || 0);
        if (beforeHp <= 0) return;
        const appliedDamage = Math.min(rawAmount, beforeHp);
        const afterHp = Math.max(0, beforeHp - rawAmount);
        const statusRule = getStatusEffectById(status.statusId);
        actions.push(createBattleAction({
          round,
          order,
          kind: 'damage',
          attacker: { id: status.sourceUnitId, side: status.sourceSide, name: status.sourceUnitId || 'Status' },
          target: unit,
          amount: appliedDamage,
          rawDamage: rawAmount,
          appliedDamage,
          beforeHp,
          afterHp: Math.max(0, beforeHp - appliedDamage),
          targetDefeated: beforeHp > 0 && beforeHp - appliedDamage <= 0,
          actionType: 'status_tick',
          statusId: status.statusId,
          statusName: status.statusName,
          logText: fillBattleTemplate(getMercField(statusRule, 'logTick', 'log_tick', ''), { name: status.sourceUnitId || 'Status' }, unit, {
            statusName: status.statusName,
            fallback: `${unit.name || 'Target'} takes ${status.statusName || status.statusId} damage`
          })
        }));
        unit.hp = Math.max(0, beforeHp - appliedDamage);
        unit.currentHp = unit.hp;
        unit.finalHp = unit.hp;
        if (unit.hp <= 0) markUnitDefeated(unit, round);
        else unit.status = 'alive';
        order += 1;
      }
      if (typeof status.duration === 'number' && status.duration > 0) status.duration -= 1;
    });
    unit.statuses = unit.statuses.filter((status) => status.duration === 'battle' || Number(status.duration || 0) > 0);
  });
  return { actions, nextOrder: order };
}

function applyBattleStartPassives(state, round, orderStart, rng) {
  const actions = [];
  let order = orderStart;
  [...state.allies, ...state.enemies].forEach((unit) => {
    if (unit.passiveApplied || isUnitDefeated(unit)) return;
    const skillId = String(unit.passiveSkillId || '').trim();
    if (!skillId) return;
    const skill = getSkillById(skillId);
    if (!skill) return;
    unit.passiveApplied = true;
    const statusId = getStatusIdFromRule(skill);
    const targets = getActiveSkillTargets(unit, state, skill, rng);
    const validTargets = (targets.length ? targets : [unit]).filter(isUnitAlive);
    let appliedStatus = null;
    validTargets.forEach((target) => {
      if (!target || isUnitDefeated(target)) return;
      const status = statusId && statusId !== 'none'
        ? applyStatusToUnit(target, statusId, unit, { round, random: rng }, { skill, chance: Number(getMercField(skill, 'statusChance', 'status_chance', 1) || 1), duration: getStatusDuration(getStatusEffectById(statusId), skill) || 'battle' })
        : null;
      if (status && !appliedStatus) appliedStatus = status;
    });
    actions.push(createBattleAction({
      round,
      order,
      kind: 'passive_apply',
      attacker: unit,
      target: unit,
      amount: 0,
      beforeHp: Number(unit.hp || 0),
      afterHp: Number(unit.hp || 0),
      actionType: 'passive_apply',
      skillId,
      skillName: getBattleRuleName(skill, skillId),
      statusId: appliedStatus?.statusId || statusId,
      statusName: appliedStatus?.statusName || getBattleRuleName(getStatusEffectById(statusId), statusId),
      statusApplied: Boolean(appliedStatus),
      statusDuration: appliedStatus?.duration ?? 0,
      statusStacks: appliedStatus?.stacks || 0,
      logText: resolveSkillLogText(skill, unit, unit, `Round ${round}: ${unit?.name || 'Actor'} passive ${getBattleRuleName(skill, skillId)} applies`)
    }));
    order += 1;
  });
  return { actions, nextOrder: order };
}

function createBattleAction({
  round,
  order,
  kind,
  attacker,
  target,
  amount,
  beforeHp,
  afterHp,
  isCritical = false,
  isMiss = false,
  aiDecision = null,
  logText: customLogText = '',
  actionType = '',
  attackTypeId = '',
  attackTypeName = '',
  skillId = '',
  skillName = '',
  statusId = '',
  statusName = '',
  statusApplied = false,
  statusChance = 0,
  statusDuration = 0,
  statusStacks = 0,
  isFinisher = false,
  rawDamage = null,
  appliedDamage = null,
  targetDefeated = null,
  ignoredBecauseTargetDefeated = false,
  actionGroupId = '',
  actionRole = '',
  appliedToState = false
}) {
  const safeKind = kind === 'heal'
    ? 'heal'
    : kind === 'miss'
      ? 'miss'
      : kind === 'status_apply' || kind === 'passive_apply'
        ? kind
        : 'damage';
  const resolvedAppliedDamage = appliedDamage !== null && appliedDamage !== undefined
    ? Math.max(0, Number(appliedDamage || 0))
    : Math.max(0, Number(amount || 0));
  const resolvedRawDamage = rawDamage !== null && rawDamage !== undefined
    ? Math.max(0, Number(rawDamage || 0))
    : resolvedAppliedDamage;
  const resolvedTargetDefeated = targetDefeated !== null && targetDefeated !== undefined
    ? Boolean(targetDefeated)
    : safeKind === 'damage' && Number(beforeHp || 0) > 0 && Number(afterHp || 0) <= 0;
  const logText = customLogText || (safeKind === 'heal'
    ? `라운드 ${round}: ${attacker?.name || '지원 담당'}이 ${target?.name || '아군'}을 ${formatNumber(amount)} 회복`
    : safeKind === 'miss'
      ? `라운드 ${round}: ${attacker?.name || '전투원'}의 공격이 빗나갔습니다`
      : safeKind === 'status_apply' || safeKind === 'passive_apply'
        ? `라운드 ${round}: ${statusName || skillName || 'status'} applied`
      : `라운드 ${round}: ${attacker?.name || '전투원'}이 ${target?.name || '대상'}에게 ${formatNumber(amount)} 피해${isCritical ? ' (치명타)' : ''}`);
  return {
    id: `act_${round}_${order}_${attacker?.id || 'actor'}_${target?.id || 'target'}_${safeKind}`,
    order,
    round,
    kind: safeKind,
    type: safeKind === 'heal'
      ? 'heal'
      : safeKind === 'miss'
        ? 'miss'
        : safeKind === 'status_apply' || safeKind === 'passive_apply'
          ? 'status'
          : 'attack',
    attackerId: attacker?.id,
    actorId: attacker?.id,
    attackerSide: attacker?.side,
    targetId: target?.id,
    targetSide: target?.side,
    amount: resolvedAppliedDamage,
    damage: safeKind === 'damage' ? resolvedAppliedDamage : 0,
    healing: safeKind === 'heal' ? resolvedAppliedDamage : 0,
    rawDamage: safeKind === 'damage' ? resolvedRawDamage : 0,
    appliedDamage: safeKind === 'damage' ? resolvedAppliedDamage : 0,
    ignoredBecauseTargetDefeated,
    isCritical,
    isMiss,
    beforeHp,
    afterHp,
    targetDefeated: resolvedTargetDefeated,
    actionType: actionType || (safeKind === 'heal' ? 'heal' : safeKind === 'miss' ? 'basic_attack' : safeKind),
    actionGroupId,
    actionRole,
    appliedToState,
    attackTypeId,
    attackTypeName,
    skillId,
    skillName,
    statusId,
    statusName,
    statusApplied,
    statusChance,
    statusDuration,
    statusStacks,
    isFinisher,
    aiDecision,
    logText,
    message: logText
  };
}

function applyBattleActionToState(state, action) {
  if (!action || action.kind === 'miss') return;
  const targetList = action.targetSide === 'ally' ? state.allies : state.enemies;
  const target = targetList.find((unit) => unit.id === action.targetId);
  if (!target) return;
  if (action.kind === 'damage' && (state?.defeatedUnitIds?.has(target.id) || (isUnitDefeated(target) && !(action.targetDefeated && Number(action.beforeHp || 0) > 0)))) {
    action.ignoredBecauseTargetDefeated = true;
    action.amount = 0;
    action.damage = 0;
    action.appliedDamage = 0;
    action.targetDefeated = false;
    return;
  }
  target.hp = clampHp(action.afterHp ?? target.hp ?? 0, target.maxHp);
  target.currentHp = target.hp;
  target.finalHp = target.hp;
  if (action.kind === 'damage' && target.hp <= 0) {
    const alreadyDefeated = state?.defeatedUnitIds?.has(target.id);
    action.targetDefeated = !alreadyDefeated && Number(action.beforeHp || 0) > 0;
    markUnitDefeated(target, action.round);
    if (state?.defeatedUnitIds && target.id) state.defeatedUnitIds.add(target.id);
    return;
  }
  target.status = target.hp <= 0 ? 'defeated' : 'alive';
}

function runMockBattleRounds(allies, enemies, seed, options = {}) {
  const random = makeSeededBattleRandom(seed);
  const modifiers = options.modifiers || getBattleDifficultyModifiers(1);
  const state = {
    allies: allies.map(cloneBattleUnitForState),
    enemies: enemies.map(cloneBattleUnitForState),
    defeatedUnitIds: new Set()
  };
  normalizeBattleStateDefeats(state, 0);
  const rounds = [];
  const maxRounds = Number(options.maxRounds || 12);
  let orderCounter = 1;
  let totalAllyDamage = 0;
  let totalEnemyDamage = 0;
  let totalHealing = 0;

  for (let round = 1; round <= maxRounds; round += 1) {
    const actions = [];
    normalizeBattleStateDefeats(state, round);
    if (areAllBattleUnitsDefeated(state.allies) || areAllBattleUnitsDefeated(state.enemies)) break;
    if (round === 1) {
      const passiveResult = applyBattleStartPassives(state, round, orderCounter, random);
      actions.push(...passiveResult.actions);
      orderCounter = passiveResult.nextOrder;
    }
    const turnOrder = sortBattleUnitsByTurnOrder(state.allies, state.enemies, random);
    for (const actor of turnOrder) {
      const liveActor = (actor.side === 'ally' ? state.allies : state.enemies).find((unit) => unit.id === actor.id);
      if (!liveActor || isUnitDefeated(liveActor)) continue;
      if (areAllBattleUnitsDefeated(state.allies) || areAllBattleUnitsDefeated(state.enemies)) break;

      const decision = decideMockBattleAction(liveActor, state, random, { round, modifiers });
      if (!decision) continue;
      if (decision.kind === 'skip') {
        const action = createBattleAction({
          round,
          order: orderCounter,
          kind: 'status_apply',
          attacker: liveActor,
          target: liveActor,
          amount: 0,
          beforeHp: Number(liveActor.hp || 0),
          afterHp: Number(liveActor.hp || 0),
          actionType: 'control_skip',
          aiDecision: decision.aiDecision,
          logText: `Round ${round}: ${liveActor?.name || 'Actor'} cannot act`
        });
        actions.push(action);
        orderCounter += 1;
        continue;
      }
      if (decision.kind === 'active_skill') {
        const skillActions = createActiveSkillActions(decision, state, random, {
          round,
          order: orderCounter,
          modifiers,
          applyAction: (action) => applyBattleActionToState(state, action)
        });
        skillActions.forEach((action) => {
          if (!action || action.ignoredBecauseTargetDefeated) return;
          actions.push(action);
          if (!action.appliedToState) applyBattleActionToState(state, action);
          if (action.kind === 'heal') totalHealing += Number(action.amount || 0);
          if (action.kind === 'damage') {
            if (action.attackerSide === 'ally') totalAllyDamage += Number(action.amount || 0);
            else totalEnemyDamage += Number(action.amount || 0);
          }
        });
        orderCounter += skillActions.length;
        normalizeBattleStateDefeats(state, round);
        continue;
      }
      const target = decision?.target;
      if (!target || isUnitDefeated(target)) continue;
      const beforeHp = Number(target.hp || 0);
      if (decision.kind === 'heal') {
        if (isUnitDefeated(target)) continue;
        const actorStats = getEffectiveBattleStats(liveActor);
        const amount = Math.min(Number(target.maxHp || 1) - beforeHp, Math.max(1, Math.round(Number(actorStats.healPower || 0) * (0.82 + random() * 0.32))));
        if (amount > 0) {
          const afterHp = beforeHp + amount;
          const action = createBattleAction({
            round,
            order: orderCounter,
            kind: 'heal',
            attacker: liveActor,
            target,
            amount,
            beforeHp,
            afterHp,
            aiDecision: decision.aiDecision,
            logText: createBattleActionLogText(round, decision, amount, false, afterHp)
          });
          actions.push(action);
          applyBattleActionToState(state, action);
          totalHealing += amount;
          orderCounter += 1;
          continue;
        }
      }

      const action = createBasicAttackAction(decision, target, round, orderCounter, random, modifiers);
      if (!action) continue;
      actions.push(action);
      applyBattleActionToState(state, action);
      if (liveActor.side === 'ally') totalAllyDamage += action.amount;
      else totalEnemyDamage += action.amount;
      orderCounter += 1;
      normalizeBattleStateDefeats(state, round);
    }

    const tickResult = tickBattleStatuses(state, round, orderCounter, modifiers);
    tickResult.actions.forEach((action) => {
      if (!action || action.ignoredBecauseTargetDefeated) return;
      actions.push(action);
      applyBattleActionToState(state, action);
      if (action.targetSide === 'enemy') totalAllyDamage += Number(action.amount || 0);
      else totalEnemyDamage += Number(action.amount || 0);
    });
    orderCounter = tickResult.nextOrder;
    normalizeBattleStateDefeats(state, round);
    decrementBattleCooldowns([...state.allies, ...state.enemies]);

    rounds.push({
      round,
      actions,
      stateAfterRound: {
        allyAlive: state.allies.filter(isUnitAlive).length,
        enemyAlive: state.enemies.filter(isUnitAlive).length
      }
    });

    if (areAllBattleUnitsDefeated(state.allies) || areAllBattleUnitsDefeated(state.enemies)) break;
  }

  if (modifiers.allowFinisher && !areAllBattleUnitsDefeated(state.enemies) && !areAllBattleUnitsDefeated(state.allies)) {
    let finishRound = (rounds[rounds.length - 1]?.round || 0) + 1;
    let finishOrder = orderCounter;
    state.enemies.filter(isUnitAlive).forEach((enemy, index) => {
      const liveAllies = state.allies.filter(isUnitAlive);
      const actor = liveAllies[index % Math.max(1, liveAllies.length)];
      if (!actor) return;
      const beforeHp = Number(enemy.hp || 0);
      const action = createBattleAction({ round: finishRound, order: finishOrder, kind: 'damage', attacker: actor, target: enemy, amount: beforeHp, rawDamage: beforeHp, appliedDamage: beforeHp, beforeHp, afterHp: 0, isCritical: false, targetDefeated: true });
      const lastRound = rounds.find((item) => item.round === finishRound) || { round: finishRound, actions: [], stateAfterRound: {} };
      if (!rounds.includes(lastRound)) rounds.push(lastRound);
      lastRound.actions.push(action);
      applyBattleActionToState(state, action);
      totalAllyDamage += action.amount;
      finishOrder += 1;
      if (finishOrder % Math.max(1, state.allies.length) === 0) finishRound += 1;
    });
  }

  const partyWipe = areAllBattleUnitsDefeated(state.allies);
  const result = areAllBattleUnitsDefeated(state.enemies)
    ? 'victory'
    : partyWipe
      ? 'defeat'
      : 'defeat';
  const finalRound = rounds[rounds.length - 1]?.round || 1;
  return {
    rounds: rounds.map((round) => ({
      ...round,
      stateAfterRound: {
        allyAlive: state.allies.filter(isUnitAlive).length,
        enemyAlive: state.enemies.filter(isUnitAlive).length,
        ...round.stateAfterRound
      }
    })),
    result,
    finalRound,
    finalAllies: state.allies,
    finalEnemies: state.enemies,
    summary: {
      totalAllyDamage,
      totalEnemyDamage,
      totalHealing,
      defeatedAllies: state.allies.filter(isUnitDefeated).length,
      defeatedEnemies: state.enemies.filter(isUnitDefeated).length,
      partyWipe,
      defeatType: partyWipe ? 'party_wipe' : result === 'defeat' ? 'enemy_remaining' : '',
      defeatReason: partyWipe ? '전원 전투불능' : result === 'defeat' ? '작전 실패' : '',
      actionPolicyVersion: 1
    }
  };
}

function summarizeBattleResult(result) {
  const allyCount = (result?.allies || []).length;
  const defeatedAllies = (result?.allies || []).filter((unit) => Number(unit.finalHp || 0) <= 0).length;
  const defeatedEnemies = (result?.enemies || []).filter((unit) => Number(unit.finalHp || 0) <= 0).length;
  const partyWipe = allyCount > 0 && defeatedAllies === allyCount;
  return {
    ...(result?.summary || {}),
    defeatedAllies,
    defeatedEnemies,
    partyWipe,
    defeatType: partyWipe ? 'party_wipe' : (result?.summary?.defeatType || result?.defeatType || ''),
    defeatReason: partyWipe ? '전원 전투불능' : (result?.summary?.defeatReason || result?.defeatReason || '')
  };
}

function createMockBattleInjuries(battleResult, powerRatio) {
  const defeatedAllies = (battleResult?.allies || []).filter((unit) => Number(unit.finalHp || 0) <= 0);
  return defeatedAllies.map((unit, index) => {
    const severe = Number(powerRatio || 0) < 0.5 || (Number(powerRatio || 0) < 0.7 && index % 2 === 0);
    const moderate = !severe && Number(powerRatio || 0) < 0.9;
    const injuryType = severe ? 'severe' : moderate ? 'moderate' : 'minor';
    return {
      mercenaryId: unit.sourceId,
      name: unit.name,
      injuryType,
      label: severe ? '중상' : moderate ? '부상' : '가벼운 부상',
      recoverySeconds: severe ? 10800 : moderate ? 7200 : 1800,
      treatmentCost: severe ? 360 : moderate ? 240 : 120
    };
  });
}

function getMockBattleRewardsForResult(operation, result) {
  if (result === 'victory') return (operation?.rewards || []).map((reward) => ({ ...reward }));
  if (result === 'draw') {
    return (operation?.rewards || [])
      .filter((reward) => reward.type === 'gold')
      .map((reward) => ({ ...reward, amount: Math.max(0, Math.floor(Number(reward.amount || 0) * 0.25)), label: `${reward.label} 일부` }));
  }
  return [];
}

function simulateClientMockBattle({ operation, battleParty, roster, seed }) {
  const startedAt = new Date().toISOString();
  const battleSeed = Number(seed || hashBattleSeed(`${operation?.id || 'operation'}:${battleParty?.id || 'party'}:${startedAt}`));
  const partyPower = calculateBattlePartyPower(battleParty);
  const recommendedPower = Math.max(1, Number(operation?.recommendedPower || partyPower || 1));
  const powerRatio = partyPower / recommendedPower;
  const difficultyLabel = getBattleDifficultyLabel(powerRatio);
  const difficultyModifiers = getBattleDifficultyModifiers(powerRatio);
  const rosterWithEquipmentSnapshots = (Array.isArray(roster) ? roster : []).map((member) => {
    const equipmentSnapshot = buildMercenaryBattleEquipmentSnapshot(member);
    return {
      ...member,
      equipmentSnapshot,
      battleBaseStats: equipmentSnapshot.baseStats,
      battleFinalStats: equipmentSnapshot.finalStats
    };
  });
  const allies = buildAllyBattleUnits(battleParty, rosterWithEquipmentSnapshots);
  const equipmentSummary = summarizeBattleEquipmentSnapshots(allies.map((unit) => unit.equipmentSnapshot));
  const enemies = buildEnemyBattleUnits(operation).map((enemy) => {
    const maxHp = Math.max(1, Math.round(Number(enemy.maxHp || 1) * Number(difficultyModifiers.enemyHpMultiplier || 1)));
    return {
      ...enemy,
      maxHp,
      initialHp: maxHp,
      finalHp: maxHp,
      hp: maxHp,
      attack: Math.max(1, Math.round(Number(enemy.attack || 1) * Number(difficultyModifiers.enemyAttackMultiplier || 1)))
    };
  });
  const simulation = runMockBattleRounds(allies, enemies, battleSeed, { maxRounds: 12, modifiers: difficultyModifiers });
  const finalHpById = new Map([...simulation.finalAllies, ...simulation.finalEnemies].map((unit) => [unit.id, Number(unit.hp || 0)]));
  const finalUnitById = new Map([...simulation.finalAllies, ...simulation.finalEnemies].map((unit) => [unit.id, unit]));
  const finalAllies = allies.map((unit) => ({
    ...unit,
    finalHp: finalHpById.get(unit.id) ?? unit.initialHp,
    defeated: isUnitDefeated(finalUnitById.get(unit.id)),
    knockedOut: isUnitDefeated(finalUnitById.get(unit.id)),
    defeatedAtRound: finalUnitById.get(unit.id)?.defeatedAtRound || 0,
    statuses: Array.isArray(finalUnitById.get(unit.id)?.statuses) ? finalUnitById.get(unit.id).statuses.map((status) => ({ ...status })) : [],
    activeCooldowns: { ...(finalUnitById.get(unit.id)?.activeCooldowns || {}) },
    passiveApplied: Boolean(finalUnitById.get(unit.id)?.passiveApplied),
    status: Number(finalHpById.get(unit.id) ?? unit.initialHp) <= 0 ? 'defeated' : 'alive'
  }));
  const finalEnemies = enemies.map((unit) => ({
    ...unit,
    finalHp: finalHpById.get(unit.id) ?? unit.initialHp,
    defeated: isUnitDefeated(finalUnitById.get(unit.id)),
    knockedOut: isUnitDefeated(finalUnitById.get(unit.id)),
    defeatedAtRound: finalUnitById.get(unit.id)?.defeatedAtRound || 0,
    statuses: Array.isArray(finalUnitById.get(unit.id)?.statuses) ? finalUnitById.get(unit.id).statuses.map((status) => ({ ...status })) : [],
    activeCooldowns: { ...(finalUnitById.get(unit.id)?.activeCooldowns || {}) },
    passiveApplied: Boolean(finalUnitById.get(unit.id)?.passiveApplied),
    status: Number(finalHpById.get(unit.id) ?? unit.initialHp) <= 0 ? 'defeated' : 'alive'
  }));
  const partyWipe = finalAllies.length > 0 && finalAllies.every((unit) => Number(unit.finalHp || 0) <= 0);
  const defeatType = partyWipe ? 'party_wipe' : simulation.result === 'defeat' ? 'enemy_remaining' : '';
  const defeatReason = partyWipe ? '전원 전투불능' : simulation.result === 'defeat' ? '작전 실패' : '';
  const battleResult = {
    battleId: `battle_${battleSeed}_${Date.now()}`,
    schemaVersion: 1,
    source: 'client_mock',
    operationId: operation?.id || '',
    operationTitle: operation?.title || '전투 작전',
    battlefield: {
      id: String(operation?.battlefieldImage || '').split('/').pop()?.replace(/\.[^.]+$/, '') || 'mock_battlefield',
      name: operation?.battlefield || '전장',
      key: operation?.battlefieldInfo?.key || operation?.backgroundKey || '',
      backgroundKey: operation?.battlefieldInfo?.backgroundKey || operation?.backgroundKey || '',
      imageKey: operation?.battlefieldInfo?.imageKey || operation?.backgroundKey || '',
      path: getBattlefieldBackgroundImage(operation?.battlefieldInfo, operation),
      imagePath: getBattlefieldBackgroundImage(operation?.battlefieldInfo, operation),
      backgroundPath: getBattlefieldBackgroundImage(operation?.battlefieldInfo, operation),
      backgroundImage: getBattlefieldBackgroundImage(operation?.battlefieldInfo, operation),
      backgroundUrl: getBattlefieldBackgroundImage(operation?.battlefieldInfo, operation),
      label: operation?.battlefieldInfo?.label || operation?.battlefield || '',
      stageTint: operation?.battlefieldInfo?.stageTint || '',
      weatherEffect: operation?.battlefieldInfo?.weatherEffect || '',
      cameraLayout: operation?.battlefieldInfo?.cameraLayout || '',
      battleBgmKey: operation?.battlefieldInfo?.battleBgmKey || ''
    },
    seed: battleSeed,
    startedAt,
    endedAt: new Date().toISOString(),
    result: simulation.result,
    defeatType,
    defeatReason,
    maxRounds: 12,
    finalRound: simulation.finalRound,
    allies: finalAllies,
    enemies: finalEnemies,
    rounds: simulation.rounds,
    rewards: getMockBattleRewardsForResult(operation, simulation.result),
    injuries: [],
    summary: {
      ...simulation.summary,
      partyPower,
      recommendedPower,
      powerRatio: Number(powerRatio.toFixed(3)),
      difficultyLabel,
      difficultyModifiers: {
        enemyHpMultiplier: difficultyModifiers.enemyHpMultiplier,
        enemyAttackMultiplier: difficultyModifiers.enemyAttackMultiplier,
        allyDamageTakenMultiplier: difficultyModifiers.allyDamageTakenMultiplier,
        allyDamageDealtMultiplier: difficultyModifiers.allyDamageDealtMultiplier,
        enemyMinDamage: difficultyModifiers.enemyMinDamage,
        allowFinisher: difficultyModifiers.allowFinisher
      },
      equipmentApplied: equipmentSummary.applied,
      equipmentAppliedCount: equipmentSummary.appliedCount,
      equipmentPower: equipmentSummary.totalEquipmentPower,
      equipmentSnapshots: equipmentSummary.members,
      partyWipe,
      defeatType,
      defeatReason
    }
  };
  battleResult.injuries = createMockBattleInjuries(battleResult, powerRatio);
  battleResult.summary = summarizeBattleResult(battleResult);
  return battleResult;
}

function createBattleResultFromOperation(operation, battleParty) {
  return simulateClientMockBattle({
    operation,
    battleParty,
    roster: getBattleOperationRoster(),
    seed: hashBattleSeed(`${operation?.id || 'operation'}:${battleParty?.id || 'party'}:${Date.now()}`)
  });
}

function createCombatRequestFromBattleOperation(operation, party = selectedBattleParty(), options = {}) {
  const adapter = window.MercenaryCombatAdapters;
  if (!adapter?.createCombatMissionRequest) throw new Error(String.fromCharCode(0xC804, 0xD22C, 0x20, 0xD638, 0xCD9C, 0x20, 0xC5B4, 0xB311, 0xD130, 0xB97C, 0x20, 0xBD88, 0xB7EC, 0xC624, 0xC9C0, 0x20, 0xBABB, 0xD588, 0xC2B5, 0xB2C8, 0xB2E4, 0x2E));
  const partyMemberIds = Array.isArray(options.partyMemberIds) && options.partyMemberIds.length
    ? options.partyMemberIds
    : battlePartyMemberIds(party);
  const partySnapshot = {
    ...(party || {}),
    partyMemberIds,
    members: Array.isArray(options.partySnapshot)
      ? options.partySnapshot.map((member) => ({ ...member }))
      : selectedBattlePartyMembers(party).map((member) => ({ ...member }))
  };
  return adapter.createCombatMissionRequest(operation, partySnapshot, {
    autoClaim: true,
    viewerMode: 'auto_battle',
    partyMemberIds
  });
}

function createBattleResultFromCombatRequest(combatRequest) {
  const adapter = window.MercenaryCombatAdapters;
  const request = adapter?.assertCanExecuteRequest
    ? adapter.assertCanExecuteRequest(combatRequest)
    : combatRequest;
  if (request.sourceType !== 'combat_mission') {
    throw new Error(`아직 지원하지 않는 전투 호출입니다: ${request.sourceType || 'unknown'}`);
  }
  const operation = request.metadata?.operation;
  if (!operation) throw new Error('전투 작전 정보를 찾을 수 없습니다.');
  const battleResult = createBattleResultFromOperation(operation, request.partySnapshot);
  return adapter?.attachRequestToBattleResult
    ? adapter.attachRequestToBattleResult(battleResult, request)
    : battleResult;
}

function flattenBattleResultActions(battleResult) {
  return (battleResult?.rounds || []).flatMap((round) => (round.actions || []).map((action) => ({ ...action, round: round.round })));
}

function getBattleReportUnitKey(unit) {
  return String(unit?.id || unit?.unitId || unit?.sourceId || unit?.mercenaryId || '');
}

function getBattleReportTargetKey(action) {
  return String(action?.targetId || action?.targetUnitId || action?.target?.id || action?.targetName || action?.target?.name || '');
}

function getBattleReportUnitName(unit) {
  return String(unit?.name || unit?.displayName || '알 수 없는 용병');
}

function getBattleReportActionAmount(action, key) {
  const value = action?.[key] ?? action?.amount ?? 0;
  return Math.max(0, Number(value || 0));
}

function getBattleReportSkillName(action) {
  const skillId = String(action?.skillId || action?.skill_id || '').trim();
  const skillRule = skillId ? getSkillById(skillId) : null;
  return String(action?.skillName || getBattleRuleName(skillRule, skillId) || (skillId ? '알 수 없는 스킬' : '기본 공격'));
}

function getBattleReportStatusName(actionOrStatus) {
  const statusId = String(actionOrStatus?.statusId || actionOrStatus?.status_id || '').trim();
  const statusRule = statusId ? getStatusEffectById(statusId) : null;
  return String(actionOrStatus?.statusName || getBattleRuleName(statusRule, statusId) || (statusId ? '알 수 없는 상태' : '상태 효과'));
}

function getBattleReportStatusType(statusId) {
  const statusRule = getStatusEffectById(statusId);
  return String(getMercField(statusRule, 'statusType', 'status_type', '') || 'status').trim() || 'status';
}

function formatBattleOutcome(result) {
  if (result === 'victory') return '승리';
  if (result === 'defeat') return '패배';
  if (result === 'draw') return '전투 종료';
  return '전투 종료';
}

function formatBattleDifficulty(summary = {}) {
  const label = String(summary.difficultyLabel || '').trim();
  const ratio = Number(summary.powerRatio || 0);
  const ratioText = ratio > 0 ? `전투력 ${ratio.toFixed(2)}배` : '전투력 정보 없음';
  return [label || '난이도 미정', ratioText].join(' / ');
}

function formatBattleRole(role) {
  const safeRole = String(role || '').trim();
  const labels = {
    tank: '방어',
    defender: '방어',
    warrior: '공격',
    attacker: '공격',
    assassin: '암살',
    rogue: '암살',
    ranger: '원거리',
    archer: '원거리',
    mage: '마법',
    caster: '마법',
    healer: '회복',
    support: '지원',
    boss: '대장'
  };
  return labels[safeRole.toLowerCase()] || safeRole || '역할 미정';
}

function formatBattleStatusType(type) {
  const safeType = String(type || '').trim();
  const labels = {
    buff: '버프',
    debuff: '약화',
    status: '상태',
    special: '특수',
    control: '제어'
  };
  return labels[safeType.toLowerCase()] || safeType || '상태';
}

function formatBattleActionType(type) {
  const safeType = String(type || '').trim();
  const labels = {
    basic_attack: '기본 공격',
    active_skill: '액티브',
    active_skill_effect: '액티브 효과',
    passive_apply: '패시브',
    status_apply: '상태 부여',
    status_tick: '지속 효과',
    heal: '회복',
    control_skip: '행동 불가'
  };
  return labels[safeType] || safeType || '행동';
}

function summarizeBattleUnits(battleResult) {
  const unitMap = new Map();
  const unitOrder = [];
  const registerUnit = (unit, side) => {
    const unitId = getBattleReportUnitKey(unit);
    if (!unitId || unitMap.has(unitId)) return;
    const finalHp = Number(unit?.finalHp ?? unit?.hp ?? unit?.initialHp ?? unit?.maxHp ?? 0);
    const maxHp = Math.max(1, Number(unit?.maxHp || unit?.initialHp || 1));
    const summary = {
      unitId,
      sourceId: unit?.sourceId || unit?.mercenaryId || '',
      side,
      name: getBattleReportUnitName(unit),
      grade: String(unit?.grade || ''),
      role: formatBattleRole(unit?.role),
      survived: finalHp > 0,
      knockedOut: finalHp <= 0,
      finalHp,
      maxHp,
      hpRatio: Math.max(0, Math.min(1, finalHp / maxHp)),
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      healingReceived: 0,
      killCount: 0,
      activeSkillUses: 0,
      passiveAppliedCount: 0,
      statusAppliedCount: 0,
      statusReceivedCount: 0,
      dotDamageDealt: 0,
      buffAppliedCount: 0,
      mvpScore: 0,
      receivedStatusNames: new Set(),
      highlights: []
    };
    unitMap.set(unitId, summary);
    unitOrder.push(summary);
  };

  (battleResult?.allies || []).forEach((unit) => registerUnit(unit, 'ally'));
  (battleResult?.enemies || []).forEach((unit) => registerUnit(unit, 'enemy'));

  const actions = flattenBattleResultActions(battleResult);
  const activeUseKeys = new Set();
  const defeatedTargetIds = new Set();
  const enemyIds = new Set((battleResult?.enemies || []).map(getBattleReportUnitKey).filter(Boolean));
  actions.forEach((action) => {
    const actorId = String(action?.actorId || action?.attackerId || '');
    const targetId = getBattleReportTargetKey(action);
    const actor = unitMap.get(actorId);
    const target = unitMap.get(targetId);
    const actionType = String(action?.actionType || action?.kind || action?.type || '');
    const kind = String(action?.kind || action?.type || '');
    const isHeal = kind === 'heal' || actionType === 'heal';
    const isDamage = kind === 'damage' || Number(action?.damage || 0) > 0 || (!isHeal && Number(action?.amount || 0) > 0);
    const isStatusApply = Boolean(action?.statusApplied) || actionType === 'status_apply' || actionType === 'passive_apply' || actionType === 'active_skill_effect' || kind === 'status_apply' || kind === 'passive_apply';
    const targetAlreadyDefeated = targetId && defeatedTargetIds.has(targetId);
    const amount = isDamage
      ? Math.max(0, Number(action?.appliedDamage ?? action?.damage ?? action?.amount ?? 0))
      : getBattleReportActionAmount(action, isHeal ? 'healing' : 'damage');
    const defeatsTarget = targetId
      && Number(action?.beforeHp || 0) > 0
      && (Boolean(action?.targetDefeated) || Number(action?.afterHp ?? 1) <= 0);

    if (isDamage && targetAlreadyDefeated) return;

    if (actor && isDamage && amount > 0) {
      actor.damageDealt += amount;
      if (actionType === 'status_tick') actor.dotDamageDealt += amount;
    }
    if (target && isDamage && amount > 0) target.damageTaken += amount;
    if (actor && isHeal && amount > 0) actor.healingDone += amount;
    if (target && isHeal && amount > 0) target.healingReceived += amount;
    if (actor && defeatsTarget && enemyIds.has(targetId) && !defeatedTargetIds.has(targetId)) {
      actor.killCount += 1;
      defeatedTargetIds.add(targetId);
    } else if (defeatsTarget && targetId) {
      defeatedTargetIds.add(targetId);
    }
    if (actor && actionType === 'active_skill') {
      const key = `${actor.unitId}:${action?.skillId || getBattleReportSkillName(action)}:${action?.round || 0}`;
      if (!activeUseKeys.has(key)) {
        activeUseKeys.add(key);
        actor.activeSkillUses += 1;
      }
    }
    if (actor && actionType === 'passive_apply') actor.passiveAppliedCount += 1;
    if (actor && isStatusApply) {
      actor.statusAppliedCount += 1;
      const statusType = getBattleReportStatusType(action?.statusId);
      if (statusType === 'buff' || statusType === 'special') actor.buffAppliedCount += 1;
    }
    if (target && isStatusApply && !targetAlreadyDefeated) {
      target.statusReceivedCount += 1;
      target.receivedStatusNames.add(getBattleReportStatusName(action));
    }
  });

  unitOrder.forEach((summary) => {
    summary.mvpScore = Math.round(
      summary.damageDealt
      + summary.healingDone * 0.8
      + summary.killCount * 250
      + summary.statusAppliedCount * 80
      + summary.buffAppliedCount * 60
      + (summary.survived ? 100 : 0)
      - (summary.knockedOut ? 120 : 0)
    );
    if (summary.damageDealt > 0) summary.highlights.push(`피해 ${formatNumber(summary.damageDealt)}`);
    if (summary.healingDone > 0) summary.highlights.push(`회복 ${formatNumber(summary.healingDone)}`);
    if (summary.statusAppliedCount > 0) summary.highlights.push(`상태 ${formatNumber(summary.statusAppliedCount)}회`);
    if (summary.killCount > 0) summary.highlights.push(`처치 ${formatNumber(summary.killCount)}회`);
    summary.receivedStatusList = Array.from(summary.receivedStatusNames).slice(0, 3);
  });

  const allies = unitOrder
    .filter((unit) => unit.side === 'ally')
    .sort((left, right) => right.mvpScore - left.mvpScore || right.damageDealt + right.healingDone - (left.damageDealt + left.healingDone));
  const enemies = unitOrder
    .filter((unit) => unit.side === 'enemy')
    .sort((left, right) => Number(left.survived) - Number(right.survived) || right.damageTaken - left.damageTaken);

  return { allies, enemies, all: unitOrder, unitMap };
}

function pickBattleMvp(unitSummaries) {
  const allies = unitSummaries?.allies || [];
  return allies.slice().sort((left, right) => right.mvpScore - left.mvpScore)[0] || null;
}

function summarizeSkillUsage(battleResult) {
  const unitNames = new Map([...(battleResult?.allies || []), ...(battleResult?.enemies || [])].map((unit) => [getBattleReportUnitKey(unit), getBattleReportUnitName(unit)]));
  const skillMap = new Map();
  const castKeys = new Set();
  const defeatedTargetIds = new Set();
  flattenBattleResultActions(battleResult).forEach((action) => {
    const actionType = String(action?.actionType || '');
    if (!['active_skill', 'active_skill_effect', 'passive_apply', 'basic_attack'].includes(actionType)) return;
    const targetId = getBattleReportTargetKey(action);
    const kind = String(action?.kind || action?.type || '');
    const defeatsTarget = targetId
      && Number(action?.beforeHp || 0) > 0
      && (Boolean(action?.targetDefeated) || Number(action?.afterHp ?? 1) <= 0);
    if (kind === 'damage' && targetId && defeatedTargetIds.has(targetId)) return;
    const summaryActionType = actionType === 'active_skill_effect' ? 'active_skill' : actionType;
    const skillId = summaryActionType === 'basic_attack'
      ? String(action?.attackTypeId || 'basic_attack')
      : String(action?.skillId || action?.skill_id || '');
    const skillName = summaryActionType === 'basic_attack'
      ? String(action?.attackTypeName || '기본 공격')
      : getBattleReportSkillName(action);
    const key = skillId || `${skillName}:${summaryActionType}`;
    if (!skillMap.has(key)) {
      skillMap.set(key, {
        skillId,
        skillName,
        actionType: summaryActionType,
        actionTypeLabel: formatBattleActionType(summaryActionType),
        casterNames: new Set(),
        useCount: 0,
        totalDamage: 0,
        totalHealing: 0,
        statusNames: new Set(),
        lastRound: 0
      });
    }
    const item = skillMap.get(key);
    const actorId = String(action?.actorId || action?.attackerId || '');
    if (actorId) item.casterNames.add(unitNames.get(actorId) || '사용자 미상');
    const castKey = action?.actionGroupId || `${key}:${actorId}:${action?.round || 0}`;
    if (!castKeys.has(castKey)) {
      castKeys.add(castKey);
      item.useCount += 1;
    }
    if (kind === 'heal') item.totalHealing += getBattleReportActionAmount(action, 'healing');
    if (kind === 'damage') item.totalDamage += Math.max(0, Number(action?.appliedDamage ?? action?.damage ?? action?.amount ?? 0));
    if (action?.statusId || action?.statusName) item.statusNames.add(getBattleReportStatusName(action));
    item.lastRound = Math.max(item.lastRound, Number(action?.round || 0));
    if (defeatsTarget) defeatedTargetIds.add(targetId);
  });
  return Array.from(skillMap.values())
    .map((item) => ({ ...item, casterNames: Array.from(item.casterNames), statusNames: Array.from(item.statusNames) }))
    .sort((left, right) => (right.actionType === 'passive_apply') - (left.actionType === 'passive_apply') || right.useCount - left.useCount || right.totalDamage + right.totalHealing - (left.totalDamage + left.totalHealing));
}

function summarizeStatusUsage(battleResult) {
  const unitNames = new Map([...(battleResult?.allies || []), ...(battleResult?.enemies || [])].map((unit) => [getBattleReportUnitKey(unit), getBattleReportUnitName(unit)]));
  const statusMap = new Map();
  const defeatedTargetIds = new Set();
  flattenBattleResultActions(battleResult).forEach((action) => {
    const targetId = getBattleReportTargetKey(action);
    const actionType = String(action?.actionType || '');
    const kind = String(action?.kind || action?.type || '');
    const isDamage = kind === 'damage' || Number(action?.appliedDamage ?? action?.damage ?? action?.amount ?? 0) > 0;
    const defeatsTarget = targetId
      && Number(action?.beforeHp || 0) > 0
      && (Boolean(action?.targetDefeated) || Number(action?.afterHp ?? 1) <= 0);
    if (isDamage && targetId && defeatedTargetIds.has(targetId)) return;
    const statusId = String(action?.statusId || action?.status_id || '').trim();
    if (!statusId) {
      if (defeatsTarget) defeatedTargetIds.add(targetId);
      return;
    }
    const statusName = getBattleReportStatusName(action);
    if (!statusMap.has(statusId)) {
      statusMap.set(statusId, {
        statusId,
        statusName,
        statusType: getBattleReportStatusType(statusId),
        appliedCount: 0,
        tickCount: 0,
        totalTickDamage: 0,
        totalTickHealing: 0,
        targetNames: new Set(),
        sourceNames: new Set()
      });
    }
    const item = statusMap.get(statusId);
    const actorId = String(action?.actorId || action?.attackerId || '');
    if (actorId) item.sourceNames.add(unitNames.get(actorId) || '시전자 미상');
    if (targetId) item.targetNames.add(unitNames.get(targetId) || '대상 미상');
    if (action?.statusApplied || actionType === 'status_apply' || actionType === 'passive_apply') item.appliedCount += 1;
    if (actionType === 'status_tick') {
      item.tickCount += 1;
      if (kind === 'heal') item.totalTickHealing += getBattleReportActionAmount(action, 'healing');
      else item.totalTickDamage += getBattleReportActionAmount(action, 'damage');
    }
    if (defeatsTarget) defeatedTargetIds.add(targetId);
  });
  return Array.from(statusMap.values())
    .map((item) => ({
      ...item,
      statusTypeLabel: formatBattleStatusType(item.statusType),
      targetNames: Array.from(item.targetNames).slice(0, 4),
      sourceNames: Array.from(item.sourceNames).slice(0, 4)
    }))
    .sort((left, right) => right.appliedCount + right.tickCount - (left.appliedCount + left.tickCount));
}

function summarizeRewards(battleResult) {
  return (battleResult?.rewards || []).map((reward) => ({
    type: String(reward?.type || 'etc'),
    label: String(reward?.label || reward?.name || '보상'),
    amount: Number(reward?.amount || 0),
    rarity: String(reward?.rarity || '')
  }));
}

function summarizeInjuriesPreview(battleResult, unitSummaries) {
  const bySourceId = new Map((battleResult?.injuries || []).map((injury) => [String(injury?.mercenaryId || injury?.unitId || injury?.sourceId || injury?.name || ''), injury]));
  return (unitSummaries?.allies || []).map((unit) => {
    const injury = bySourceId.get(String(unit.sourceId || unit.unitId || unit.name)) || bySourceId.get(unit.name) || null;
    if (injury) {
      return {
        unitId: unit.unitId,
        name: injury.name || unit.name,
        state: injury.label || (injury.injuryType === 'severe' ? '중상' : injury.injuryType === 'moderate' ? '경상' : '전투불능'),
        treatmentCost: injury.treatmentCost,
        recoverySeconds: injury.recoverySeconds,
        fromResult: true
      };
    }
    const ratio = unit.hpRatio;
    const state = unit.finalHp <= 0
      ? '전투불능'
      : ratio <= 0.25
        ? '중상 가능'
        : ratio <= 0.5
          ? '경상 가능'
          : '치료 필요 없음';
    return {
      unitId: unit.unitId,
      name: unit.name,
      state,
      treatmentCost: null,
      recoverySeconds: null,
      fromResult: false
    };
  });
}

function buildBattleReportViewModel(battleResult, ruleContext = {}) {
  const unitSummaries = summarizeBattleUnits(battleResult, ruleContext);
  const mvp = pickBattleMvp(unitSummaries);
  const skillSummary = summarizeSkillUsage(battleResult, ruleContext);
  const statusSummary = summarizeStatusUsage(battleResult, ruleContext);
  const rewards = summarizeRewards(battleResult);
  const injuries = summarizeInjuriesPreview(battleResult, unitSummaries);
  const summary = battleResult?.summary || {};
  const equipmentSummary = summarizeBattleEquipmentSnapshots(summary.equipmentSnapshots || (battleResult?.allies || []).map((unit) => unit.equipmentSnapshot));
  const totalDamage = unitSummaries.allies.reduce((sum, unit) => sum + unit.damageDealt, 0) || Number(summary.totalAllyDamage || 0);
  const totalHealing = unitSummaries.allies.reduce((sum, unit) => sum + unit.healingDone, 0) || Number(summary.totalHealing || 0);
  const killCount = unitSummaries.allies.reduce((sum, unit) => sum + unit.killCount, 0) || Number(summary.defeatedEnemies || 0);
  const result = String(battleResult?.result || 'done');
  const operationName = String(battleResult?.operationTitle || ruleContext?.operation?.title || '전투 작전');
  const battlefieldName = String(battleResult?.battlefield?.name || ruleContext?.operation?.battlefield || '전장');
  const finalRound = Number(battleResult?.finalRound || (battleResult?.rounds || []).slice(-1)[0]?.round || 0);
  const resultText = result === 'victory'
    ? `${operationName} 완료`
    : result === 'defeat'
      ? (summary.defeatReason || battleResult?.defeatReason || '작전 실패')
      : `${operationName} 종료`;
  return {
    result,
    outcomeLabel: formatBattleOutcome(result),
    operationName,
    battlefieldName,
    finalRound,
    difficultyText: formatBattleDifficulty(summary),
    resultText,
    totalDamage,
    totalHealing,
    killCount,
    defeatedAllies: unitSummaries.allies.filter((unit) => unit.knockedOut).length,
    statusAppliedCount: unitSummaries.allies.reduce((sum, unit) => sum + unit.statusAppliedCount, 0),
    rewardCount: rewards.length,
    mvp,
    unitSummaries,
    skillSummary,
    statusSummary,
    rewards,
    injuries,
    equipmentSummary,
    rounds: battleResult?.rounds || [],
    dev: {
      battleId: battleResult?.battleId || '',
      seed: battleResult?.seed ?? '',
      operationId: battleResult?.operationId || '',
      schemaVersion: battleResult?.schemaVersion || ''
    }
  };
}

function renderBattleReportMetric(label, value) {
  return `
    <div class="merc-battle-report-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function renderBattleMvpCard(mvp) {
  if (!mvp) {
    return `
      <section class="merc-battle-mvp-card">
        <span>MVP</span>
        <h4>선정된 용병 없음</h4>
        <p>전투 행동 로그가 부족해 MVP를 산정하지 못했습니다.</p>
      </section>
    `;
  }
  const contribution = mvp.highlights.length ? mvp.highlights.join(' / ') : '기여 기록 없음';
  const flavor = mvp.statusAppliedCount > 0
    ? '전장 흐름을 바꾸는 효과로 승부의 무게를 옮겼다.'
    : mvp.killCount > 0
      ? '결정적인 마무리로 전선을 정리했다.'
      : mvp.healingDone > 0
        ? '무너지는 전열을 끝까지 붙잡았다.'
        : '가장 꾸준한 전투 기여를 남겼다.';
  return `
    <section class="merc-battle-mvp-card">
      <span>MVP</span>
      <h4>${escapeHtml(mvp.name)}</h4>
      <p>${escapeHtml([mvp.grade, mvp.role].filter(Boolean).join(' · '))}</p>
      <strong>${escapeHtml(contribution)}</strong>
      <em>“${escapeHtml(flavor)}”</em>
    </section>
  `;
}

function renderBattleContributionList(unitSummaries) {
  const rows = (unitSummaries?.allies || []).map((unit, index) => {
    const received = unit.receivedStatusList.length ? unit.receivedStatusList.join(' / ') : '없음';
    return `
      <article class="merc-battle-unit-row ${unit.knockedOut ? 'is-knocked-out' : ''} ${index === 0 ? 'is-mvp' : ''}">
        <div>
          <strong>${escapeHtml(unit.name)}</strong>
          <span>${escapeHtml(unit.knockedOut ? '전투불능' : '생존')} · ${escapeHtml(unit.grade || '등급 미정')} · ${escapeHtml(unit.role)}</span>
        </div>
        <div class="merc-battle-hpbar" aria-label="HP ${formatNumber(Math.max(0, unit.finalHp))}/${formatNumber(unit.maxHp)}">
          <span style="width: ${Math.round(unit.hpRatio * 100)}%"></span>
        </div>
        <dl>
          <div><dt>HP</dt><dd>${formatNumber(Math.max(0, unit.finalHp))}/${formatNumber(unit.maxHp)}</dd></div>
          <div><dt>피해</dt><dd>${formatNumber(unit.damageDealt)}</dd></div>
          <div><dt>회복</dt><dd>${formatNumber(unit.healingDone)}</dd></div>
          <div><dt>받은 피해</dt><dd>${formatNumber(unit.damageTaken)}</dd></div>
          <div><dt>처치</dt><dd>${formatNumber(unit.killCount)}</dd></div>
          <div><dt>액티브</dt><dd>${formatNumber(unit.activeSkillUses)}회</dd></div>
          <div><dt>상태 부여</dt><dd>${formatNumber(unit.statusAppliedCount)}회</dd></div>
          <div><dt>받은 상태</dt><dd>${escapeHtml(received)}</dd></div>
        </dl>
      </article>
    `;
  }).join('');
  return `<section class="merc-battle-contribution-list"><h4>아군별 기여도</h4>${rows || '<p>표시할 아군 기록이 없습니다.</p>'}</section>`;
}

function renderBattleEnemyResultList(unitSummaries) {
  const rows = (unitSummaries?.enemies || []).map((unit) => {
    const received = unit.receivedStatusList.length ? unit.receivedStatusList.join(' / ') : '없음';
    return `
      <article class="merc-battle-unit-row ${unit.knockedOut ? 'is-knocked-out' : 'is-survivor'}">
        <div>
          <strong>${escapeHtml(unit.name)}</strong>
          <span>${escapeHtml(unit.knockedOut ? '제압' : '생존')} · HP ${formatNumber(Math.max(0, unit.finalHp))}/${formatNumber(unit.maxHp)}</span>
        </div>
        <div class="merc-battle-hpbar" aria-label="HP ${formatNumber(Math.max(0, unit.finalHp))}/${formatNumber(unit.maxHp)}">
          <span style="width: ${Math.round(unit.hpRatio * 100)}%"></span>
        </div>
        <dl>
          <div><dt>받은 피해</dt><dd>${formatNumber(unit.damageTaken)}</dd></div>
          <div><dt>받은 상태</dt><dd>${escapeHtml(received)}</dd></div>
        </dl>
      </article>
    `;
  }).join('');
  return `<section class="merc-battle-contribution-list"><h4>적 처치 결과</h4>${rows || '<p>표시할 적 기록이 없습니다.</p>'}</section>`;
}

function renderBattleSkillSummary(skillSummary) {
  const featured = (skillSummary || []).filter((item) => item.actionType !== 'basic_attack').slice(0, 6);
  const fallback = (skillSummary || []).filter((item) => item.actionType === 'basic_attack').slice(0, 3);
  const items = featured.length ? featured : fallback;
  const rows = items.map((item) => `
    <article>
      <strong>${escapeHtml(item.casterNames.join(', ') || '사용자 미상')} · ${escapeHtml(item.skillName)}</strong>
      <span>${escapeHtml(item.actionTypeLabel)} · 사용 ${formatNumber(item.useCount)}회 / 피해 ${formatNumber(item.totalDamage)} / 회복 ${formatNumber(item.totalHealing)}</span>
      ${item.statusNames.length ? `<p>${item.statusNames.map((name) => `<em>${escapeHtml(name)}</em>`).join('')}</p>` : ''}
    </article>
  `).join('');
  return `<section class="merc-battle-skill-summary"><h4>사용 스킬 요약</h4>${rows || '<p>집계된 스킬 사용 기록이 없습니다.</p>'}</section>`;
}

function renderBattleStatusSummary(statusSummary) {
  const rows = (statusSummary || []).slice(0, 8).map((item) => `
    <article>
      <strong>${escapeHtml(item.statusName)}</strong>
      <span>${escapeHtml(item.statusTypeLabel)} · ${formatNumber(item.appliedCount)}회 부여 / 지속 피해 ${formatNumber(item.totalTickDamage)} / 지속 회복 ${formatNumber(item.totalTickHealing)}</span>
      <p>${escapeHtml(item.targetNames.length ? `대상: ${item.targetNames.join(', ')}` : '대상 기록 없음')}</p>
    </article>
  `).join('');
  return `<section class="merc-battle-status-summary"><h4>상태 효과 요약</h4>${rows || '<p>집계된 상태 효과 기록이 없습니다.</p>'}</section>`;
}

function renderBattleRewardsSummary(rewards) {
  const rows = (rewards || []).map((reward) => `<li><span>${escapeHtml(reward.label)}</span><strong>${formatNumber(reward.amount)}</strong></li>`).join('');
  return `
    <section class="merc-battle-reward-list">
      <h4>보상 미리보기</h4>
      <ul>${rows || '<li><span>획득 보상 없음</span><strong>-</strong></li>'}</ul>
      <p>실제 수령은 후속 단계에서 서버 연결 예정입니다.</p>
    </section>
  `;
}

function renderBattleInjuryPreview(injuries) {
  const rows = (injuries || []).map((injury) => `
    <li>
      <span>${escapeHtml(injury.name)}</span>
      <strong>${escapeHtml(injury.state)}</strong>
      <em>${injury.treatmentCost ? `추정 치료비 ${formatNumber(injury.treatmentCost)}` : '치료비 산정 예정'}</em>
    </li>
  `).join('');
  return `<section class="merc-battle-injury-list"><h4>부상/치료 필요 미리보기</h4><ul>${rows || '<li><span>부상 가능성 없음</span><strong>정상</strong><em>치료 필요 없음</em></li>'}</ul></section>`;
}

function getBattleRoundDisplayActions(round) {
  const seenCastGroups = new Set();
  return (round?.actions || []).filter((action) => {
    if (!action || action.ignoredBecauseTargetDefeated) return false;
    if (action.actionRole === 'skill_cast' && action.actionGroupId) {
      if (seenCastGroups.has(action.actionGroupId)) return false;
      seenCastGroups.add(action.actionGroupId);
    }
    return true;
  });
}

function renderBattleRoundLog(rounds) {
  if (!Array.isArray(rounds) || !rounds.length) {
    return '<details class="merc-battle-log-details"><summary>상세 전투 로그</summary><p>상세 전투 로그 없음</p></details>';
  }
  const rows = rounds.map((round) => {
    const actions = getBattleRoundDisplayActions(round);
    return `
      <section class="merc-battle-log-round">
        <h5>라운드 ${formatNumber(round?.round || 0)}</h5>
        ${actions.map((action) => `
          <p class="merc-battle-log-action">
            <span>${escapeHtml(formatBattleActionType(action?.actionType || action?.kind || action?.type))}</span>
            ${escapeHtml(action?.logText || action?.message || '기록 없음')}
          </p>
        `).join('') || '<p class="merc-battle-log-action">행동 기록 없음</p>'}
      </section>
    `;
  }).join('');
  return `<details class="merc-battle-log-details"><summary>상세 전투 로그</summary>${rows}</details>`;
}

function renderBattleDevDetails(report) {
  return `
    <details class="merc-battle-dev-details">
      <summary>개발자 정보</summary>
      <dl>
        <div><dt>battleId</dt><dd>${escapeHtml(String(report?.dev?.battleId || ''))}</dd></div>
        <div><dt>seed</dt><dd>${escapeHtml(String(report?.dev?.seed || ''))}</dd></div>
        <div><dt>operationId</dt><dd>${escapeHtml(String(report?.dev?.operationId || ''))}</dd></div>
        <div><dt>schemaVersion</dt><dd>${escapeHtml(String(report?.dev?.schemaVersion || ''))}</dd></div>
      </dl>
    </details>
  `;
}

function getBattleClaimStatus(claimState = {}) {
  if (claimState.status) return claimState.status;
  if (claimState.claiming) return 'claiming';
  if (claimState.claimed) return 'claimed';
  if (claimState.failed) return 'failed';
  return 'idle';
}

function getClaimMercenaryResults(claimResult = {}) {
  const growthMercs = claimResult?.growth?.mercenaries;
  if (Array.isArray(growthMercs)) return growthMercs;
  if (Array.isArray(claimResult?.mercenaries)) return claimResult.mercenaries;
  return [];
}

function getBattleInjuryStatus(entry = {}) {
  return String(
    entry?.injuryStatus ||
    entry?.injurySeverity ||
    entry?.severity ||
    entry?.injuryType ||
    entry?.injury ||
    entry?.operationalStatus ||
    entry?.status ||
    ''
  ).trim().toLowerCase();
}

function isActualBattleInjury(entry = {}) {
  const raw = getBattleInjuryStatus(entry);
  if (!raw) return false;
  const safeStatuses = new Set([
    'none',
    'normal',
    'healthy',
    'ok',
    'idle',
    'operational',
    'available',
    'ready',
    'no_injury',
    'uninjured'
  ]);
  if (safeStatuses.has(raw)) return false;
  return [
    'injured',
    'injured_light',
    'injured_heavy',
    'treatment_required',
    'incapacitated',
    'infirmary',
    'hospitalized',
    'waiting_treatment',
    'in_treatment',
    'severe',
    'moderate',
    'minor',
    'heavy',
    'light',
    'critical',
    '경상',
    '중상',
    '부상',
    '치료 필요',
    '치료 대기',
    '치료 중',
    '전투불능',
    '전투 불능'
  ].includes(raw);
}

function isInfirmaryRegistered(entry = {}) {
  const raw = String(
    entry?.infirmaryStatus ||
    entry?.treatmentStatus ||
    entry?.operationalStatus ||
    entry?.injuryStatus ||
    entry?.injuryType ||
    entry?.injury ||
    entry?.status ||
    ''
  ).trim().toLowerCase();
  return [
    'injured_light',
    'injured_heavy',
    'treatment_required',
    'incapacitated',
    'waiting_treatment',
    'in_treatment',
    'infirmary',
    'hospitalized',
    'severe',
    'moderate',
    'heavy',
    'critical',
    '경상',
    '중상',
    '부상',
    '치료 필요',
    '치료 대기',
    '치료 중',
    '전투불능',
    '전투 불능'
  ].includes(raw);
}

function getClaimInjuryResults(claimResult = {}) {
  const explicit = Array.isArray(claimResult?.injuries) ? claimResult.injuries : [];
  const explicitInjuries = explicit
    .filter(isActualBattleInjury)
    .map((item) => ({
      ...item,
      name: item.name || item.mercenaryName || item.ownedId || item.userMercenaryId || '용병',
      status: getBattleInjuryStatus(item),
      treatmentCost: Number(item.treatmentCost || item.treatmentCostGold || item.requiredGold || 0) || 0,
      infirmaryRegistered: isInfirmaryRegistered(item)
    }));
  if (explicit.length) return explicitInjuries;
  return getClaimMercenaryResults(claimResult)
    .filter(isActualBattleInjury)
    .map((item) => ({
      ...item,
      name: item.name || item.mercenaryName || item.ownedId || item.userMercenaryId || '용병',
      status: getBattleInjuryStatus(item),
      treatmentCost: Number(item.treatmentCost || item.treatmentCostGold || item.requiredGold || 0) || 0,
      infirmaryRegistered: isInfirmaryRegistered(item)
    }));
}

function formatBattleInjuryLabel(status = '') {
  const key = String(status || '').trim().toLowerCase();
  return {
    injured_light: '경상',
    injured_heavy: '중상',
    treatment_required: '치료 필요',
    incapacitated: '전투 불능',
    waiting_treatment: '치료 대기',
    in_treatment: '치료 중',
    severe: '중상',
    moderate: '경상',
    minor: '경상',
    heavy: '중상',
    light: '경상',
    critical: '전투 불능',
    injured: '부상',
    infirmary: '의무실 대기',
    hospitalized: '의무실 대기',
    경상: '경상',
    중상: '중상',
    부상: '부상',
    '치료 필요': '치료 필요',
    '치료 대기': '치료 대기',
    '치료 중': '치료 중',
    전투불능: '전투 불능',
    '전투 불능': '전투 불능'
  }[key] || '부상';
}

function renderBattleSettlementRewards(claimState = {}) {
  const status = getBattleClaimStatus(claimState);
  if (status === 'claiming') return '<p class="battle-result-settlement">전투 정산 중...</p>';
  if (status === 'failed') return '<p class="battle-result-settlement is-error">정산 실패</p>';
  const result = claimState.result || {};
  const rewards = result.rewards || {};
  const profile = result.profile || {};
  const office = result.office || result.growth?.office || {};
  const mercExp = Number(rewards.mercenaryExp || rewards.mercExp || 0) || getClaimMercenaryResults(result).reduce((sum, item) => sum + (Number(item.gainedExp || 0) || 0), 0);
  const gold = Number(rewards.gold || profile.gainedGold || 0) || 0;
  const officeExp = Number(rewards.officeExp || office.gainedExp || 0) || 0;
  if (status !== 'claimed') return '<p class="battle-result-settlement">정산 대기 중</p>';
  return `
    <div class="battle-result-reward-grid">
      <div><span>골드</span><strong>+${formatNumber(gold)}</strong></div>
      <div><span>사무소 EXP</span><strong>+${formatNumber(officeExp)}</strong></div>
      <div><span>용병 EXP</span><strong>+${formatNumber(mercExp)}</strong></div>
    </div>
    ${renderRewardGrowthSummary(result)}
    ${renderClaimInventoryRewards(result)}
  `;
}

function renderClaimInventoryRewards(claimResult = {}) {
  const rewards = Array.isArray(claimResult.inventoryRewards) ? claimResult.inventoryRewards : [];
  if (!rewards.length) return '';
  return `
    <section class="battle-result-inventory-rewards">
      <h4>\uD68D\uB4DD \uC544\uC774\uD15C</h4>
      <ul>
        ${rewards.map((item) => {
          const meta = [
            item.grade ? `[${item.grade}]` : '',
            item.slot ? getEquipmentSlotLabel(item.slot) : '',
            Number(item.combatPower || 0) > 0 ? `\uC804\uD22C\uB825 +${formatNumber(item.combatPower)}` : ''
          ].filter(Boolean).join(' / ');
          return `
            <li>
              <strong>${escapeHtml(item.name || item.itemId || '\uC544\uC774\uD15C')}</strong>
              <span>x${formatNumber(item.quantity || 1)}</span>
              ${meta ? `<em>${escapeHtml(meta)}</em>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `;
}

function renderBattleSettlementInjuries(claimState = {}) {
  const status = getBattleClaimStatus(claimState);
  if (status === 'claiming' || status === 'idle') return '<p>의무실 반영 여부를 확인하는 중입니다.</p>';
  if (status === 'failed') return '<p>정산 성공 후 부상/의무실 상태가 표시됩니다.</p>';
  const injuries = getClaimInjuryResults(claimState.result || {});
  if (!injuries.length) return '<p class="battle-result-injury-empty">부상자 없음 / 전원 무사 복귀</p>';
  return `
    <ul class="battle-result-injury-list">
      ${injuries.map((item) => `
        <li>
          <strong>${escapeHtml(item.name || '용병')}</strong>
          <span>${escapeHtml(formatBattleInjuryLabel(item.status || item.injury || item.operationalStatus))}</span>
          <em>${Number(item.treatmentCost || item.treatmentCostGold || 0) > 0 ? `치료비 ${formatNumber(item.treatmentCost || item.treatmentCostGold)}G` : '치료비 산정 완료'}</em>
          ${item.infirmaryRegistered || isInfirmaryRegistered(item) ? '<small>의무실 등록됨</small>' : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function hasBattleResultInjuries(claimState = {}) {
  return getClaimInjuryResults(claimState.result || {}).length > 0;
}

function renderBattleModalUnitRecords(title, units = [], options = {}) {
  const rows = units.map((unit) => {
    const hp = `${formatNumber(Math.max(0, Number(unit.finalHp || 0)))}/${formatNumber(unit.maxHp || 0)}`;
    const statusText = unit.knockedOut
      ? (options.enemy ? '처치됨' : '전투 불능')
      : '생존';
    const received = unit.receivedStatusList?.length
      ? unit.receivedStatusList.map((name) => `<span>${escapeHtml(name)}</span>`).join('')
      : '<span>상태 기록 없음</span>';
    return `
      <article class="battle-result-unit-record ${unit.knockedOut ? 'is-knocked-out' : ''}">
        <header>
          <strong>${escapeHtml(unit.name || '알 수 없는 유닛')}</strong>
          <em>${escapeHtml(statusText)} · 남은 체력 ${escapeHtml(hp)}</em>
        </header>
        <div class="merc-battle-hpbar" aria-label="남은 체력 ${escapeHtml(hp)}">
          <span style="width: ${Math.round(Math.max(0, Math.min(1, Number(unit.hpRatio || 0))) * 100)}%"></span>
        </div>
        <dl>
          <div><dt>준 피해</dt><dd>${formatNumber(unit.damageDealt || 0)}</dd></div>
          <div><dt>받은 피해</dt><dd>${formatNumber(unit.damageTaken || 0)}</dd></div>
          <div><dt>회복량</dt><dd>${formatNumber(unit.healingDone || 0)}</dd></div>
          <div><dt>처치</dt><dd>${formatNumber(unit.killCount || 0)}</dd></div>
          <div><dt>스킬 사용</dt><dd>${formatNumber(unit.activeSkillUses || 0)}</dd></div>
          <div><dt>상태 부여</dt><dd>${formatNumber(unit.statusAppliedCount || 0)}</dd></div>
        </dl>
        <p class="battle-result-chip-list">${received}</p>
      </article>
    `;
  }).join('');
  return `
    <section class="battle-result-detail-section">
      <h4>${escapeHtml(title)}</h4>
      <div class="battle-result-unit-record-grid">
        ${rows || '<p>표시할 전투 기록이 없습니다.</p>'}
      </div>
    </section>
  `;
}

function renderBattleModalSkillRecords(skillSummary = []) {
  const rows = (skillSummary || []).slice(0, 12).map((item) => {
    const statuses = item.statusNames?.length
      ? item.statusNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')
      : '<span>상태 효과 없음</span>';
    return `
      <article class="battle-result-record-row">
        <strong>${escapeHtml(item.skillName || '알 수 없는 스킬')}</strong>
        <span>${escapeHtml(item.casterNames?.join(', ') || '사용자 미상')} · ${escapeHtml(item.actionTypeLabel || '')} · ${formatNumber(item.useCount || 0)}회</span>
        <em>피해 ${formatNumber(item.totalDamage || 0)} / 회복 ${formatNumber(item.totalHealing || 0)} / 마지막 ${formatNumber(item.lastRound || 0)}라운드</em>
        <p class="battle-result-chip-list">${statuses}</p>
      </article>
    `;
  }).join('');
  return `
    <section class="battle-result-detail-section">
      <h4>스킬 사용 기록</h4>
      <div class="battle-result-record-list">
        ${rows || '<p>스킬 사용 기록이 없습니다.</p>'}
      </div>
    </section>
  `;
}

function renderBattleModalStatusRecords(statusSummary = []) {
  const rows = (statusSummary || []).slice(0, 12).map((item) => {
    const sources = item.sourceNames?.length ? item.sourceNames.join(', ') : '시전자 기록 없음';
    const targets = item.targetNames?.length ? item.targetNames.join(', ') : '대상 기록 없음';
    return `
      <article class="battle-result-record-row">
        <strong>${escapeHtml(item.statusName || '알 수 없는 상태')}</strong>
        <span>${escapeHtml(item.statusTypeLabel || '상태이상')} · 부여 ${formatNumber(item.appliedCount || 0)}회 · 틱 ${formatNumber(item.tickCount || 0)}회</span>
        <em>지속 피해 ${formatNumber(item.totalTickDamage || 0)} / 지속 회복 ${formatNumber(item.totalTickHealing || 0)}</em>
        <p>${escapeHtml(`시전자: ${sources}`)}</p>
        <p>${escapeHtml(`대상: ${targets}`)}</p>
      </article>
    `;
  }).join('');
  return `
    <section class="battle-result-detail-section">
      <h4>상태이상 / 디버프 기록</h4>
      <div class="battle-result-record-list">
        ${rows || '<p>상태이상 / 디버프 기록이 없습니다.</p>'}
      </div>
    </section>
  `;
}


function formatEquipmentBonusLine(bonus = {}) {
  const rows = BATTLE_EQUIPMENT_STAT_KEYS
    .filter((key) => Number(bonus?.[key] || 0) !== 0)
    .map((key) => `${(DETAIL_STAT_LABELS[key] || key.toUpperCase())} ${Number(bonus[key]) > 0 ? '+' : ''}${formatNumber(bonus[key])}`);
  return rows.join(' / ') || '스탯 보너스 없음';
}

function renderBattleEquipmentSummary(equipmentSummary = {}) {
  const members = (equipmentSummary.members || []).filter((snapshot) => snapshot?.applied);
  const rows = members.slice(0, 6).map((snapshot) => {
    const equipmentNames = (snapshot.equippedNames || []).filter(Boolean).slice(0, 4).join(' / ') || '장착 장비명 없음';
    return `
      <article>
        <strong>${escapeHtml(snapshot.name || '용병')}</strong>
        <p>${escapeHtml(formatEquipmentBonusLine(snapshot.equipmentBonus || {}))}</p>
        <em>${escapeHtml(equipmentNames)}</em>
      </article>
    `;
  }).join('');
  return `
    <section class="battle-result-detail-section merc-battle-equipment-summary">
      <h4>장비 적용 요약</h4>
      <div class="battle-result-modal-summary is-compact">
        ${renderBattleReportMetric('장비 적용 용병', `${formatNumber(equipmentSummary.appliedCount || 0)}명`)}
        ${renderBattleReportMetric('총 장비 전투력', `+${formatNumber(equipmentSummary.totalEquipmentPower || 0)}`)}
      </div>
      <div class="battle-result-record-list">
        ${rows || '<p>장비 보너스가 적용된 용병이 없습니다.</p>'}
      </div>
    </section>
  `;
}

function renderBattleModalDetailedReport(report) {
  const allyDamageTaken = report.unitSummaries?.allies?.reduce((sum, unit) => sum + (Number(unit.damageTaken || 0) || 0), 0) || 0;
  const aliveAllies = report.unitSummaries?.allies?.filter((unit) => unit.survived).length || 0;
  const aliveEnemies = report.unitSummaries?.enemies?.filter((unit) => unit.survived).length || 0;
  return `
    <section class="battle-result-modal-section battle-result-detail-report">
      <h3>상세 전투 보고서</h3>
      <div class="battle-result-modal-summary is-compact">
        ${renderBattleReportMetric('아군 피해', formatNumber(allyDamageTaken))}
        ${renderBattleReportMetric('남은 아군', formatNumber(aliveAllies))}
        ${renderBattleReportMetric('남은 적', formatNumber(aliveEnemies))}
        ${renderBattleReportMetric('상태 부여', `${formatNumber(report.statusAppliedCount || 0)}회`)}
        ${renderBattleReportMetric('장비 전투력', `+${formatNumber(report.equipmentSummary?.totalEquipmentPower || 0)}`)}
      </div>
      ${renderBattleEquipmentSummary(report.equipmentSummary || {})}
      ${renderBattleModalUnitRecords('아군 전투 기록', report.unitSummaries?.allies || [])}
      ${renderBattleModalUnitRecords('적 전투 기록', report.unitSummaries?.enemies || [], { enemy: true })}
      ${renderBattleModalSkillRecords(report.skillSummary || [])}
      ${renderBattleModalStatusRecords(report.statusSummary || [])}
      <section class="battle-result-detail-section">
        <h4>라운드별 상세 로그</h4>
        ${renderBattleRoundLog(report.rounds)}
      </section>
    </section>
  `;
}

function renderBattleResultModal() {
  const layer = document.querySelector('#battle-result-modal');
  const content = document.querySelector('#battle-result-modal-content');
  const viewer = battleOperationState.viewer;
  const battleResult = viewer.battleResult;
  if (!layer || !content || !battleResult) return;
  const report = buildBattleReportViewModel(battleResult, { operation: viewer.operation });
  const claimState = viewer.claimState || {};
  const claimStatus = getBattleClaimStatus(claimState);
  const isVictory = report.result === 'victory';
  const title = isVictory ? '승리' : report.result === 'defeat' ? '패배' : '전투 종료';
  const allyDamageTaken = report.unitSummaries?.allies?.reduce((sum, unit) => sum + (Number(unit.damageTaken || 0) || 0), 0) || 0;
  const aliveAllies = report.unitSummaries?.allies?.filter((unit) => unit.survived).length || 0;
  const aliveEnemies = report.unitSummaries?.enemies?.filter((unit) => unit.survived).length || 0;
  const statusMessage = claimStatus === 'claiming'
    ? '전투 정산 중...'
    : claimStatus === 'claimed'
      ? (claimState.result?.alreadyClaimed ? '이미 반영된 전투 결과입니다.' : '전투 결과가 정산되었습니다.')
      : claimStatus === 'failed'
        ? '전투 결과는 저장되었지만 보상 정산에 실패했습니다.'
        : '전투 정산 대기 중';
  layer.hidden = false;
  content.innerHTML = `
    <header class="battle-result-modal-header ${isVictory ? 'is-victory' : 'is-defeat'}">
      <span>${escapeHtml(title)}</span>
      <h2>${escapeHtml(report.resultText || title)}</h2>
      <p>${escapeHtml(report.operationTitle || battleResult.operationTitle || viewer.operation?.title || '')}</p>
      <em>${formatNumber(report.finalRound)}라운드 · ${escapeHtml(report.difficultyText || '')}</em>
    </header>
    <section class="battle-result-modal-summary">
      ${renderBattleReportMetric('MVP', report.mvp?.name || '없음')}
      ${renderBattleReportMetric('총 피해', formatNumber(report.totalDamage))}
      ${renderBattleReportMetric('총 회복', formatNumber(report.totalHealing))}
      ${renderBattleReportMetric('처치', formatNumber(report.killCount))}
      ${renderBattleReportMetric('아군 피해', formatNumber(allyDamageTaken))}
      ${renderBattleReportMetric('남은 아군', formatNumber(aliveAllies))}
      ${renderBattleReportMetric('남은 적', formatNumber(aliveEnemies))}
      ${renderBattleReportMetric('상태이상', `${formatNumber(report.statusAppliedCount || 0)}회`)}
      ${renderBattleReportMetric('장비 전투력', `+${formatNumber(report.equipmentSummary?.totalEquipmentPower || 0)}`)}
    </section>
    <section class="battle-result-modal-section">
      <h3>정산</h3>
      <p>${escapeHtml(statusMessage)}</p>
      ${renderBattleSettlementRewards(claimState)}
    </section>
    <section class="battle-result-modal-section">
      <h3>부상 / 의무실</h3>
      ${renderBattleSettlementInjuries(claimState)}
    </section>
    ${renderBattleModalDetailedReport(report)}
    <footer class="battle-result-modal-actions">
      ${claimStatus === 'failed' ? '<button type="button" data-battle-claim-retry>정산 재시도</button>' : ''}
      ${claimStatus === 'claimed' && hasBattleResultInjuries(claimState) ? '<button type="button" data-battle-result-infirmary>의무실 보기</button>' : ''}
      <button type="button" data-battle-result-confirm ${claimStatus === 'claiming' ? 'disabled' : ''}>확인</button>
      <button type="button" data-battle-result-board ${claimStatus === 'claiming' ? 'disabled' : ''}>작전판으로 돌아가기</button>
    </footer>
  `;
  content.querySelector('[data-battle-claim-retry]')?.addEventListener('click', () => claimCurrentBattleResult({ retry: true }));
  content.querySelector('[data-battle-result-confirm]')?.addEventListener('click', closeBattleResultModal);
  content.querySelector('[data-battle-result-board]')?.addEventListener('click', closeBattleResultModal);
  content.querySelector('[data-battle-result-infirmary]')?.addEventListener('click', () => {
    closeBattleResultModal();
    openInfirmaryView();
  });
}

function closeBattleResultModal() {
  document.querySelector('#battle-result-modal')?.setAttribute('hidden', '');
  closeBattleViewer();
  renderBattleOperationBoard();
}

function finalizeBattleAndOpenReport() {
  const viewer = battleOperationState.viewer;
  if (!viewer.finished || !viewer.battleResult) return;
  if (!viewer.claimState) viewer.claimState = { status: 'idle' };
  if (!viewer.resultSfxPlayed) {
    viewer.resultSfxPlayed = true;
    if (viewer.battleResult?.result === 'victory') window.MercenaryAudio?.playVictory?.();
    else if (viewer.battleResult?.result === 'defeat') window.MercenaryAudio?.playDefeat?.();
    else window.MercenaryAudio?.stopBattleBgm?.({ fade: true });
  }
  renderBattleResultModal();
  autoClaimBattleResultOnce();
}

function autoClaimBattleResultOnce() {
  const viewer = battleOperationState.viewer;
  const claimStatus = getBattleClaimStatus(viewer.claimState || {});
  if (claimStatus === 'idle' || claimStatus === 'failed') claimCurrentBattleResult({ automatic: true });
}

function renderBattleClaimPanel(report, claimState = {}) {
  const claimed = Boolean(claimState.claimed);
  const claiming = Boolean(claimState.claiming);
  const result = claimState.result || null;
  const isVictory = report?.result === 'victory';
  const buttonText = claimed
    ? '수령 완료'
    : claiming
      ? '처리 중'
      : isVictory
        ? '보상 수령'
        : '결과 반영';
  const message = claimState.message || (claimed ? '전투 결과가 서버에 반영되었습니다.' : '전투 결과를 저장하고 보상/EXP/부상 상태를 반영합니다.');
  const rewards = result?.rewards || {};
  const profile = result?.profile || {};
  const office = result?.office || {};
  const mercenaries = Array.isArray(result?.mercenaries) ? result.mercenaries : [];
  const hasTreatableInjury = mercenaries.some((item) => Number(item?.treatmentCost || 0) > 0 || ['injured_light', 'injured_heavy', 'treatment_required', 'incapacitated'].includes(String(item?.status || '')));
  return `
    <section class="merc-battle-claim-panel">
      <div>
        <h4>서버 반영</h4>
        <p>${escapeHtml(message)}</p>
      </div>
      <button type="button" data-battle-claim ${claimed || claiming ? 'disabled' : ''}>${escapeHtml(buttonText)}</button>
      ${claimed && hasTreatableInjury ? '<button type="button" data-battle-infirmary>의무실 확인</button>' : ''}
      ${result ? renderRewardGrowthSummary(result) : ''}
    </section>
  `;
}

function renderBattleReport(report, claimState = {}) {
  const bannerClass = report.result === 'victory' ? 'victory' : report.result === 'defeat' ? 'defeat' : 'done';
  return `
    <section class="merc-battle-report">
      <header class="merc-battle-report-banner ${bannerClass}">
        <div>
          <span>${escapeHtml(report.outcomeLabel)}</span>
          <h3>${escapeHtml(report.resultText)}</h3>
          <p>${escapeHtml(report.battlefieldName)} · ${formatNumber(report.finalRound)}라운드 / ${escapeHtml(report.difficultyText)}</p>
        </div>
      </header>
      <div class="merc-battle-report-summary-grid">
        ${renderBattleReportMetric('MVP', report.mvp?.name || '없음')}
        ${renderBattleReportMetric('총 피해', formatNumber(report.totalDamage))}
        ${renderBattleReportMetric('총 회복', formatNumber(report.totalHealing))}
        ${renderBattleReportMetric('처치', formatNumber(report.killCount))}
        ${renderBattleReportMetric('전투불능', formatNumber(report.defeatedAllies))}
        ${renderBattleReportMetric('상태 효과', `${formatNumber(report.statusAppliedCount)}회`)}
        ${renderBattleReportMetric('보상', `${formatNumber(report.rewardCount)}개`)}
      </div>
      ${renderBattleMvpCard(report.mvp)}
      <div class="merc-battle-report-two-col">
        ${renderBattleContributionList(report.unitSummaries)}
        ${renderBattleEnemyResultList(report.unitSummaries)}
      </div>
      <div class="merc-battle-report-two-col">
        ${renderBattleSkillSummary(report.skillSummary)}
        ${renderBattleStatusSummary(report.statusSummary)}
      </div>
      <div class="merc-battle-report-two-col">
        ${renderBattleRewardsSummary(report.rewards)}
        ${renderBattleInjuryPreview(report.injuries)}
      </div>
      ${renderBattleRoundLog(report.rounds)}
      ${renderBattleDevDetails(report)}
    </section>
  `;
}

function buildMockBattleEvents(allies, enemies) {
  const events = [];
  const enemyHp = new Map(enemies.map((enemy) => [enemy.id, Number(enemy.hp || enemy.maxHp || 1)]));
  const allyHp = new Map(allies.map((ally) => [ally.id, Number(ally.hp || ally.maxHp || 1)]));
  const pickAliveEnemy = (offset = 0) => {
    const alive = enemies.filter((enemy) => Number(enemyHp.get(enemy.id) || 0) > 0);
    return alive[offset % Math.max(1, alive.length)] || null;
  };
  const pickAliveAlly = (offset = 0) => {
    const alive = allies.filter((ally) => Number(allyHp.get(ally.id) || 0) > 0);
    return alive[offset % Math.max(1, alive.length)] || null;
  };
  const pickWoundedAlly = () => allies
    .filter((ally) => Number(allyHp.get(ally.id) || 0) > 0 && Number(allyHp.get(ally.id) || 0) < Number(ally.maxHp || 1))
    .sort((a, b) => (Number(allyHp.get(a.id) || 0) / Math.max(1, Number(a.maxHp || 1))) - (Number(allyHp.get(b.id) || 0) / Math.max(1, Number(b.maxHp || 1))))[0] || null;
  const healer = allies.find(isMockHealerMercenary);
  const applyPlannedDamage = (side, unit, amount) => {
    if (!unit) return;
    const hpMap = side === 'ally' ? allyHp : enemyHp;
    hpMap.set(unit.id, Math.max(0, Number(hpMap.get(unit.id) || 0) - Number(amount || 0)));
  };
  const applyPlannedHeal = (unit, amount) => {
    if (!unit) return;
    allyHp.set(unit.id, Math.min(Number(unit.maxHp || 1), Number(allyHp.get(unit.id) || 0) + Number(amount || 0)));
  };
  for (let round = 1; round <= 6; round += 1) {
    const actor = allies[(round - 1) % Math.max(1, allies.length)];
    const target = pickAliveEnemy(round - 1);
    if (!actor || !target) break;
    const damage = 110 + round * 28;
    events.push(makeMockBattleAction({
      round,
      kind: 'damage',
      attacker: actor,
      attackerSide: 'ally',
      target,
      targetSide: 'enemy',
      amount: damage,
      logText: `라운드 ${round}: ${actor?.name || '용병'}이 ${target?.name || '적'}에게 ${formatNumber(damage)} 피해`
    }));
    applyPlannedDamage('enemy', target, damage);

    const secondActor = allies[(round + 1) % Math.max(1, allies.length)];
    const secondTarget = pickAliveEnemy(round + 1);
    if (round % 2 === 0 && secondActor && secondTarget) {
      const secondDamage = 86 + round * 18;
      events.push(makeMockBattleAction({
        round,
        kind: 'damage',
        attacker: secondActor,
        attackerSide: 'ally',
        target: secondTarget,
        targetSide: 'enemy',
        amount: secondDamage,
        logText: `라운드 ${round}: ${secondActor?.name || '용병'}이 ${secondTarget?.name || '적'}에게 ${formatNumber(secondDamage)} 피해`
      }));
      applyPlannedDamage('enemy', secondTarget, secondDamage);
    }

    const enemyActor = pickAliveEnemy(round);
    const allyTarget = pickAliveAlly(round + 1);
    if (enemyActor && allyTarget) {
      const enemyDamage = Math.min(260, 78 + round * 24 + (round % 3) * 16);
      events.push(makeMockBattleAction({
        round,
        kind: 'damage',
        attacker: enemyActor,
        attackerSide: 'enemy',
        target: allyTarget,
        targetSide: 'ally',
        amount: enemyDamage,
        logText: `라운드 ${round}: ${enemyActor?.name || '적'}이 ${allyTarget?.name || '용병'}에게 ${formatNumber(enemyDamage)} 피해`
      }));
      applyPlannedDamage('ally', allyTarget, enemyDamage);
    }

    const secondEnemyActor = round % 3 === 0 ? pickAliveEnemy(round + 2) : null;
    const secondAllyTarget = secondEnemyActor ? pickAliveAlly(round + 3) : null;
    if (secondEnemyActor && secondAllyTarget) {
      const secondEnemyDamage = Math.min(220, 70 + round * 20);
      events.push(makeMockBattleAction({
        round,
        kind: 'damage',
        attacker: secondEnemyActor,
        attackerSide: 'enemy',
        target: secondAllyTarget,
        targetSide: 'ally',
        amount: secondEnemyDamage,
        logText: `라운드 ${round}: ${secondEnemyActor?.name || '적'}이 ${secondAllyTarget?.name || '용병'}에게 ${formatNumber(secondEnemyDamage)} 피해`
      }));
      applyPlannedDamage('ally', secondAllyTarget, secondEnemyDamage);
    }

    const healTarget = healer && round % 3 === 0 ? pickWoundedAlly() : null;
    if (healer && healTarget && Number(allyHp.get(healer.id) || 0) > 0) {
      const healAmount = 96 + round * 18;
      events.push(makeMockBattleAction({
        round,
        kind: 'heal',
        attacker: healer,
        attackerSide: 'ally',
        target: healTarget,
        targetSide: 'ally',
        amount: healAmount,
        logText: `라운드 ${round}: ${healer?.name || '지원 담당'}이 ${healTarget?.name || '아군'}을 ${formatNumber(healAmount)} 회복`
      }));
      applyPlannedHeal(healTarget, healAmount);
    }
  }
  let finishRound = 7;
  let finishIndex = 0;
  enemies.forEach((enemy) => {
    const remainingHp = Number(enemyHp.get(enemy.id) || 0);
    if (remainingHp <= 0) return;
    const actor = pickAliveAlly(finishIndex) || allies[finishIndex % Math.max(1, allies.length)];
    const damage = remainingHp;
    events.push(makeMockBattleAction({
      round: finishRound,
      kind: 'damage',
      attacker: actor,
      attackerSide: 'ally',
      target: enemy,
      targetSide: 'enemy',
      amount: damage,
      logText: `라운드 ${finishRound}: ${actor?.name || '용병'}이 ${enemy.name || '적'}에게 ${formatNumber(damage)} 피해`
    }));
    applyPlannedDamage('enemy', enemy, damage);
    finishIndex += 1;
    if (finishIndex % Math.max(1, allies.length) === 0) finishRound += 1;
  });
  events.push({ id: `mock_${finishRound}_victory`, round: finishRound, kind: 'result', type: 'victory', attackerId: allies[0]?.id, actorId: allies[0]?.id, attackerSide: 'ally', targetId: enemies[0]?.id, targetSide: 'enemy', amount: 0, logText: `라운드 ${finishRound}: 모든 적 전투불능. 승리!`, message: `라운드 ${finishRound}: 모든 적 전투불능. 승리!` });
  return events;
}

function openBattleViewer(operation, party = selectedBattleParty()) {
  const validation = getBattlePartyValidation(party, operation);
  if (!validation.ok) {
    showReadyNotice(validation.reason || String.fromCharCode(0xC804, 0xD22C, 0x20, 0xD30C, 0xD2F0, 0xB97C, 0x20, 0xC120, 0xD0DD, 0xD574, 0xC8FC, 0xC138, 0xC694, 0x2E));
    renderBattleOperationBoard();
    return;
  }
  const partyMemberIds = battlePartyMemberIds(party);
  const partySnapshot = buildBattlePartyMembersWithEquipmentSnapshot(party, getBattleOperationRoster());
  let combatRequest;
  let battleResult;
  try {
    combatRequest = createCombatRequestFromBattleOperation(operation, party, { partyMemberIds, partySnapshot });
    battleResult = createBattleResultFromCombatRequest(combatRequest);
  } catch (error) {
    console.warn('[mercenary/combat] failed to create combat request:', error);
    showReadyNotice(error?.message || String.fromCharCode(0xC804, 0xD22C, 0xB97C, 0x20, 0xC2DC, 0xC791, 0xD560, 0x20, 0xC218, 0x20, 0xC5C6, 0xC2B5, 0xB2C8, 0xB2E4, 0x2E));
    return;
  }
  const combatResult = window.MercenaryCombatAdapters?.normalizeBattleResultToCombatResult?.(battleResult, combatRequest) || null;
  const allies = (battleResult.allies || []).map(cloneBattleUnitForState);
  const enemies = (battleResult.enemies || []).map(cloneBattleUnitForState);
  const viewer = battleOperationState.viewer;
  stopBattleViewerPlayback();
  document.querySelector('#battle-result-modal')?.setAttribute('hidden', '');
  viewer.operation = operation;
  viewer.combatRequest = combatRequest;
  viewer.combatResult = combatResult;
  viewer.battleResult = battleResult;
  viewer.allies = allies;
  viewer.enemies = enemies;
  viewer.logs = [];
  viewer.events = flattenBattleResultActions(battleResult);
  viewer.currentRound = 1;
  viewer.currentEventIndex = -1;
  viewer.status = String.fromCharCode(0xAD50, 0xC804, 0x20, 0xC911);
  viewer.paused = false;
  viewer.finished = false;
  viewer.floating = null;
  viewer.resultBanner = '';
  viewer.resultSfxPlayed = false;
  viewer.claimState = { status: 'idle', battleId: battleResult.battleId, requestId: combatRequest.requestId };
  if (MERCENARY_BATTLE_DEBUG) console.debug('[mercenary/battle] battleResult', battleResult);
  document.querySelector('#battle-viewer-layer')?.removeAttribute('hidden');
  pauseMercenaryBgmForBattle();
  window.MercenaryAudio?.unlockAudio?.();
  window.MercenaryAudio?.playBattleBgm?.();
  renderBattleViewerFrame();
  playMockBattleReplay();
}

function stopBattleViewerPlayback() {
  const viewer = battleOperationState.viewer;
  if (viewer.timer) {
    window.clearTimeout(viewer.timer);
    viewer.timer = null;
  }
}

function closeBattleViewer() {
  stopBattleViewerPlayback();
  window.MercenaryAudio?.stopBattleBgm?.({ fade: false });
  document.querySelector('#battle-viewer-layer')?.setAttribute('hidden', '');
  resumeMercenaryBgmAfterBattle();
}

function getBattleClaimRoundCount(battleResult) {
  if (Array.isArray(battleResult?.rounds)) return battleResult.rounds.length;
  const numericRoundCount = Number(battleResult?.roundCount ?? battleResult?.summary?.rounds ?? 0);
  if (Number.isFinite(numericRoundCount) && numericRoundCount > 0) return numericRoundCount;
  const actions = Array.isArray(battleResult?.actions)
    ? battleResult.actions
    : flattenBattleResultActions(battleResult);
  if (Array.isArray(actions) && actions.length) {
    const rounds = new Set(actions.map((action) => Number(action?.round || 0)).filter(Boolean));
    return rounds.size || 0;
  }
  return 0;
}

function buildBattleClaimClientSummary(battleResult, allies) {
  const summary = battleResult?.summary && typeof battleResult.summary === 'object' ? battleResult.summary : {};
  const partySnapshot = Array.isArray(battleResult?.partySnapshot)
    ? battleResult.partySnapshot
    : Array.isArray(summary?.equipmentSnapshots)
      ? summary.equipmentSnapshots
      : [];
  const partyMemberIds = allies
    .map((unit) => unit?.sourceId || unit?.ownedId || unit?.mercenaryId || unit?.userMercenaryId || '')
    .filter(Boolean)
    .map(String);
  const equipmentSnapshots = Array.isArray(summary?.equipmentSnapshots) ? summary.equipmentSnapshots : partySnapshot;
  return {
    partyMemberIds,
    enemyCount: Number(summary.enemyCount ?? battleResult?.enemyCount ?? (Array.isArray(battleResult?.enemies) ? battleResult.enemies.length : 0)) || 0,
    totalDamageDealt: Number(summary.totalDamageDealt ?? summary.damageDealt ?? battleResult?.stats?.totalDamageDealt ?? battleResult?.stats?.damageDealt ?? 0) || 0,
    totalDamageTaken: Number(summary.totalDamageTaken ?? summary.damageTaken ?? battleResult?.stats?.totalDamageTaken ?? battleResult?.stats?.damageTaken ?? 0) || 0,
    injuryCount: Array.isArray(battleResult?.injuries) ? battleResult.injuries.length : 0,
    equipmentApplied: Boolean(summary.equipmentApplied || equipmentSnapshots.some((member) => Number(member?.equipmentBonus?.combatPower || member?.equipmentCombatPower || 0) > 0)),
    equipmentCombatPower: equipmentSnapshots.reduce((sum, member) => sum + Number(member?.equipmentBonus?.combatPower || member?.equipmentCombatPower || 0), 0)
  };
}

function buildBattleClaimPayload(battleResult) {
  const allies = Array.isArray(battleResult?.allies) ? battleResult.allies : [];
  const payload = {
    battleId: battleResult?.battleId || '',
    runId: battleResult?.runId || battleResult?.battleId || '',
    requestId: battleResult?.requestId || '',
    sourceType: battleResult?.sourceType || 'combat_mission',
    sourceId: battleResult?.sourceId || battleResult?.operationId || '',
    missionId: battleResult?.missionId || battleResult?.operationId || '',
    operationId: battleResult?.operationId || '',
    result: battleResult?.result || '',
    outcome: battleResult?.outcome || battleResult?.result || '',
    seed: battleResult?.seed ?? null,
    rounds: getBattleClaimRoundCount(battleResult),
    roundCount: getBattleClaimRoundCount(battleResult),
    mvpUserMercenaryId: battleResult?.mvp?.userMercenaryId || battleResult?.mvpUserMercenaryId || null,
    partyUserMercenaryIds: allies.map((unit) => String(unit?.sourceId || '')).filter(Boolean),
    allies: allies.map((unit) => ({
      sourceId: unit.sourceId || unit.ownedId || unit.mercenaryId || '',
      finalHp: Number(unit.finalHp ?? unit.hp ?? 0),
      maxHp: Number(unit.maxHp || 1),
      status: unit.status || ''
    })),
    clientSummary: buildBattleClaimClientSummary(battleResult, allies)
  };
  if (MERCENARY_BATTLE_DEBUG) {
    try {
      console.debug('[mercenary/battle] slim claim payload bytes', JSON.stringify(payload).length);
    } catch (error) {
      console.debug('[mercenary/battle] failed to measure claim payload', error);
    }
  }
  return payload;
}

async function claimCurrentBattleResult(options = {}) {
  const viewer = battleOperationState.viewer;
  const battleResult = viewer.battleResult;
  if (!battleResult?.battleId) {
    showReadyNotice('반영할 전투 결과를 찾지 못했습니다.');
    return;
  }
  const claimStatus = getBattleClaimStatus(viewer.claimState || {});
  if (claimStatus === 'claiming' || (claimStatus === 'claimed' && !options.retry)) return;
  viewer.claimState = {
    ...(viewer.claimState || {}),
    status: 'claiming',
    claiming: true,
    claimed: false,
    failed: false,
    message: '전투 정산 중...'
  };
  renderBattleResultModal();
  try {
    const payload = await apiRequest('/api/mercenary/battles/claim', {
      method: 'POST',
      body: JSON.stringify(buildBattleClaimPayload(battleResult)),
      perfScope: 'mercenary-battle-claim'
    });
    viewer.claimState = {
      status: 'claimed',
      claiming: false,
      claimed: true,
      failed: false,
      result: payload,
      message: payload.alreadyClaimed ? '이미 반영된 전투 결과입니다.' : '전투 결과가 정산되었습니다.'
    };
    updateMercenaryCurrencyDisplay(payload);
    const shouldRefreshStageClears = battleResult?.result === 'victory';
    await Promise.allSettled([
      loadOwnedMercenariesFromApi(),
      loadInfirmaryData(),
      loadInventoryData({ force: true }),
      shouldRefreshStageClears ? loadBattleStageClears({ force: true }) : Promise.resolve()
    ]);
    if (shouldRefreshStageClears && payload?.stageClear) {
      showReadyNotice('\uC2A4\uD14C\uC774\uC9C0 \uD074\uB9AC\uC5B4. \uB2E4\uC74C Stage \uD574\uAE08 \uC0C1\uD0DC\uB97C \uAC31\uC2E0\uD588\uC2B5\uB2C8\uB2E4.');
    }
  } catch (error) {
    if (error.status === 401) {
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
    }
    viewer.claimState = {
      ...(viewer.claimState || {}),
      status: 'failed',
      claiming: false,
      claimed: false,
      failed: true,
      error,
      message: error?.data?.code === 'BATTLE_ALREADY_CLAIMED'
        ? '이미 반영된 전투 결과입니다.'
        : '전투 결과는 저장되었지만 보상 정산에 실패했습니다.'
    };
  }
  renderBattleResultModal();
  renderBattleOperationBoard();
}

function applyMockBattleEvent(event) {
  const viewer = battleOperationState.viewer;
  viewer.currentRound = event.round;
  viewer.logs.push(event.logText || event.message);
  viewer.floating = { ...event, visualKey: `${event.round}-${viewer.currentEventIndex}-${Date.now()}` };
  window.MercenaryAudio?.playBattleAction?.(event);
  if (event.kind === 'damage' || event.type === 'attack' || event.type === 'down') {
    const targetList = event.targetSide === 'ally' ? viewer.allies : viewer.enemies;
    const target = targetList.find((unit) => unit.id === event.targetId);
    if (target) {
      target.hp = Math.max(0, Number(event.afterHp ?? (Number(target.hp || 0) - Number(event.amount || 0))));
      target.status = target.hp <= 0 ? 'defeated' : 'alive';
    }
  }
  if (event.kind === 'heal' || event.type === 'heal') {
    const targetList = event.targetSide === 'enemy' ? viewer.enemies : viewer.allies;
    const target = targetList.find((unit) => unit.id === event.targetId);
    if (target) {
      target.hp = Math.min(target.maxHp, Number(event.afterHp ?? (Number(target.hp || 0) + Number(event.amount || 0))));
      target.status = target.hp <= 0 ? 'defeated' : 'alive';
    }
  }
  const outcome = getBattleMockOutcome(viewer);
  if (outcome === 'defeat') {
    viewer.status = '패배';
    viewer.finished = true;
    viewer.resultBanner = '패배';
    return;
  }
  if (event.type === 'victory') {
    if (areAllEnemiesDefeated(viewer)) {
      viewer.status = '승리';
      viewer.finished = true;
      viewer.resultBanner = '승리';
    } else {
      viewer.status = '교전 중';
      viewer.resultBanner = '';
      viewer.logs.push('적이 아직 남아 있습니다. 교전이 계속됩니다.');
    }
  }
}

function playMockBattleReplay() {
  const viewer = battleOperationState.viewer;
  stopBattleViewerPlayback();
  if (viewer.finished) {
    finalizeBattleAndOpenReport();
    return;
  }
  viewer.timer = window.setTimeout(() => {
    viewer.currentEventIndex += 1;
    const event = viewer.events?.[viewer.currentEventIndex];
    if (!event) {
      const outcome = getBattleMockOutcome(viewer);
      if (outcome === 'victory') {
        viewer.status = '승리';
        viewer.finished = true;
        viewer.resultBanner = '승리';
      } else if (outcome === 'defeat') {
        viewer.status = '패배';
        viewer.finished = true;
        viewer.resultBanner = '패배';
      } else if (viewer.battleResult?.result === 'defeat') {
        viewer.status = '패배';
        viewer.finished = true;
        viewer.resultBanner = '패배';
      } else if (viewer.battleResult?.result === 'draw') {
        viewer.status = '무승부';
        viewer.finished = true;
        viewer.resultBanner = '무승부';
      } else {
        viewer.status = '교전 중';
        viewer.resultBanner = '';
      }
    } else {
      applyMockBattleEvent(event);
    }
    renderBattleViewerFrame();
    if (viewer.finished) finalizeBattleAndOpenReport();
    else playMockBattleReplay();
  }, Math.max(320, Math.floor(950 / Math.max(1, viewer.speed))));
}

function renderBattleUnit(unit, side, index = 0, enemyPattern = '') {
  const hpRate = Math.max(0, Math.min(1, Number(unit.hp || 0) / Math.max(1, Number(unit.maxHp || 1))));
  const floating = battleOperationState.viewer.floating;
  const isTarget = floating?.targetId === unit.id;
  const isActor = floating?.actorId === unit.id;
  const isHealed = isTarget && (floating?.kind === 'heal' || floating?.type === 'heal');
  const isDamage = isTarget && (floating?.kind === 'damage' || floating?.type === 'attack' || floating?.type === 'down');
  const defeated = hpRate <= 0;
  const portrait = side === 'ally'
    ? renderImageWithPlaceholder(unit.member || unit, 'battle-viewer-unit-img battlefield-unit-img')
    : `<img class="battle-viewer-unit-img battlefield-unit-img" src="${escapeHtml(unit.image || '')}" alt="" onerror="this.hidden=true" />`;
  const hpPercent = Math.round(hpRate * 100);
  const hpStateClass = hpRate <= 0.3 && !defeated ? 'is-low' : '';
  const dataAttributes = side === 'ally'
    ? `data-slot="${escapeHtml(unit.slotKey || '')}" data-depth="${escapeHtml(unit.depth || '')}" data-ally-index="${index}"`
    : `data-pattern="${escapeHtml(enemyPattern || '')}" data-enemy-index="${index}"`;
  return `
    <article class="battle-viewer-unit battlefield-unit ${side === 'enemy' ? 'is-enemy' : 'is-ally'} ${isDamage ? 'is-hit' : ''} ${isActor ? 'is-acting' : ''} ${isHealed ? 'is-healed' : ''} ${defeated ? 'is-defeated' : ''}" ${dataAttributes}>
      <div class="battlefield-unit-sprite">${portrait}</div>
      <div class="battlefield-unit-nameplate">
        <strong class="battlefield-unit-name">${escapeHtml(unit.name)}</strong>
        <div class="battle-hp-bar battlefield-hpbar ${hpStateClass}"><span style="width:${hpPercent}%"></span></div>
        <em>${defeated ? '전투불능' : `${formatNumber(Math.max(0, unit.hp))}/${formatNumber(unit.maxHp)}`}</em>
      </div>
      ${isDamage ? `<i class="battle-attack-effect ${floating?.attackerSide === 'enemy' ? 'is-enemy' : 'is-ally'}" aria-hidden="true"></i>` : ''}
      ${isHealed ? '<i class="battle-heal-effect" aria-hidden="true"></i>' : ''}
      ${isTarget && floating?.amount ? `<b class="battle-floating-number ${isHealed ? 'is-heal' : 'is-damage'}" data-float-key="${escapeHtml(floating.visualKey || '')}">${isHealed ? '+' : '-'}${formatNumber(floating.amount)}</b>` : ''}
    </article>
  `;
}

function renderBattleViewerFrame() {
  const root = document.querySelector('#battle-viewer-content');
  const viewer = battleOperationState.viewer;
  const operation = viewer.operation;
  if (!root || !operation) return;
  const battleResult = viewer.battleResult;
  const rewards = battleResult?.rewards || operation.rewards || [];
  const battlefieldImage = getBattlefieldBackgroundImage(battleResult?.battlefield, operation);
  const battlefieldName = battleResult?.battlefield?.name || operation.battlefield || '전장';
  const recentLogs = viewer.logs.slice(-6);
  const outcome = getBattleMockOutcome(viewer);
  const result = outcome !== 'ongoing' ? outcome : battleResult?.result || 'ongoing';
  const isVictory = viewer.finished && result === 'victory';
  const isDefeat = viewer.finished && result === 'defeat';
  const isDraw = viewer.finished && result === 'draw';
  const resultBanner = viewer.resultBanner || (viewer.finished ? viewer.status : '');
  const enemyPattern = getBattleEnemyFormationPattern(operation, viewer.enemies);
  root.innerHTML = `
    <section class="battle-viewer-shell">
      <header class="battle-viewer-topbar">
        <div>
          <span class="battle-board-kicker">오토배틀 관전</span>
          <h3>${escapeHtml(battleResult?.operationTitle || operation.title)}</h3>
          <p>${escapeHtml(battlefieldName)} · ROUND ${formatNumber(viewer.currentRound)} · ${escapeHtml(viewer.status)}</p>
        </div>
        <div class="battle-viewer-controls">
          ${[1, 1.5, 2].map((speed) => `<button type="button" data-battle-speed="${speed}" class="${viewer.speed === speed ? 'is-active' : ''}">x${speed}</button>`).join('')}
        </div>
      </header>
      <div class="battle-viewer-stage" style="--battle-bg: url('${escapeHtml(battlefieldImage)}')">
        <div class="battlefield-backdrop" aria-hidden="true"></div>
        <div class="battlefield-depth-line" aria-hidden="true"></div>
        <div class="battle-viewer-row battle-viewer-row-enemy enemy-row" data-pattern="${escapeHtml(enemyPattern)}">${viewer.enemies.map((unit, index) => renderBattleUnit(unit, 'enemy', index, enemyPattern)).join('')}</div>
        <div class="battle-viewer-row battle-viewer-row-ally ally-row">${viewer.allies.map((unit, index) => renderBattleUnit(unit, 'ally', index)).join('')}</div>
        ${resultBanner ? `<div class="battle-result-banner">${escapeHtml(resultBanner)}</div>` : ''}
      </div>
      <footer class="battle-viewer-bottom">
        <section class="battle-viewer-log">
          <h4>전투 로그</h4>
          <div>${recentLogs.map((log, index) => `<p class="${index === recentLogs.length - 1 ? 'is-latest' : ''}">${escapeHtml(log)}</p>`).join('') || '<p>전투 개시 대기</p>'}</div>
        </section>
        <section class="battle-viewer-loot ${isVictory ? 'is-finished' : ''}">
          <h4>${viewer.finished ? '결과 정산' : '교전 중'}</h4>
          <p>${viewer.finished ? '전투 결과 모달에서 정산 내용을 확인합니다.' : '전투 종료 후 결과가 자동 정산됩니다.'}</p>
          <div>${rewards.map((reward) => `<span>${escapeHtml(reward.label)} ${formatNumber(reward.amount)}</span>`).join('')}</div>
        </section>
      </footer>
    </section>
  `;
  root.querySelectorAll('[data-battle-speed]').forEach((button) => {
    button.addEventListener('click', () => {
      viewer.speed = Number(button.dataset.battleSpeed || 1) || 1;
      renderBattleViewerFrame();
      playMockBattleReplay();
    });
  });
}

function renderHotspots(hotspots) {
  const layer = document.querySelector('#hotspot-layer');
  if (!layer) return;

  layer.innerHTML = hotspots.map((hotspot) => `
    <button
      class="lobby-hotspot hotspot-${hotspot.key}"
      type="button"
      data-status="${hotspot.status}"
      aria-label="${hotspot.label}: ${hotspot.description}"
    >
      ${renderIcon(hotspot.icon, 'large')}
      <span class="hotspot-copy">
        <span class="hotspot-label">${hotspot.label}</span>
        <span class="hotspot-badge">${hotspot.badge}</span>
      </span>
      <span class="lobby-tooltip" role="tooltip">${hotspot.description}</span>
    </button>
  `).join('');

  layer.querySelectorAll('.lobby-hotspot').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.classList.contains('hotspot-recruitment')) {
        openRecruitmentBoard();
        return;
      }
      if (button.classList.contains('hotspot-missions')) {
        openMissionView();
        return;
      }
      if (button.classList.contains('hotspot-infirmary')) {
        openInfirmaryView();
        return;
      }
      if (button.classList.contains('hotspot-office')) {
        openOfficeView();
        return;
      }
      if (button.classList.contains('hotspot-cases')) {
        openCaseView();
        return;
      }
      showReadyNotice();
    });
  });
}

function renderLogs(logs) {
  const list = document.querySelector('#recent-log-list');
  if (!list) return;
  list.innerHTML = logs.map((log) => `<li>${log}</li>`).join('');
}

function renderQuickNav(items) {
  const nav = document.querySelector('#quick-nav');
  if (!nav) return;
  nav.innerHTML = items.map((item) => `
    <button type="button" data-quick-action="${escapeHtml(item.action || 'ready')}">
      ${renderIcon(item.icon, 'small')}
      <span>${item.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.quickAction === 'roster') {
        openMercenaryRoster();
        return;
      }
      if (button.dataset.quickAction === 'squads') {
        openSquadView();
        return;
      }
      if (button.dataset.quickAction === 'missions') {
        openMissionView();
        return;
      }
      if (button.dataset.quickAction === 'battle') {
        openBattleOperationView();
        return;
      }
      if (button.dataset.quickAction === 'infirmary') {
        openInfirmaryView();
        return;
      }
      if (button.dataset.quickAction === 'office') {
        openOfficeView();
        return;
      }
      if (button.dataset.quickAction === 'cases') {
        openCaseView();
        return;
      }
      if (button.dataset.quickAction === 'inventory') {
        openInventoryView();
        return;
      }
      showReadyNotice();
    });
  });
}

function getGradeRank(grade) {
  return { N: 1, R: 2, SR: 3, SSR: 4, EX: 5 }[grade] || 0;
}

function getGradeClass(grade) {
  return `grade-${String(grade || 'N').toLowerCase()}`;
}

function getMercenaryImagePath(mercenary) {
  if (!mercenary.imageKey) return '';
  if (mercenary.grade === 'N') {
    return `/assets/mercenary/characters/n_common/${mercenary.imageKey}.png`;
  }
  return `/assets/mercenary/characters/standing/${mercenary.imageKey}.png`;
}

function renderImageWithPlaceholder(mercenary, className) {
  const imagePath = getMercenaryImagePath(mercenary);
  const gradeClass = getGradeClass(mercenary.grade);
  const safeName = escapeHtml(mercenary.name || '용병');

  if (!imagePath) {
    return `
      <div class="${className} merc-image-wrap ${gradeClass} is-missing"></div>
    `;
  }

  return `
    <div class="${className} merc-image-wrap ${gradeClass} has-image">
      <img
        src="${escapeHtml(imagePath)}"
        alt="${safeName}"
        loading="lazy"
        onload="this.classList.add('is-loaded'); this.closest('.merc-image-wrap')?.classList.add('is-loaded');"
        onerror="this.hidden=true; this.closest('.merc-image-wrap')?.classList.add('is-missing');"
      />
    </div>
  `;
}
function renderSelectOptions(root, options, selected) {
  if (!root) return;
  root.innerHTML = options.map((option) => {
    const value = typeof option === 'string' ? option : option.value;
    const label = typeof option === 'string' ? option : option.label;
    return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
}

function setupRosterFilters() {
  renderSelectOptions(document.querySelector('#merc-grade-filter'), ['전체', 'N', 'R', 'SR', 'SSR', 'EX'], rosterState.grade);
  renderSelectOptions(document.querySelector('#merc-position-filter'), ['전체', '전열', '화력', '지원', '특수'], rosterState.position);
  renderSelectOptions(document.querySelector('#merc-status-filter'), ['전체', '대기 중', '임무 중', '부상', '치료 중'], rosterState.status);
  renderSelectOptions(
    document.querySelector('#merc-species-filter'),
    ['전체', ...new Set(ownedMercenaryRoster.map((item) => item.species))].sort((a, b) => a === '전체' ? -1 : b === '전체' ? 1 : a.localeCompare(b, 'ko')),
    rosterState.species
  );
  renderSelectOptions(document.querySelector('#merc-sort-select'), rosterSortOptions, rosterState.sort);
}

function applyMercenaryFilters(items = ownedMercenaryRoster) {
  const query = rosterState.search.trim().toLowerCase();
  return items.filter((item) => {
    if (rosterState.grade !== '전체' && item.grade !== rosterState.grade) return false;
    if (rosterState.position !== '전체' && item.position !== rosterState.position) return false;
    if (rosterState.status !== '전체' && item.status !== rosterState.status) {
      if (rosterState.status === '부상' && TREATABLE_MERCENARY_OPERATIONAL_STATUSES.has(String(item.operationalStatus || ''))) return true;
      return false;
    }
    if (rosterState.species !== '전체' && item.species !== rosterState.species) return false;
    if (!query) return true;
    return [item.name, item.species, item.job, item.role, ...item.tags].some((value) => String(value).toLowerCase().includes(query));
  });
}

function sortMercenaries(items) {
  return [...items].sort((a, b) => {
    if (rosterState.sort === 'level') return b.level - a.level || b.power - a.power;
    if (rosterState.sort === 'grade') return getGradeRank(b.grade) - getGradeRank(a.grade) || b.power - a.power;
    if (rosterState.sort === 'name') return a.name.localeCompare(b.name, 'ko');
    if (rosterState.sort === 'status') return a.status.localeCompare(b.status, 'ko') || b.power - a.power;
    if (rosterState.sort === 'species') return a.species.localeCompare(b.species, 'ko') || b.power - a.power;
    return b.power - a.power;
  });
}

function getFilteredMercenaries() {
  return sortMercenaries(applyMercenaryFilters());
}

function renderMercenaryCard(mercenary) {
  const selected = mercenary.rosterId === rosterState.selectedId ? 'is-selected' : '';
  const unavailable = mercenary.available ? '' : 'is-unavailable';
  const locked = mercenary.isLocked ? 'is-locked' : '';
  return `
    <button class="merc-card ${getGradeClass(mercenary.grade)} ${selected} ${unavailable} ${locked}" type="button" data-merc-id="${escapeHtml(mercenary.rosterId)}" data-owned-id="${escapeHtml(mercenary.ownedId)}" data-master-id="${escapeHtml(mercenary.id)}" data-operational-status="${escapeHtml(mercenary.operationalStatus)}">
      ${renderImageWithPlaceholder(mercenary, 'merc-card-portrait')}
      <span class="merc-card-body">
        <span class="merc-card-name"><em>${escapeHtml(mercenary.grade)}</em> ${escapeHtml(mercenary.name)}</span>
        <span class="merc-card-line">${mercenary.isMaxLevel ? 'Lv.MAX' : `Lv. ${escapeHtml(mercenary.level)} / ${escapeHtml(mercenary.maxLevel)}`}</span>
        <span class="merc-card-exp">${mercenary.isMaxLevel ? 'EXP MAX' : `${formatNumber(mercenary.exp)} / ${formatNumber(mercenary.expToNext)} EXP`}</span>
        <span class="merc-card-expbar"><i style="width: ${Math.round((mercenary.expProgress || 0) * 100)}%"></i></span>
        <span class="merc-card-line">${escapeHtml(mercenary.position)} / ${escapeHtml(mercenary.role)}</span>
        <span class="merc-card-meta">
          <span class="merc-status-badge status-${escapeHtml(mercenary.operationalStatus)}">${escapeHtml(mercenary.statusLabel || mercenary.status)}</span>
          ${mercenary.isLocked ? '<span class="merc-lock-badge">잠금</span>' : ''}
          <strong>전투력 ${formatNumber(mercenary.power)}</strong>
        </span>
      </span>
    </button>
  `;
}

function renderMercenaryList(items) {
  const root = document.querySelector('#mercenary-list');
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<p class="roster-empty">${escapeHtml(rosterState.errorMessage || '보유 중인 용병이 없습니다. 채용 게시판에서 싸구려 계약서를 먼저 찾아보세요.')}</p>`;
  } else {
    root.innerHTML = items.map(renderMercenaryCard).join('');
  }

  root.querySelectorAll('[data-merc-id]').forEach((button) => {
    button.addEventListener('click', () => selectMercenary(button.dataset.mercId));
  });
}

function renderStatGrid(stats) {
  return Object.entries(stats).map(([key, value]) => `
    <div class="merc-stat">
      <span>${escapeHtml(key)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join('');
}

function renderBonusBox(title, text) {
  return `
    <article class="merc-bonus-box">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function warnMissingCombatRule(kind, id) {
  const key = `${kind}:${id}`;
  if (!id || missingCombatRuleWarnings.has(key)) return;
  missingCombatRuleWarnings.add(key);
  console.warn(`[mercenary/combat-rules] missing ${kind}:`, id);
}

function getRuleDisplayName(rule, fallback = '') {
  return String(rule?.displayName || rule?.display_name || fallback || '').trim();
}

function formatCombatRate(value) {
  const numeric = Number(value || 0);
  if (!numeric) return '0%';
  return `${(numeric * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

function renderCombatTagList(tags) {
  const items = normalizeArrayField(tags);
  if (!items.length) return '<span class="is-muted">없음</span>';
  return items.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
}

const DETAIL_STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'tec', 'sup', 'combatPower'];
const DETAIL_STAT_LABELS = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  spd: 'SPD',
  tec: 'TEC',
  sup: 'SUP',
  combatPower: '전투력'
};

function normalizeStatNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getNumberField(source, keys, fallback = 0) {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], source);
    if (value !== undefined && value !== null && value !== '') return normalizeStatNumber(value, fallback);
  }
  return fallback;
}

function buildBaseStats(mercenary) {
  const base = mercenary?.baseStats || {};
  const old = mercenary?.stats || {};
  return {
    hp: getNumberField(mercenary, ['baseStats.hp', 'baseHp', 'hp', 'stats.HP'], normalizeStatNumber(old.HP)),
    atk: getNumberField(mercenary, ['baseStats.atk', 'baseAtk', 'atk', 'attack', 'stats.ATK'], normalizeStatNumber(old.ATK)),
    def: getNumberField(mercenary, ['baseStats.def', 'baseDef', 'def', 'defense', 'stats.DEF'], normalizeStatNumber(old.DEF)),
    spd: getNumberField(mercenary, ['baseStats.spd', 'baseSpd', 'spd', 'speed', 'stats.SPD'], normalizeStatNumber(old.SPD)),
    tec: getNumberField(mercenary, ['baseStats.tec', 'baseTec', 'tec', 'stats.TEC'], normalizeStatNumber(old.TEC)),
    sup: getNumberField(mercenary, ['baseStats.sup', 'baseSup', 'sup', 'support', 'stats.SUP'], normalizeStatNumber(old.SUP)),
    combatPower: getNumberField(mercenary, ['baseStats.combatPower', 'baseCombatPower', 'base_combat_power'], 0)
  };
}

function hasExplicitCurrentStats(mercenary) {
  const base = mercenary?.baseStats || {};
  const effective = mercenary?.effectiveStats || null;
  const hasDistinctEffectiveStats = Boolean(effective) && ['hp', 'atk', 'def', 'spd', 'tec', 'sup'].some((key) => normalizeStatNumber(effective[key]) !== normalizeStatNumber(base[key]));
  return ['currentStats', 'finalStats', 'ownedStats'].some((key) => mercenary?.[key])
    || hasDistinctEffectiveStats
    || ['currentHp', 'maxHp', 'currentAtk', 'currentDef', 'currentSpd', 'currentTec', 'currentSup', 'battlePower'].some((key) => mercenary?.[key] !== undefined);
}

function calculateDetailCombatPower(stats = {}) {
  return Math.round(
    normalizeStatNumber(stats.hp) * 0.25
    + normalizeStatNumber(stats.atk) * 1.2
    + normalizeStatNumber(stats.def) * 1
    + normalizeStatNumber(stats.spd) * 0.8
    + normalizeStatNumber(stats.tec) * 0.8
    + normalizeStatNumber(stats.sup) * 0.6
  );
}

function calculateDetailUnifiedLevelBonus(level) {
  const safeLevel = Math.max(1, normalizeStatNumber(level, 1));
  const levelOffset = Math.max(0, Math.floor(safeLevel) - 1);
  return Object.fromEntries(Object.entries(DETAIL_LEVEL_STAT_GAIN).map(([key, value]) => [key, value * levelOffset]));
}

function addUnifiedLevelBonusToStats(baseStats = {}, level = 1) {
  const levelBonus = calculateDetailUnifiedLevelBonus(level);
  return {
    hp: Math.max(0, Math.round(normalizeStatNumber(baseStats.hp) + normalizeStatNumber(levelBonus.hp))),
    atk: Math.max(0, Math.round(normalizeStatNumber(baseStats.atk) + normalizeStatNumber(levelBonus.atk))),
    def: Math.max(0, Math.round(normalizeStatNumber(baseStats.def) + normalizeStatNumber(levelBonus.def))),
    spd: Math.max(0, Math.round(normalizeStatNumber(baseStats.spd) + normalizeStatNumber(levelBonus.spd))),
    tec: Math.max(0, Math.round(normalizeStatNumber(baseStats.tec) + normalizeStatNumber(levelBonus.tec))),
    sup: Math.max(0, Math.round(normalizeStatNumber(baseStats.sup) + normalizeStatNumber(levelBonus.sup)))
  };
}

function buildCurrentStats(ownedMercenary, masterMercenary = ownedMercenary) {
  const mercenary = ownedMercenary || masterMercenary || {};
  const baseStats = buildBaseStats(masterMercenary || mercenary);
  const explicit = hasExplicitCurrentStats(mercenary);
  if (explicit) {
    return {
      hp: getNumberField(mercenary, ['currentStats.hp', 'finalStats.hp', 'ownedStats.hp', 'currentHp', 'maxHp', 'hp', 'effectiveStats.hp'], baseStats.hp),
      atk: getNumberField(mercenary, ['currentStats.atk', 'finalStats.atk', 'ownedStats.atk', 'currentAtk', 'atk', 'attack', 'effectiveStats.atk'], baseStats.atk),
      def: getNumberField(mercenary, ['currentStats.def', 'finalStats.def', 'ownedStats.def', 'currentDef', 'def', 'defense', 'effectiveStats.def'], baseStats.def),
      spd: getNumberField(mercenary, ['currentStats.spd', 'finalStats.spd', 'ownedStats.spd', 'currentSpd', 'spd', 'speed', 'effectiveStats.spd'], baseStats.spd),
      tec: getNumberField(mercenary, ['currentStats.tec', 'finalStats.tec', 'ownedStats.tec', 'currentTec', 'tec', 'effectiveStats.tec'], baseStats.tec),
      sup: getNumberField(mercenary, ['currentStats.sup', 'finalStats.sup', 'ownedStats.sup', 'currentSup', 'sup', 'support', 'effectiveStats.sup'], baseStats.sup),
      combatPower: getNumberField(mercenary, ['currentStats.combatPower', 'finalStats.combatPower', 'ownedStats.combatPower', 'combatPower', 'battlePower', 'power'], baseStats.combatPower)
    };
  }

  const level = Math.max(1, normalizeStatNumber(mercenary.currentLevel ?? mercenary.level, 1));
  const stats = addUnifiedLevelBonusToStats(baseStats, level);
  stats.combatPower = calculateDetailCombatPower(stats);
  return stats;
}

function makeEmptyStatBlock() {
  return DETAIL_STAT_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function subtractStats(left, right) {
  return DETAIL_STAT_KEYS.reduce((acc, key) => {
    acc[key] = Math.round(normalizeStatNumber(left?.[key]) - normalizeStatNumber(right?.[key]));
    return acc;
  }, {});
}

function buildStatBreakdown(ownedMercenary, masterMercenary = ownedMercenary) {
  const baseStats = buildBaseStats(masterMercenary || ownedMercenary);
  const currentStats = buildCurrentStats(ownedMercenary, masterMercenary);
  const levelBonus = subtractStats(currentStats, baseStats);
  const trainingBonus = makeEmptyStatBlock();
  const equipmentBonus = makeEmptyStatBlock();
  const permanentBonus = makeEmptyStatBlock();
  const previewStats = { ...currentStats };
  return {
    baseStats,
    levelBonus,
    trainingBonus,
    equipmentBonus,
    permanentBonus,
    currentStats,
    previewStats
  };
}

function getDisplayStats(ownedMercenary, masterMercenary = ownedMercenary) {
  return buildStatBreakdown(ownedMercenary, masterMercenary).currentStats;
}

function toTagArray(value) {
  return normalizeArrayField(value);
}

function uniqueCompactTags(tags) {
  return [...new Set(toTagArray(tags).map((tag) => String(tag || '').trim()).filter(Boolean))];
}

function renderLimitedTagChips(tags, limit = 8) {
  const items = uniqueCompactTags(tags);
  if (!items.length) return '<span class="merc-detail-tag-chip is-muted">없음</span>';
  const visible = items.slice(0, limit);
  const hiddenCount = Math.max(0, items.length - visible.length);
  return [
    ...visible.map((tag) => `<span class="merc-detail-tag-chip">${escapeHtml(tag)}</span>`),
    hiddenCount ? `<span class="merc-detail-tag-chip is-more">+${hiddenCount}</span>` : ''
  ].join('');
}

function renderFullTagChips(tags) {
  const items = uniqueCompactTags(tags);
  if (!items.length) return '<span class="merc-detail-tag-chip is-muted">없음</span>';
  return items.map((tag) => `<span class="merc-detail-tag-chip">${escapeHtml(tag)}</span>`).join('');
}

function isRawCombatIdentifierTag(tag) {
  const text = String(tag || '').trim();
  if (!text) return false;
  if (mercenaryCombatRules.attackTypesById.has(text)) return true;
  if (mercenaryCombatRules.skillsById.has(text)) return true;
  if (mercenaryCombatRules.statusEffectsById.has(text)) return true;
  return /^(active|passive|bb|normal|guard|heavy|speed|pierce|ranged|magic|support|elite|shadow|arcane|lightning|precision|command|aegis|frost|venom|curse|dragon|siege|moonlight|rescue|byte|cardboard)_/.test(text);
}

function playerFacingTags(tags) {
  return uniqueCompactTags(tags).filter((tag) => !isRawCombatIdentifierTag(tag));
}

function formatEffectType(effectType) {
  return {
    damage: '피해',
    damage_pierce: '관통 피해',
    damage_magic: '마법 피해',
    heal: '회복',
    heal_shield: '회복/보호막',
    shield: '보호막',
    self_buff: '자기 강화',
    buff: '아군 강화',
    debuff: '약화',
    debuff_damage: '피해/약화',
    shield_counter: '보호/반격',
    hack_damage_debuff: '해킹 피해/약화',
    field_control: '전장 장악',
    stat_modifier: '능력 보정',
    damage_reduce: '피해 감소',
    party_stat_modifier: '파티 강화',
    heal_modifier: '회복 강화',
    debuff_modifier: '약화 보정'
  }[String(effectType || '').trim()] || '전투 효과';
}

function getSkillStatusEffect(skill) {
  return lookupStatusEffect(skill?.statusId || skill?.status_id);
}

function getCombatSchemaDisplay(mercenary) {
  const basicAttackId = String(mercenary.basicAttackId || '').trim();
  const activeSkillId = String(mercenary.activeSkillId || '').trim();
  const passiveSkillId = String(mercenary.passiveSkillId || '').trim();
  const attackRule = mercenaryCombatRules.attackTypesById.get(basicAttackId) || null;
  if (basicAttackId && !attackRule) warnMissingCombatRule('basic_attack', basicAttackId);
  const activeSkill = lookupCombatSkill(activeSkillId);
  const passiveSkill = lookupCombatSkill(passiveSkillId);
  const activeStatus = getSkillStatusEffect(activeSkill);
  const passiveStatus = getSkillStatusEffect(passiveSkill);
  return {
    basicAttackId,
    activeSkillId,
    passiveSkillId,
    attackRule,
    activeSkill,
    passiveSkill,
    activeStatus,
    passiveStatus,
    attackTypeName: mercenary.attackType || attackRule?.attackType || attackRule?.attack_type || '미정의 공격 타입',
    basicAttackName: attackRule ? getRuleDisplayName(attackRule, basicAttackId) : (basicAttackId ? '미정의 기본 공격' : '없음'),
    activeSkillName: activeSkill ? getRuleDisplayName(activeSkill, activeSkillId) : (activeSkillId ? '미정의 액티브' : '없음'),
    passiveSkillName: passiveSkill ? getRuleDisplayName(passiveSkill, passiveSkillId) : (passiveSkillId ? '미정의 패시브' : '없음'),
    statusNames: [activeStatus, passiveStatus].filter(Boolean).map((status) => getRuleDisplayName(status, status.statusId || status.status_id))
  };
}

function renderStatCard(label, value, hint = '') {
  const displayValue = typeof value === 'number' ? formatNumber(value) : String(value ?? '');
  return `
    <article class="merc-detail-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(displayValue)}</strong>
      ${hint ? `<em>${escapeHtml(hint)}</em>` : ''}
    </article>
  `;
}

function renderDetailStatCards(stats, hints = {}) {
  return DETAIL_STAT_KEYS.map((key) => renderStatCard(DETAIL_STAT_LABELS[key], stats[key] || 0, hints[key] || '')).join('');
}

function renderBreakdownRow(label, stats, className = '') {
  return `
    <div class="merc-detail-breakdown-row ${className}">
      <strong>${escapeHtml(label)}</strong>
      ${DETAIL_STAT_KEYS.map((key) => `<span>${escapeHtml(DETAIL_STAT_LABELS[key])} ${escapeHtml(formatNumber(stats?.[key] || 0))}</span>`).join('')}
    </div>
  `;
}

function renderStatBreakdownDetails(breakdown) {
  return `
    <details class="merc-detail-collapsible">
      <summary>능력치 상세 계산</summary>
      <div class="merc-detail-breakdown">
        ${renderBreakdownRow('기준 능력치', breakdown.baseStats)}
        ${renderBreakdownRow('레벨 성장', breakdown.levelBonus)}
        ${renderBreakdownRow('훈련 보정', breakdown.trainingBonus, 'is-muted')}
        ${renderBreakdownRow('장비 보정', breakdown.equipmentBonus, 'is-muted')}
        ${renderBreakdownRow('영구 보정', breakdown.permanentBonus, 'is-muted')}
        ${renderBreakdownRow('현재 최종 능력치', breakdown.currentStats, 'is-current')}
        ${renderBreakdownRow('전투 예상치', breakdown.previewStats, 'is-muted')}
      </div>
    </details>
  `;
}

function renderStatusEffectChip(statusEffect) {
  if (!statusEffect) return '<span class="merc-detail-status-chip is-muted">상태 효과 없음</span>';
  return `<span class="merc-detail-status-chip">${escapeHtml(getRuleDisplayName(statusEffect, statusEffect.statusId || statusEffect.status_id))}</span>`;
}

function renderSkillSummary(title, skill, statusEffect, fallbackName) {
  const skillName = skill ? getRuleDisplayName(skill, fallbackName) : fallbackName;
  const effectLabel = skill ? formatEffectType(skill.effectType || skill.effect_type) : '전투 효과 없음';
  return `
    <article class="merc-detail-skill-card">
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(skillName || '없음')}</strong>
      <p>${escapeHtml(effectLabel)}</p>
      <div>${renderStatusEffectChip(statusEffect)}</div>
    </article>
  `;
}

function renderCombatSummary(mercenary) {
  const display = getCombatSchemaDisplay(mercenary);
  return `
    <section class="detail-section merc-detail-combat-panel">
      <div class="section-row-title">
        <h4>전투 요약</h4>
        <strong>${escapeHtml(mercenary.combatRole || 'unknown')} · ${escapeHtml(mercenary.recommendedSlot || '미지정')}</strong>
      </div>
      <div class="merc-detail-combat-grid">
        <div><span>전투 역할</span><strong>${escapeHtml(mercenary.combatRole || 'unknown')}</strong></div>
        <div><span>추천 배치</span><strong>${escapeHtml(mercenary.recommendedSlot || '미지정')}</strong></div>
        <div><span>공격 타입</span><strong>${escapeHtml(display.attackTypeName)}</strong></div>
        <div><span>기본 공격</span><strong>${escapeHtml(display.basicAttackName)}</strong></div>
        <div><span>액티브</span><strong>${escapeHtml(display.activeSkillName)}</strong></div>
        <div><span>패시브</span><strong>${escapeHtml(display.passiveSkillName)}</strong></div>
        <div class="is-wide"><span>상태 효과</span><strong>${escapeHtml(display.statusNames.length ? display.statusNames.join(' / ') : '상태 효과 없음')}</strong></div>
      </div>
    </section>
  `;
}

function renderSkillDetailPanel(mercenary) {
  const display = getCombatSchemaDisplay(mercenary);
  return `
    <section class="detail-section merc-detail-skill-list">
      <div class="section-row-title">
        <h4>스킬 상세</h4>
        <span>전투 적용 효과</span>
      </div>
      <div class="merc-detail-skill-grid">
        <article class="merc-detail-skill-card">
          <span>기본 공격</span>
          <strong>${escapeHtml(display.basicAttackName)}</strong>
          <p>${escapeHtml(display.attackRule?.description || display.attackRule?.formulaHint || display.attackRule?.formula_hint || '기본 공격 정보가 없습니다.')}</p>
        </article>
        ${renderSkillSummary('액티브 스킬', display.activeSkill, display.activeStatus, display.activeSkillName)}
        ${renderSkillSummary('패시브 스킬', display.passiveSkill, display.passiveStatus, display.passiveSkillName)}
      </div>
    </section>
  `;
}

function renderOperationBonusPanel(mercenary) {
  return `
    <section class="detail-section merc-detail-operation-panel">
      <div class="section-row-title">
        <h4>운영 보정</h4>
        <span>의뢰 · 행정 · 편성</span>
      </div>
      <div class="merc-bonus-grid">
        ${renderBonusBox('의뢰 보너스', mercenary.requestBonus)}
        ${renderBonusBox('행정 보너스', mercenary.adminBonus)}
        ${renderBonusBox('지휘/편성 보너스', mercenary.commandBonus)}
      </div>
    </section>
  `;
}

function renderTagGroupsPanel(mercenary) {
  const allTags = {
    '전투 태그': playerFacingTags(mercenary.combatTags),
    '스킬 태그': playerFacingTags(mercenary.skillTags),
    '운영 태그': playerFacingTags(mercenary.adminTags),
    '편성 태그': playerFacingTags(mercenary.formationTags),
    '일반 태그': playerFacingTags(mercenary.tags)
  };
  return `
    <section class="detail-section merc-detail-tag-group">
      <div class="section-row-title">
        <h4>태그</h4>
        <span>주요 태그만 표시</span>
      </div>
      <div class="merc-detail-tag-grid">
        ${Object.entries(allTags).map(([label, tags]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <p>${renderLimitedTagChips(tags, 8)}</p>
          </div>
        `).join('')}
      </div>
      <details class="merc-detail-collapsible">
        <summary>전체 태그 보기</summary>
        <div class="merc-detail-tag-grid is-full">
          ${Object.entries(allTags).map(([label, tags]) => `
            <div>
              <span>${escapeHtml(label)}</span>
              <p>${renderFullTagChips(tags)}</p>
            </div>
          `).join('')}
        </div>
      </details>
    </section>
  `;
}

function renderDeveloperInfo(mercenary, breakdown) {
  const display = getCombatSchemaDisplay(mercenary);
  return `
    <details class="merc-detail-collapsible merc-detail-dev-info">
      <summary>개발자 정보</summary>
      <div class="merc-detail-dev-grid">
        <div><span>character id</span><code>${escapeHtml(mercenary.id || '')}</code></div>
        <div><span>basicAttackId</span><code>${escapeHtml(display.basicAttackId || '')}</code></div>
        <div><span>activeSkillId</span><code>${escapeHtml(display.activeSkillId || '')}</code></div>
        <div><span>passiveSkillId</span><code>${escapeHtml(display.passiveSkillId || '')}</code></div>
        <div><span>active statusId</span><code>${escapeHtml(display.activeStatus?.statusId || display.activeStatus?.status_id || '')}</code></div>
        <div><span>passive statusId</span><code>${escapeHtml(display.passiveStatus?.statusId || display.passiveStatus?.status_id || '')}</code></div>
        <div class="is-wide"><span>raw combatTags</span><code>${escapeHtml(JSON.stringify(uniqueCompactTags(mercenary.combatTags)))}</code></div>
        <div class="is-wide"><span>raw skillTags</span><code>${escapeHtml(JSON.stringify(uniqueCompactTags(mercenary.skillTags)))}</code></div>
        <div class="is-wide"><span>raw adminTags</span><code>${escapeHtml(JSON.stringify(uniqueCompactTags(mercenary.adminTags)))}</code></div>
        <div class="is-wide"><span>raw formationTags</span><code>${escapeHtml(JSON.stringify(uniqueCompactTags(mercenary.formationTags)))}</code></div>
        <div class="is-wide"><span>baseStats</span><code>${escapeHtml(JSON.stringify(breakdown.baseStats))}</code></div>
      </div>
    </details>
  `;
}

function lookupCombatSkill(skillId) {
  const id = String(skillId || '').trim();
  if (!id) return null;
  const skill = mercenaryCombatRules.skillsById.get(id) || null;
  if (!skill) warnMissingCombatRule('skill', id);
  return skill;
}

function lookupStatusEffect(statusId) {
  const id = String(statusId || '').trim();
  if (!id || id === 'none') return null;
  const status = mercenaryCombatRules.statusEffectsById.get(id) || null;
  if (!status) warnMissingCombatRule('status', id);
  return status;
}

function renderSkillSchemaRow(label, skillId) {
  const skill = lookupCombatSkill(skillId);
  const status = lookupStatusEffect(skill?.statusId || skill?.status_id);
  const skillName = skill ? getRuleDisplayName(skill, skillId) : (skillId ? '미정의 스킬' : '없음');
  const statusName = status ? getRuleDisplayName(status, status.statusId || status.status_id) : '상태 효과 없음';
  return `
    <article class="merc-combat-schema-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(skillName)}</strong>
      <p>${escapeHtml(skill?.effectType || skill?.effect_type || skill?.trigger || skillId || '등록된 스킬이 없습니다.')}</p>
      <em>부여 상태: ${escapeHtml(statusName)}</em>
    </article>
  `;
}

function renderMercenaryCombatSchemaPanel(mercenary) {
  const attackRule = mercenaryCombatRules.attackTypesById.get(String(mercenary.basicAttackId || '').trim()) || null;
  if (mercenary.basicAttackId && !attackRule) warnMissingCombatRule('basic_attack', mercenary.basicAttackId);
  const attackDisplay = attackRule ? getRuleDisplayName(attackRule, mercenary.basicAttackId) : (mercenary.basicAttackId ? '미정의 기본 공격' : '없음');
  const activeSkill = lookupCombatSkill(mercenary.activeSkillId);
  const passiveSkill = lookupCombatSkill(mercenary.passiveSkillId);
  const activeStatus = lookupStatusEffect(activeSkill?.statusId || activeSkill?.status_id);
  const passiveStatus = lookupStatusEffect(passiveSkill?.statusId || passiveSkill?.status_id);
  const statusNames = [activeStatus, passiveStatus]
    .filter(Boolean)
    .map((status) => getRuleDisplayName(status, status.statusId || status.status_id))
    .filter(Boolean);
  const stats = mercenary.baseStats || {};

  return `
    <section class="detail-section merc-combat-schema-panel">
      <div class="section-row-title">
        <h4>전투 정보</h4>
        <strong>${escapeHtml(mercenary.combatRole || 'unknown')} · ${escapeHtml(mercenary.recommendedSlot || '미지정')}</strong>
      </div>
      <div class="merc-combat-schema-grid">
        <article class="merc-combat-schema-card">
          <span>공격</span>
          <strong>${escapeHtml(mercenary.attackType || attackRule?.attackType || attackRule?.attack_type || '미지정')}</strong>
          <p>기본 공격: ${escapeHtml(attackDisplay)}</p>
          <em>${escapeHtml(mercenary.attackFormulaHint || attackRule?.formulaHint || attackRule?.formula_hint || '공식 힌트 없음')}</em>
        </article>
        ${renderSkillSchemaRow('액티브 스킬', mercenary.activeSkillId)}
        ${renderSkillSchemaRow('패시브 스킬', mercenary.passiveSkillId)}
        <article class="merc-combat-schema-card">
          <span>상태 효과</span>
          <strong>${escapeHtml(statusNames.length ? statusNames.join(' / ') : '상태 효과 없음')}</strong>
          <p>스킬 규칙의 status_id lookup 결과입니다.</p>
          <em>계산 적용은 후속 단계</em>
        </article>
      </div>
      <div class="merc-combat-stat-grid">
        ${renderStatGrid({
    HP: formatNumber(stats.hp || mercenary.stats?.HP || 0),
    ATK: formatNumber(stats.atk || mercenary.stats?.ATK || 0),
    DEF: formatNumber(stats.def || mercenary.stats?.DEF || 0),
    SPD: formatNumber(stats.spd || mercenary.stats?.SPD || 0),
    TEC: formatNumber(stats.tec || mercenary.stats?.TEC || 0),
    SUP: formatNumber(stats.sup || mercenary.stats?.SUP || 0),
    '전투력': formatNumber(mercenary.baseCombatPower || mercenary.combatPower || mercenary.power || 0),
    '최대 레벨': mercenary.maxLevel || '-',
    '회피율': formatCombatRate(mercenary.evasionRate),
    '명중률': formatCombatRate(mercenary.accuracyRate),
    '치명률': formatCombatRate(mercenary.critRate),
    '회복력': formatNumber(mercenary.healPower || 0),
    '행정력': formatNumber(mercenary.adminPower || 0)
  })}
      </div>
      <div class="merc-combat-tag-groups">
        <div><span>전투 태그</span><p>${renderCombatTagList(mercenary.combatTags)}</p></div>
        <div><span>스킬 태그</span><p>${renderCombatTagList(mercenary.skillTags)}</p></div>
        <div><span>행정 태그</span><p>${renderCombatTagList(mercenary.adminTags)}</p></div>
        <div><span>편성 태그</span><p>${renderCombatTagList(mercenary.formationTags)}</p></div>
      </div>
    </section>
  `;
}

function renderMercenaryDetail(mercenary) {
  const root = document.querySelector('#mercenary-detail');
  if (!root) return;
  const expPercent = Math.min(100, Math.round((mercenary.expProgress || 0) * 100));
  const breakdown = buildStatBreakdown(mercenary, mercenary);
  const displayStats = getDisplayStats(mercenary, mercenary);
  const detailHints = hasExplicitCurrentStats(mercenary) ? {} : { combatPower: '레벨 성장 반영' };
  root.innerHTML = `
    <div class="detail-heading merc-detail-summary ${getGradeClass(mercenary.grade)}">
      <span class="grade-badge">${escapeHtml(mercenary.grade)}</span>
      <div>
        <h3>${escapeHtml(mercenary.name)}</h3>
        <p>${escapeHtml(mercenary.species)} / ${escapeHtml(mercenary.job)} / ${escapeHtml(mercenary.position)} / ${escapeHtml(mercenary.role)}</p>
      </div>
    </div>

    <div class="detail-meta-grid">
      <div><span>레벨</span><strong>${mercenary.isMaxLevel ? 'Lv.MAX' : `Lv. ${escapeHtml(mercenary.level)} / ${escapeHtml(mercenary.maxLevel)}`}</strong></div>
      <div><span>상태</span><strong>${escapeHtml(mercenary.statusLabel || mercenary.status)}${mercenary.isLocked ? ' · 잠금' : ''}</strong></div>
      <div><span>직군</span><strong>${escapeHtml(mercenary.job)}</strong></div>
      <div><span>역할</span><strong>${escapeHtml(mercenary.role)}</strong></div>
      <div><span>고용 방식</span><strong>${escapeHtml(mercenary.hireMethod)}</strong></div>
      <div><span>계약일</span><strong>${escapeHtml(mercenary.contractDate)}</strong></div>
      <div><span>전투력</span><strong>${formatNumber(displayStats.combatPower || mercenary.power)}</strong></div>
    </div>

    <div class="detail-exp">
      <span>${mercenary.isMaxLevel ? 'EXP MAX' : `EXP ${formatNumber(mercenary.exp)} / ${formatNumber(mercenary.expToNext)}`}</span>
      <div><i style="width: ${expPercent}%"></i></div>
    </div>

    <section class="detail-paper">
      <h4>하자 / 특이사항</h4>
      <p>${escapeHtml(mercenary.flaw)}</p>
    </section>

    <section class="detail-section merc-detail-current-stats">
      <div class="section-row-title">
        <h4>현재 능력치</h4>
        <strong>전투력 ${formatNumber(displayStats.combatPower || mercenary.power)}</strong>
      </div>
      <div class="merc-detail-stat-grid">${renderDetailStatCards(displayStats, detailHints)}</div>
    </section>

    ${renderCombatSummary(mercenary)}
    ${renderSkillDetailPanel(mercenary)}

    <section class="detail-section merc-detail-secondary-stats">
      <div class="section-row-title">
        <h4>세부 수치</h4>
        <span>보유 용병 기준</span>
      </div>
      <div class="merc-detail-stat-grid is-compact">
        ${renderStatCard('최대 레벨', mercenary.maxLevel || '-')}
        ${renderStatCard('회피율', formatCombatRate(mercenary.evasionRate))}
        ${renderStatCard('명중률', formatCombatRate(mercenary.accuracyRate))}
        ${renderStatCard('치명률', formatCombatRate(mercenary.critRate))}
        ${renderStatCard('회복력', mercenary.healPower || 0)}
        ${renderStatCard('행정력', mercenary.adminPower || 0)}
      </div>
    </section>

    ${renderOperationBonusPanel(mercenary)}
    ${renderTagGroupsPanel(mercenary)}
    ${renderStatBreakdownDetails(breakdown)}
    ${renderDeveloperInfo(mercenary, breakdown)}
  `;
}

function renderMercenaryEquipment(mercenary) {
  const slots = normalizeEquipmentSlotMap(mercenary.equipmentSlots || {});
  const ownedId = getOwnedRosterKey(mercenary) || mercenary.ownedId || '';
  return EQUIPMENT_SLOT_ORDER.map((slotKey) => {
    const slot = slots[slotKey];
    const equipment = slot?.equipment || {};
    const item = slot?.item || {};
    const name = slot?.name || equipment.name || item.name || '';
    return `
      <article class="equipment-slot ${slot ? getGradeClass(slot.grade || equipment.grade || mercenary.grade) : 'is-empty'}">
        ${renderIcon(getEquipmentSlotIcon(slotKey), 'small')}
        <div>
          <span>${escapeHtml(getEquipmentSlotLabel(slotKey))}</span>
          <strong>${escapeHtml(name || '\uBE44\uC5B4 \uC788\uC74C')}</strong>
          <em>${slot ? escapeHtml(`${slot.grade || equipment.grade || ''} · ${formatEquipmentSummary(equipment || slot)}`) : '\uC7A5\uBE44 \uC5C6\uC74C'}</em>
        </div>
        ${slot ? `<button type="button" data-mercenary-unequip="${escapeHtml(ownedId)}" data-equipment-slot="${escapeHtml(slotKey)}">\uD574\uC81C</button>` : ''}
      </article>
    `;
  }).join('');
}

function renderMercenaryVisual(mercenary) {
  const root = document.querySelector('#mercenary-visual');
  if (!root) return;
  const locked = Boolean(mercenary.isLocked);
  const busy = !isMercenaryIdleForManagement(mercenary);
  root.innerHTML = `
    <div class="visual-art-panel ${getGradeClass(mercenary.grade)}" data-merc-action="illustration" role="button" tabindex="0" aria-label="일러스트 확대">
      ${renderImageWithPlaceholder(mercenary, 'merc-full-art')}
    </div>
    <div class="equipment-panel">
      <div class="section-row-title">
        <h4>장비</h4>
        <span>4 slots</span>
      </div>
      <div class="equipment-list">${renderMercenaryEquipment(mercenary)}</div>
      <div class="visual-actions mercenary-detail-actions">
        <button type="button" data-merc-action="illustration">일러 확대</button>
        <button type="button" data-merc-action="equipment" ${busy ? 'disabled title="진행 중인 활동이 있어 장비를 변경할 수 없습니다."' : ''}>장비 변경</button>
        <button type="button" data-merc-action="lock">${locked ? '잠금 해제' : '잠금'}</button>
        <button type="button" class="mercenary-action-danger" data-merc-action="dismiss" ${locked || busy ? 'disabled' : ''} title="${locked ? '잠금 상태인 용병은 해고할 수 없습니다.' : busy ? '진행 중인 활동이 있어 해고할 수 없습니다.' : ''}">해고</button>
      </div>
    </div>
  `;
  root.querySelectorAll('[data-merc-action="illustration"]').forEach((button) => {
    button.addEventListener('click', () => openMercenaryIllustrationLightbox(mercenary));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') openMercenaryIllustrationLightbox(mercenary);
    });
  });
  root.querySelector('[data-merc-action="equipment"]')?.addEventListener('click', () => openMercenaryEquipmentManageModal(mercenary));
  root.querySelector('[data-merc-action="lock"]')?.addEventListener('click', () => setMercenaryLockState(mercenary, !locked));
  root.querySelector('[data-merc-action="dismiss"]')?.addEventListener('click', () => openMercenaryDismissModal(mercenary));
  root.querySelectorAll('[data-mercenary-unequip]').forEach((button) => {
    button.addEventListener('click', () => unequipMercenaryEquipmentSlot(button.dataset.mercenaryUnequip, button.dataset.equipmentSlot));
  });
}

function renderRosterError(message) {
  const list = document.querySelector('#mercenary-list');
  const detail = document.querySelector('#mercenary-detail');
  const visual = document.querySelector('#mercenary-visual');
  const count = document.querySelector('#roster-count');
  if (count) count.textContent = '보유 용병 확인 필요';
  if (list) list.innerHTML = `<p class="roster-empty">${escapeHtml(message)}</p>`;
  if (detail) detail.innerHTML = `<p class="roster-empty">${escapeHtml(message)}</p>`;
  if (visual) visual.innerHTML = '<p class="roster-empty">전신 일러 영역이 비어 있습니다.</p>';
}

function renderMercenaryRoster(list = ownedMercenaryRoster, options = {}) {
  const source = options.source || rosterState.source;
  if (source !== 'owned') {
    console.warn('[mercenary/roster] blocked non-owned roster render', source, list?.length);
    renderRosterError('보유 용병 목록이 아닌 데이터가 전달되었습니다.');
    return;
  }
  if (list !== ownedMercenaryRoster) {
    console.warn('[mercenary/roster] ignored external roster list', list?.length);
  }
  console.log('[mercenary/roster] render source:', source);
  console.log('[mercenary/roster] render count:', ownedMercenaryRoster.length);
  console.log('[mercenary/roster] first id:', ownedMercenaryRoster[0]?.rosterId || ownedMercenaryRoster[0]?.id || ownedMercenaryRoster[0]?.mercenaryId);
  const items = getFilteredMercenaries();
  if (!items.some((item) => item.rosterId === rosterState.selectedId) && items[0]) {
    rosterState.selectedId = items[0].rosterId;
  }
  const selected = ownedMercenaryRoster.find((item) => item.rosterId === rosterState.selectedId) || items[0] || ownedMercenaryRoster[0];
  const count = document.querySelector('#roster-count');
  if (count) {
    count.textContent = `보유 용병 ${ownedMercenaryRoster.length}/40 · 표시 ${items.length}명`;
  }
  renderMercenaryList(items);
  if (selected) {
    renderMercenaryDetail(selected);
    renderMercenaryVisual(selected);
  } else {
    const detail = document.querySelector('#mercenary-detail');
    const visual = document.querySelector('#mercenary-visual');
    if (detail) detail.innerHTML = '<p class="roster-empty">선택할 용병이 없습니다.</p>';
    if (visual) visual.innerHTML = '<p class="roster-empty">전신 일러 영역이 비어 있습니다.</p>';
  }
}

function selectMercenary(id) {
  if (!ownedMercenaryRoster.some((item) => item.rosterId === id)) return;
  rosterState.selectedId = id;
  renderMercenaryRoster(ownedMercenaryRoster, { source: 'owned' });
}

function bindRosterControls() {
  const bindings = [
    ['#merc-search-input', 'input', (event) => { rosterState.search = event.target.value; }],
    ['#merc-grade-filter', 'change', (event) => { rosterState.grade = event.target.value; }],
    ['#merc-position-filter', 'change', (event) => { rosterState.position = event.target.value; }],
    ['#merc-status-filter', 'change', (event) => { rosterState.status = event.target.value; }],
    ['#merc-species-filter', 'change', (event) => { rosterState.species = event.target.value; }],
    ['#merc-sort-select', 'change', (event) => { rosterState.sort = event.target.value; }]
  ];

  bindings.forEach(([selector, eventName, update]) => {
    const element = document.querySelector(selector);
    if (!element || element.dataset.bound === 'true') return;
    element.dataset.bound = 'true';
    element.addEventListener(eventName, (event) => {
      update(event);
      renderMercenaryRoster();
    });
  });
}

async function openMercenaryRoster() {
  if (!requireMercenaryAuth()) return;
  const screen = document.querySelector('#mercenary-roster-screen');
  if (!screen) return;
  screen.hidden = false;
  document.body.classList.add('roster-open');
  const list = document.querySelector('#mercenary-list');
  if (list) list.innerHTML = '<p class="roster-empty">보유 용병 목록을 확인하는 중입니다.</p>';
  let loadedFromApi = false;
  try {
    loadedFromApi = await loadOwnedMercenariesFromApi();
  } catch (error) {
    console.warn('[mercenary] owned roster API unavailable', error);
    if (error.status === 401) {
      closeMercenaryRoster();
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      setRosterErrorState('로그인 후 보유 용병 목록을 확인할 수 있습니다.', 'unauthorized');
      setupRosterFilters();
      bindRosterControls();
      renderRosterError(rosterState.errorMessage);
      showReadyNotice('로그인 세션이 없어 보유 용병 목록을 불러오지 못했습니다.');
      return;
    }
    setRosterErrorState('보유 용병 목록을 불러오지 못했습니다.', 'error');
    setupRosterFilters();
    bindRosterControls();
    renderRosterError(rosterState.errorMessage);
    showReadyNotice('보유 용병 API 연결 실패');
    return;
  }
  if (!loadedFromApi) {
    setRosterErrorState('보유 용병 목록을 불러오지 못했습니다.', 'error');
    setupRosterFilters();
    bindRosterControls();
    renderRosterError(rosterState.errorMessage);
    return;
  }
  setupRosterFilters();
  bindRosterControls();
  rosterState.selectedId = getFilteredMercenaries()[0]?.id || ownedMercenaryRoster[0]?.id || '';
  renderMercenaryRoster(ownedMercenaryRoster, { source: 'owned' });
}

function closeMercenaryRoster() {
  document.querySelector('#mercenary-roster-screen')?.setAttribute('hidden', '');
  document.body.classList.remove('roster-open');
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

function pickRecruitCandidate(pool, grade, usedIds, seed) {
  const gradeOrder = grade === 'SR' ? ['SR', 'R', 'N'] : grade === 'R' ? ['R', 'N'] : ['N'];
  for (const targetGrade of gradeOrder) {
    const candidates = pool.filter((item) => item.grade === targetGrade && !usedIds.has(item.id));
    if (candidates.length) {
      return candidates[deterministicNumber(seed, 0, candidates.length - 1, targetGrade)];
    }
  }
  return pool.find((item) => !usedIds.has(item.id)) || null;
}

function getRecruitmentCandidates() {
  if (recruitmentState.serverMode) return recruitmentState.candidates;
  const pool = mercenaryMasterData.filter((item) => ['N', 'R', 'SR'].includes(item.grade));
  const usedIds = new Set();
  const seedBase = `${getTodayKey()}:recruitment:${recruitmentState.refreshIndex}`;
  const candidates = [];

  for (let index = 0; index < RECRUIT_BOARD_SIZE; index += 1) {
    const grade = weightedRecruitGrade(`${seedBase}:grade:${index}`);
    const candidate = pickRecruitCandidate(pool, grade, usedIds, `${seedBase}:pick:${index}`);
    if (candidate) {
      usedIds.add(candidate.id);
      candidates.push(candidate);
    }
  }

  return candidates;
}

function renderRecruitmentFlyer(mercenary, index) {
  const tilt = [-4.2, 2.6, -1.7, 3.4, -2.8][index] || 0;
  const top = [12, -8, 22, -2, 15][index] || 0;
  const x = [0, -10, 6, -7, 9][index] || 0;
  const pinX = [49, 42, 57, 46, 54][index] || 50;
  const tapeClass = index % 2 === 0 ? 'has-pin' : 'has-tape';
  const hired = recruitmentState.hiredCandidateIds.includes(mercenary.id) || mercenary.hired;
  return `
    <article
      class="recruit-flyer ${getGradeClass(mercenary.grade)} ${tapeClass} ${hired ? 'is-hired' : ''}"
      data-recruit-id="${escapeHtml(mercenary.id)}"
      style="--flyer-tilt: ${tilt}deg; --flyer-top: ${top}px; --flyer-x: ${x}px; --pin-x: ${pinX}%"
    >
      <div class="flyer-grade-stamp">${escapeHtml(mercenary.grade)}</div>
      ${renderImageWithPlaceholder(mercenary, 'flyer-portrait')}
      <div class="flyer-copy">
        <h3>${escapeHtml(mercenary.name)}</h3>
        <p class="flyer-meta">${escapeHtml(mercenary.species)} / ${escapeHtml(mercenary.role)} / ${escapeHtml(mercenary.position)}</p>
        <p class="flyer-memo">“${escapeHtml(mercenary.flaw)}”</p>
        <div class="flyer-stats">
          <span>전투력 ${formatNumber(mercenary.power)}</span>
          <strong>영입비 ${formatNumber(getRecruitCost(mercenary))}G</strong>
        </div>
      </div>
      <div class="flyer-actions">
        <button type="button" data-recruit-detail="${escapeHtml(mercenary.id)}">상세</button>
        <button type="button" data-recruit-hire="${escapeHtml(mercenary.id)}" ${hired ? 'disabled' : ''}>${hired ? '계약완료' : '영입'}</button>
      </div>
    </article>
  `;
}

function renderRecruitmentBoard() {
  const list = document.querySelector('#recruitment-flyer-list');
  if (!list) return;
  const candidates = getRecruitmentCandidates();
  recruitmentState.candidates = candidates;
  list.innerHTML = candidates.map(renderRecruitmentFlyer).join('');
  list.querySelectorAll('.recruit-flyer').forEach((flyer) => {
    flyer.addEventListener('click', () => openRecruitDetail(flyer.dataset.recruitId));
  });
  list.querySelectorAll('[data-recruit-detail]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openRecruitDetail(button.dataset.recruitDetail);
    });
  });
  list.querySelectorAll('[data-recruit-hire]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openRecruitConfirm(button.dataset.recruitHire);
    });
  });

  document.querySelector('#recruitment-gold').textContent = `${formatNumber(recruitmentState.gold)}G`;
  document.querySelector('#recruit-owned-gold').textContent = `${formatNumber(recruitmentState.gold)}G`;
  document.querySelector('#recruit-refresh-count').textContent = `${recruitmentState.refreshRemaining}/${recruitmentState.maxRefresh}`;
  document.querySelector('#recruit-refresh-cost').textContent = `${formatNumber(recruitmentState.refreshCost)}G`;
  const refreshButton = document.querySelector('#recruit-refresh-button');
  refreshButton.textContent = recruitmentState.refreshRemaining > 0
    ? `게시판 갱신 · ${formatNumber(recruitmentState.refreshCost)}G`
    : '오늘 갱신 한도 소진';
  refreshButton.disabled = recruitmentState.refreshRemaining <= 0;
  renderRecruitGradeRateBox();
}

function renderRecruitGradeRateBox() {
  const box = document.querySelector('.recruit-rate-box');
  if (!box) return;
  const rates = recruitmentState.gradeRates?.length
    ? recruitmentState.gradeRates
    : RECRUIT_GRADE_RATES;
  box.innerHTML = `
    <h4>등급 등장 확률</h4>
    ${rates.map((item) => `
      <p><span>${escapeHtml(item.grade)}</span><strong>${formatNumber(item.rate)}%</strong></p>
    `).join('')}
  `;
}

async function openRecruitmentBoard() {
  if (!requireMercenaryAuth()) return;
  const screen = document.querySelector('#recruitment-board-screen');
  if (!screen) return;
  screen.hidden = false;
  document.body.classList.add('recruitment-open');
  const list = document.querySelector('#recruitment-flyer-list');
  if (list) list.innerHTML = '<p class="recruit-loading">구직 전단을 확인하는 중입니다.</p>';
  await loadMercenaryMasterData();
  let loadedFromApi = false;
  try {
    loadedFromApi = await loadRecruitBoardFromApi();
  } catch (error) {
    if (error.status === 401) {
      closeRecruitmentBoard();
      mercenaryAuthState.authenticated = false;
      showMercenaryLoginRequiredModal();
      return;
    }
    console.warn('[mercenary] recruit board API unavailable, using local fallback', error);
    showReadyNotice('채용 게시판 API 연결 실패: 임시 게시판을 표시합니다.');
  }
  if (!loadedFromApi) {
    recruitmentState.serverMode = false;
    recruitmentState.gold = mercenaryGold;
    recruitmentState.hiredCandidateIds = [];
    readRecruitmentStorage();
  }
  renderRecruitmentBoard();
}

function closeRecruitmentBoard() {
  document.querySelector('#recruitment-board-screen')?.setAttribute('hidden', '');
  document.body.classList.remove('recruitment-open');
  closeRecruitDetail();
  closeRecruitConfirm();
}

function getRecruitCandidate(id) {
  return recruitmentState.candidates.find((item) => item.id === id) || mercenaryMasterData.find((item) => item.id === id) || null;
}

function renderRecruitMiniStats(mercenary) {
  return Object.entries(mercenary.stats).map(([key, value]) => `
    <div class="recruit-mini-stat"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join('');
}

function renderRecruitTagList(mercenary) {
  return mercenary.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
}

function openRecruitDetail(id) {
  const mercenary = getRecruitCandidate(id);
  if (!mercenary) return;
  const modal = document.querySelector('#recruit-detail-modal');
  const content = document.querySelector('#recruit-detail-content');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="recruit-detail-layout ${getGradeClass(mercenary.grade)}">
      ${renderImageWithPlaceholder(mercenary, 'recruit-detail-portrait')}
      <div class="recruit-detail-body">
        <div class="detail-heading ${getGradeClass(mercenary.grade)}">
          <span class="grade-badge">${escapeHtml(mercenary.grade)}</span>
          <div>
            <h3>${escapeHtml(mercenary.name)}</h3>
            <p>${escapeHtml(mercenary.species)} / ${escapeHtml(mercenary.job)} / ${escapeHtml(mercenary.position)} / ${escapeHtml(mercenary.role)}</p>
          </div>
        </div>
        <p class="recruit-detail-memo">“${escapeHtml(mercenary.flaw)}”</p>
        <div class="recruit-mini-stat-grid">${renderRecruitMiniStats(mercenary)}</div>
        <div class="recruit-detail-facts">
          <div><span>기준 전투력</span><strong>${formatNumber(mercenary.power)}</strong></div>
          <div><span>최대 레벨</span><strong>Lv. ${escapeHtml(mercenary.maxLevel)}</strong></div>
          <div><span>영입비</span><strong>${formatNumber(getRecruitCost(mercenary))}G</strong></div>
        </div>
        <article class="merc-skill-card">
          <strong>${escapeHtml(mercenary.skill.name)}</strong>
          <p>${escapeHtml(mercenary.skill.effect)}</p>
        </article>
        <div class="merc-bonus-grid recruit-bonus-grid">
          ${renderBonusBox('의뢰 보너스', mercenary.requestBonus)}
          ${renderBonusBox('행정 보너스', mercenary.adminBonus)}
          ${renderBonusBox('지휘/편성 보너스', mercenary.commandBonus)}
        </div>
        <div class="merc-tag-list">${renderRecruitTagList(mercenary)}</div>
        <div class="recruit-detail-actions">
          <button type="button" data-recruit-detail-hire="${escapeHtml(mercenary.id)}">영입하기</button>
          <button type="button" data-recruit-detail-close>닫기</button>
        </div>
      </div>
    </div>
  `;

  modal.hidden = false;
  content.querySelector('[data-recruit-detail-hire]')?.addEventListener('click', () => openRecruitConfirm(mercenary.id));
  content.querySelector('[data-recruit-detail-close]')?.addEventListener('click', closeRecruitDetail);
}

function closeRecruitDetail() {
  document.querySelector('#recruit-detail-modal')?.setAttribute('hidden', '');
}

function openRecruitConfirm(id) {
  const mercenary = getRecruitCandidate(id);
  if (!mercenary) return;
  const modal = document.querySelector('#recruit-confirm-modal');
  const title = document.querySelector('#recruit-confirm-title');
  const content = document.querySelector('#recruit-confirm-content');
  const primary = document.querySelector('#recruit-confirm-primary');
  if (!modal || !title || !content || !primary) return;

  recruitmentState.pendingConfirm = { type: 'hire', id: mercenary.id };
  title.textContent = '정말 이 용병을 영입하시겠습니까?';
  content.innerHTML = `
    <dl class="recruit-confirm-list">
      <div><dt>후보</dt><dd>${escapeHtml(mercenary.name)}</dd></div>
      <div><dt>등급</dt><dd>${escapeHtml(mercenary.grade)}</dd></div>
      <div><dt>종족</dt><dd>${escapeHtml(mercenary.species)}</dd></div>
      <div><dt>전투력</dt><dd>${formatNumber(mercenary.power)}</dd></div>
      <div><dt>영입비</dt><dd>${formatNumber(getRecruitCost(mercenary))}G</dd></div>
      <div><dt>보유 골드</dt><dd>${formatNumber(recruitmentState.gold)}G</dd></div>
    </dl>
  `;
  primary.textContent = '계약서에 서명';
  modal.hidden = false;
}

function openRefreshConfirm() {
  if (recruitmentState.refreshRemaining <= 0) return;
  const modal = document.querySelector('#recruit-confirm-modal');
  const title = document.querySelector('#recruit-confirm-title');
  const content = document.querySelector('#recruit-confirm-content');
  const primary = document.querySelector('#recruit-confirm-primary');
  if (!modal || !title || !content || !primary) return;

  recruitmentState.pendingConfirm = { type: 'refresh' };
  title.textContent = `${formatNumber(recruitmentState.refreshCost)}G를 지불하고 게시판을 갱신하시겠습니까?`;
  content.innerHTML = `
    <dl class="recruit-confirm-list">
      <div><dt>갱신 비용</dt><dd>${formatNumber(recruitmentState.refreshCost)}G</dd></div>
      <div><dt>오늘 남은 갱신</dt><dd>${recruitmentState.refreshRemaining}/${recruitmentState.maxRefresh}</dd></div>
      <div><dt>보유 골드</dt><dd>${formatNumber(recruitmentState.gold)}G</dd></div>
      <div><dt>무료 갱신</dt><dd>없음</dd></div>
    </dl>
  `;
  primary.textContent = '유료 갱신';
  modal.hidden = false;
}

function closeRecruitConfirm() {
  document.querySelector('#recruit-confirm-modal')?.setAttribute('hidden', '');
  recruitmentState.pendingConfirm = null;
}

function recruitErrorMessage(error) {
  const code = error?.data?.code || error?.code;
  if (code === 'ALREADY_HIRED') return '오늘 게시판의 이 전단은 이미 계약되었습니다.';
  if (code === 'ALREADY_OWNED') return '이미 보유 중인 고유 용병입니다.';
  if (code === 'CANDIDATE_NOT_FOUND') return '이 후보는 현재 게시판에 없습니다.';
  if (code === 'NOT_ENOUGH_GOLD') return '용병단 골드가 부족합니다.';
  return error?.message || '영입 처리에 실패했습니다.';
}

async function recruitCandidate(candidate, button = null) {
  if (!recruitmentState.serverMode) {
    showReadyNotice(`${candidate.name} 영입 기능은 로그인 API 연결 후 사용할 수 있습니다.`);
    return;
  }
  const actionKey = buildMercenaryActionKey('recruit-hire', { mercenaryId: candidate.id, id: candidate.id });
  const payload = await runLockedMercenaryAction({
    key: actionKey,
    button,
    label: '영입 중...',
    task: () => apiRequest('/api/mercenary/recruit-board/hire', {
      method: 'POST',
      body: JSON.stringify({
        mercenaryId: candidate.id,
        clientRequestId: createClientRequestId('recruit-hire')
      }),
      perfScope: 'mercenary-recruit'
    })
  });
  if (!payload) return;
  applyRecruitBoardPayload(payload);
  renderRecruitmentBoard();
  showReadyNotice(`${candidate.name} 계약이 완료되었습니다. 골드가 차감되었습니다.`);
}

async function handleRecruitConfirmPrimary() {
  const pending = recruitmentState.pendingConfirm;
  if (!pending) return;

  if (pending.type === 'hire') {
    const candidate = getRecruitCandidate(pending.id);
    const primary = document.querySelector('#recruit-confirm-primary');
    try {
      if (candidate) await recruitCandidate(candidate, primary);
      closeRecruitConfirm();
      closeRecruitDetail();
    } catch (error) {
      showReadyNotice(recruitErrorMessage(error));
    }
    return;
  }

  if (pending.type === 'refresh') {
    if (recruitmentState.serverMode) {
      const primary = document.querySelector('#recruit-confirm-primary');
      const actionKey = buildMercenaryActionKey('recruit-refresh', { id: getTodayKey() });
      try {
        const payload = await runLockedMercenaryAction({
          key: actionKey,
          button: primary,
          label: '갱신 중...',
          task: () => apiRequest('/api/mercenary/recruit-board/refresh', {
            method: 'POST',
            body: JSON.stringify({ clientRequestId: createClientRequestId('recruit-refresh') }),
            perfScope: 'mercenary-recruit'
          })
        });
        if (!payload) return;
        applyRecruitBoardPayload(payload);
        closeRecruitConfirm();
        renderRecruitmentBoard();
        showReadyNotice('20,000G를 지불하고 게시판을 새로 붙였습니다.');
      } catch (error) {
        showReadyNotice(recruitErrorMessage(error) || '게시판 갱신에 실패했습니다.');
      }
      return;
    }
    const nextCount = Math.min(RECRUIT_DAILY_REFRESH_LIMIT, recruitmentState.refreshCount + 1);
    recruitmentState.refreshCount = nextCount;
    recruitmentState.refreshIndex = nextCount;
    recruitmentState.refreshRemaining = Math.max(0, RECRUIT_DAILY_REFRESH_LIMIT - nextCount);
    writeRecruitmentStorage(nextCount);
    closeRecruitConfirm();
    renderRecruitmentBoard();
    showReadyNotice('게시판 후보를 새로 붙였습니다. 실제 골드는 차감되지 않았습니다.');
  }
}

function bindRecruitmentBoard() {
  ['#recruitment-close-button', '#recruit-panel-close-button'].forEach((selector) => {
    document.querySelector(selector)?.addEventListener('click', closeRecruitmentBoard);
  });
  document.querySelector('#recruit-refresh-button')?.addEventListener('click', () => {
    openRefreshConfirm();
  });
  document.querySelector('[data-recruit-detail-close]')?.addEventListener('click', closeRecruitDetail);
  document.querySelector('#recruit-confirm-cancel')?.addEventListener('click', closeRecruitConfirm);
  document.querySelector('#recruit-confirm-primary')?.addEventListener('click', handleRecruitConfirmPrimary);
}

function renderLobbyProgress(state) {
  const levelLine = document.querySelector('#level-line');
  const expFill = document.querySelector('#exp-fill');
  const expBar = document.querySelector('.lobby-exp-bar');
  if (!levelLine || !expFill) return;

  const safePercent = Math.max(0, Math.min(100, Number(state.expPercent) || 0));
  const expText = state.isOfficeMaxLevel
    ? 'EXP MAX'
    : `${formatNumber(state.officeExp || 0)} / ${formatNumber(state.officeExpToNext || 0)} EXP`;
  const progressText = state.isOfficeMaxLevel
    ? 'MAX'
    : `다음 레벨까지 ${safePercent}%`;

  levelLine.textContent = `사무소 Lv.${state.isOfficeMaxLevel ? 'MAX' : state.level} · 평판 ${state.reputation} · ${progressText} · ${expText}`;
  expFill.style.width = `${state.isOfficeMaxLevel ? 100 : safePercent}%`;
  expBar?.setAttribute('aria-label', `${progressText} (${expText})`);
}

function officeGrowthFallback() {
  return {
    currentEffects: {
      maxMissionOffers: 3,
      maxActiveRuns: 1,
      maxSquadSlots: 3,
      unlockedRiskLevels: ['낮음']
    },
    nextUnlock: {
      level: 3,
      title: '보통 위험도 의뢰 등장',
      description: '사무소 Lv.3부터 보통 위험도의 의뢰가 게시판에 등장합니다.'
    },
    milestones: [
      { level: 1, title: '기본 사무소 운영', description: '낮음 위험도 의뢰, 동시 파견 1개, 의뢰 게시판 3칸이 열립니다.', unlocked: true }
    ]
  };
}

function renderOfficeGrowthPopover() {
  const content = document.querySelector('#office-growth-content');
  if (!content) return;
  const growth = mercenaryLobbyState.officeGrowth || officeGrowthFallback();
  const effects = growth.currentEffects || {};
  const nextUnlock = growth.nextUnlock || null;
  const milestones = Array.isArray(growth.milestones) ? growth.milestones : [];
  const currentLevel = Number(mercenaryLobbyState.level || 1) || 1;
  const nextLevel = nextUnlock?.level;
  const recruitRates = Array.isArray(effects.recruitRates) ? effects.recruitRates : [];
  const recruitRateText = recruitRates.length
    ? recruitRates.map((item) => `${escapeHtml(item.grade)} ${formatNumber(item.rate)}%`).join(' · ')
    : '';

  content.innerHTML = `
    <section class="office-growth-summary">
      <div>
        <span>현재 사무소 레벨</span>
        <strong>Lv.${formatNumber(currentLevel)} · ${escapeHtml(mercenaryLobbyState.reputation || 'D급')}</strong>
      </div>
      <div>
        <span>현재 적용 효과</span>
        <strong>게시판 ${formatNumber(effects.maxMissionOffers || 0)}칸 · 동시 파견 ${formatNumber(effects.maxActiveRuns || 0)}개 · 편성 슬롯 ${formatNumber(effects.maxSquadSlots || 0)}개</strong>
      </div>
      <div>
        <span>등장 위험도</span>
        <strong>${(effects.unlockedRiskLevels || ['낮음']).map(escapeHtml).join(', ')}</strong>
      </div>
      ${recruitRateText ? `
        <div>
          <span>채용 게시판 확률</span>
          <strong>${recruitRateText}</strong>
        </div>
      ` : ''}
      <div class="office-growth-next">
        <span>다음 해금</span>
        <strong>${nextUnlock ? `Lv.${formatNumber(nextUnlock.level)} ${escapeHtml(nextUnlock.title)}` : '모든 주요 해금 달성'}</strong>
        ${nextUnlock?.description ? `<p>${escapeHtml(nextUnlock.description)}</p>` : ''}
      </div>
    </section>
    <section class="office-growth-list" aria-label="사무소 레벨별 효과">
      ${milestones.map((item) => {
        const itemLevel = Number(item.level || 0) || 0;
        const stateClass = itemLevel <= currentLevel
          ? 'is-unlocked'
          : itemLevel === Number(nextLevel || 0)
            ? 'is-next'
            : 'is-future';
        const stateLabel = stateClass === 'is-unlocked' ? '적용 중' : stateClass === 'is-next' ? '다음 해금' : '잠김';
        return `
          <article class="office-growth-row ${stateClass}">
            <span>Lv.${formatNumber(itemLevel)}</span>
            <div>
              <strong>${escapeHtml(item.title || '해금 효과')}</strong>
              <p>${escapeHtml(item.description || '')}</p>
            </div>
            <em>${stateLabel}</em>
          </article>
        `;
      }).join('')}
    </section>
  `;
}

function openOfficeGrowthPopover() {
  renderOfficeGrowthPopover();
  document.querySelector('#office-growth-popover')?.removeAttribute('hidden');
}

function closeOfficeGrowthPopover() {
  document.querySelector('#office-growth-popover')?.setAttribute('hidden', '');
}

function bindOfficeGrowthPopover() {
  const button = document.querySelector('#office-growth-info-button');
  const closeButton = document.querySelector('#office-growth-close');
  if (button && button.dataset.bound !== 'true') {
    button.dataset.bound = 'true';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const popover = document.querySelector('#office-growth-popover');
      if (popover?.hidden) openOfficeGrowthPopover();
      else closeOfficeGrowthPopover();
    });
  }
  if (closeButton && closeButton.dataset.bound !== 'true') {
    closeButton.dataset.bound = 'true';
    closeButton.addEventListener('click', closeOfficeGrowthPopover);
  }
  if (document.body.dataset.officeGrowthBound !== 'true') {
    document.body.dataset.officeGrowthBound = 'true';
    document.addEventListener('click', (event) => {
      const popover = document.querySelector('#office-growth-popover');
      if (!popover || popover.hidden) return;
      if (popover.contains(event.target) || button?.contains(event.target)) return;
      closeOfficeGrowthPopover();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeOfficeGrowthPopover();
    });
  }
}

function renderLobby(state) {
  document.querySelector('#office-name').textContent = state.officeName;
  renderLobbyProgress(state);
  renderOfficeGrowthPopover();
  document.querySelector('#assistant-panel-title').textContent = state.assistant.name;
  document.querySelector('#assistant-line').textContent = state.assistant.line;

  renderTopActions(state);
  renderStatusPanel(state.summary);
  renderHotspots(state.hotspots);
  renderLogs(state.logs);
  renderQuickNav(state.quickNav);
}

async function initializeMercenaryLobby() {
  bindMercenaryAuthOverlay();
  bindOfficeGrowthPopover();
  bindMercenarySettingsModal();
  bindInventoryView();
  bindOfficeControls();
  bindCaseControls();
  document.querySelector('#battle-board-close')?.addEventListener('click', closeBattleOperationView);
  document.querySelector('#battle-party-editor-close')?.addEventListener('click', closeBattlePartyEditor);
  document.querySelector('#battle-party-new-button')?.addEventListener('click', createBattleParty);
  initMercenaryBgm();
  await Promise.allSettled([
    loadMercenaryMasterData(),
    loadMercenaryCombatRuleData()
  ]);
  renderLobby(mercenaryLobbyState);
  document.querySelector('#roster-close-button')?.addEventListener('click', closeMercenaryRoster);
  bindRecruitmentBoard();
  const authenticated = await checkMercenaryAuth();
  if (authenticated) {
    await hydrateMercenaryOfficeProfile();
  }
}

initializeMercenaryLobby();
