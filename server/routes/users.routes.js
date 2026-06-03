const express = require('express');
const { listSeasonTrophiesForUser } = require('../services/seasonRewards.service');

const router = express.Router();

function safe(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseId(value, name) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    const error = new Error(`${name} must be a positive integer.`);
    error.status = 400;
    throw error;
  }
  return id;
}

router.get('/:id/season-trophies', safe(async (req, res) => {
  return res.json({
    success: true,
    ...(await listSeasonTrophiesForUser(parseId(req.params.id, 'user id'), {
      seasonId: req.query.seasonId,
      limit: req.query.limit,
      featuredOnly: req.query.featuredOnly
    }))
  });
}));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : 'User season trophies failed.'
  });
});

module.exports = router;
