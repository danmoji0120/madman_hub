const express = require('express');
const { all } = require('../db');
const { getRandomPost } = require('../services/posts.service');

const router = express.Router();

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

router.get('/today', async (req, res) => {
  const members = await all(
    `SELECT u.id, u.display_name, p.nickname, p.title, p.danger_level
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id`
  );

  const randomQuote = await getRandomPost();

  return res.json({
    success: true,
    madmanOfTheDay: pickRandom(members),
    randomQuote,
    message: '오늘도 정상인 척 실패한 하루입니다.'
  });
});

module.exports = router;
