const express = require('express');
const {
  httpError,
  getPublicSeasons,
  getPublicCurrentSeason,
  getPublicSeason,
  getPublicRankings,
  getPublicRankingSummary,
  getPublicHallOfFame,
  getHallOfFameSummary
} = require('../services/seasons.service');

const router = express.Router();

function safe(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseId(value, name) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, `${name} must be a positive integer.`);
  return id;
}

function parseLimit(value) {
  if (value === undefined) return 10;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) throw httpError(400, 'limit must be a positive integer.');
  return Math.min(limit, 50);
}

function parseOffset(value) {
  if (value === undefined) return 0;
  const offset = Number(value);
  if (!Number.isInteger(offset) || offset < 0) throw httpError(400, 'offset must be a non-negative integer.');
  return offset;
}

router.get('/', safe(async (req, res) => res.json({
  success: true,
  ...(await getPublicSeasons(typeof req.query.status === 'string' ? req.query.status.trim() : ''))
})));

router.get('/current/rankings', safe(async (req, res) => {
  return res.json({ success: true, ...(await getPublicRankingSummary({ limit: parseLimit(req.query.limit) })) });
}));

router.get('/current/rankings/:category', safe(async (req, res) => {
  return res.json({
    success: true,
    ...(await getPublicRankings({
      category: req.params.category,
      limit: parseLimit(req.query.limit),
      offset: parseOffset(req.query.offset)
    }))
  });
}));

router.get('/current', safe(async (req, res) => {
  if (!req.query.category && !req.query.limit) {
    return res.json({ success: true, ...(await getPublicCurrentSeason()) });
  }
  const data = await getPublicRankings({
    category: typeof req.query.category === 'string' ? req.query.category.trim() : 'activity_score',
    limit: parseLimit(req.query.limit)
  });
  return res.json({ success: true, ...data });
}));

router.get('/hall-of-fame', safe(async (req, res) => {
  if (!req.query.seasonId) return res.json({ success: true, ...(await getHallOfFameSummary()) });
  const data = await getPublicHallOfFame({
    seasonId: parseId(req.query.seasonId, 'seasonId'),
    category: typeof req.query.category === 'string' ? req.query.category.trim() : ''
  });
  return res.json({ success: true, ...data });
}));

router.get('/:id/hall-of-fame', safe(async (req, res) => {
  const data = await getPublicHallOfFame({
    seasonId: parseId(req.params.id, 'season id'),
    category: typeof req.query.category === 'string' ? req.query.category.trim() : ''
  });
  return res.json({ success: true, ...data });
}));

router.get('/:id/rankings/:category', safe(async (req, res) => {
  const data = await getPublicRankings({
    seasonId: parseId(req.params.id, 'season id'),
    category: req.params.category,
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, ...data });
}));

router.get('/:id/rankings', safe(async (req, res) => {
  const data = await getPublicRankings({
    seasonId: parseId(req.params.id, 'season id'),
    category: typeof req.query.category === 'string' ? req.query.category.trim() : 'activity_score',
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, ...data });
}));

router.get('/:id', safe(async (req, res) => {
  return res.json({ success: true, ...(await getPublicSeason(parseId(req.params.id, 'season id'))) });
}));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : '시즌 랭킹 조회 중 오류가 발생했습니다.'
  });
});

module.exports = router;
