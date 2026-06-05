const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    rewardAmount: Number(row.reward_amount || 0),
    resultCode: row.result_code,
    resultLabel: row.result_label,
    mineState: row.mine_state,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at
  };
}

async function listTodayLogs(userId, { startIso, endIso }) {
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient().from('mine_logs').select('*')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })) || [];
    return rows.map(normalizeLog);
  }
  const rows = await all(
    `SELECT * FROM mine_logs
     WHERE user_id = ? AND created_at >= ? AND created_at < ?
     ORDER BY created_at ASC`,
    [userId, startIso.replace('T', ' ').replace(/\.\d{3}Z$/, ''), endIso.replace('T', ' ').replace(/\.\d{3}Z$/, '')]
  );
  return rows.map(normalizeLog);
}

async function getLatestLog(userId) {
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient().from('mine_logs').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle());
    return normalizeLog(row);
  }
  return normalizeLog(await get(
    `SELECT * FROM mine_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  ));
}

async function createMineLog({ userId, rewardAmount, resultCode, resultLabel, mineState, metadata = {} }) {
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient().from('mine_logs').insert({
      user_id: userId,
      reward_amount: rewardAmount,
      result_code: resultCode,
      result_label: resultLabel,
      mine_state: mineState,
      metadata_json: metadata
    }).select().single());
    return normalizeLog(row);
  }
  const result = await run(
    `INSERT INTO mine_logs (user_id, reward_amount, result_code, result_label, mine_state, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, rewardAmount, resultCode, resultLabel, mineState, JSON.stringify(metadata)]
  );
  return normalizeLog(await get('SELECT * FROM mine_logs WHERE id = ?', [result.id]));
}

async function listMineHistory(userId, limit = 20) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient().from('mine_logs').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(safeLimit)) || [];
    return rows.map(normalizeLog);
  }
  const rows = await all(
    `SELECT * FROM mine_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, safeLimit]
  );
  return rows.map(normalizeLog);
}

module.exports = {
  listTodayLogs,
  getLatestLog,
  createMineLog,
  listMineHistory
};
