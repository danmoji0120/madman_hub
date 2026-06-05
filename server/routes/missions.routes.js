const express = require('express');
const authRequired = require('../middleware/auth');
const { getDailyMissions, getWeeklyMissions, claimMission, claimBonus } = require('../services/dailyMissions.service');

const router = express.Router();
router.use(authRequired);

function handle(task) {
  return async (req, res) => {
    try {
      return res.json({ success: true, ...(await task(req)) });
    } catch (error) {
      if (!error.status || error.status >= 500) console.error('Missions API failed:', error);
      return res.status(error.status || 400).json({ success: false, message: error.message });
    }
  };
}

router.get('/daily', handle(async (req) => getDailyMissions(req.user.id)));
router.get('/weekly', handle(async (req) => getWeeklyMissions(req.user.id)));
router.post('/daily/bonus/:bonusCode/claim', handle(async (req) => claimBonus(req.user.id, req.params.bonusCode)));
router.post('/daily/:missionCode/claim', handle(async (req) => claimMission(req.user.id, req.params.missionCode)));
router.post('/weekly/bonus/:bonusCode/claim', handle(async (req) => claimBonus(req.user.id, req.params.bonusCode, 'weekly')));
router.post('/weekly/:missionCode/claim', handle(async (req) => claimMission(req.user.id, req.params.missionCode, 'weekly')));

module.exports = router;
