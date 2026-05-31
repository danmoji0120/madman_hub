const { getSupabaseAdminClient } = require('../supabaseClient');
const { mapRpcError } = require('../utils/rpcErrors');

async function callRpc(name, params) {
  const { data, error } = await getSupabaseAdminClient().rpc(name, params);
  if (error) throw mapRpcError(error);
  return data;
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

async function applyPointTransaction(input) {
  const row = firstRow(await callRpc('apply_point_transaction', {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_type: input.type,
    p_reason: input.reason,
    p_source_platform: input.sourcePlatform || 'hub',
    p_source_id: input.sourceId ?? null,
    p_created_by: input.createdBy ?? null
  }));
  return {
    user_id: row.user_id,
    balance: row.balance,
    total_earned: row.total_earned,
    total_spent: row.total_spent,
    updated_at: row.updated_at,
    transaction_id: row.transaction_id
  };
}

async function buyTitleTransaction(userId, titleId) {
  return callRpc('buy_title_transaction', {
    p_user_id: userId,
    p_title_id: titleId
  });
}

async function adminApplyPointsTransaction({ actorUserId, targetUserId, amount, reason }) {
  return callRpc('admin_apply_points_transaction', {
    p_actor_user_id: actorUserId,
    p_target_user_id: targetUserId,
    p_amount: amount,
    p_reason: reason
  });
}

async function unlockAchievementTransaction(userId, achievementCode) {
  return callRpc('unlock_achievement_transaction', {
    p_user_id: userId,
    p_achievement_code: achievementCode
  });
}

async function createGameSessionTransaction({ userId, gameCode, betAmount, state }) {
  return callRpc('create_game_session_transaction', {
    p_user_id: userId,
    p_game_code: gameCode,
    p_bet_amount: betAmount,
    p_state: state
  });
}

async function completeGameSessionTransaction({
  sessionId,
  userId,
  status,
  result,
  state,
  payoutAmount,
  payoutType = 'game_payout',
  feedAction = null,
  feedMetadata = {}
}) {
  return callRpc('complete_game_session_transaction', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_status: status,
    p_result: result,
    p_final_state: state,
    p_payout_amount: payoutAmount,
    p_payout_type: payoutType,
    p_feed_action: feedAction,
    p_feed_metadata: feedMetadata
  });
}

async function playInstantGameTransaction({
  userId,
  gameCode,
  betAmount,
  payoutAmount,
  payoutType = 'game_payout',
  result,
  state,
  feedAction = null,
  feedMetadata = {}
}) {
  return callRpc('play_instant_game_transaction', {
    p_user_id: userId,
    p_game_code: gameCode,
    p_bet_amount: betAmount,
    p_payout_amount: payoutAmount,
    p_payout_type: payoutType,
    p_result: result,
    p_state: state,
    p_feed_action: feedAction,
    p_feed_metadata: feedMetadata
  });
}

module.exports = {
  callRpc,
  applyPointTransaction,
  buyTitleTransaction,
  adminApplyPointsTransaction,
  unlockAchievementTransaction,
  createGameSessionTransaction,
  completeGameSessionTransaction,
  playInstantGameTransaction
};
