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
router.post('/recruit-board/hire', handle(async (req) => {
  const userId = req.user?.id;
  const mercenaryId = String(req.body?.mercenaryId || '');
  console.log('[mercenary/hire] userId:', userId || null);
  console.log('[mercenary/hire] cookie:', req.headers.cookie ? 'exists' : 'missing');
  console.log('[mercenary/hire] mercenaryId:', mercenaryId || null);
  const payload = await mercenarySystem.hireRecruitCandidate(userId, mercenaryId);
  console.log('[mercenary/hire] savedMercenaryId:', payload.hired?.mercenaryId || payload.hired?.id || null);
  return payload;
}));
router.get('/squads', handle((req) => mercenarySystem.listSquads(req.user.id)));
router.post('/squads', handle((req) => mercenarySystem.createSquad(req.user.id, req.body)));
router.patch('/squads/:id', handle((req) => mercenarySystem.updateSquad(req.user.id, req.params.id, req.body)));
router.delete('/squads/:id', handle((req) => mercenarySystem.deleteSquad(req.user.id, req.params.id)));
router.get('/missions', handle((req) => mercenarySystem.listMissions(req.user.id)));
router.post('/mission-offers/reject', handle((req) => mercenarySystem.rejectMissionOffer(req.user.id, req.body?.offerId)));
router.get('/runs', handle((req) => mercenarySystem.listRuns(req.user.id)));
router.post('/runs/start', handle((req) => mercenarySystem.startMissionRun(req.user.id, req.body)));
router.post('/runs/claim', handle((req) => mercenarySystem.claimMissionRun(req.user.id, req.body?.runId)));
router.get('/infirmary', handle((req) => mercenarySystem.getInfirmaryState(req.user.id)));
router.post('/infirmary/treat/start', handle((req) => mercenarySystem.startTreatment(req.user.id, req.body?.ownedMercenaryId)));
router.post('/infirmary/treat/claim', handle((req) => mercenarySystem.claimTreatment(req.user.id, req.body?.treatmentId)));
router.get('/my', handle(async (req) => {
  const userId = req.user?.id;
  console.log('[mercenary/my] userId:', userId || null);
  console.log('[mercenary/my] cookie:', req.headers.cookie ? 'exists' : 'missing');
  const payload = await mercenarySystem.listMyMercenaries(userId);
  console.log('[mercenary/my] rows:', payload.items?.length ?? 0);
  return payload;
}));

module.exports = router;
