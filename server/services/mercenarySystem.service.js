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
const SQUAD_SLOT_LIMIT = 3;
const SQUAD_MEMBER_LIMIT = 3;
const ALLOWED_OPERATIONAL_STATUSES = new Set(['idle', 'dispatched', 'injured', 'treating']);
const OPERATIONAL_STATUS_LABELS = {
  idle: '대기 중',
  dispatched: '파견 중',
  injured: '부상',
  treating: '치료 중'
};
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

function getOperationalStatusLabel(status) {
  return OPERATIONAL_STATUS_LABELS[status] || '확인 필요';
}

function normalizeOperationalStatus(status) {
  const normalized = String(status || 'idle').trim();
  return ALLOWED_OPERATIONAL_STATUSES.has(normalized) ? normalized : '';
}

function calculateBaseWorkPower(mercenary) {
  const stats = mercenary?.baseStats || {};
  return Number(stats.tec || 0) + Number(stats.sup || 0) + Number(stats.spd || 0);
}

function buildOwnedMercenaryItem(row, master) {
  if (!row || !master) return null;
  const operationalStatus = normalizeOperationalStatus(row.operationalStatus) || 'idle';
  const statusLabel = getOperationalStatusLabel(operationalStatus);
  const item = {
    ...master,
    ownedId: row.id,
    level: row.level,
    exp: row.exp,
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
  return {
    ...item,
    workPower: calculateBaseWorkPower(item)
  };
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
  calculateBaseWorkPower,
  summarizeSquad,
  listSquads,
  createSquad,
  updateSquad,
  deleteSquad
};
