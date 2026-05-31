const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get } = require('../db');
const { logActivity } = require('../services/activity.service');
require('dotenv').config();

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ success: false, message: '이메일, 비밀번호, 표시 이름이 필요합니다.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) {
      return res.status(409).json({ success: false, message: '이미 가입된 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await run(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, displayName, 'member']
    );

    await run(
      'INSERT INTO user_profiles (user_id, nickname, title, bio, danger_level) VALUES (?, ?, ?, ?, ?)',
      [created.id, displayName, '신규 격리 대상', '아직 자기소개를 쓰지 않은 수상한 인물입니다.', 3]
    );

    await run('INSERT INTO point_accounts (user_id, balance, total_earned, total_spent) VALUES (?, 0, 0, 0)', [created.id]);

    const defaultTitle = await get('SELECT id FROM titles WHERE name = ?', ['신규 격리 대상']);
    if (defaultTitle) {
      await run(
        'INSERT OR IGNORE INTO user_titles (user_id, title_id, source) VALUES (?, ?, ?)',
        [created.id, defaultTitle.id, 'default']
      );
    }

    const user = await get('SELECT id, email, display_name, role FROM users WHERE id = ?', [created.id]);
    const token = createToken(user);
    await logActivity({
      userId: created.id,
      action: 'user_registered',
      platform: 'hub',
      metadata: { displayName },
      isPublic: true
    });

    return res.json({ success: true, token, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '회원가입 중 오류가 발생했습니다.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: '이메일과 비밀번호가 필요합니다.' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    await run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const safeUser = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role
    };

    const token = createToken(safeUser);
    return res.json({ success: true, token, user: safeUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '로그인 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
