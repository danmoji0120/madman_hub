const express = require('express');
const { all } = require('../db');
const { decoratePublicUsers } = require('../repositories/cosmetics.repo');

const router = express.Router();

router.get('/', async (req, res) => {
  const members = await all(
    `SELECT u.id, u.display_name, u.role,
            p.nickname, p.title, p.bio, p.avatar_url, p.danger_level,
            p.favorite_quote, p.tags, p.profile_theme,
            pa.balance
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     LEFT JOIN point_accounts pa ON pa.user_id = u.id
     ORDER BY pa.balance DESC, u.created_at ASC`
  );

  return res.json({ success: true, members: await decoratePublicUsers(members) });
});

module.exports = router;
