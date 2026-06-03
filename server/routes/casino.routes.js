const express = require('express');
const authRequired = require('../middleware/auth');
const casino = require('../services/casino.service');
const {
  getMyCasinoStats,
  buildCasinoLeaderboard,
  listCasinoEvents
} = require('../repositories/casinoStats.repo');

const router = express.Router();

function parseSessionId(value) {
  const sessionId = Number(value);
  if (!Number.isInteger(sessionId) || sessionId < 1) {
    const error = new Error('올바른 게임 세션 ID가 필요합니다.');
    error.statusCode = 400;
    throw error;
  }
  return sessionId;
}

function handle(handler) {
  return async (req, res) => {
    try {
      const data = await handler(req);
      return res.json({ success: true, ...data });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      if (statusCode >= 500) console.error('Casino API failed:', error);
      return res.status(statusCode).json({ success: false, message: error.message });
    }
  };
}

router.get('/games', (req, res) => {
  res.json({ success: true, games: casino.getPublicGames() });
});

router.get('/me/limits', authRequired, handle(async (req) => casino.getMyLimits(req.user.id)));

router.get('/history', authRequired, handle(async (req) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { results: await casino.listMyGameResults(req.user.id, limit, offset) };
}));

router.get('/stats/me', authRequired, handle(async (req) => getMyCasinoStats(req.user.id)));

router.get('/stats/leaderboard', handle(async (req) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return buildCasinoLeaderboard({
    category: typeof req.query.category === 'string' ? req.query.category : 'drawdown',
    seasonId: req.query.seasonId ? Number(req.query.seasonId) : null,
    limit,
    offset
  });
}));

router.get('/events', handle(async (req) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return listCasinoEvents({
    type: typeof req.query.type === 'string' ? req.query.type : '',
    seasonId: req.query.seasonId ? Number(req.query.seasonId) : null,
    userId: req.query.userId ? Number(req.query.userId) : null,
    publicOnly: req.query.publicOnly !== 'false',
    limit,
    offset
  });
}));

router.post('/roulette/play', authRequired, handle(async (req) => (
  casino.playRoulette(req.user.id, req.body.betAmount)
)));

router.post('/dice-blackjack/start', authRequired, handle(async (req) => (
  casino.startDiceBlackjack(req.user.id, req.body.betAmount)
)));

router.post('/dice-blackjack/:sessionId/hit', authRequired, handle(async (req) => (
  casino.hitDiceBlackjack(req.user.id, parseSessionId(req.params.sessionId))
)));

router.post('/dice-blackjack/:sessionId/stand', authRequired, handle(async (req) => (
  casino.standDiceBlackjack(req.user.id, parseSessionId(req.params.sessionId))
)));

router.post('/crash/start', authRequired, handle(async (req) => (
  casino.startCrash(req.user.id, req.body.betAmount)
)));

router.post('/crash/:sessionId/cashout', authRequired, handle(async (req) => (
  casino.cashoutCrash(req.user.id, parseSessionId(req.params.sessionId))
)));

router.post('/russian-roulette/start', authRequired, handle(async (req) => (
  casino.startRussianRoulette(req.user.id, req.body.betAmount ?? 30)
)));

router.post('/russian-roulette/:sessionId/pull', authRequired, handle(async (req) => (
  casino.pullRussianRoulette(req.user.id, parseSessionId(req.params.sessionId))
)));

router.post('/russian-roulette/:sessionId/cashout', authRequired, handle(async (req) => (
  casino.cashoutRussianRoulette(req.user.id, parseSessionId(req.params.sessionId))
)));

module.exports = router;
