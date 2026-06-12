const express = require('express');
const authRequired = require('../middleware/auth');
const mercenarySystem = require('../services/mercenarySystem.service');

const router = express.Router();

router.use(authRequired);

function handle(task) {
  return async (req, res) => {
    try {
      const payload = await task(req);
      return res.json({ success: true, ...payload });
    } catch (error) {
      if (!error.status || error.status >= 500) console.error('Mercenary system API failed:', error);
      return res.status(error.status || 400).json({
        success: false,
        code: error.code,
        message: error.message || '용병 시스템 처리 중 오류가 발생했습니다.'
      });
    }
  };
}

router.get('/recruit-board', handle((req) => mercenarySystem.getRecruitBoard(req.user.id)));
router.post('/recruit-board/refresh', handle((req) => mercenarySystem.refreshRecruitBoard(req.user.id)));
router.post('/recruit-board/hire', handle((req) => (
  mercenarySystem.hireRecruitCandidate(req.user.id, String(req.body?.mercenaryId || ''))
)));
router.get('/my', handle((req) => mercenarySystem.listMyMercenaries(req.user.id)));

module.exports = router;
