const express = require('express');
const authRequired = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const config = require('../config/community.config');
const { listPublicSongs, createSong, randomSong, getTodaySong } = require('../services/songs.service');

const router = express.Router();

router.get('/config', (req, res) => res.json({ success: true, config }));
router.get('/random', optionalAuth, async (req, res) => handle(res, () => randomSong(req.user?.id)));
router.get('/today', async (req, res) => handle(res, async () => {
  const song = await getTodaySong();
  if (!song) {
    const error = new Error('아직 추천된 노래가 없습니다.');
    error.status = 404;
    throw error;
  }
  return { song };
}));
router.get('/', async (req, res) => handle(res, async () => ({
  songs: await listPublicSongs({
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    tag: typeof req.query.tag === 'string' ? req.query.tag.trim() : '',
    limit: Math.min(Math.max(Number(req.query.limit) || 50, 1), 100),
    offset: Math.max(Number(req.query.offset) || 0, 0)
  })
})));
router.post('/', authRequired, async (req, res) => handle(res, () => createSong({ userId: req.user.id, ...req.body })));

async function handle(res, task) {
  try {
    return res.json({ success: true, ...(await task()) });
  } catch (error) {
    if (!error.status || error.status >= 500) console.error('Songs API failed:', error);
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

module.exports = router;
