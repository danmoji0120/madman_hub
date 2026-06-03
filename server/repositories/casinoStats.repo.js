const { provider, get, all, run } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { decoratePublicUsers } = require('./cosmetics.repo');
const { getActiveSeason, getSeasonById } = require('./seasons.repo');
const { formatPoints, formatRankingScore } = require('../utils/formatNumbers');

const PUBLIC_EVENT_TYPES = new Set(['jackpot', 'disaster', 'biggest_win', 'biggest_loss', 'peak_balance', 'drawdown', 'comeback', 'suspicious_loop', 'high_turnover']);
const POINT_LEADERBOARD_CATEGORIES = new Set(['balance_peak', 'drawdown', 'casino_net_profit', 'casino_net_loss', 'biggest_casino_win', 'biggest_casino_loss', 'blackjack_profit']);
const PERCENT_LEADERBOARD_CATEGORIES = new Set(['drawdown_rate', 'point_turnover']);
const COUNT_LEADERBOARD_CATEGORIES = new Set(['russian_cashout_count']);

function client() {
  return getSupabaseAdminClient();
}

function assertData(result) {
  if (result.error) throw result.error;
  return result.data;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizePeak(row) {
  if (!row) return null;
  return {
    ...row,
    seasonId: row.season_id,
    userId: row.user_id,
    peakBalance: Number(row.peak_balance || 0),
    peakRecordedAt: row.peak_recorded_at,
    currentBalanceSnapshot: Number(row.current_balance_snapshot || 0),
    drawdown: Number(row.drawdown || 0),
    drawdownRate: Number(row.drawdown_rate || 0),
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

function normalizeStat(row) {
  if (!row) return null;
  return {
    ...row,
    seasonId: row.season_id,
    userId: row.user_id,
    gameKey: row.game_key,
    plays: Number(row.plays || 0),
    totalBet: Number(row.total_bet || 0),
    totalPayout: Number(row.total_payout || 0),
    netProfit: Number(row.net_profit || 0),
    biggestWin: Number(row.biggest_win || 0),
    biggestLoss: Number(row.biggest_loss || 0),
    lastPlayedAt: row.last_played_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

function eventMessage(event) {
  const name = event.nickname || event.displayName || `User ${event.userId}`;
  const game = event.gameKey || 'casino';
  const amount = formatPoints(event.amount);
  const messages = {
    jackpot: `${name}님이 ${game}에서 ${amount}를 벌었습니다. 아직은 운이 편입니다.`,
    disaster: `${name}님이 ${game}에서 ${amount}를 잃었습니다. 딜러가 박수를 치고 있습니다.`,
    biggest_win: `${name}님이 단일 최대 승리 ${amount}를 기록했습니다.`,
    biggest_loss: `${name}님이 단일 최대 손실 ${amount}를 기록했습니다.`,
    peak_balance: `${name}님이 시즌 최고점 ${amount}를 기록했습니다.`,
    drawdown: `${name}님이 최고점에서 ${amount} 추락했습니다. 돈은 머무르지 않았습니다.`,
    suspicious_loop: `${name}님이 러시안 룰렛 2발 캐시아웃을 반복 중입니다. BB쨩이 지켜보고 있어요.`,
    high_turnover: `${name}님이 포인트 회전율 ${event.metadata?.formattedTurnover || ''}를 기록했습니다. 지갑이 통과 지점이네요.`
  };
  return messages[event.eventType] || `${name}님의 카지노 사건이 기록되었습니다.`;
}

function normalizeEvent(row) {
  const metadata = parseJson(row.metadata_json);
  const event = {
    ...row,
    seasonId: row.season_id,
    userId: row.user_id,
    eventType: row.event_type,
    event_type: row.event_type,
    gameKey: row.game_key,
    game_key: row.game_key,
    amount: Number(row.amount || 0),
    formattedAmount: formatPoints(row.amount || 0),
    balanceBefore: row.balance_before,
    balanceAfter: row.balance_after,
    metadata,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at
  };
  event.message = eventMessage(event);
  return event;
}

async function getSeason(seasonId = null) {
  return seasonId ? getSeasonById(Number(seasonId)) : getActiveSeason();
}

async function getPointAccount(userId) {
  if (provider === 'supabase') {
    return assertData(await client().from('point_accounts').select('*').eq('user_id', userId).maybeSingle());
  }
  return get('SELECT * FROM point_accounts WHERE user_id = ?', [userId]);
}

async function getPointTotals(season, userId = null) {
  const totals = new Map();
  const add = (row) => {
    if (!totals.has(row.user_id)) totals.set(row.user_id, { earned: 0, spent: 0 });
    const item = totals.get(row.user_id);
    const amount = Number(row.amount || 0);
    if (amount > 0) item.earned += amount;
    if (amount < 0) item.spent += Math.abs(amount);
  };
  if (provider === 'supabase') {
    let query = client().from('point_transactions').select('user_id,amount')
      .gte('created_at', season.starts_at).lt('created_at', season.ends_at);
    if (userId) query = query.eq('user_id', userId);
    (assertData(await query) || []).forEach(add);
  } else {
    const params = [season.starts_at, season.ends_at];
    const filter = userId ? ' AND user_id = ?' : '';
    if (userId) params.push(userId);
    (await all(
      `SELECT user_id, amount FROM point_transactions
       WHERE DATETIME(created_at) >= DATETIME(?) AND DATETIME(created_at) < DATETIME(?)${filter}`,
      params
    )).forEach(add);
  }
  return totals;
}

async function getPeakRow(seasonId, userId) {
  if (provider === 'supabase') {
    return normalizePeak(assertData(await client().from('season_user_point_peaks').select('*')
      .eq('season_id', seasonId).eq('user_id', userId).maybeSingle()));
  }
  return normalizePeak(await get('SELECT * FROM season_user_point_peaks WHERE season_id = ? AND user_id = ?', [seasonId, userId]));
}

async function updateSeasonPointPeak(userId, account = null, season = null) {
  const activeSeason = season || await getActiveSeason();
  if (!activeSeason) return null;
  const currentAccount = account || await getPointAccount(userId);
  if (!currentAccount) return null;
  const currentBalance = Number(currentAccount.balance || 0);
  const previous = await getPeakRow(activeSeason.id, userId);
  const peakBalance = Math.max(Number(previous?.peakBalance || 0), currentBalance);
  const isNewPeak = !previous || currentBalance > Number(previous.peakBalance || 0);
  const drawdown = Math.max(0, peakBalance - currentBalance);
  const drawdownRate = peakBalance > 0 ? drawdown / peakBalance : 0;
  const peakRecordedAt = isNewPeak ? new Date().toISOString() : previous?.peakRecordedAt || null;

  if (provider === 'supabase') {
    assertData(await client().from('season_user_point_peaks').upsert({
      season_id: activeSeason.id,
      user_id: userId,
      peak_balance: peakBalance,
      peak_recorded_at: peakRecordedAt,
      current_balance_snapshot: currentBalance,
      drawdown,
      drawdown_rate: drawdownRate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'season_id,user_id' }));
  } else {
    await run(
      `INSERT INTO season_user_point_peaks
       (season_id, user_id, peak_balance, peak_recorded_at, current_balance_snapshot, drawdown, drawdown_rate, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(season_id, user_id) DO UPDATE SET
         peak_balance = excluded.peak_balance,
         peak_recorded_at = excluded.peak_recorded_at,
         current_balance_snapshot = excluded.current_balance_snapshot,
         drawdown = excluded.drawdown,
         drawdown_rate = excluded.drawdown_rate,
         updated_at = CURRENT_TIMESTAMP`,
      [activeSeason.id, userId, peakBalance, peakRecordedAt, currentBalance, drawdown, drawdownRate]
    );
  }
  const peak = await getPeakRow(activeSeason.id, userId);
  return { peak, isNewPeak };
}

async function getCasinoStatsRow(seasonId, userId, gameKey) {
  if (provider === 'supabase') {
    return normalizeStat(assertData(await client().from('casino_user_stats').select('*')
      .eq('season_id', seasonId).eq('user_id', userId).eq('game_key', gameKey).maybeSingle()));
  }
  return normalizeStat(await get(
    'SELECT * FROM casino_user_stats WHERE season_id = ? AND user_id = ? AND game_key = ?',
    [seasonId, userId, gameKey]
  ));
}

async function upsertCasinoUserStats({ season, gameResult }) {
  const previous = await getCasinoStatsRow(season.id, gameResult.userId, gameResult.gameCode);
  const net = Number(gameResult.netAmount || 0);
  const next = {
    season_id: season.id,
    user_id: gameResult.userId,
    game_key: gameResult.gameCode,
    plays: Number(previous?.plays || 0) + 1,
    total_bet: Number(previous?.totalBet || 0) + Number(gameResult.betAmount || 0),
    total_payout: Number(previous?.totalPayout || 0) + Number(gameResult.payoutAmount || 0),
    net_profit: Number(previous?.netProfit || 0) + net,
    biggest_win: Math.max(Number(previous?.biggestWin || 0), net > 0 ? net : 0),
    biggest_loss: Math.max(Number(previous?.biggestLoss || 0), net < 0 ? Math.abs(net) : 0),
    last_played_at: gameResult.createdAt || new Date().toISOString()
  };
  if (provider === 'supabase') {
    assertData(await client().from('casino_user_stats').upsert({
      ...next,
      updated_at: new Date().toISOString()
    }, { onConflict: 'season_id,user_id,game_key' }));
  } else {
    await run(
      `INSERT INTO casino_user_stats
       (season_id, user_id, game_key, plays, total_bet, total_payout, net_profit, biggest_win, biggest_loss, last_played_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(season_id, user_id, game_key) DO UPDATE SET
         plays = excluded.plays,
         total_bet = excluded.total_bet,
         total_payout = excluded.total_payout,
         net_profit = excluded.net_profit,
         biggest_win = excluded.biggest_win,
         biggest_loss = excluded.biggest_loss,
         last_played_at = excluded.last_played_at,
         updated_at = CURRENT_TIMESTAMP`,
      [next.season_id, next.user_id, next.game_key, next.plays, next.total_bet, next.total_payout, next.net_profit, next.biggest_win, next.biggest_loss, next.last_played_at]
    );
  }
  return { previous, current: await getCasinoStatsRow(season.id, gameResult.userId, gameResult.gameCode) };
}

async function recentSimilarEvent({ seasonId, userId, eventType, gameKey, minutes = 60 }) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  if (provider === 'supabase') {
    let query = client().from('casino_events').select('id').eq('season_id', seasonId).eq('user_id', userId)
      .eq('event_type', eventType).gte('created_at', since).limit(1);
    if (gameKey) query = query.eq('game_key', gameKey);
    const rows = assertData(await query);
    return Boolean(rows?.length);
  }
  const row = await get(
    `SELECT id FROM casino_events
     WHERE season_id = ? AND user_id = ? AND event_type = ? AND (? IS NULL OR game_key = ?)
       AND DATETIME(created_at) >= DATETIME(?)
     LIMIT 1`,
    [seasonId, userId, eventType, gameKey || null, gameKey || null, since]
  );
  return Boolean(row);
}

async function createCasinoEvent({ seasonId, userId, eventType, gameKey = null, amount = 0, balanceBefore = null, balanceAfter = null, metadata = {}, isPublic = true, dedupeMinutes = 60 }) {
  if (!PUBLIC_EVENT_TYPES.has(eventType)) return null;
  if (dedupeMinutes && await recentSimilarEvent({ seasonId, userId, eventType, gameKey, minutes: dedupeMinutes })) return null;
  const payload = {
    season_id: seasonId,
    user_id: userId,
    event_type: eventType,
    game_key: gameKey,
    amount: Math.round(Number(amount || 0)),
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    metadata_json: metadata,
    is_public: Boolean(isPublic)
  };
  if (provider === 'supabase') {
    return normalizeEvent(assertData(await client().from('casino_events').insert(payload).select().single()));
  }
  const created = await run(
    `INSERT INTO casino_events
     (season_id, user_id, event_type, game_key, amount, balance_before, balance_after, metadata_json, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.season_id, payload.user_id, payload.event_type, payload.game_key, payload.amount, payload.balance_before, payload.balance_after, JSON.stringify(metadata), payload.is_public ? 1 : 0]
  );
  return normalizeEvent(await get('SELECT * FROM casino_events WHERE id = ?', [created.id]));
}

async function maybeCreateTurnoverEvent({ season, userId, balanceAfter }) {
  const totals = await getPointTotals(season, userId);
  const total = totals.get(userId) || { earned: 0, spent: 0 };
  if (total.earned <= 0) return null;
  const turnover = total.spent / total.earned;
  if (turnover < 0.9) return null;
  return createCasinoEvent({
    seasonId: season.id,
    userId,
    eventType: 'high_turnover',
    amount: Math.round(turnover * 1000),
    balanceAfter,
    metadata: { pointEarned: total.earned, pointSpent: total.spent, formattedTurnover: `${(turnover * 100).toFixed(1)}%` },
    dedupeMinutes: 360
  });
}

async function countRussianTwoStepCashouts(season, userId) {
  if (provider === 'supabase') {
    const rows = assertData(await client().from('game_results').select('state,result')
      .eq('user_id', userId).eq('game_code', 'russian_roulette')
      .gte('created_at', season.starts_at).lt('created_at', season.ends_at)) || [];
    return rows.filter((row) => row.result === 'survived' && Number(parseJson(row.state).survivedCount || 0) === 2).length;
  }
  const rows = await all(
    `SELECT state, result FROM game_results
     WHERE user_id = ? AND game_code = 'russian_roulette'
       AND DATETIME(created_at) >= DATETIME(?) AND DATETIME(created_at) < DATETIME(?)`,
    [userId, season.starts_at, season.ends_at]
  );
  return rows.filter((row) => row.result === 'survived' && Number(parseJson(row.state).survivedCount || 0) === 2).length;
}

async function recordCasinoResultStats(gameResult, account = null) {
  try {
    const season = await getActiveSeason();
    if (!season || !gameResult?.id) return null;
    const balanceAfter = Number(account?.balance ?? (await getPointAccount(gameResult.userId))?.balance ?? 0);
    const balanceBefore = balanceAfter - Number(gameResult.netAmount || 0);
    const { previous } = await upsertCasinoUserStats({ season, gameResult });
    const { peak, isNewPeak } = await updateSeasonPointPeak(gameResult.userId, { balance: balanceAfter }, season) || {};
    const events = [];
    const net = Number(gameResult.netAmount || 0);
    const metadata = {
      gameResultId: gameResult.id,
      result: gameResult.result,
      state: gameResult.state,
      betAmount: gameResult.betAmount,
      payoutAmount: gameResult.payoutAmount,
      netAmount: gameResult.netAmount
    };
    if (net >= 10000) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'jackpot', gameKey: gameResult.gameCode, amount: net, balanceBefore, balanceAfter, metadata, dedupeMinutes: 10 }));
    if (net <= -10000) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'disaster', gameKey: gameResult.gameCode, amount: Math.abs(net), balanceBefore, balanceAfter, metadata, dedupeMinutes: 10 }));
    if (net > Number(previous?.biggestWin || 0)) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'biggest_win', gameKey: gameResult.gameCode, amount: net, balanceBefore, balanceAfter, metadata, dedupeMinutes: 0 }));
    if (net < 0 && Math.abs(net) > Number(previous?.biggestLoss || 0)) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'biggest_loss', gameKey: gameResult.gameCode, amount: Math.abs(net), balanceBefore, balanceAfter, metadata, dedupeMinutes: 0 }));
    if (isNewPeak) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'peak_balance', amount: peak.peakBalance, balanceAfter, metadata, dedupeMinutes: 30 }));
    if (peak?.drawdown >= 50000) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'drawdown', amount: peak.drawdown, balanceAfter, metadata: { ...metadata, peakBalance: peak.peakBalance, drawdownRate: peak.drawdownRate }, dedupeMinutes: 60 }));
    if (gameResult.gameCode === 'russian_roulette' && gameResult.result === 'survived' && Number(gameResult.state?.survivedCount || 0) === 2) {
      const twoStepCount = await countRussianTwoStepCashouts(season, gameResult.userId);
      if (twoStepCount >= 3) events.push(await createCasinoEvent({ seasonId: season.id, userId: gameResult.userId, eventType: 'suspicious_loop', gameKey: gameResult.gameCode, amount: twoStepCount, balanceAfter, metadata: { ...metadata, twoStepCashoutCount: twoStepCount }, dedupeMinutes: 60 }));
    }
    events.push(await maybeCreateTurnoverEvent({ season, userId: gameResult.userId, balanceAfter }));
    return { season, events: events.filter(Boolean), peak };
  } catch (error) {
    console.error('Casino V1.7 stats recording failed:', error);
    return null;
  }
}

async function listStatsForSeason(seasonId, userId = null) {
  if (provider === 'supabase') {
    let query = client().from('casino_user_stats').select('*').eq('season_id', seasonId);
    if (userId) query = query.eq('user_id', userId);
    return (assertData(await query) || []).map(normalizeStat);
  }
  const params = [seasonId];
  const filter = userId ? ' AND user_id = ?' : '';
  if (userId) params.push(userId);
  return (await all(`SELECT * FROM casino_user_stats WHERE season_id = ?${filter}`, params)).map(normalizeStat);
}

async function listPeaksForSeason(seasonId, userId = null) {
  if (provider === 'supabase') {
    let query = client().from('season_user_point_peaks').select('*').eq('season_id', seasonId);
    if (userId) query = query.eq('user_id', userId);
    return (assertData(await query) || []).map(normalizePeak);
  }
  const params = [seasonId];
  const filter = userId ? ' AND user_id = ?' : '';
  if (userId) params.push(userId);
  return (await all(`SELECT * FROM season_user_point_peaks WHERE season_id = ?${filter}`, params)).map(normalizePeak);
}

async function decorateLeaderboardRows(rows) {
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((row) => row.userId))];
  let users;
  if (provider === 'supabase') {
    const [userRows, profileRows] = await Promise.all([
      assertData(await client().from('users').select('id,display_name').in('id', userIds)),
      assertData(await client().from('user_profiles').select('user_id,nickname,title,avatar_url').in('user_id', userIds))
    ]);
    const profileMap = new Map(profileRows.map((row) => [row.user_id, row]));
    users = userRows.map((user) => ({ ...user, ...(profileMap.get(user.id) || {}) }));
  } else {
    users = await all(
      `SELECT u.id, u.display_name, p.nickname, p.title, p.avatar_url
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );
  }
  const userMap = new Map((await decoratePublicUsers(users)).map((user) => [user.id, user]));
  return rows.map((row) => ({ ...row, ...(userMap.get(row.userId) || {}) }));
}

function aggregateUserStats(stats) {
  const map = new Map();
  stats.forEach((row) => {
    if (!map.has(row.userId)) {
      map.set(row.userId, { userId: row.userId, casinoNet: 0, biggestWin: 0, biggestLoss: 0, plays: 0, totalBet: 0, totalPayout: 0, blackjackProfit: 0 });
    }
    const item = map.get(row.userId);
    item.casinoNet += row.netProfit;
    item.biggestWin = Math.max(item.biggestWin, row.biggestWin);
    item.biggestLoss = Math.max(item.biggestLoss, row.biggestLoss);
    item.plays += row.plays;
    item.totalBet += row.totalBet;
    item.totalPayout += row.totalPayout;
    if (row.gameKey === 'dice_blackjack') item.blackjackProfit += row.netProfit;
  });
  return [...map.values()];
}

async function getRussianTwoStepCounts(season) {
  const rows = provider === 'supabase'
    ? (assertData(await client().from('game_results').select('user_id,state,result,net_amount')
      .eq('game_code', 'russian_roulette').gte('created_at', season.starts_at).lt('created_at', season.ends_at)) || [])
    : await all(
      `SELECT user_id, state, result, net_amount FROM game_results
       WHERE game_code = 'russian_roulette' AND DATETIME(created_at) >= DATETIME(?) AND DATETIME(created_at) < DATETIME(?)`,
      [season.starts_at, season.ends_at]
    );
  const map = new Map();
  rows.forEach((row) => {
    const state = parseJson(row.state);
    if (row.result !== 'survived' || Number(state.survivedCount || 0) !== 2) return;
    if (!map.has(row.user_id)) map.set(row.user_id, { userId: row.user_id, count: 0, net: 0 });
    const item = map.get(row.user_id);
    item.count += 1;
    item.net += Number(row.net_amount || 0);
  });
  return map;
}

async function buildCasinoLeaderboard({ category = 'drawdown', seasonId = null, limit = 10, offset = 0 }) {
  if (!POINT_LEADERBOARD_CATEGORIES.has(category) && !PERCENT_LEADERBOARD_CATEGORIES.has(category) && !COUNT_LEADERBOARD_CATEGORIES.has(category)) {
    const error = new Error('category is invalid.');
    error.status = 400;
    throw error;
  }
  const season = await getSeason(seasonId);
  if (!season) {
    const error = new Error('Season not found.');
    error.status = 404;
    throw error;
  }
  const [stats, peaks, totals, russianCounts] = await Promise.all([
    listStatsForSeason(season.id),
    listPeaksForSeason(season.id),
    getPointTotals(season),
    getRussianTwoStepCounts(season)
  ]);
  const byUser = new Map(aggregateUserStats(stats).map((row) => [row.userId, row]));
  peaks.forEach((peak) => {
    if (!byUser.has(peak.userId)) byUser.set(peak.userId, { userId: peak.userId, casinoNet: 0, biggestWin: 0, biggestLoss: 0, plays: 0, totalBet: 0, totalPayout: 0, blackjackProfit: 0 });
    Object.assign(byUser.get(peak.userId), peak);
  });
  totals.forEach((total, userId) => {
    if (!byUser.has(userId)) byUser.set(userId, { userId, casinoNet: 0, biggestWin: 0, biggestLoss: 0, plays: 0, totalBet: 0, totalPayout: 0, blackjackProfit: 0 });
    Object.assign(byUser.get(userId), total);
  });
  russianCounts.forEach((item, userId) => {
    if (!byUser.has(userId)) byUser.set(userId, { userId, casinoNet: 0, biggestWin: 0, biggestLoss: 0, plays: 0, totalBet: 0, totalPayout: 0, blackjackProfit: 0 });
    byUser.get(userId).russianCashoutCount = item.count;
  });
  const scoreFor = (row) => {
    if (category === 'balance_peak') return row.peakBalance || 0;
    if (category === 'drawdown') return row.drawdown || 0;
    if (category === 'drawdown_rate') return Math.round(Number(row.drawdownRate || 0) * 1000);
    if (category === 'casino_net_profit') return Math.max(0, row.casinoNet || 0);
    if (category === 'casino_net_loss') return Math.max(0, -Number(row.casinoNet || 0));
    if (category === 'biggest_casino_win') return row.biggestWin || 0;
    if (category === 'biggest_casino_loss') return row.biggestLoss || 0;
    if (category === 'blackjack_profit') return Math.max(0, row.blackjackProfit || 0);
    if (category === 'russian_cashout_count') return row.russianCashoutCount || 0;
    if (category === 'point_turnover') return row.earned > 0 ? Math.round((row.spent / row.earned) * 1000) : 0;
    return 0;
  };
  const rows = await decorateLeaderboardRows([...byUser.values()]
    .map((row) => ({ ...row, score: scoreFor(row), category }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.userId - b.userId)
    .slice(offset, offset + limit)
    .map((row, index) => ({
      ...row,
      rank: offset + index + 1,
      formattedScore: formatRankingScore(category, row.score),
      extraLabel: row.gameKey || ''
    })));
  return { season, category, rows };
}

async function getMyCasinoStats(userId) {
  const season = await getActiveSeason();
  if (!season) return { season: null, games: [], peakBalance: 0, currentBalance: 0, drawdown: 0, drawdownRate: 0, casinoNet: 0, biggestWin: 0, biggestLoss: 0, pointTurnover: 0, recentEvents: [] };
  const account = await getPointAccount(userId);
  const peakUpdate = await updateSeasonPointPeak(userId, account, season);
  const [stats, totals, events] = await Promise.all([
    listStatsForSeason(season.id, userId),
    getPointTotals(season, userId),
    listCasinoEvents({ seasonId: season.id, userId, limit: 5, publicOnly: false })
  ]);
  const aggregate = aggregateUserStats(stats)[0] || {};
  const total = totals.get(userId) || { earned: 0, spent: 0 };
  const turnoverScore = total.earned > 0 ? Math.round((total.spent / total.earned) * 1000) : 0;
  const peak = peakUpdate?.peak || await getPeakRow(season.id, userId);
  return {
    season,
    games: stats,
    peakBalance: peak?.peakBalance || 0,
    currentBalance: Number(account?.balance || 0),
    drawdown: peak?.drawdown || 0,
    drawdownRate: Math.round(Number(peak?.drawdownRate || 0) * 1000),
    casinoNet: aggregate.casinoNet || 0,
    biggestWin: aggregate.biggestWin || 0,
    biggestLoss: aggregate.biggestLoss || 0,
    favoriteGame: stats.sort((a, b) => b.plays - a.plays)[0]?.gameKey || null,
    dangerousGame: stats.sort((a, b) => a.netProfit - b.netProfit)[0]?.gameKey || null,
    pointTurnover: turnoverScore,
    recentEvents: events.events
  };
}

async function listCasinoEvents({ type = '', seasonId = null, userId = null, publicOnly = true, limit = 20, offset = 0 } = {}) {
  const season = await getSeason(seasonId);
  if (!season) return { season: null, events: [] };
  let rows;
  if (provider === 'supabase') {
    let query = client().from('casino_events').select('*').eq('season_id', season.id);
    if (type) query = query.eq('event_type', type);
    if (userId) query = query.eq('user_id', userId);
    if (publicOnly) query = query.eq('is_public', true);
    rows = assertData(await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)) || [];
  } else {
    const params = [season.id];
    let filter = '';
    if (type) { filter += ' AND event_type = ?'; params.push(type); }
    if (userId) { filter += ' AND user_id = ?'; params.push(userId); }
    if (publicOnly) filter += ' AND is_public = 1';
    params.push(limit, offset);
    rows = await all(`SELECT * FROM casino_events WHERE season_id = ?${filter} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, params);
  }
  const events = await decorateLeaderboardRows(rows.map(normalizeEvent));
  return { season, events: events.map((event) => ({ ...event, message: eventMessage(event) })) };
}

async function getAdminCasinoStats({ seasonId = null, gameKey = '', userId = null, limit = 10, offset = 0 } = {}) {
  const season = await getSeason(seasonId);
  if (!season) return { season: null, totals: {}, gameStats: [], userStats: [], biggestWins: [], biggestLosses: [], suspiciousLoops: [] };
  let stats = await listStatsForSeason(season.id, userId);
  if (gameKey) stats = stats.filter((row) => row.gameKey === gameKey);
  const totals = stats.reduce((sum, row) => ({
    plays: sum.plays + row.plays,
    totalBet: sum.totalBet + row.totalBet,
    totalPayout: sum.totalPayout + row.totalPayout,
    netProfit: sum.netProfit + row.netProfit
  }), { plays: 0, totalBet: 0, totalPayout: 0, netProfit: 0 });
  const byGame = new Map();
  stats.forEach((row) => {
    if (!byGame.has(row.gameKey)) byGame.set(row.gameKey, { gameKey: row.gameKey, plays: 0, totalBet: 0, totalPayout: 0, netProfit: 0, biggestWin: 0, biggestLoss: 0 });
    const item = byGame.get(row.gameKey);
    item.plays += row.plays;
    item.totalBet += row.totalBet;
    item.totalPayout += row.totalPayout;
    item.netProfit += row.netProfit;
    item.biggestWin = Math.max(item.biggestWin, row.biggestWin);
    item.biggestLoss = Math.max(item.biggestLoss, row.biggestLoss);
    item.returnRate = item.totalBet > 0 ? item.totalPayout / item.totalBet : 0;
    item.houseEdge = item.totalBet > 0 ? (item.totalBet - item.totalPayout) / item.totalBet : 0;
  });
  const userStats = await decorateLeaderboardRows(aggregateUserStats(stats)
    .sort((a, b) => Math.abs(b.casinoNet) - Math.abs(a.casinoNet))
    .slice(offset, offset + limit));
  return {
    season,
    totals,
    gameStats: [...byGame.values()],
    userStats,
    biggestWins: [...stats].sort((a, b) => b.biggestWin - a.biggestWin).slice(0, limit),
    biggestLosses: [...stats].sort((a, b) => b.biggestLoss - a.biggestLoss).slice(0, limit),
    suspiciousLoops: (await getSuspiciousLoops({ seasonId: season.id, limit })).rows
  };
}

async function getSuspiciousLoops({ seasonId = null, limit = 20 } = {}) {
  const season = await getSeason(seasonId);
  if (!season) return { season: null, rows: [] };
  const counts = [...(await getRussianTwoStepCounts(season)).values()].filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count).slice(0, limit);
  const rows = await decorateLeaderboardRows(counts.map((row, index) => ({ ...row, rank: index + 1, score: row.count, formattedScore: formatRankingScore('russian_cashout_count', row.count), extraLabel: `${formatPoints(row.net)} net` })));
  return { season, rows };
}

async function rebuildCasinoStats({ seasonId = null, dryRun = true } = {}) {
  const season = await getSeason(seasonId);
  if (!season) {
    const error = new Error('Season not found.');
    error.status = 404;
    throw error;
  }
  const rows = provider === 'supabase'
    ? (assertData(await client().from('game_results').select('*').gte('created_at', season.starts_at).lt('created_at', season.ends_at).order('created_at')) || [])
    : await all(
      `SELECT * FROM game_results WHERE DATETIME(created_at) >= DATETIME(?) AND DATETIME(created_at) < DATETIME(?) ORDER BY created_at ASC, id ASC`,
      [season.starts_at, season.ends_at]
    );
  if (dryRun) return { season, dryRun: true, gameResults: rows.length };
  if (provider === 'supabase') {
    await Promise.all([
      client().from('casino_events').delete().eq('season_id', season.id),
      client().from('casino_user_stats').delete().eq('season_id', season.id),
      client().from('season_user_point_peaks').delete().eq('season_id', season.id)
    ]);
  } else {
    await run('DELETE FROM casino_events WHERE season_id = ?', [season.id]);
    await run('DELETE FROM casino_user_stats WHERE season_id = ?', [season.id]);
    await run('DELETE FROM season_user_point_peaks WHERE season_id = ?', [season.id]);
  }
  for (const row of rows) await recordCasinoResultStats({
    id: row.id,
    userId: row.user_id,
    gameCode: row.game_code,
    betAmount: row.bet_amount,
    payoutAmount: row.payout_amount,
    netAmount: row.net_amount,
    result: row.result,
    state: parseJson(row.state),
    createdAt: row.created_at
  });
  return { season, dryRun: false, gameResults: rows.length };
}

module.exports = {
  updateSeasonPointPeak,
  recordCasinoResultStats,
  getMyCasinoStats,
  buildCasinoLeaderboard,
  listCasinoEvents,
  getAdminCasinoStats,
  getSuspiciousLoops,
  rebuildCasinoStats
};
