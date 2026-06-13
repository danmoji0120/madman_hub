const fs = require('fs');
const path = require('path');
const { provider, run } = require('../db');
const { ensurePointAccount } = require('./points.service');
const repo = require('../repositories/mercenarySystem.repo');

const MASTER_PATH = path.join(__dirname, '../../public/data/mercenaries.master.json');
const RECRUIT_BOARD_SIZE = 5;
const RECRUIT_REFRESH_COST = 20000;
const RECRUIT_DAILY_REFRESH_LIMIT = 4;
const RECRUIT_GRADE_RATES = [
  { grade: 'N', rate: 94.9 },
  { grade: 'R', rate: 5.0 },
  { grade: 'SR', rate: 0.1 }
];
const MERCENARY_INITIAL_GOLD = Number(process.env.MERCENARY_INITIAL_GOLD ?? 50000) || 0;

let masterCache = null;

function httpError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

function publicMercenaryProfile(profile) {
  return {
    gold: Number(profile?.gold || 0),
    reputation: Number(profile?.reputation || 0),
    rank: profile?.rank || 'D',
    officeLevel: Number(profile?.officeLevel || 1)
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

function pickRecruitCandidate(pool, grade, usedIds, seed) {
  const gradeOrder = grade === 'SR' ? ['SR', 'R', 'N'] : grade === 'R' ? ['R', 'N'] : ['N'];
  for (const targetGrade of gradeOrder) {
    const candidates = pool.filter((item) => item.grade === targetGrade && !usedIds.has(item.id));
    if (candidates.length) return candidates[deterministicNumber(seed, 0, candidates.length - 1, targetGrade)];
  }
  return pool.find((item) => !usedIds.has(item.id)) || null;
}

function generateCandidateIds(userId, boardDate, refreshCount) {
  const pool = readMasterData().filter((item) => ['N', 'R', 'SR'].includes(item.grade));
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

function deterministicInstanceState(mercenaryId, maxLevel) {
  const safeMax = Math.max(1, Number(maxLevel || 20));
  const level = deterministicNumber(mercenaryId, 1, safeMax, 'owned-level');
  const nextExp = Math.max(100, safeMax * 40);
  return {
    level,
    exp: deterministicNumber(mercenaryId, 0, nextExp - 1, 'owned-exp'),
    status: '대기 중'
  };
}

function attachCandidate(master, hiredIds = []) {
  if (!master) return null;
  return {
    ...master,
    recruitCost: getRecruitCost(master),
    hired: hiredIds.includes(master.id)
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
    candidateIds: generateCandidateIds(userId, boardDate, 0),
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
      candidateIds: generateCandidateIds(userId, board.boardDate, nextCount),
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
    throw httpError(400, '현재 게시 중인 후보만 영입할 수 있습니다.', 'invalid_candidate');
  }
  if (board.hiredCandidateIds.includes(mercenaryId)) {
    throw httpError(409, '이미 계약 완료된 후보입니다.', 'candidate_already_hired');
  }

  const mercenary = masterById().get(mercenaryId);
  if (!mercenary || !['N', 'R', 'SR'].includes(mercenary.grade)) {
    throw httpError(404, '영입 가능한 후보를 찾을 수 없습니다.', 'candidate_not_found');
  }

  const hireCost = getRecruitCost(mercenary);
  if (provider === 'sqlite') await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const spent = await spendMercenaryGold(userId, hireCost, `용병 영입: ${mercenary.name}`);
    const instance = deterministicInstanceState(mercenary.id, mercenary.maxLevel);
    const owned = await repo.createUserMercenary({
      userId,
      mercenaryId: mercenary.id,
      level: instance.level,
      exp: instance.exp,
      status: instance.status
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

async function listMyMercenaries(userId) {
  const [ownedRows, profile, communityPoints] = await Promise.all([
    repo.listUserMercenaries(userId),
    getOrCreateMercenaryProfile(userId),
    getCommunityPoints(userId)
  ]);
  const mercenaryProfile = publicMercenaryProfile(profile);
  const lookup = masterById();
  const items = ownedRows.map((row) => {
    const master = lookup.get(row.mercenaryId);
    if (!master) return null;
    return {
      ...master,
      ownedId: row.id,
      level: row.level,
      exp: row.exp,
      status: row.status,
      locked: row.locked,
      contractDate: String(row.hiredAt || '').slice(0, 10),
      hiredAt: row.hiredAt,
      obtainMethod: master.obtainMethod || '채용 게시판'
    };
  }).filter(Boolean);

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
  addMercenaryGold
};
