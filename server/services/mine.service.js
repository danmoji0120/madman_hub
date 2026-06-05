const { ensurePointAccount, addPointTransaction } = require('./points.service');
const { incrementMission } = require('./dailyMissions.service');
const repo = require('../repositories/mine.repo');
const { formatPoints } = require('../utils/formatNumbers');

const MINE_COOLDOWN_MS = Number(process.env.MINE_DIG_COOLDOWN_MS || 4000);
const TABLE_VERSION = 'mine-v1-blind-softcap';

const MINE_TIERS = [
  {
    maxCount: 20,
    state: '풍부함',
    publicHint: '광맥이 아직 살아 있습니다.',
    table: [
      { code: 'rubble', label: '잡석', weight: 28, min: 0, max: 1 },
      { code: 'low_ore', label: '저순도 광석', weight: 32, min: 1, max: 3 },
      { code: 'common_ore', label: '일반 광맥', weight: 30, min: 3, max: 6 },
      { code: 'great_success', label: '대성공', weight: 8, min: 10, max: 25 },
      { code: 'rare_vein', label: '희귀 광맥', weight: 2, min: 30, max: 80 }
    ]
  },
  {
    maxCount: 50,
    state: '안정적',
    publicHint: '잡석이 섞이기 시작했습니다.',
    table: [
      { code: 'rubble', label: '잡석', weight: 38, min: 0, max: 1 },
      { code: 'low_ore', label: '저순도 광석', weight: 34, min: 1, max: 3 },
      { code: 'common_ore', label: '일반 광맥', weight: 22, min: 3, max: 5 },
      { code: 'great_success', label: '대성공', weight: 5, min: 8, max: 18 },
      { code: 'rare_vein', label: '희귀 광맥', weight: 1, min: 25, max: 60 }
    ]
  },
  {
    maxCount: 100,
    state: '불안정',
    publicHint: '깊은 층에서 불안정한 반응이 감지됩니다.',
    table: [
      { code: 'rubble', label: '잡석', weight: 50, min: 0, max: 1 },
      { code: 'low_ore', label: '저순도 광석', weight: 32, min: 1, max: 2 },
      { code: 'common_ore', label: '일반 광맥', weight: 15, min: 2, max: 4 },
      { code: 'great_success', label: '대성공', weight: 3, min: 6, max: 14 }
    ]
  },
  {
    maxCount: 200,
    state: '깊은 잡석층',
    publicHint: 'BB쨩이 선배의 노동을 관찰 중입니다.',
    table: [
      { code: 'rubble', label: '잡석', weight: 68, min: 0, max: 1 },
      { code: 'low_ore', label: '저순도 광석', weight: 24, min: 1, max: 2 },
      { code: 'common_ore', label: '일반 광맥', weight: 7, min: 2, max: 3 },
      { code: 'great_success', label: '대성공', weight: 1, min: 5, max: 10 }
    ]
  },
  {
    maxCount: Infinity,
    state: '폐쇄구역 심층',
    publicHint: '채굴음만 들리고 광석은 말을 아낍니다.',
    table: [
      { code: 'rubble', label: '잡석', weight: 82, min: 0, max: 1 },
      { code: 'low_ore', label: '저순도 광석', weight: 16, min: 1, max: 1 },
      { code: 'common_ore', label: '일반 광맥', weight: 2, min: 2, max: 3 }
    ]
  }
];

function httpError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

function getKstDayRangeUtc(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const start = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - 1, 15, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function getTier(count) {
  return MINE_TIERS.find((tier) => count <= tier.maxCount) || MINE_TIERS[MINE_TIERS.length - 1];
}

function weightedPick(table) {
  const total = table.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of table) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return table[table.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function publicLog(log) {
  return {
    id: log.id,
    rewardAmount: log.rewardAmount,
    formattedReward: formatPoints(log.rewardAmount),
    resultCode: log.resultCode,
    resultLabel: log.resultLabel,
    mineState: log.mineState,
    createdAt: log.createdAt
  };
}

async function getTodayContext(userId) {
  const range = getKstDayRangeUtc();
  const [logs, latest] = await Promise.all([
    repo.listTodayLogs(userId, range),
    repo.getLatestLog(userId)
  ]);
  const todayEarned = logs.reduce((sum, log) => sum + Number(log.rewardAmount || 0), 0);
  const tier = getTier(logs.length);
  return { range, logs, latest, todayEarned, tier };
}

function cooldownStatus(latest) {
  if (!latest?.createdAt) return { active: false, remainingMs: 0 };
  const raw = String(latest.createdAt);
  const normalized = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
  const elapsed = Date.now() - new Date(normalized).getTime();
  const remainingMs = MINE_COOLDOWN_MS - elapsed;
  return { active: remainingMs > 0, remainingMs: Math.max(0, remainingMs) };
}

async function getMineStatus(userId) {
  const { logs, latest, todayEarned, tier } = await getTodayContext(userId);
  const cooldown = cooldownStatus(latest);
  const account = await ensurePointAccount(userId);
  return {
    mineState: tier.state,
    publicHint: tier.publicHint,
    todayEarned,
    formattedTodayEarned: formatPoints(todayEarned),
    cooldownActive: cooldown.active,
    cooldownRemainingMs: cooldown.remainingMs,
    account,
    recentLogs: logs.slice(-8).reverse().map(publicLog)
  };
}

async function listMineHistory(userId, limit = 20) {
  const logs = await repo.listMineHistory(userId, limit);
  return { items: logs.map(publicLog) };
}

async function digMine(userId) {
  const context = await getTodayContext(userId);
  const cooldown = cooldownStatus(context.latest);
  if (cooldown.active) {
    throw httpError(429, '광맥을 다시 정렬하는 중입니다. 잠시 뒤 다시 시도하세요.', {
      retryAfterMs: cooldown.remainingMs
    });
  }

  const nextCount = context.logs.length + 1;
  const tier = getTier(nextCount);
  const picked = weightedPick(tier.table);
  const rewardAmount = randomInt(picked.min, picked.max);
  const account = rewardAmount > 0
    ? await addPointTransaction({
      userId,
      amount: rewardAmount,
      type: 'mine_dig_reward',
      reason: `격리소 광산 채굴 보상: ${picked.label}`,
      sourcePlatform: 'hub-mine',
      sourceId: `${TABLE_VERSION}:${Date.now()}`,
      createdBy: userId
    })
    : await ensurePointAccount(userId);

  const log = await repo.createMineLog({
    userId,
    rewardAmount,
    resultCode: picked.code,
    resultLabel: picked.label,
    mineState: tier.state,
    metadata: {
      tableVersion: TABLE_VERSION
    }
  });

  await incrementMission(userId, 'mine_dig').catch((error) => {
    console.error('Mine mission progress failed:', error);
  });

  const todayEarned = context.todayEarned + rewardAmount;
  return {
    result: {
      code: picked.code,
      label: picked.label,
      rewardAmount,
      formattedReward: formatPoints(rewardAmount),
      message: rewardAmount > 0
        ? `${picked.label}을 발견했습니다. +${formatPoints(rewardAmount)}`
        : `${picked.label}만 나왔습니다. 포인트는 조용했습니다.`,
      mineState: tier.state,
      publicHint: tier.publicHint,
      todayEarned,
      formattedTodayEarned: formatPoints(todayEarned),
      log: publicLog(log)
    },
    account
  };
}

module.exports = {
  getMineStatus,
  listMineHistory,
  digMine
};
