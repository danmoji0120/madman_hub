const { provider, run, get, all } = require('../db');
const { applyPointTransaction } = require('../repositories/rpc.repo');
const { updateSeasonPointPeak } = require('../repositories/casinoStats.repo');

async function ensurePointAccount(userId) {
  const account = await get('SELECT * FROM point_accounts WHERE user_id = ?', [userId]);
  if (account) return account;

  await run('INSERT INTO point_accounts (user_id, balance, total_earned, total_spent) VALUES (?, 0, 0, 0)', [userId]);
  return get('SELECT * FROM point_accounts WHERE user_id = ?', [userId]);
}

async function addPointTransaction({ userId, amount, type, reason, sourcePlatform = 'hub', sourceId = null, createdBy = null }) {
  if (provider === 'supabase') {
    const account = await applyPointTransaction({ userId, amount, type, reason, sourcePlatform, sourceId, createdBy });
    await updateSeasonPointPeak(userId, account).catch((error) => {
      console.error('Season point peak update failed:', error);
    });
    return account;
  }

  await ensurePointAccount(userId);

  const account = await get('SELECT * FROM point_accounts WHERE user_id = ?', [userId]);
  const nextBalance = account.balance + amount;

  if (nextBalance < 0) {
    throw new Error('포인트가 부족합니다.');
  }

  await run(
    `INSERT INTO point_transactions
     (user_id, amount, type, reason, source_platform, source_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, type, reason, sourcePlatform, sourceId, createdBy]
  );

  await run(
    `UPDATE point_accounts
     SET balance = ?,
         total_earned = total_earned + ?,
         total_spent = total_spent + ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [
      nextBalance,
      amount > 0 ? amount : 0,
      amount < 0 ? Math.abs(amount) : 0,
      userId
    ]
  );

  const updated = await get('SELECT * FROM point_accounts WHERE user_id = ?', [userId]);
  await updateSeasonPointPeak(userId, updated).catch((error) => {
    console.error('Season point peak update failed:', error);
  });
  return updated;
}

async function getTransactions(userId, limit = 30) {
  return all(
    `SELECT * FROM point_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}

module.exports = {
  ensurePointAccount,
  addPointTransaction,
  getTransactions
};
