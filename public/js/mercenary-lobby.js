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
  point: '18_point.png'
};

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
    { label: '편성/파견', icon: 'crossedSwords', action: 'squads' },
    { label: '의무실', icon: 'medicalCross', action: 'infirmary' },
    { label: '사무실', icon: 'settings', action: 'office' },
    { label: '사건 파일', icon: 'report', action: 'cases' },
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
    commandBonus: '부상 위험 의뢰 편성 시 생환율 증가',
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
let mercenaryGold = mercenaryLobbyState.gold;
let communityPoints = mercenaryLobbyState.points;

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

const recruitmentState = {
  refreshIndex: 0,
  refreshCount: 0,
  refreshRemaining: 4,
  maxRefresh: 4,
  refreshCost: 20000,
  gold: mercenaryLobbyState.gold,
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

const RECRUIT_BOARD_SIZE = 5;
const RECRUIT_REFRESH_COST = 20000;
const RECRUIT_DAILY_REFRESH_LIMIT = 10;
const SQUAD_SLOT_LIMIT = 3;
const SQUAD_MEMBER_LIMIT = 3;
const RECRUIT_GRADE_RATES = [
  { grade: 'N', rate: 94.9 },
  { grade: 'R', rate: 5.0 },
  { grade: 'SR', rate: 0.1 }
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
    sup: Number(value.sup ?? value.SUP ?? 0) || 0
  };
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
    baseStats: normalizeLowerStats(item.baseStats || item.stats),
    effectiveStats: normalizeLowerStats(item.effectiveStats || item.baseStats || item.stats),
    stats: normalizeStats(item),
    workPower: Number(item.workPower || 0) || 0,
    combatPower: Number(item.combatPower ?? item.power ?? item.baseCombatPower ?? 0) || 0,
    power: Number(item.combatPower ?? item.power ?? item.baseCombatPower ?? 0) || 0,
    skill: splitSkill(combatSkill),
    requestBonus: item.missionBonus || item.requestBonus || '의뢰 보너스 미등록',
    adminBonus: item.adminBonus || '행정 보너스 미등록',
    commandBonus: item.commandBonus || '지휘/편성 보너스 미등록',
    tags: Array.isArray(item.tags) ? item.tags : [],
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
  normalized.equipment = Array.isArray(item.equipment) ? item.equipment : makeDummyEquipment(normalized);
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
  recruitmentState.candidates = (board.candidates || []).map(normalizeMercenaryForRoster);
  return true;
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

function renderSquadOwnedRoster() {
  const roster = document.querySelector('#squad-roster-grid');
  const count = document.querySelector('#squad-roster-count');
  if (!roster) return;
  if (count) count.textContent = `${squadState.owned.length}명`;
  if (!squadState.owned.length) {
    roster.innerHTML = '<p class="squad-empty">아직 보유한 용병이 없습니다. 채용 게시판에서 용병을 영입해 보세요.</p>';
    return;
  }

  const selectedIds = new Set(squadState.draft?.ownedMercenaryIds || []);
  roster.innerHTML = squadState.owned.map((member) => {
    const ownedId = getOwnedRosterKey(member);
    const selected = selectedIds.has(ownedId);
    const unavailable = member.available === false;
    return `
      <article class="squad-roster-card ${getGradeClass(member.grade)} ${selected ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}" data-owned-id="${escapeHtml(ownedId)}">
        <button type="button" class="squad-add-button" data-squad-add="${escapeHtml(ownedId)}" ${selected || unavailable ? 'disabled' : ''}>${selected ? '✓' : '+'}</button>
        <div class="squad-roster-portrait">${renderImageWithPlaceholder(member, 'squad-roster-portrait-img')}</div>
        <div>
          <span class="merc-grade-badge ${getGradeClass(member.grade)}">${escapeHtml(member.grade)}</span>
          <h4>${escapeHtml(member.name)}</h4>
          <p>${member.isMaxLevel ? 'Lv.MAX' : `Lv. ${formatNumber(member.level)} / ${formatNumber(member.maxLevel)}`} · 작업력 ${formatNumber(calculateBaseWorkPower(member))}</p>
          <p><span class="squad-status-badge status-${escapeHtml(member.operationalStatus || 'idle')}">${escapeHtml(member.statusLabel || member.status)}</span>${member.isLocked ? '<span class="squad-lock-mark">잠금</span>' : ''}</p>
          ${selected ? '<em>현재 편성됨</em>' : unavailable ? '<em>사용 불가</em>' : ''}
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

async function saveCurrentSquad() {
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
  const path = squadState.draft.id
    ? `/api/mercenary/squads/${encodeURIComponent(squadState.draft.id)}`
    : '/api/mercenary/squads';
  const method = squadState.draft.id ? 'PATCH' : 'POST';

  try {
    const result = await apiRequest(path, {
      method,
      body: JSON.stringify(payload),
      perfScope: 'mercenary-squads-save'
    });
    updateMercenaryCurrencyDisplay(result);
    await loadSquadData();
    renderSquadView();
    showReadyNotice('편성이 저장되었습니다.');
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '편성 저장에 실패했습니다.');
  }
}

async function deleteCurrentSquad() {
  if (!squadState.draft?.id) {
    showReadyNotice('삭제할 저장 편성이 없습니다.');
    return;
  }
  if (!window.confirm('이 편성을 삭제하시겠습니까?')) return;
  try {
    const result = await apiRequest(`/api/mercenary/squads/${encodeURIComponent(squadState.draft.id)}`, {
      method: 'DELETE',
      perfScope: 'mercenary-squads-delete'
    });
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
    saveButton.addEventListener('click', saveCurrentSquad);
  }
  const renameButton = document.querySelector('#squad-rename-button');
  if (renameButton && renameButton.dataset.bound !== 'true') {
    renameButton.dataset.bound = 'true';
    renameButton.addEventListener('click', renameCurrentSquad);
  }
  const deleteButton = document.querySelector('#squad-delete-button');
  if (deleteButton && deleteButton.dataset.bound !== 'true') {
    deleteButton.dataset.bound = 'true';
    deleteButton.addEventListener('click', deleteCurrentSquad);
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
        <button class="mission-reject-button" type="button" disabled>해금 필요</button>
        <span>잠긴 의뢰는 게시판 재고가 아니므로 시작하거나 거부할 수 없습니다.</span>
      </div>
    ` : `<div class="mission-detail-actions">
      <button class="mission-reject-button" type="button" data-mission-reject="${escapeHtml(mission.offerId)}">의뢰 거부</button>
      <span>거부한 의뢰는 즉시 보충되지 않습니다.</span>
    </div>`}
  `;
  root.querySelector('[data-mission-reject]')?.addEventListener('click', () => rejectSelectedMissionOffer());
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
    button.addEventListener('click', () => claimMissionRun(button.dataset.missionClaim));
  });
}

async function startSelectedMission() {
  const mission = selectedMission();
  const squad = selectedMissionSquad();
  const blockReason = missionStartBlockReason();
  if (blockReason) {
    showReadyNotice(blockReason);
    renderMissionStartState();
    return;
  }
  try {
    const payload = await apiRequest('/api/mercenary/runs/start', {
      method: 'POST',
      body: JSON.stringify({ offerId: mission.offerId, squadId: squad.id }),
      perfScope: 'mercenary-run-start'
    });
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice('의뢰를 시작했습니다. 용병들이 파견 중 상태가 됩니다.');
    await loadMissionData();
    renderMissionView();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '의뢰 시작에 실패했습니다.');
  }
}

async function rejectSelectedMissionOffer() {
  const mission = selectedMission();
  if (!mission?.offerId) {
    showReadyNotice('거부할 의뢰를 선택하세요.');
    return;
  }
  const confirmed = window.confirm('이 의뢰를 거부하시겠습니까? 거부한 의뢰는 게시판에서 사라지고, 새 의뢰는 다음 보충 시간에 들어옵니다.');
  if (!confirmed) return;

  try {
    const payload = await apiRequest('/api/mercenary/mission-offers/reject', {
      method: 'POST',
      body: JSON.stringify({ offerId: mission.offerId }),
      perfScope: 'mercenary-mission-reject'
    });
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

async function claimMissionRun(runId) {
  try {
    const payload = await apiRequest('/api/mercenary/runs/claim', {
      method: 'POST',
      body: JSON.stringify({ runId }),
      perfScope: 'mercenary-run-claim'
    });
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
    <dl class="mission-result-list">
      <div><dt>골드</dt><dd>+${formatNumber(result.gainedGold)}G</dd></div>
      <div><dt>사무소 EXP</dt><dd>+${formatNumber(result.gainedOfficeExp)}</dd></div>
      <div><dt>용병 EXP</dt><dd>+${formatNumber(result.gainedMercenaryExp)}</dd></div>
    </dl>
    <div class="mission-result-members">
      ${(payload.members || []).map((member) => `
        <p><strong>${escapeHtml(member.name)}</strong> Lv.${formatNumber(member.beforeLevel)} → Lv.${formatNumber(member.afterLevel)} · EXP ${formatNumber(member.afterExp)}${member.levelUps ? ` · 레벨업 +${member.levelUps}` : ''}</p>
      `).join('')}
    </div>
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
          <em>상태: 부상</em>
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
    button.addEventListener('click', () => startInfirmaryTreatment(button.dataset.treatmentStart));
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
    button.addEventListener('click', () => claimInfirmaryTreatment(button.dataset.treatmentClaim));
  });
}

async function startInfirmaryTreatment(ownedMercenaryId) {
  try {
    const payload = await apiRequest('/api/mercenary/infirmary/treat/start', {
      method: 'POST',
      body: JSON.stringify({ ownedMercenaryId }),
      perfScope: 'mercenary-treatment-start'
    });
    updateMercenaryCurrencyDisplay(payload);
    infirmaryState.injured = Array.isArray(payload?.injured) ? payload.injured.map(normalizeMercenaryForRoster) : infirmaryState.injured;
    infirmaryState.treating = Array.isArray(payload?.treating) ? payload.treating.map(normalizeInfirmaryTreatment) : infirmaryState.treating;
    renderInfirmaryView();
    showReadyNotice('치료를 시작했습니다. 용병단 골드가 차감되었습니다.');
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '치료 시작에 실패했습니다.');
  }
}

async function claimInfirmaryTreatment(treatmentId) {
  try {
    const payload = await apiRequest('/api/mercenary/infirmary/treat/claim', {
      method: 'POST',
      body: JSON.stringify({ treatmentId }),
      perfScope: 'mercenary-treatment-claim'
    });
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
    button.addEventListener('click', () => unassignOfficeMercenary(button.dataset.officeUnassign));
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
    button.addEventListener('click', () => assignOfficeMercenary(button.dataset.officeAssign));
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

async function assignOfficeMercenary(ownedMercenaryId) {
  const facility = selectedOfficeFacility();
  const slot = (facility?.slots || []).find((item) => !item.assignment);
  if (!facility || !slot) {
    showReadyNotice('빈 사무실 슬롯이 없습니다.');
    return;
  }
  try {
    const payload = await apiRequest('/api/mercenary/office/assign', {
      method: 'POST',
      body: JSON.stringify({ facilityKey: facility.key, slotIndex: slot.slotIndex, ownedMercenaryId }),
      perfScope: 'mercenary-office-assign'
    });
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice('용병을 사무실에 배치했습니다.');
    await loadOfficeData();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사무실 배치에 실패했습니다.');
  }
}

async function unassignOfficeMercenary(assignmentId) {
  if (!assignmentId) return;
  try {
    const payload = await apiRequest('/api/mercenary/office/unassign', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
      perfScope: 'mercenary-office-unassign'
    });
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
  document.querySelector('#case-start-button')?.addEventListener('click', startSelectedCase);
  document.querySelector('#case-step-start-button')?.addEventListener('click', startSelectedCaseStep);
  document.querySelector('#case-step-claim-button')?.addEventListener('click', claimSelectedCaseStep);
  document.querySelector('#case-reward-button')?.addEventListener('click', claimSelectedCaseReward);
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

async function startSelectedCase() {
  const item = selectedCaseSummary();
  if (!item) return;
  try {
    await apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
      perfScope: 'mercenary-case-start'
    });
    showReadyNotice('사건 파일을 시작했습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 시작에 실패했습니다.');
  }
}

async function startSelectedCaseStep() {
  const item = selectedCaseSummary();
  const step = selectedCaseStep();
  if (!item || !step) return;
  if (!caseState.selectedOwnedIds.length) {
    showReadyNotice('파견할 용병을 선택하세요.');
    return;
  }
  try {
    const payload = await apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/steps/${encodeURIComponent(step.stepId)}/start`, {
      method: 'POST',
      body: JSON.stringify({ ownedMercenaryIds: caseState.selectedOwnedIds }),
      perfScope: 'mercenary-case-step-start'
    });
    updateMercenaryCurrencyDisplay(payload);
    caseState.selectedOwnedIds = [];
    showReadyNotice('사건 단계 의뢰를 시작했습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 단계 시작에 실패했습니다.');
  }
}

