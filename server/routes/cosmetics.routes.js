const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const authRequired = require('../middleware/auth');
const { getShop, buyCosmetic } = require('../services/cosmetics.service');

const router = express.Router();

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    const error = new Error('올바른 꾸미기 아이템 ID가 필요합니다.');
    error.status = 400;
    throw error;
  }
  return id;
}

router.get('/shop', optionalAuth, async (req, res) => {
  try {
    return res.json({ success: true, items: await getShop({ userId: req.user?.id, type: req.query.type, rarity: req.query.rarity }) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

router.post('/:id/buy', authRequired, async (req, res) => {
  try {
    return res.json({ success: true, ...(await buyCosmetic({ user: req.user, cosmeticId: parseId(req.params.id) })) });
  } catch (error) {
    return res.status(error.status || error.statusCode || 500).json({ success: false, message: error.message });
  }
});

module.exports = router;
