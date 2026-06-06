const crypto = require('crypto');
const { provider, run } = require('../db');
const { ensurePointAccount, addPointTransaction } = require('./points.service');
const repo = require('../repositories/mercenaries.repo');
const {
  HIRE_CANDIDATE_COUNT,
  HIRE_CANDIDATE_TTL_HOURS,
  HIRE_RARITY_TABLE,
  STAT_RANGES,
  TEMPLATE_POOLS,
  ROLES,
  STAT_KEYS,
  RESCUE_SUBSCRIBE_COSTS,
  MAX_DEPLOY_MERCENARIES,
  MIN_DEPLOY_MERCENARIES,
  ROLE_LABELS,
  STATUS_LABELS,
  isValidRarity,
  isValidPerformanceGrade,
  treatmentCost
} = require('../config/mercenaries.config');
const { formatPoints } = require('../utils/formatNumbers');

function httpError(status, message, code, extra = {}) {
  return Object.assign(new Error(message), { status, code, ...extra });
}

function randomInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = randomInt(1, total);
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value);
  return new Date(text.includes('T') ? text : `${text.replace(' ', 'T')}Z`);
}

function expiresAt() {
  return new Date(Date.now() + HIRE_CANDIDATE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function totalPower(mercenary) {
  return STAT_KEYS.reduce((sum, key) => sum + Number(mercenary[key] || 0), 0) + Number(mercenary.level || 1) * 2;
}

function gradeCost(grade) {
  return STAT_RANGES[grade]?.cost || 0;
}

function publicMercenary(mercenary) {
  if (!mercenary) return null;
  return {
    ...mercenary,
    roleLabel: ROLE_LABELS[mercenary.role] || mercenary.role,
    statusLabel: STATUS_LABELS[mercenary.status] || mercenary.status,
    power: totalPower(mercenary),
    rescueCost: RESCUE_SUBSCRIBE_COSTS[mercenary.performanceGrade] || 0,
    treatmentCost: ['injured', 'hospitalized'].includes(mercenary.status)
      ? treatmentCost({
        level: mercenary.level,
        performanceGrade: mercenary.performanceGrade,
        injuryLevel: mercenary.injuryLevel || 1
      })
      : 0,
    rarityNote: mercenary.rarity === 'EX'
      ? `EX 한정 · 성능 ${mercenary.performanceGrade}`
      : `성능 ${mercenary.performanceGrade}`
  };
}

function publicCandidate(candidate) {
  if (!candidate) return null;
  return {
    ...candidate,
    roleLabel: ROLE_LABELS[candidate.role] || candidate.role,
    formattedHireCost: formatPoints(candidate.hireCost),
    power: totalPower({ ...candidate, level: 1 }),
    rarityNote: candidate.rarity === 'EX'
      ? `EX 한정 · 성능 ${candidate.performanceGrade}`
      : `성능 ${candidate.performanceGrade}`
  };
}

function publicMission(mission) {
  if (!mission) return null;
  return {
    ...mission,
    recommendedRoleLabels: mission.recommendedRoles.map((role) => ROLE_LABELS[role] || role),
    rewardLabel: `${formatPoints(mission.baseRewardMin)} ~ ${formatPoints(mission.baseRewardMax)}`,
    durationLabel: mission.durationSeconds >= 60
      ? `${Math.round(mission.durationSeconds / 60)}분`
      : `${mission.durationSeconds}초`
  };
}

function publicRun(run, missionMap = new Map(), mercenaryMap = new Map()) {
  if (!run) return null;
  const mission = missionMap.get(run.missionCode);
  const mercenaries = run.mercenaryIds.map((id) => mercenaryMap.get(id)).filter(Boolean).map(publicMercenary);
  return {
    ...run,
    mission: mission ? publicMission(mission) : null,
    mercenaries,
    rewardLabel: formatPoints(run.rewardPoints || 0),
    readyToClaim: run.status === 'running' && normalizeDate(run.completesAt)?.getTime() <= Date.now()
  };
}

function validateCandidate(candidate) {
  if (!candidate) throw httpError(404, '고용 후보를 찾을 수 없습니다.', 'candidate_not_found');
  if (candidate.status !== 'available') throw httpError(409, '이미 처리된 고용 후보입니다.', 'candidate_consumed');
  if (normalizeDate(candidate.expiresAt)?.getTime() <= Date.now()) {
    throw httpError(409, '고용 후보 시간이 만료되었습니다.', 'candidate_expired');
  }
  if (!['N', 'R'].includes(candidate.rarity) || !['N', 'R'].includes(candidate.performanceGrade)) {
    throw httpError(409, '일반 고용소 후보는 N/R만 허용됩니다.', 'invalid_hire_candidate');
  }
  if (candidate.isUnique || candidate.limited || candidate.sourceType !== 'hire_shop') {
    throw httpError(409, '일반 고용소 후보 정책과 맞지 않습니다.', 'invalid_hire_candidate');
  }
}

function createProceduralCandidate(userId) {
  const pickedRarity = weightedPick(HIRE_RARITY_TABLE);
  const pool = TEMPLATE_POOLS[pickedRarity.rarity];
  const template = pool[randomInt(0, pool.length - 1)];
  const role = ROLES[randomInt(0, ROLES.length - 1)];
  const range = STAT_RANGES[pickedRarity.performanceGrade];
  const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, randomInt(range.min, range.max)]));
  const roleBoost = {
    attacker: 'attack',
    defender: 'defense',
    supporter: 'support',
    scout: 'luck',
    engineer: 'tech',
    medic: 'support'
  }[role];
  stats[roleBoost] += randomInt(2, 5);
  return {
    userId,
    mercenaryKey: randomId('merc'),
    templateKey: template.templateKey,
    isUnique: false,
    name: template.name,
    rarity: pickedRarity.rarity,
    performanceGrade: pickedRarity.performanceGrade,
    role,
    ...stats,
    hireCost: gradeCost(pickedRarity.performanceGrade),
    illustrationUrl: '',
    sourceType: 'hire_shop',
    seasonKey: '',
    limited: false,
    exclusiveTag: '',
    status: 'available',
    expiresAt: expiresAt()
  };
}

