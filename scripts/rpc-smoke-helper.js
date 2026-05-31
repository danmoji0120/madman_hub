const assert = require('assert');
const { getSupabaseAdminClient } = require('../server/supabaseClient');
const {
  applyPointTransaction,
  unlockAchievementTransaction,
  createGameSessionTransaction,
  completeGameSessionTransaction
} = require('../server/repositories/rpc.repo');

function countRows(result) {
  if (result.error) throw result.error;
  return Number(result.count || 0);
}

async function runSupabaseRpcSmoke({ request, auth, userId, runPrefix }) {
  const client = getSupabaseAdminClient();
  const titleName = `${runPrefix}rpc-title`;
  let title;

  try {
    const funded = await applyPointTransaction({
      userId,
      amount: 200,
      type: 'rpc_smoke_funding',
      reason: 'rpc smoke funding',
      sourcePlatform: 'smoke-test',
      createdBy: userId
    });
    assert.ok(funded.balance >= 200);

    const insertedTitle = await client.from('titles').insert({
      name: titleName,
      description: 'RPC concurrent purchase smoke title',
      price: 20,
      rarity: 'common',
      is_active: true
    }).select().single();
    if (insertedTitle.error) throw insertedTitle.error;
    title = insertedTitle.data;

    const purchaseCalls = await Promise.all([
      request(`/api/shop/titles/${title.id}/buy`, { method: 'POST', headers: auth }),
      request(`/api/shop/titles/${title.id}/buy`, { method: 'POST', headers: auth })
    ]);
    assert.strictEqual(purchaseCalls.filter((item) => item.purchased).length, 1);
    assert.strictEqual(purchaseCalls.filter((item) => item.alreadyOwned).length, 1);
    const titleTransactions = await client
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'title_purchase')
      .eq('source_id', String(title.id));
    assert.strictEqual(countRows(titleTransactions), 1);

    const achievementCalls = await Promise.all([
      unlockAchievementTransaction(userId, 'CHECKIN_3'),
      unlockAchievementTransaction(userId, 'CHECKIN_3')
    ]);
    assert.strictEqual(achievementCalls.filter((item) => item.unlocked).length, 1);
    assert.strictEqual(achievementCalls.filter((item) => item.alreadyUnlocked).length, 1);
    const achievementTransactions = await client
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'achievement_reward')
      .eq('source_id', 'CHECKIN_3');
    assert.strictEqual(countRows(achievementTransactions), 1);

    const created = await createGameSessionTransaction({
      userId,
      gameCode: 'rpc_duplicate_session',
      betAmount: 10,
      state: { smoke: true }
    });
    const completeInput = {
      sessionId: created.session.id,
      userId,
      status: 'completed',
      result: 'rpc_duplicate_complete',
      state: { smoke: true, completed: true },
      payoutAmount: 15
    };
    const completions = await Promise.allSettled([
      completeGameSessionTransaction(completeInput),
      completeGameSessionTransaction(completeInput)
    ]);
    assert.strictEqual(completions.filter((item) => item.status === 'fulfilled').length, 1);
    const rejected = completions.find((item) => item.status === 'rejected');
    assert.strictEqual(rejected.reason.code, 'session_not_active');
    assert.strictEqual(rejected.reason.status, 409);

    const duplicateResults = await client
      .from('game_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('game_code', 'rpc_duplicate_session')
      .eq('result', 'rpc_duplicate_complete');
    assert.strictEqual(countRows(duplicateResults), 1);
    const duplicatePayouts = await client
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'game_payout')
      .eq('source_id', String(created.session.id));
    assert.strictEqual(countRows(duplicatePayouts), 1);
  } finally {
    if (title) {
      const { error } = await client.from('titles').delete().eq('id', title.id);
      if (error) console.error('RPC smoke title cleanup failed:', error);
    }
  }
}

module.exports = {
  runSupabaseRpcSmoke
};
