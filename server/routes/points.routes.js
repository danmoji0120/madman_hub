const express = require('express');
const authRequired = require('../middleware/auth');
const { all } = require('../db');
const { ensurePointAccount, getTransactions } = require('../services/points.service');

const router = express.Router();

router.get('/me', authRequired, async (req, res) => {
  const account = await ensurePointAccount(req.user.id);
  return res.json({ success: true, account });
});

router.get('/transactions', authRequired, async (req, res) => {
  const transactions = await getTransactions(req.user.id);
  return res.json({ success: true, transactions });
});

router.get('/leaderboard', async (req, res) => {
  const rows = await all(
    `SELECT u.id, u.display_name, p.nickname, p.title, pa.balance, pa.total_earned
     FROM point_accounts pa
     JOIN users u ON u.id = pa.user_id
     LEFT JOIN user_profiles p ON p.user_id = u.id
     ORDER BY pa.balance DESC
     LIMIT 20`
  );

  return res.json({ success: true, leaderboard: rows });
});

module.exports = router;