async function listCandidates(userId) {
  await repo.expireOldCandidates(userId);
  let candidates = await repo.listCandidates(userId);
  if (!candidates.length) {
    candidates = await repo.createCandidates(Array.from({ length: HIRE_CANDIDATE_COUNT }, () => createProceduralCandidate(userId)));
  }
  return { items: candidates.map(publicCandidate) };
}

async function hireCandidate(userId, candidateId) {
  const id = Number(candidateId);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, '올바른 후보 ID가 필요합니다.', 'invalid_candidate_id');
  const candidate = await repo.getCandidate(userId, id);
  validateCandidate(candidate);

  let started = false;
  try {
    if (provider === 'sqlite') {
      await run('BEGIN IMMEDIATE TRANSACTION');
      started = true;
    }
    if (candidate.hireCost > 0) {
      await addPointTransaction({
        userId,
        amount: -candidate.hireCost,
        type: 'mercenary_hire',
        reason: `용병 고용: ${candidate.name}`,
        sourcePlatform: 'hub-mercenaries',
        sourceId: String(candidate.id),
        createdBy: userId
      });
    }
    const consumed = await repo.markCandidateHired(candidate.id);
    if (!consumed) throw httpError(409, '이미 처리된 고용 후보입니다.', 'candidate_consumed');
    const mercenary = await repo.createMercenary({
      ownerUserId: userId,
      mercenaryKey: candidate.mercenaryKey,
      templateKey: candidate.templateKey,
      isUnique: false,
      name: candidate.name,
      rarity: candidate.rarity,
      performanceGrade: candidate.performanceGrade,
      role: candidate.role,
      level: 1,
      xp: 0,
      attack: candidate.attack,
      defense: candidate.defense,
      support: candidate.support,
      tech: candidate.tech,
      luck: candidate.luck,
      status: 'idle',
      injuryLevel: 0,
      illustrationUrl: candidate.illustrationUrl,
      sourceType: 'hire_shop',
      seasonKey: '',
      limited: false,
      exclusiveTag: '',
      rescueInsured: false,
      rescuePlan: 'none',
      rescueUntil: null,
      rescueUsedCount: 0
    });
    if (provider === 'sqlite') {
      await run('COMMIT');
      started = false;
    }
    return {
      hired: true,
      mercenary: publicMercenary(mercenary),
      account: await ensurePointAccount(userId)
    };
  } catch (error) {
    if (started) await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function listMercenaries(userId) {
  const items = await repo.listMercenaries(userId);
  return { items: items.map(publicMercenary), summary: buildSummary(items, await repo.listRuns(userId, { status: 'running', limit: 50 })) };
}

function buildSummary(mercenaries, runs = []) {
  return {
    total: mercenaries.length,
    deployed: mercenaries.filter((item) => item.status === 'deployed').length,
    hospitalized: mercenaries.filter((item) => item.status === 'hospitalized').length,
    injured: mercenaries.filter((item) => item.status === 'injured').length,
    dead: mercenaries.filter((item) => item.status === 'dead').length,
    rescueInsured: mercenaries.filter((item) => item.rescueInsured).length,
    runningRuns: runs.filter((item) => item.status === 'running').length,
    claimableRuns: runs.filter((item) => normalizeDate(item.completesAt)?.getTime() <= Date.now()).length,
    totalPower: mercenaries.reduce((sum, item) => sum + totalPower(item), 0)
  };
}

async function overview(userId) {
  const [mercenaries, candidates, missions, runningRuns, history] = await Promise.all([
    repo.listMercenaries(userId),
    listCandidates(userId).then((data) => data.items),
    repo.listMissions(),
    repo.listRuns(userId, { status: 'running', limit: 20 }),
    repo.listRuns(userId, { limit: 10 })
  ]);
  const missionMap = new Map(missions.map((mission) => [mission.code, mission]));
  const mercenaryMap = new Map(mercenaries.map((item) => [item.id, item]));
  return {
    summary: buildSummary(mercenaries, runningRuns),
    mercenaries: mercenaries.map(publicMercenary),
    candidates,
    missions: missions.map(publicMission),
    runningRuns: runningRuns.map((run) => publicRun(run, missionMap, mercenaryMap)),
    history: history.filter((run) => run.status === 'completed').map((run) => publicRun(run, missionMap, mercenaryMap)),
    account: await ensurePointAccount(userId)
  };
}

async function listMissions() {
  const missions = await repo.listMissions();
  return { items: missions.map(publicMission) };
}

function uniqueMercenaryIds(ids) {
  if (!Array.isArray(ids)) throw httpError(400, '투입할 용병 목록이 필요합니다.', 'invalid_mercenary_ids');
  const normalized = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const unique = [...new Set(normalized)];
  if (unique.length !== ids.length) throw httpError(400, '중복된 용병은 투입할 수 없습니다.', 'duplicate_mercenary');
  if (unique.length < MIN_DEPLOY_MERCENARIES || unique.length > MAX_DEPLOY_MERCENARIES) {
    throw httpError(400, '임무에는 용병 1~3명을 투입할 수 있습니다.', 'invalid_party_size');
  }
  return unique;
}

function successRate(mission, mercenaries) {
  const avgPower = mercenaries.reduce((sum, item) => sum + totalPower(item), 0) / Math.max(mercenaries.length, 1);
  const roleMatches = mercenaries.filter((item) => mission.recommendedRoles.includes(item.role)).length;
  const levelBonus = mercenaries.reduce((sum, item) => sum + Number(item.level || 1), 0);
  const gradeBonus = mercenaries.reduce((sum, item) => {
    const bonus = { N: 0, R: 2, SR: 5, SSR: 8 }[item.performanceGrade] || 0;
    return sum + bonus;
  }, 0);
  const difficultyPenalty = { easy: 0, normal: 5, hard: 12, dangerous: 18 }[mission.difficulty] || 0;
  return Math.round(clamp(
    mission.baseSuccessRate + Math.floor(avgPower / 8) + roleMatches * 6 + levelBonus + gradeBonus - difficultyPenalty,
    15,
    95
  ));
}

async function startMission(userId, missionCode, mercenaryIdsInput) {
  const mission = await repo.getMission(missionCode);
  if (!mission) throw httpError(404, '임무를 찾을 수 없습니다.', 'mission_not_found');
  const ids = uniqueMercenaryIds(mercenaryIdsInput);
  const mercenaries = await repo.listMercenariesByIds(userId, ids);
  if (mercenaries.length !== ids.length) throw httpError(403, '다른 유저의 용병은 투입할 수 없습니다.', 'forbidden_mercenary');
  const invalid = mercenaries.find((item) => item.status !== 'idle');
  if (invalid) throw httpError(409, `${invalid.name}은 현재 임무에 투입할 수 없습니다.`, 'mercenary_not_idle');

  const now = new Date();
  const runInput = {
    userId,
    missionCode: mission.code,
    mercenaryIds: ids,
    successRate: successRate(mission, mercenaries),
    startedAt: now.toISOString(),
    completesAt: new Date(now.getTime() + mission.durationSeconds * 1000).toISOString()
  };

  let started = false;
  try {
    if (provider === 'sqlite') {
      await run('BEGIN IMMEDIATE TRANSACTION');
      started = true;
    }
    const created = await repo.createRun(runInput);
    for (const mercenary of mercenaries) {
      await repo.updateMercenary(userId, mercenary.id, { status: 'deployed' });
    }
    if (provider === 'sqlite') {
      await run('COMMIT');
      started = false;
    }
    return { run: publicRun(created, new Map([[mission.code, mission]]), new Map(mercenaries.map((item) => [item.id, { ...item, status: 'deployed' }]))) };
  } catch (error) {
    if (started) await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

function resultByRoll(rate) {
  const roll = randomInt(1, 100);
  if (roll <= Math.max(5, Math.floor(rate * 0.15))) return 'great_success';
  if (roll <= rate) return 'success';
  if (roll <= rate + 20) return 'partial_success';
  if (roll >= 96) return 'disaster';
  return 'fail';
}

function rewardForResult(mission, result) {
  const base = randomInt(mission.baseRewardMin, mission.baseRewardMax);
  if (result === 'great_success') return Math.floor(base * 1.5);
  if (result === 'success') return base;
  if (result === 'partial_success') return Math.floor(base * 0.5);
  return 0;
}

function xpForResult(mission, result) {
  const base = Math.max(10, Math.floor((mission.baseRewardMin + mission.baseRewardMax) / 4));
  if (result === 'great_success') return Math.floor(base * 1.5);
  if (result === 'fail') return Math.floor(base * 0.4);
  if (result === 'disaster') return Math.floor(base * 0.25);
  return base;
}

function injuryChance(mission, result) {
  const extra = { great_success: -3, success: 0, partial_success: 6, fail: 12, disaster: 25 }[result] || 0;
  return clamp(mission.injuryRisk + extra, 0, 95);
}

function deathChance(mission, result) {
  if (mission.deathRisk <= 0) return 0;
  const extra = result === 'disaster' ? Math.max(4, mission.deathRisk * 1.5) : result === 'fail' ? 1 : 0;
  return clamp(Math.floor(mission.deathRisk + extra), 0, 100);
}

function injuryLevelFor(result) {
  if (result === 'disaster') return randomInt(2, 3);
  if (result === 'fail') return randomInt(1, 2);
  return 1;
}

function applyXp(mercenary, xpGained) {
  let level = Number(mercenary.level || 1);
  let xp = Number(mercenary.xp || 0) + xpGained;
  let leveled = false;
  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
    leveled = true;
  }
  return { level, xp, leveled };
}

async function claimRun(userId, runId) {
  const runRow = await repo.getRun(userId, Number(runId));
  if (!runRow) throw httpError(404, '임무 기록을 찾을 수 없습니다.', 'run_not_found');
  if (runRow.status !== 'running') throw httpError(409, '이미 완료 처리된 임무입니다.', 'run_already_completed');
  const readyAt = normalizeDate(runRow.completesAt);
  const now = new Date();
  if (!readyAt || readyAt.getTime() > now.getTime()) {
    throw httpError(409, '아직 임무가 끝나지 않았습니다.', 'run_not_ready', {
      remainingMs: readyAt ? Math.max(0, readyAt.getTime() - now.getTime()) : 0
    });
  }

  const mission = await repo.getMission(runRow.missionCode);
  if (!mission) throw httpError(404, '임무 정보를 찾을 수 없습니다.', 'mission_not_found');
  const mercenaries = await repo.listMercenariesByIds(userId, runRow.mercenaryIds);
  const result = resultByRoll(runRow.successRate);
  const rewardPoints = rewardForResult(mission, result);
  const xpGained = xpForResult(mission, result);
  const injuryResult = {};
  const deathResult = {};
  const rescueResult = {};

  let started = false;
  try {
    if (provider === 'sqlite') {
      await run('BEGIN IMMEDIATE TRANSACTION');
      started = true;
    }
    if (rewardPoints > 0) {
      await addPointTransaction({
        userId,
        amount: rewardPoints,
        type: 'mercenary_mission_reward',
        reason: `용병 임무 보상: ${mission.title}`,
        sourcePlatform: 'hub-mercenaries',
        sourceId: String(runRow.id),
        createdBy: userId
      });
    }

    for (const mercenary of mercenaries) {
      const deathRoll = randomInt(1, 100);
      const dies = deathRoll <= deathChance(mission, result);
      if (dies && mercenary.rescueInsured) {
        rescueResult[mercenary.id] = { status: 'rescued', roll: deathRoll };
        injuryResult[mercenary.id] = { injuryLevel: 3, rescued: true };
        await repo.updateMercenary(userId, mercenary.id, {
          status: 'hospitalized',
          injuryLevel: 3,
          rescueUsedCount: mercenary.rescueUsedCount + 1
        });
        continue;
      }
      if (dies) {
        deathResult[mercenary.id] = { status: 'killed', roll: deathRoll };
        await repo.updateMercenary(userId, mercenary.id, {
          status: 'dead',
          injuryLevel: 0,
          deadAt: now.toISOString()
        });
        continue;
      }

      const hurt = randomInt(1, 100) <= injuryChance(mission, result);
      const xpState = applyXp(mercenary, xpGained);
      if (hurt) {
        const injuryLevel = injuryLevelFor(result);
        injuryResult[mercenary.id] = { injuryLevel, rescued: false };
        await repo.updateMercenary(userId, mercenary.id, {
          status: 'hospitalized',
          injuryLevel,
          level: xpState.level,
          xp: xpState.xp
        });
      } else {
        await repo.updateMercenary(userId, mercenary.id, {
          status: 'idle',
          injuryLevel: 0,
          level: xpState.level,
          xp: xpState.xp
        });
      }
    }

    const completed = await repo.completeRun(userId, runRow.id, {
      result,
      resultData: {
        missionTitle: mission.title,
        successRate: runRow.successRate,
        completedAt: now.toISOString()
      },
      rewardPoints,
      xpGained,
      injuryResult,
      deathResult,
      rescueResult,
      completedAt: now.toISOString()
    });

    if (provider === 'sqlite') {
      await run('COMMIT');
      started = false;
    }

    const updatedMercenaries = await repo.listMercenariesByIds(userId, runRow.mercenaryIds);
    return {
      run: publicRun(completed, new Map([[mission.code, mission]]), new Map(updatedMercenaries.map((item) => [item.id, item]))),
      result,
      rewardPoints,
      formattedReward: formatPoints(rewardPoints),
      xpGained,
      account: await ensurePointAccount(userId)
    };
  } catch (error) {
    if (started) await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function listRuns(userId, status = '') {
  const [runs, mercenaries, missions] = await Promise.all([
    repo.listRuns(userId, { status: status || undefined, limit: 30 }),
    repo.listMercenaries(userId),
    repo.listMissions()
  ]);
  const missionMap = new Map(missions.map((mission) => [mission.code, mission]));
  const mercenaryMap = new Map(mercenaries.map((item) => [item.id, item]));
  return { items: runs.map((run) => publicRun(run, missionMap, mercenaryMap)) };
}

async function listHospital(userId) {
  const mercenaries = (await repo.listMercenaries(userId))
    .filter((item) => ['injured', 'hospitalized'].includes(item.status));
  return { items: mercenaries.map(publicMercenary) };
}

async function treatMercenary(userId, mercenaryId) {
  const mercenary = await repo.getMercenary(userId, Number(mercenaryId));
  if (!mercenary) throw httpError(404, '용병을 찾을 수 없습니다.', 'mercenary_not_found');
  if (mercenary.status === 'dead') throw httpError(409, '전사한 용병은 치료할 수 없습니다.', 'mercenary_dead');
  if (!['injured', 'hospitalized'].includes(mercenary.status)) throw httpError(409, '치료가 필요한 상태가 아닙니다.', 'not_in_hospital');
  const cost = treatmentCost({
    level: mercenary.level,
    performanceGrade: mercenary.performanceGrade,
    injuryLevel: mercenary.injuryLevel || 1
  });
  let started = false;
  try {
    if (provider === 'sqlite') {
      await run('BEGIN IMMEDIATE TRANSACTION');
      started = true;
    }
    if (cost > 0) {
      await addPointTransaction({
        userId,
        amount: -cost,
        type: 'mercenary_treatment',
        reason: `용병 치료: ${mercenary.name}`,
        sourcePlatform: 'hub-mercenaries',
        sourceId: String(mercenary.id),
        createdBy: userId
      });
    }
    const updated = await repo.updateMercenary(userId, mercenary.id, { status: 'idle', injuryLevel: 0 });
    await repo.createTreatment({ userId, mercenaryId: mercenary.id, cost });
    if (provider === 'sqlite') {
      await run('COMMIT');
      started = false;
    }
    return { treated: true, mercenary: publicMercenary(updated), cost, formattedCost: formatPoints(cost), account: await ensurePointAccount(userId) };
  } catch (error) {
    if (started) await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

function assertRescueMutable(mercenary) {
  if (!mercenary) throw httpError(404, '용병을 찾을 수 없습니다.', 'mercenary_not_found');
  if (!['idle', 'injured'].includes(mercenary.status)) {
    throw httpError(409, '응급구조 서비스는 대기/부상 상태에서만 변경할 수 있습니다.', 'invalid_rescue_state');
  }
}

async function subscribeRescue(userId, mercenaryId) {
  const mercenary = await repo.getMercenary(userId, Number(mercenaryId));
  assertRescueMutable(mercenary);
  if (mercenary.rescueInsured) throw httpError(409, '이미 응급구조 서비스에 가입되어 있습니다.', 'already_subscribed');
  const cost = RESCUE_SUBSCRIBE_COSTS[mercenary.performanceGrade] || 0;
  let started = false;
  try {
    if (provider === 'sqlite') {
      await run('BEGIN IMMEDIATE TRANSACTION');
      started = true;
    }
    if (cost > 0) {
      await addPointTransaction({
        userId,
        amount: -cost,
        type: 'mercenary_rescue_subscribe',
        reason: `용병 응급구조 가입: ${mercenary.name}`,
        sourcePlatform: 'hub-mercenaries',
        sourceId: String(mercenary.id),
        createdBy: userId
      });
    }
    const updated = await repo.updateMercenary(userId, mercenary.id, {
      rescueInsured: true,
      rescuePlan: 'basic',
      rescueUntil: null
    });
    if (provider === 'sqlite') {
      await run('COMMIT');
      started = false;
    }
    return { subscribed: true, mercenary: publicMercenary(updated), cost, formattedCost: formatPoints(cost), account: await ensurePointAccount(userId) };
  } catch (error) {
    if (started) await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function cancelRescue(userId, mercenaryId) {
  const mercenary = await repo.getMercenary(userId, Number(mercenaryId));
  assertRescueMutable(mercenary);
  if (!mercenary.rescueInsured) throw httpError(409, '응급구조 서비스에 가입되어 있지 않습니다.', 'not_subscribed');
  const updated = await repo.updateMercenary(userId, mercenary.id, {
    rescueInsured: false,
    rescuePlan: 'none',
    rescueUntil: null
  });
  return { cancelled: true, mercenary: publicMercenary(updated), account: await ensurePointAccount(userId) };
}

module.exports = {
  overview,
  listCandidates,
  hireCandidate,
  listMercenaries,
  listMissions,
  startMission,
  listRuns,
  claimRun,
  listHospital,
  treatMercenary,
  subscribeRescue,
  cancelRescue,
  httpError,
  publicMercenary,
  publicMission,
  isValidRarity,
  isValidPerformanceGrade
};
