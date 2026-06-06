const express = require('express');
const authRequired = require('../middleware/auth');
const mercenaries = require('../services/mercenaries.service');

const router = express.Router();

router.use(authRequired);

function handle(task) {
  return async (req, res) => {
    try {
      const payload = await task(req);
      return res.json({ success: true, ...payload });
    } catch (error) {
      if (!error.status || error.status >= 500) console.error('Mercenaries API failed:', error);
      return res.status(error.status || 400).json({
        success: false,
        code: error.code,
        message: error.message || '용병단 처리 중 오류가 발생했습니다.',
        remainingMs: error.remainingMs
      });
    }
  };
}

router.get('/overview', handle((req) => mercenaries.overview(req.user.id)));
router.get('/candidates', handle((req) => mercenaries.listCandidates(req.user.id)));
router.post('/candidates/:candidateId/hire', handle((req) => mercenaries.hireCandidate(req.user.id, req.params.candidateId)));

router.get('/', handle((req) => mercenaries.listMercenaries(req.user.id)));

router.get('/missions', handle(() => mercenaries.listMissions()));
router.post('/missions/:missionCode/start', handle((req) => (
  mercenaries.startMission(req.user.id, req.params.missionCode, req.body?.mercenaryIds)
)));

router.get('/runs', handle((req) => mercenaries.listRuns(req.user.id, req.query.status || '')));
router.post('/runs/:runId/claim', handle((req) => mercenaries.claimRun(req.user.id, req.params.runId)));

router.get('/hospital', handle((req) => mercenaries.listHospital(req.user.id)));
router.post('/:mercenaryId/treat', handle((req) => mercenaries.treatMercenary(req.user.id, req.params.mercenaryId)));

router.post('/:mercenaryId/rescue/subscribe', handle((req) => mercenaries.subscribeRescue(req.user.id, req.params.mercenaryId)));
router.post('/:mercenaryId/rescue/cancel', handle((req) => mercenaries.cancelRescue(req.user.id, req.params.mercenaryId)));

router.get('/history', handle((req) => mercenaries.listRuns(req.user.id, 'completed')));

module.exports = router;
