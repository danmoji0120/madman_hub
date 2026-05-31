const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { getKstDateString } = require('../utils/date');
const {
  createGameSessionTransaction,
  completeGameSessionTransaction,
  playInstantGameTransaction
} = require('./rpc.repo');

function parseState(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeSession(row) {
  if (!row) return null;
  return {
    ...row,
    userId: row.user_id,
    gameCode: row.game_code,
    betAmount: row.bet_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    state: parseState(row.state)
  };
}

function normalizeResult(row) {
  if (!row) return null;
  return {
    ...row,
    userId: row.user_id,
    gameCode: row.game_code,
    betAmount: row.bet_amount,
    payoutAmount: row.payout_amount,
    netAmount: row.net_amount,
    createdAt: row.created_at,
    state: parseState(row.state)
  };
}

function sanitizePublicResult(row) {
  const result = normalizeResult(row);
  return {
    id: result.id,
    userId: result.userId,
    gameCode: result.gameCode,
    betAmount: result.betAmount,
    payoutAmount: result.payoutAmount,
    netAmount: result.netAmount,
    result: result.result,
    createdAt: result.createdAt,
    display_name: result.display_name,
    nickname: result.nickname
  };
}

function getKstRange(date = new Date()) {
  const day = getKstDateString(date);
  const start = new Date(`${day}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { day, start: start.toISOString(), end: end.toISOString() };
}

function supabase() {
  return getSupabaseAdminClient();
}

function supabaseData(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function createGameSession({ userId, gameCode, betAmount, state }) {
  if (provider === 'sqlite') {
    const created = await run(
      `INSERT INTO game_sessions (user_id, game_code, bet_amount, state)
       VALUES (?, ?, ?, ?)`,
      [userId, gameCode, betAmount, JSON.stringify(state)]
    );
    return getGameSessionById(created.id);
  }

  const row = supabaseData(await supabase().from('game_sessions').insert({
    user_id: userId,
    game_code: gameCode,
    bet_amount: betAmount,
    state
  }).select().single());
  return normalizeSession(row);
}

async function createAtomicGameSession({ userId, gameCode, betAmount, state }) {
  const result = await createGameSessionTransaction({ userId, gameCode, betAmount, state });
  return {
    ...result,
    session: normalizeSession(result.session)
  };
}

async function getGameSessionById(sessionId) {
  if (provider === 'sqlite') {
    return normalizeSession(await get('SELECT * FROM game_sessions WHERE id = ?', [sessionId]));
  }

  return normalizeSession(supabaseData(
    await supabase().from('game_sessions').select('*').eq('id', sessionId).maybeSingle()
  ));
}

async function getActiveSession(userId, gameCode) {
  if (provider === 'sqlite') {
    return normalizeSession(await get(
      `SELECT * FROM game_sessions
       WHERE user_id = ? AND game_code = ? AND status = 'active'
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [userId, gameCode]
    ));
  }

  return normalizeSession(supabaseData(
    await supabase().from('game_sessions').select('*')
      .eq('user_id', userId).eq('game_code', gameCode).eq('status', 'active')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .limit(1).maybeSingle()
  ));
}

async function listActiveSessions(userId) {
  if (provider === 'sqlite') {
    return (await all(
      `SELECT * FROM game_sessions WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC, id DESC`,
      [userId]
    )).map(normalizeSession);
  }

  return (supabaseData(
    await supabase().from('game_sessions').select('*').eq('user_id', userId).eq('status', 'active')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
  ) || []).map(normalizeSession);
}

