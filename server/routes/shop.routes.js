const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const authRequired = require('../middleware/auth');
const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { addPointTransaction, ensurePointAccount } = require('../services/points.service');
const { logActivity } = require('../services/activity.service');
const { checkAndUnlockAchievements } = require('../services/achievement.service');
const { buyTitleTransaction } = require('../repositories/rpc.repo');
const { normalizeTitle, validateTitleTaxonomy } = require('../utils/titles');

const router = express.Router();

function parseBoolean(value) {
  if (value === undefined) return null;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function cleanFilters(query) {
  const filters = {
    rarity: typeof query.rarity === 'string' ? query.rarity.trim() : '',
    category: typeof query.category === 'string' ? query.category.trim() : '',
    sourceType: typeof (query.sourceType || query.source_type) === 'string' ? (query.sourceType || query.source_type).trim() : '',
    purchasable: parseBoolean(query.purchasable),
    owned: parseBoolean(query.owned),
    q: typeof query.q === 'string' ? query.q.trim() : ''
  };
  const error = validateTitleTaxonomy(filters);
  if (error) {
    const thrown = new Error(error);
    thrown.status = 400;
    throw thrown;
  }
  return filters;
}

async function listSupabaseShopTitles(userId, filters) {
  let query = getSupabaseAdminClient().from('titles').select('*').eq('is_active', true);
  if (filters.rarity) query = query.eq('rarity', filters.rarity);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.sourceType) query = query.eq('source_type', filters.sourceType);
  if (filters.purchasable !== null) query = query.eq('is_purchasable', filters.purchasable);
  if (filters.q) {
    const pattern = `*${filters.q.replace(/[%*,]/g, '')}*`;
    query = query.or(['name', 'description', 'flavor_text', 'unlock_hint'].map((column) => `${column}.ilike.${pattern}`).join(','));
  }
  const result = await query.order('display_order', { ascending: true }).order('price', { ascending: true }).order('id', { ascending: true });
  if (result.error) throw result.error;
  const owned = userId
    ? await getSupabaseAdminClient().from('user_titles').select('title_id').eq('user_id', userId)
    : { data: [] };
  if (owned.error) throw owned.error;
  const ownedIds = new Set((owned.data || []).map((item) => item.title_id));
  return (result.data || [])
    .map((title) => normalizeTitle({ ...title, owned: ownedIds.has(title.id) }))
    .filter((title) => filters.owned === null || title.owned === filters.owned);
}

