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
        message: error.message || '용병 시스템 처리 중 오류가 발생했습니다.',
        ...(Array.isArray(error.reasons) ? { reasons: error.reasons } : {})
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
router.post('/battles/claim', handle((req) => mercenarySystem.claimBattleResult(req.user.id, req.body)));
router.get('/combat-stage-clears', handle((req) => mercenarySystem.listCombatStageClears(req.user.id)));
router.get('/inventory', handle((req) => mercenarySystem.getUserInventory(req.user.id, req.query || {})));
router.get('/inventory/summary', handle((req) => mercenarySystem.getUserInventorySummary(req.user.id)));
router.get('/equipment-slots', handle((req) => mercenarySystem.listUserEquipmentSlots(req.user.id)));
router.get('/representative', handle((req) => mercenarySystem.getRepresentativeMercenary(req.user.id)));
router.patch('/representative', handle((req) => mercenarySystem.setRepresentativeMercenary(req.user.id, req.body?.userMercenaryId)));
router.get('/blacksmith/summary', handle((req) => mercenarySystem.getBlacksmithSummary(req.user.id)));
router.post('/blacksmith/disassemble', handle((req) => mercenarySystem.disassembleBlacksmithEquipment(req.user.id, req.body || {})));
router.post('/blacksmith/enhance', handle((req) => mercenarySystem.enhanceBlacksmithEquipment(req.user.id, req.body || {})));
router.patch('/my/:userMercenaryId/lock', handle((req) => mercenarySystem.setOwnedMercenaryLock(req.user.id, req.params.userMercenaryId, req.body?.locked)));
router.post('/my/:userMercenaryId/lock', handle((req) => mercenarySystem.setOwnedMercenaryLock(req.user.id, req.params.userMercenaryId, req.body?.locked)));
router.post('/my/:userMercenaryId/dismiss', handle((req) => mercenarySystem.dismissOwnedMercenary(req.user.id, req.params.userMercenaryId, req.body || {})));
router.get('/my/:userMercenaryId/equipment', handle((req) => mercenarySystem.getUserMercenaryEquipment(req.user.id, req.params.userMercenaryId)));
router.post('/my/:userMercenaryId/equipment/equip', handle((req) => mercenarySystem.equipInventoryItem(req.user.id, req.params.userMercenaryId, req.body?.inventoryItemId)));
router.delete('/my/:userMercenaryId/equipment/:slot', handle((req) => mercenarySystem.unequipSlot(req.user.id, req.params.userMercenaryId, req.params.slot)));
router.get('/infirmary', handle((req) => mercenarySystem.getInfirmaryState(req.user.id)));
router.post('/infirmary/treat/start', handle((req) => mercenarySystem.startTreatment(req.user.id, req.body?.ownedMercenaryId)));
router.post('/infirmary/treat/claim', handle((req) => mercenarySystem.claimTreatment(req.user.id, req.body?.treatmentId)));
router.get('/office', handle((req) => mercenarySystem.buildMercenaryOfficeView(req.user.id)));
router.post('/office/assign', handle((req) => mercenarySystem.assignMercenaryToOffice(req.user.id, req.body)));
router.post('/office/unassign', handle((req) => mercenarySystem.unassignMercenaryFromOffice(req.user.id, req.body)));
router.get('/cases', handle((req) => mercenarySystem.listCases(req.user.id)));
router.get('/cases/:caseId', handle((req) => mercenarySystem.getCaseDetail(req.user.id, req.params.caseId)));
router.post('/cases/:caseId/start', handle((req) => mercenarySystem.startCaseFile(req.user.id, req.params.caseId)));
router.post('/cases/:caseId/steps/:stepId/start', handle((req) => mercenarySystem.startCaseStepRun(req.user.id, req.params.caseId, req.params.stepId, req.body)));
router.post('/cases/:caseId/steps/:stepId/claim', handle((req) => mercenarySystem.claimCaseStepRun(req.user.id, req.params.caseId, req.params.stepId)));
router.post('/cases/:caseId/reward/claim', handle((req) => mercenarySystem.claimCaseReward(req.user.id, req.params.caseId)));
router.get('/my', handle(async (req) => {
  const userId = req.user?.id;
  console.log('[mercenary/my] userId:', userId || null);
  console.log('[mercenary/my] cookie:', req.headers.cookie ? 'exists' : 'missing');
  const payload = await mercenarySystem.listMyMercenaries(userId);
  console.log('[mercenary/my] rows:', payload.items?.length ?? 0);
  return payload;
}));

module.exports = router;