async function updateGameSession(sessionId, { status, state }) {
  const values = [status, JSON.stringify(state), sessionId];
  if (provider === 'sqlite') {
    await run(
      `UPDATE game_sessions SET status = ?, state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return getGameSessionById(sessionId);
  }

  return normalizeSession(supabaseData(
    await supabase().from('game_sessions').update({
      status,
      state,
      updated_at: new Date().toISOString()
    }).eq('id', sessionId).select().single()
  ));
}

async function createGameResult({ userId, gameCode, betAmount, payoutAmount, netAmount, result, state }) {
  if (provider === 'sqlite') {
    const created = await run(
      `INSERT INTO game_results
       (user_id, game_code, bet_amount, payout_amount, net_amount, result, state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, gameCode, betAmount, payoutAmount, netAmount, result, JSON.stringify(state)]
    );
    return normalizeResult(await get('SELECT * FROM game_results WHERE id = ?', [created.id]));
  }

  return normalizeResult(supabaseData(
    await supabase().from('game_results').insert({
      user_id: userId,
      game_code: gameCode,
      bet_amount: betAmount,
      payout_amount: payoutAmount,
      net_amount: netAmount,
      result,
      state
    }).select().single()
  ));
}

async function completeAtomicGameSession(input) {
  const result = await completeGameSessionTransaction(input);
  return {
    ...result,
    session: normalizeSession(result.session),
    result: normalizeResult(result.result)
  };
}

async function createAtomicInstantGameResult(input) {
  const result = await playInstantGameTransaction(input);
  return {
    ...result,
    result: normalizeResult(result.result)
  };
}

async function listMyGameResults(userId, limit = 30, offset = 0) {
  if (provider === 'sqlite') {
    return (await all(
      `SELECT * FROM game_results WHERE user_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    )).map(normalizeResult);
  }

  return (supabaseData(
    await supabase().from('game_results').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + limit - 1)
  ) || []).map(normalizeResult);
}

async function listPublicRecentGameResults(limit = 10) {
  if (provider === 'sqlite') {
    return (await all(
      `SELECT gr.*, u.display_name, p.nickname
       FROM game_results gr
       LEFT JOIN users u ON u.id = gr.user_id
       LEFT JOIN user_profiles p ON p.user_id = gr.user_id
       ORDER BY gr.created_at DESC, gr.id DESC LIMIT ?`,
      [limit]
    )).map(sanitizePublicResult);
  }

  const rows = (supabaseData(
    await supabase().from('game_results').select('*')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit)
  ) || []).map(normalizeResult);
  const userIds = [...new Set(rows.map((row) => row.userId))];
  if (!userIds.length) return rows.map(sanitizePublicResult);
  const [users, profiles] = await Promise.all([
    supabaseData(await supabase().from('users').select('id, display_name').in('id', userIds)),
    supabaseData(await supabase().from('user_profiles').select('user_id, nickname').in('user_id', userIds))
  ]);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const profileMap = new Map(profiles.map((item) => [item.user_id, item]));
  return rows.map((row) => sanitizePublicResult({
    ...row,
    display_name: userMap.get(row.userId)?.display_name || null,
    nickname: profileMap.get(row.userId)?.nickname || null
  }));
}

async function countTodayGameResults(userId, gameCode) {
  const range = getKstRange();
  if (provider === 'sqlite') {
    return (await get(
      `SELECT COUNT(*) AS count FROM game_results
       WHERE user_id = ? AND game_code = ?
       AND substr(datetime(created_at, '+9 hours'), 1, 10) = ?`,
      [userId, gameCode, range.day]
    )).count;
  }

  const result = await supabase().from('game_results').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('game_code', gameCode).gte('created_at', range.start).lt('created_at', range.end);
  if (result.error) throw result.error;
  return result.count || 0;
}

async function countTodayAllGameResults(userId) {
  const range = getKstRange();
  if (provider === 'sqlite') {
    return (await get(
      `SELECT COUNT(*) AS count FROM game_results
       WHERE user_id = ? AND substr(datetime(created_at, '+9 hours'), 1, 10) = ?`,
      [userId, range.day]
    )).count;
  }

  const result = await supabase().from('game_results').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).gte('created_at', range.start).lt('created_at', range.end);
  if (result.error) throw result.error;
  return result.count || 0;
}

module.exports = {
  createGameSession,
  createAtomicGameSession,
  getGameSessionById,
  getActiveSession,
  listActiveSessions,
  updateGameSession,
  createGameResult,
  completeAtomicGameSession,
  createAtomicInstantGameResult,
  listMyGameResults,
  listPublicRecentGameResults,
  countTodayGameResults,
  countTodayAllGameResults
};
