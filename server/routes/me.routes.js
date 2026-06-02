const express = require('express');
const authRequired = require('../middleware/auth');
const { get, run, all } = require('../db');
const { ensurePointAccount, getTransactions } = require('../services/points.service');
const { logActivity } = require('../services/activity.service');
const {
  getMyCosmetics,
  getEquippedCosmetics,
  equipCosmetic,
  unequipCosmetic
} = require('../services/cosmetics.service');

const router = express.Router();

function cleanText(value, fieldName, maxLength) {
  if (value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`${fieldName} 형식이 올바르지 않습니다.`);

  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new Error(`${fieldName}은 ${maxLength}자 이하여야 합니다.`);
  return cleaned;
}

function cleanTags(tags) {
  if (tags === undefined) return null;
  if (!Array.isArray(tags)) throw new Error('태그는 배열이어야 합니다.');
  if (tags.length > 8) throw new Error('태그는 최대 8개까지 저장할 수 있습니다.');

  return tags.map((tag) => {
    if (typeof tag !== 'string') throw new Error('태그 형식이 올바르지 않습니다.');

    const cleaned = tag.trim();
    if (cleaned.length > 20) throw new Error('각 태그는 20자 이하여야 합니다.');
    return cleaned;
  }).filter(Boolean);
}

function getProfile(userId) {
  return get(
    `SELECT u.id, u.email, u.display_name, u.role, p.nickname, p.title, p.bio, p.avatar_url,
            p.danger_level, p.favorite_quote, p.tags, p.profile_theme
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
}

router.get('/', authRequired, async (req, res) => {
  const user = await getProfile(req.user.id);
  user.cosmetics = await getEquippedCosmetics(req.user.id);
  const points = await ensurePointAccount(req.user.id);
  return res.json({ success: true, user, points });
});

router.get('/cosmetics', authRequired, async (req, res) => {
  return res.json({ success: true, ...(await getMyCosmetics(req.user.id)) });
});

router.get('/cosmetics/equips', authRequired, async (req, res) => {
  return res.json({ success: true, equips: await getEquippedCosmetics(req.user.id) });
});

router.post('/cosmetics/equip', authRequired, async (req, res) => {
  try {
    const cosmeticId = Number(req.body.cosmeticId);
    if (!Number.isInteger(cosmeticId) || cosmeticId < 1) throw Object.assign(new Error('올바른 꾸미기 아이템 ID가 필요합니다.'), { status: 400 });
    return res.json({ success: true, equips: await equipCosmetic({ userId: req.user.id, type: req.body.type, cosmeticId }) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

router.post('/cosmetics/unequip', authRequired, async (req, res) => {
  try {
    return res.json({ success: true, equips: await unequipCosmetic({ userId: req.user.id, type: req.body.type }) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

router.patch('/profile', authRequired, async (req, res) => {
  try {
    const { nickname, bio, avatarUrl, dangerLevel, favoriteQuote, tags, profileTheme } = req.body;
    const cleanedNickname = cleanText(nickname, '닉네임', 30);
    const cleanedBio = cleanText(bio, '자기소개', 500);
    const cleanedAvatarUrl = cleanText(avatarUrl, '아바타 URL', 500);
    const cleanedFavoriteQuote = cleanText(favoriteQuote, '좋아하는 문장', 200);
    const cleanedProfileTheme = cleanText(profileTheme, '프로필 테마', 30);
    const cleanedTags = cleanTags(tags);

    if (dangerLevel !== undefined && (!Number.isInteger(dangerLevel) || dangerLevel < 1 || dangerLevel > 5)) {
      return res.status(400).json({ success: false, message: '위험도는 1부터 5 사이의 정수여야 합니다.' });
    }

    await run(
      `UPDATE user_profiles
       SET nickname = COALESCE(?, nickname),
           bio = COALESCE(?, bio),
           avatar_url = COALESCE(?, avatar_url),
           danger_level = COALESCE(?, danger_level),
           favorite_quote = COALESCE(?, favorite_quote),
           tags = COALESCE(?, tags),
           profile_theme = COALESCE(?, profile_theme)
       WHERE user_id = ?`,
      [
        cleanedNickname,
        cleanedBio,
        cleanedAvatarUrl,
        dangerLevel ?? null,
        cleanedFavoriteQuote,
        cleanedTags ? JSON.stringify(cleanedTags) : null,
        cleanedProfileTheme,
        req.user.id
      ]
    );

    const profile = await getProfile(req.user.id);
    return res.json({ success: true, profile });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/transactions', authRequired, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const transactions = await getTransactions(req.user.id, limit);
  return res.json({ success: true, transactions });
});

router.get('/titles', authRequired, async (req, res) => {
  const [profile, titles, account] = await Promise.all([
    getProfile(req.user.id),
    all(
      `SELECT t.id, t.name, t.description, t.rarity, ut.acquired_at, ut.source
       FROM user_titles ut
       JOIN titles t ON t.id = ut.title_id
       WHERE ut.user_id = ?
       ORDER BY ut.acquired_at ASC, t.id ASC`,
      [req.user.id]
    ),
    ensurePointAccount(req.user.id)
  ]);

  return res.json({
    success: true,
    equippedTitle: profile?.title || '',
    titles: titles.map((title) => ({
      ...title,
      equipped: title.name === profile?.title
    })),
    account
  });
});

router.post('/title/equip', authRequired, async (req, res) => {
  const titleId = Number(req.body.titleId);

  if (!Number.isInteger(titleId) || titleId < 1) {
    return res.status(400).json({ success: false, message: '올바른 칭호 ID가 필요합니다.' });
  }

  const title = await get(
    `SELECT t.id, t.name
     FROM user_titles ut
     JOIN titles t ON t.id = ut.title_id
     WHERE ut.user_id = ? AND ut.title_id = ?`,
    [req.user.id, titleId]
  );

  if (!title) {
    return res.status(403).json({ success: false, message: '보유한 칭호만 장착할 수 있습니다.' });
  }

  await run('UPDATE user_profiles SET title = ? WHERE user_id = ?', [title.name, req.user.id]);
  await logActivity({
    userId: req.user.id,
    action: 'title_equipped',
    platform: 'hub',
    metadata: { titleId: title.id, titleName: title.name },
    isPublic: true
  });
  const profile = await getProfile(req.user.id);
  return res.json({ success: true, equippedTitle: title.name, profile });
});

router.get('/achievements', authRequired, async (req, res) => {
  const achievements = await all(
    `SELECT a.id, a.code, a.name, a.description, a.category, a.reward_points,
            ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
     WHERE a.is_active = 1
     ORDER BY a.id ASC`,
    [req.user.id]
  );

  return res.json({
    success: true,
    unlocked: achievements.filter((item) => item.unlocked_at).map((item) => ({
      ...item,
      unlockedAt: item.unlocked_at
    })),
    locked: achievements.filter((item) => !item.unlocked_at)
  });
});

module.exports = router;
