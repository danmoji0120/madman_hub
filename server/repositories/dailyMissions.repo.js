const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { addPointTransaction } = require('../services/points.service');
const {
  claimDailyMissionRewardTransaction,
  claimDailyMissionBonusTransaction
} = require('./rpc.repo');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function listProgress(userId, missionDate) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('daily_mission_progress').select('*')
      .eq('user_id', userId).eq('mission_date', missionDate)) || [];
  }
  return all('SELECT * FROM daily_mission_progress WHERE user_id = ? AND mission_date = ?', [userId, missionDate]);
}

async function listBonusClaims(userId, missionDate) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('daily_mission_bonus_claims').select('*')
      .eq('user_id', userId).eq('mission_date', missionDate)) || [];
  }
  return all('SELECT * FROM daily_mission_bonus_claims WHERE user_id = ? AND mission_date = ?', [userId, missionDate]);
}

async function incrementProgress({ userId, missionDate, mission }) {
  if (provider === 'supabase') {
    const existing = assertResult(await getSupabaseAdminClient().from('daily_mission_progress').select('*')
      .eq('user_id', userId).eq('mission_date', missionDate).eq('mission_code', mission.code).maybeSingle());
    if (existing?.completed) return existing;
    const progress = Math.min((existing?.progress || 0) + 1, mission.target);
    const completed = progress >= mission.target;
    return assertResult(await getSupabaseAdminClient().from('daily_mission_progress').upsert({
      user_id: userId, mission_date: missionDate, mission_code: mission.code,
      progress, target: mission.target, completed, reward_points: mission.rewardPoints,
      completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,mission_date,mission_code' }).select().single());
  }
  await run(
    `INSERT INTO daily_mission_progress
     (user_id, mission_date, mission_code, progress, target, completed, reward_points, completed_at)
     VALUES (?, ?, ?, 1, ?, CASE WHEN ? <= 1 THEN 1 ELSE 0 END, ?, CASE WHEN ? <= 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
     ON CONFLICT(user_id, mission_date, mission_code) DO UPDATE SET
       progress = MIN(daily_mission_progress.progress + 1, excluded.target),
       completed = CASE WHEN MIN(daily_mission_progress.progress + 1, excluded.target) >= excluded.target THEN 1 ELSE 0 END,
       completed_at = CASE WHEN MIN(daily_mission_progress.progress + 1, excluded.target) >= excluded.target
         THEN COALESCE(daily_mission_progress.completed_at, CURRENT_TIMESTAMP) ELSE daily_mission_progress.completed_at END,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, missionDate, mission.code, mission.target, mission.target, mission.rewardPoints, mission.target]
  );
  return get(
    'SELECT * FROM daily_mission_progress WHERE user_id = ? AND mission_date = ? AND mission_code = ?',
    [userId, missionDate, mission.code]
  );
}

async function claimMission({ userId, missionDate, missionCode }) {
  if (provider === 'supabase') {
    return claimDailyMissionRewardTransaction({ userId, missionDate, missionCode });
  }
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const row = await get(
      'SELECT * FROM daily_mission_progress WHERE user_id = ? AND mission_date = ? AND mission_code = ?',
      [userId, missionDate, missionCode]
    );
    if (!row || !row.completed) throw Object.assign(new Error('mission_not_completed'), { status: 409 });
    if (row.claimed) throw Object.assign(new Error('mission_already_claimed'), { status: 409 });
    const account = await addPointTransaction({
      userId, amount: row.reward_points, type: 'daily_mission_reward', reason: `일일 미션 보상: ${missionCode}`,
      sourcePlatform: 'hub-missions', sourceId: `${missionCode}:${missionDate}`, createdBy: userId
    });
    await run(
      `UPDATE daily_mission_progress SET claimed = 1, claimed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [row.id]
    );
    await run('COMMIT');
    return { claimed: true, rewardPoints: row.reward_points, account };
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function claimBonus({ userId, missionDate, bonusCode, requiredCompleted, rewardPoints }) {
  if (provider === 'supabase') {
    return claimDailyMissionBonusTransaction({ userId, missionDate, bonusCode, requiredCompleted, rewardPoints });
  }
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const completed = Number((await get(
      'SELECT COUNT(*) AS count FROM daily_mission_progress WHERE user_id = ? AND mission_date = ? AND completed = 1',
      [userId, missionDate]
    )).count || 0);
    if (completed < requiredCompleted) throw Object.assign(new Error('mission_bonus_not_ready'), { status: 409 });
    const existing = await get(
      'SELECT * FROM daily_mission_bonus_claims WHERE user_id = ? AND mission_date = ? AND bonus_code = ?',
      [userId, missionDate, bonusCode]
    );
    if (existing?.claimed) throw Object.assign(new Error('mission_bonus_already_claimed'), { status: 409 });
    const account = await addPointTransaction({
      userId, amount: rewardPoints, type: 'daily_mission_bonus', reason: `일일 미션 보너스: ${bonusCode}`,
      sourcePlatform: 'hub-missions', sourceId: `${bonusCode}:${missionDate}`, createdBy: userId
    });
    await run(
      `INSERT INTO daily_mission_bonus_claims (user_id, mission_date, bonus_code, claimed, reward_points, claimed_at)
       VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, mission_date, bonus_code) DO UPDATE SET claimed = 1, reward_points = excluded.reward_points,
       claimed_at = CURRENT_TIMESTAMP`,
      [userId, missionDate, bonusCode, rewardPoints]
    );
    await run('COMMIT');
    return { claimed: true, rewardPoints, account };
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
}

module.exports = { listProgress, listBonusClaims, incrementProgress, claimMission, claimBonus };