async function claimSelectedCaseStep() {
  const item = selectedCaseSummary();
  const step = selectedCaseStep();
  if (!item || !step) return;
  try {
    const payload = await apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/steps/${encodeURIComponent(step.stepId)}/claim`, {
      method: 'POST',
      body: JSON.stringify({}),
      perfScope: 'mercenary-case-step-claim'
    });
    updateMercenaryCurrencyDisplay(payload);
    showReadyNotice(payload?.result?.status === 'success' ? '사건 단계 결과를 수령했습니다.' : '사건 단계는 실패했지만 다음 단서로 이어졌습니다.');
    await refreshSelectedCase();
  } catch (error) {
    showReadyNotice(error.data?.message || error.message || '사건 단계 결과 수령에 실패했습니다.');
  }
}

async function claimSelectedCaseReward() {
  const item = selectedCaseSummary();
  if (!item) return;
  try {
    const payload = await apiRequest(`/api/mercenary/cases/${encodeURIComponent(item.caseId)}/reward/claim`, {
      method: 'POST',
      body: JSON.stringify({}),
      perfScope: 'mercenary-case-reward'
    });
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
    startButton.addEventListener('click', startSelectedMission);
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

function renderTopActions(state) {
  const topActions = document.querySelector('#top-actions');
  if (!topActions) return;

  const actions = [
    { title: '골드', label: `${formatNumber(state.gold)}G`, icon: 'coin', showLabel: true },
    { title: '포인트', label: `${formatNumber(state.points)}P`, icon: 'point', showLabel: true },
    { title: '우편', label: state.mailCount ? String(state.mailCount) : '', icon: 'envelope', showLabel: false },
    { title: '알림', label: String(state.alertCount), icon: 'bell', showLabel: false, badge: state.alertCount },
    { title: '설정', label: '', icon: 'settings', showLabel: false }
  ];

  topActions.innerHTML = actions.map((action) => `
    <button class="top-action" type="button" title="${action.title}" aria-label="${action.title}">
      ${renderIcon(action.icon, 'medium')}
      ${action.showLabel ? `<span>${action.label}</span>` : ''}
      ${action.badge ? `<em class="count-badge">${action.badge}</em>` : ''}
    </button>
  `).join('');

  topActions.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', showReadyNotice);
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
  const placeholderHtml = '<div class="merc-image-placeholder" aria-hidden="true"></div>';

  if (!imagePath) {
    return `
      <div class="${className} merc-image-wrap ${gradeClass} is-missing">
        ${placeholderHtml}
      </div>
    `;
  }

  return `
    <div class="${className} merc-image-wrap ${gradeClass} has-image">
      <img
        src="${escapeHtml(imagePath)}"
        alt="${safeName}"
        loading="lazy"
        onload="this.classList.add('is-loaded'); this.closest('.merc-image-wrap')?.classList.add('is-loaded');"
        onerror="this.hidden=true; const wrap=this.closest('.merc-image-wrap'); wrap?.classList.remove('has-image'); wrap?.classList.add('is-missing');"
      />
      ${placeholderHtml}
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
    if (rosterState.status !== '전체' && item.status !== rosterState.status) return false;
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

function renderMercenaryDetail(mercenary) {
  const root = document.querySelector('#mercenary-detail');
  if (!root) return;
  const expPercent = Math.min(100, Math.round((mercenary.expProgress || 0) * 100));
  root.innerHTML = `
    <div class="detail-heading ${getGradeClass(mercenary.grade)}">
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
    </div>

    <div class="detail-exp">
      <span>${mercenary.isMaxLevel ? 'EXP MAX' : `EXP ${formatNumber(mercenary.exp)} / ${formatNumber(mercenary.expToNext)}`}</span>
      <div><i style="width: ${expPercent}%"></i></div>
    </div>

    <section class="detail-paper">
      <h4>하자 / 특이사항</h4>
      <p>${escapeHtml(mercenary.flaw)}</p>
    </section>

    <section class="detail-section">
      <div class="section-row-title">
        <h4>능력치</h4>
        <strong>전투력 ${formatNumber(mercenary.power)}</strong>
      </div>
      <div class="merc-stat-grid">${renderStatGrid(mercenary.stats)}</div>
    </section>

    <section class="detail-section">
      <h4>전투 스킬</h4>
      <article class="merc-skill-card">
        <strong>${escapeHtml(mercenary.skill.name)}</strong>
        <p>${escapeHtml(mercenary.skill.effect)}</p>
      </article>
    </section>

    <div class="merc-bonus-grid">
      ${renderBonusBox('의뢰 보너스', mercenary.requestBonus)}
      ${renderBonusBox('행정 보너스', mercenary.adminBonus)}
      ${renderBonusBox('지휘/편성 보너스', mercenary.commandBonus)}
    </div>

    <div class="merc-tag-list">
      ${mercenary.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
    </div>
  `;
}

function renderMercenaryEquipment(mercenary) {
  return mercenary.equipment.map((item) => `
    <article class="equipment-slot ${getGradeClass(mercenary.grade)}">
      ${renderIcon(item.icon, 'small')}
      <div>
        <span>${escapeHtml(item.slot)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <em>${escapeHtml(item.grade)} · ${escapeHtml(item.effect)}</em>
      </div>
    </article>
  `).join('');
}

function renderMercenaryVisual(mercenary) {
  const root = document.querySelector('#mercenary-visual');
  if (!root) return;
  root.innerHTML = `
    <div class="visual-art-panel ${getGradeClass(mercenary.grade)}">
      ${renderImageWithPlaceholder(mercenary, 'merc-full-art')}
    </div>
    <div class="equipment-panel">
      <div class="section-row-title">
        <h4>장비</h4>
        <span>4 slots</span>
      </div>
      <div class="equipment-list">${renderMercenaryEquipment(mercenary)}</div>
      <div class="visual-actions">
        <button type="button" data-roster-ready>일러 확대</button>
        <button type="button" data-roster-ready>장비 변경</button>
        <button type="button" data-roster-ready>잠금</button>
        <button type="button" data-roster-ready>해고</button>
      </div>
    </div>
  `;
  root.querySelectorAll('[data-roster-ready]').forEach((button) => button.addEventListener('click', showReadyNotice));
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

async function recruitCandidate(candidate) {
  if (!recruitmentState.serverMode) {
    showReadyNotice(`${candidate.name} 영입 기능은 로그인 API 연결 후 사용할 수 있습니다.`);
    return;
  }
  const payload = await apiRequest('/api/mercenary/recruit-board/hire', {
    method: 'POST',
    body: JSON.stringify({ mercenaryId: candidate.id }),
    perfScope: 'mercenary-recruit'
  });
  applyRecruitBoardPayload(payload);
  renderRecruitmentBoard();
  showReadyNotice(`${candidate.name} 계약이 완료되었습니다. 골드가 차감되었습니다.`);
}

async function handleRecruitConfirmPrimary() {
  const pending = recruitmentState.pendingConfirm;
  if (!pending) return;

  if (pending.type === 'hire') {
    const candidate = getRecruitCandidate(pending.id);
    try {
      if (candidate) await recruitCandidate(candidate);
      closeRecruitConfirm();
      closeRecruitDetail();
    } catch (error) {
      showReadyNotice(recruitErrorMessage(error));
    }
    return;
  }

  if (pending.type === 'refresh') {
    if (recruitmentState.serverMode) {
      try {
        const payload = await apiRequest('/api/mercenary/recruit-board/refresh', {
          method: 'POST',
          perfScope: 'mercenary-recruit'
        });
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
  bindOfficeControls();
  bindCaseControls();
  renderLobby(mercenaryLobbyState);
  document.querySelector('#roster-close-button')?.addEventListener('click', closeMercenaryRoster);
  bindRecruitmentBoard();
  const authenticated = await checkMercenaryAuth();
  if (authenticated) {
    await hydrateMercenaryOfficeProfile();
  }
}

initializeMercenaryLobby();