async function listSqliteShopTitles(userId, filters) {
  const params = [];
  let ownedJoin = 'LEFT JOIN user_titles ut ON 1 = 0';
  if (userId) {
    ownedJoin = 'LEFT JOIN user_titles ut ON ut.title_id = t.id AND ut.user_id = ?';
    params.push(userId);
  }

  const conditions = ['t.is_active = 1'];
  if (filters.rarity) { conditions.push('t.rarity = ?'); params.push(filters.rarity); }
  if (filters.category) { conditions.push('t.category = ?'); params.push(filters.category); }
  if (filters.sourceType) { conditions.push('t.source_type = ?'); params.push(filters.sourceType); }
  if (filters.purchasable !== null) { conditions.push('t.is_purchasable = ?'); params.push(filters.purchasable ? 1 : 0); }
  if (filters.owned !== null) conditions.push(userId && filters.owned ? 'ut.title_id IS NOT NULL' : 'ut.title_id IS NULL');
  if (filters.q) {
    conditions.push('(t.name LIKE ? OR t.description LIKE ? OR t.flavor_text LIKE ? OR t.unlock_hint LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like, like);
  }

  const titles = await all(
    `SELECT t.id, t.name, t.description, t.price, t.rarity, t.category, t.source_type,
            t.is_purchasable, t.is_reward_only, t.display_order, t.flavor_text, t.unlock_hint,
            t.css_class, t.icon, t.is_limited, t.starts_at, t.ends_at, t.is_active,
            CASE WHEN ut.title_id IS NULL THEN 0 ELSE 1 END AS owned
     FROM titles t
     ${ownedJoin}
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.display_order ASC, t.price ASC, t.id ASC`,
    params
  );
  return titles.map(normalizeTitle);
}

function canBuyTitle(title) {
  return title.isPurchasable && !title.isRewardOnly && !['admin', 'punishment'].includes(title.rarity);
}

router.get('/titles', optionalAuth, async (req, res) => {
  try {
    const filters = cleanFilters(req.query);
    const titles = provider === 'supabase'
      ? await listSupabaseShopTitles(req.user?.id, filters)
      : await listSqliteShopTitles(req.user?.id, filters);
    return res.json({ success: true, titles });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : '칭호 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/titles/:id/buy', authRequired, async (req, res) => {
  const titleId = Number(req.params.id);
  if (!Number.isInteger(titleId) || titleId < 1) {
    return res.status(400).json({ success: false, message: '올바른 칭호 ID가 필요합니다.' });
  }

  let transactionStarted = false;
  try {
    if (provider === 'supabase') {
      const result = await buyTitleTransaction(req.user.id, titleId);
      const title = normalizeTitle(result.title);
      if (result.alreadyOwned) {
        return res.json({ success: true, purchased: false, alreadyOwned: true, title, account: result.account });
      }
      await logActivity({
        userId: req.user.id,
        action: 'title_purchased',
        platform: 'hub',
        metadata: { titleId: title.id, titleName: title.name, price: title.price },
        isPublic: true
      });
      const unlockedAchievements = await checkAndUnlockAchievements(req.user.id);
      const account = await ensurePointAccount(req.user.id);
      return res.json({ success: true, ...result, title, account, unlockedAchievements });
    }

    await run('BEGIN IMMEDIATE TRANSACTION');
    transactionStarted = true;
    const title = normalizeTitle(await get(
      `SELECT id, name, description, price, rarity, category, source_type, is_purchasable,
              is_reward_only, display_order, flavor_text, unlock_hint, css_class, icon,
              is_limited, starts_at, ends_at, is_active
       FROM titles WHERE id = ? AND is_active = 1`,
      [titleId]
    ));

    if (!title.id) {
      await run('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ success: false, message: '구매할 수 없는 칭호입니다.' });
    }
    if (!canBuyTitle(title)) {
      await run('ROLLBACK');
      transactionStarted = false;
      return res.status(403).json({ success: false, message: '구매할 수 없는 보상 전용 칭호입니다.' });
    }

    const owned = await get('SELECT title_id FROM user_titles WHERE user_id = ? AND title_id = ?', [req.user.id, titleId]);
    if (owned) {
      await run('ROLLBACK');
      transactionStarted = false;
      const account = await ensurePointAccount(req.user.id);
      return res.json({ success: true, purchased: false, alreadyOwned: true, message: '이미 보유한 칭호입니다.', title, account });
    }

    if (title.price > 0) {
      await addPointTransaction({
        userId: req.user.id,
        amount: -title.price,
        type: 'title_purchase',
        reason: `칭호 구매: ${title.name}`,
        sourcePlatform: 'hub-shop',
        sourceId: String(titleId),
        createdBy: req.user.id
      });
    }
    await run('INSERT INTO user_titles (user_id, title_id, source) VALUES (?, ?, ?)', [req.user.id, titleId, 'shop']);
    await run(
      'INSERT INTO title_grants (user_id, title_id, grant_type, granted_by, reason, source_id) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, titleId, 'purchase', req.user.id, `Title purchase: ${title.name}`, String(titleId)]
    );
    await run('COMMIT');
    transactionStarted = false;

    await logActivity({
      userId: req.user.id,
      action: 'title_purchased',
      platform: 'hub',
      metadata: { titleId: title.id, titleName: title.name, price: title.price },
      isPublic: true
    });
    const unlockedAchievements = await checkAndUnlockAchievements(req.user.id);
    const account = await ensurePointAccount(req.user.id);
    return res.json({ success: true, purchased: true, title, account, unlockedAchievements });
  } catch (error) {
    if (transactionStarted) await run('ROLLBACK').catch(() => {});
    if (error.status || error.statusCode) {
      return res.status(error.status || error.statusCode).json({ success: false, message: error.message });
    }
    if (error.message === '포인트가 부족합니다.') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: '칭호 구매 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
