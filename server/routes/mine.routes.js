const express = require('express');
const authRequired = require('../middleware/auth');
const { getMineStatus, listMineHistory, digMine } = require('../services/mine.service');

const router = express.Router();

router.use(authRequired);

function handle(task) {
  return async (req, res) => {
    try {
      return res.json({ success: true, ...(await task(req)) });
    } catch (error) {
      if (!error.status || error.status >= 500) console.error('Mine API failed:', error);
      return res.status(error.status || 400).json({
        success: false,
        message: error.message || '광산 처리 중 오류가 발생했습니다.',
        retryAfterMs: error.retryAfterMs
      });
    }
  };
}

router.get('/status', handle(async (req) => getMineStatus(req.user.id)));
router.get('/history', handle(async (req) => listMineHistory(req.user.id, Number(req.query.limit || 20))));
router.post('/dig', handle(async (req) => digMine(req.user.id)));

module.exports = router;
