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
  level: 12,
  reputation: 'D급',
  expPercent: 68,
  gold: 18420,
  points: 12840,
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
    }
  ],
  logs: [
    '[채용] 채용 게시판에 새 후보 6명이 등록되었습니다.',
    '[부상] 방패병 마틸다가 경상 상태로 복귀했습니다.',
    '[보고] 완료 보고서 1건이 접수 데스크에 도착했습니다.'
  ],
  quickNav: [
    { label: '용병 목록', icon: 'group', action: 'roster' },
    { label: '의뢰 목록', icon: 'scroll', action: 'ready' },
    { label: '편성/파견', icon: 'crossedSwords', action: 'ready' },
    { label: '의무실', icon: 'medicalCross', action: 'ready' },
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

const RECRUIT_BOARD_SIZE = 5;
const RECRUIT_REFRESH_COST = 20000;
const RECRUIT_DAILY_REFRESH_LIMIT = 4;
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
  const baseStats = item.baseStats || {};
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

function normalizeMercenaryForRoster(item) {
  const id = String(item.id || '').trim();
  const maxLevel = Number(item.maxLevel || 20) || 20;
  const level = Number(item.level) || deterministicNumber(id, 1, Math.max(1, maxLevel), 'level');
  const nextExp = Number(item.nextExp) || Math.max(100, maxLevel * 40);
  const exp = Number(item.exp) || deterministicNumber(id, 0, Math.max(0, nextExp - 1), 'exp');
  const combatSkill = item.combatSkill || (item.skill ? `${item.skill.name}: ${item.skill.effect}` : '');
  const normalized = {
    id,
    imageKey: String(item.imageKey || item.illustrationFileName || '').replace(/\.png$/i, '').trim(),
    grade: String(item.grade || 'N').trim(),
    name: String(item.name || '이름 없는 용병').trim(),
    species: String(item.species || '미상').trim(),
    job: String(item.job || item.role || '미분류').trim(),
    role: String(item.role || item.job || '미분류').trim(),
    position: String(item.position || '특수').trim(),
    level,
    maxLevel,
    exp,
    nextExp,
    status: item.status || deterministicStatus(id),
    hireMethod: item.obtainMethod || item.hireMethod || '마스터 데이터',
    contractDate: item.contractDate || `2025-${String(deterministicNumber(id, 1, 12, 'month')).padStart(2, '0')}-${String(deterministicNumber(id, 1, 28, 'day')).padStart(2, '0')}`,
    flaw: item.memo || item.flaw || '특이사항 없음',
    stats: normalizeStats(item),
    power: Number(item.baseCombatPower ?? item.power ?? 0) || 0,
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
  if (item.ownedId !== undefined) normalized.ownedId = item.ownedId;
  if (item.locked !== undefined) normalized.locked = Boolean(item.locked);
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
  const nextMercenaryGold = payload.mercenaryGold ?? payload.gold ?? payload.mercenaryProfile?.gold;
  const nextCommunityPoints = payload.communityPoints;
  if (nextMercenaryGold !== undefined && nextMercenaryGold !== null) {
    mercenaryGold = Number(nextMercenaryGold) || 0;
    mercenaryLobbyState.gold = mercenaryGold;
    recruitmentState.gold = mercenaryGold;
  }
  if (nextCommunityPoints !== undefined && nextCommunityPoints !== null) {
    communityPoints = Number(nextCommunityPoints) || 0;
    mercenaryLobbyState.points = communityPoints;
  }
  renderTopActions(mercenaryLobbyState);
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
  return `
    <div class="${className} merc-image-wrap ${getGradeClass(mercenary.grade)}">
      ${imagePath ? `
        <img
          src="${escapeHtml(imagePath)}"
          alt="${escapeHtml(mercenary.name)}"
          loading="lazy"
          onload="this.classList.add('is-loaded'); this.nextElementSibling.hidden=true;"
          onerror="this.hidden=true;"
        />
      ` : ''}
      <div class="merc-image-placeholder" aria-hidden="true"></div>
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
  const selected = mercenary.id === rosterState.selectedId ? 'is-selected' : '';
  return `
    <button class="merc-card ${getGradeClass(mercenary.grade)} ${selected}" type="button" data-merc-id="${escapeHtml(mercenary.id)}">
      ${renderImageWithPlaceholder(mercenary, 'merc-card-portrait')}
      <span class="merc-card-body">
        <span class="merc-card-name"><em>${escapeHtml(mercenary.grade)}</em> ${escapeHtml(mercenary.name)}</span>
        <span class="merc-card-line">Lv. ${escapeHtml(mercenary.level)}</span>
        <span class="merc-card-line">${escapeHtml(mercenary.position)} / ${escapeHtml(mercenary.role)}</span>
        <span class="merc-card-meta">
          <span>${escapeHtml(mercenary.status)}</span>
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
  const expPercent = Math.min(100, Math.round((mercenary.exp / mercenary.nextExp) * 100));
  root.innerHTML = `
    <div class="detail-heading ${getGradeClass(mercenary.grade)}">
      <span class="grade-badge">${escapeHtml(mercenary.grade)}</span>
      <div>
        <h3>${escapeHtml(mercenary.name)}</h3>
        <p>${escapeHtml(mercenary.species)} / ${escapeHtml(mercenary.job)} / ${escapeHtml(mercenary.position)} / ${escapeHtml(mercenary.role)}</p>
      </div>
    </div>

    <div class="detail-meta-grid">
      <div><span>레벨</span><strong>Lv. ${escapeHtml(mercenary.level)} / ${escapeHtml(mercenary.maxLevel)}</strong></div>
      <div><span>상태</span><strong>${escapeHtml(mercenary.status)}</strong></div>
      <div><span>직군</span><strong>${escapeHtml(mercenary.job)}</strong></div>
      <div><span>역할</span><strong>${escapeHtml(mercenary.role)}</strong></div>
      <div><span>고용 방식</span><strong>${escapeHtml(mercenary.hireMethod)}</strong></div>
      <div><span>계약일</span><strong>${escapeHtml(mercenary.contractDate)}</strong></div>
    </div>

    <div class="detail-exp">
      <span>EXP ${formatNumber(mercenary.exp)} / ${formatNumber(mercenary.nextExp)}</span>
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
  console.log('[mercenary/roster] first id:', ownedMercenaryRoster[0]?.id || ownedMercenaryRoster[0]?.mercenaryId);
  const items = getFilteredMercenaries();
  if (!items.some((item) => item.id === rosterState.selectedId) && items[0]) {
    rosterState.selectedId = items[0].id;
  }
  const selected = ownedMercenaryRoster.find((item) => item.id === rosterState.selectedId) || items[0] || ownedMercenaryRoster[0];
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
  if (!ownedMercenaryRoster.some((item) => item.id === id)) return;
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
    console.warn('[mercenary] recruit board API unavailable, using local fallback', error);
    showReadyNotice(error.status === 401 ? '로그인하면 채용 게시판 후보와 골드 차감이 저장됩니다.' : '채용 게시판 API 연결 실패: 임시 게시판을 표시합니다.');
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
      showReadyNotice(error.message || '영입 처리에 실패했습니다.');
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
        showReadyNotice(error.message || '게시판 갱신에 실패했습니다.');
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

function renderLobby(state) {
  document.querySelector('#office-name').textContent = state.officeName;
  document.querySelector('#level-line').textContent = `Lv. ${state.level} · 평판 ${state.reputation} · 다음 등급까지 ${state.expPercent}%`;
  document.querySelector('#exp-fill').style.width = `${state.expPercent}%`;
  document.querySelector('#assistant-panel-title').textContent = state.assistant.name;
  document.querySelector('#assistant-line').textContent = state.assistant.line;

  renderTopActions(state);
  renderStatusPanel(state.summary);
  renderHotspots(state.hotspots);
  renderLogs(state.logs);
  renderQuickNav(state.quickNav);
}

renderLobby(mercenaryLobbyState);
document.querySelector('#roster-close-button')?.addEventListener('click', closeMercenaryRoster);
bindRecruitmentBoard();
