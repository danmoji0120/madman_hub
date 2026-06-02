const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { COSMETIC_SLOTS } = require('../config/cosmetics.config');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function normalizeItem(row) {
  if (!row) return row;
  return {
    ...row,
    is_active: Boolean(row.is_active),
    isActive: Boolean(row.is_active),
    is_admin_only: Boolean(row.is_admin_only),
    isAdminOnly: Boolean(row.is_admin_only),
    cssClass: row.css_class,
    previewText: row.preview_text || '',
    owned: Boolean(row.owned),
    equipped: Boolean(row.equipped)
  };
}

function emptyEquips() {
  return {
    profileFrame: null,
    profileBackground: null,
    nicknameColor: null,
    profileFrameClass: 'cosmetic-frame-default',
    profileBackgroundClass: 'cosmetic-bg-default',
    nicknameColorClass: 'cosmetic-name-default'
  };
}

function mapEquips(row, itemsById) {
  const result = emptyEquips();
  const pairs = [
    ['profileFrame', 'profile_frame_id', 'profileFrameClass'],
    ['profileBackground', 'profile_background_id', 'profileBackgroundClass'],
    ['nicknameColor', 'nickname_color_id', 'nicknameColorClass']
  ];
  for (const [key, column, classKey] of pairs) {
    const item = itemsById.get(row?.[column]);
    if (item) {
      result[key] = normalizeItem(item);
      result[classKey] = item.css_class;
    }
  }
  return result;
}

async function getEquippedCosmeticsByUserIds(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const result = new Map(ids.map((id) => [id, emptyEquips()]));
  if (!ids.length) return result;

  let equips;
  if (provider === 'supabase') {
    equips = assertResult(await getSupabaseAdminClient()
      .from('user_cosmetic_equips')
      .select('*')
      .in('user_id', ids)) || [];
  } else {
    equips = await all(`SELECT * FROM user_cosmetic_equips WHERE user_id IN (${ids.map(() => '?').join(',')})`, ids);
  }
  const cosmeticIds = [...new Set(equips.flatMap((row) => [
    row.profile_frame_id, row.profile_background_id, row.nickname_color_id
  ]).filter(Boolean))];
  if (!cosmeticIds.length) return result;

  let items;
  if (provider === 'supabase') {
    items = assertResult(await getSupabaseAdminClient().from('cosmetic_items').select('*').in('id', cosmeticIds)) || [];
  } else {
    items = await all(`SELECT * FROM cosmetic_items WHERE id IN (${cosmeticIds.map(() => '?').join(',')})`, cosmeticIds);
  }
  const itemsById = new Map(items.map((item) => [item.id, item]));
  equips.forEach((row) => result.set(row.user_id, mapEquips(row, itemsById)));
  return result;
}

async function getEquippedCosmetics(userId) {
  return (await getEquippedCosmeticsByUserIds([userId])).get(userId) || emptyEquips();
}

async function decoratePublicUsers(rows) {
  const equips = await getEquippedCosmeticsByUserIds(rows.map((row) => row.id ?? row.user_id));
  return rows.map((row) => ({ ...row, cosmetics: equips.get(row.id ?? row.user_id) || emptyEquips() }));
}

async function decorateAuthorRows(rows) {
  const equips = await getEquippedCosmeticsByUserIds(rows.map((row) => row.user_id));
  return rows.map((row) => ({
    ...row,
    cosmetics: row.is_anonymous ? emptyEquips() : (equips.get(row.user_id) || emptyEquips())
  }));
}

async function listCosmetics({ activeOnly = false, type = '', rarity = '', q = '', userId = null } = {}) {
  let items;
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('cosmetic_items').select('*');
    if (activeOnly) query = query.eq('is_active', true);
    if (type) query = query.eq('type', type);
    if (rarity) query = query.eq('rarity', rarity);
    if (q) query = query.or(`code.ilike.*${q.replace(/[%*,]/g, '')}*,name.ilike.*${q.replace(/[%*,]/g, '')}*,description.ilike.*${q.replace(/[%*,]/g, '')}*`);
    items = assertResult(await query.order('price').order('id')) || [];
  } else {
    const filters = [];
    const params = [];
    if (activeOnly) filters.push('is_active = 1');
    if (type) { filters.push('type = ?'); params.push(type); }
    if (rarity) { filters.push('rarity = ?'); params.push(rarity); }
    if (q) {
      filters.push('(code LIKE ? OR name LIKE ? OR description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    items = await all(`SELECT * FROM cosmetic_items ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''} ORDER BY price ASC, id ASC`, params);
  }

  if (!userId) return items.map(normalizeItem);
  const [owned, equips] = await Promise.all([getOwnedCosmetics(userId), getEquippedCosmetics(userId)]);
  const ownedIds = new Set(owned.map((item) => item.id));
  const equippedIds = new Set([equips.profileFrame?.id, equips.profileBackground?.id, equips.nicknameColor?.id].filter(Boolean));
  return items.map((item) => normalizeItem({ ...item, owned: ownedIds.has(item.id), equipped: equippedIds.has(item.id) }));
}

async function getCosmetic(cosmeticId) {
  if (provider === 'supabase') {
    return normalizeItem(assertResult(await getSupabaseAdminClient().from('cosmetic_items').select('*').eq('id', cosmeticId).maybeSingle()));
  }
  return normalizeItem(await get('SELECT * FROM cosmetic_items WHERE id = ?', [cosmeticId]));
}

async function getOwnedCosmetics(userId) {
  let rows;
  if (provider === 'supabase') {
    const owned = assertResult(await getSupabaseAdminClient().from('user_cosmetics').select('cosmetic_id,purchased_at').eq('user_id', userId)) || [];
    if (!owned.length) return [];
    const items = assertResult(await getSupabaseAdminClient().from('cosmetic_items').select('*').in('id', owned.map((item) => item.cosmetic_id))) || [];
    const dates = new Map(owned.map((item) => [item.cosmetic_id, item.purchased_at]));
    rows = items.map((item) => ({ ...item, purchased_at: dates.get(item.id), owned: true }));
  } else {
    rows = await all(
      `SELECT c.*, uc.purchased_at, 1 AS owned
       FROM user_cosmetics uc JOIN cosmetic_items c ON c.id = uc.cosmetic_id
       WHERE uc.user_id = ? ORDER BY uc.purchased_at ASC, c.id ASC`,
      [userId]
    );
  }
  const equips = await getEquippedCosmetics(userId);
  const equippedIds = new Set([equips.profileFrame?.id, equips.profileBackground?.id, equips.nicknameColor?.id].filter(Boolean));
  return rows.map((item) => normalizeItem({ ...item, equipped: equippedIds.has(item.id) }));
}

async function getOwnership(userId, cosmeticId) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('user_cosmetics').select('*').eq('user_id', userId).eq('cosmetic_id', cosmeticId).maybeSingle());
  }
  return get('SELECT * FROM user_cosmetics WHERE user_id = ? AND cosmetic_id = ?', [userId, cosmeticId]);
}

async function addOwnership(userId, cosmeticId) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('user_cosmetics').insert({ user_id: userId, cosmetic_id: cosmeticId }).select().single());
  }
  return run('INSERT INTO user_cosmetics (user_id, cosmetic_id) VALUES (?, ?)', [userId, cosmeticId]);
}

async function equipCosmetic(userId, type, cosmeticId) {
  const slot = COSMETIC_SLOTS[type];
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient()
      .from('user_cosmetic_equips')
      .upsert({ user_id: userId, [slot]: cosmeticId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single());
  }
  await run('INSERT OR IGNORE INTO user_cosmetic_equips (user_id) VALUES (?)', [userId]);
  await run(`UPDATE user_cosmetic_equips SET ${slot} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [cosmeticId, userId]);
  return get('SELECT * FROM user_cosmetic_equips WHERE user_id = ?', [userId]);
}

async function unequipCosmetic(userId, type) {
  const slot = COSMETIC_SLOTS[type];
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('user_cosmetic_equips').upsert({
      user_id: userId, [slot]: null, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).select().single());
  }
  await run('INSERT OR IGNORE INTO user_cosmetic_equips (user_id) VALUES (?)', [userId]);
  await run(`UPDATE user_cosmetic_equips SET ${slot} = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [userId]);
  return get('SELECT * FROM user_cosmetic_equips WHERE user_id = ?', [userId]);
}

async function createCosmetic(input) {
  if (provider === 'supabase') {
    return normalizeItem(assertResult(await getSupabaseAdminClient().from('cosmetic_items').insert(input).select().single()));
  }
  const created = await run(
    `INSERT INTO cosmetic_items (code, name, description, type, rarity, price, css_class, preview_text, is_active, is_admin_only)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.code, input.name, input.description, input.type, input.rarity, input.price, input.css_class, input.preview_text, input.is_active ? 1 : 0, input.is_admin_only ? 1 : 0]
  );
  return getCosmetic(created.id);
}

async function updateCosmetic(cosmeticId, input) {
  if (provider === 'supabase') {
    return normalizeItem(assertResult(await getSupabaseAdminClient().from('cosmetic_items').update({
      ...input, updated_at: new Date().toISOString()
    }).eq('id', cosmeticId).select().single()));
  }
  const current = await getCosmetic(cosmeticId);
  const next = { ...current, ...input };
  await run(
    `UPDATE cosmetic_items SET name = ?, description = ?, price = ?, rarity = ?, css_class = ?,
     preview_text = ?, is_admin_only = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [next.name, next.description, next.price, next.rarity, next.css_class, next.preview_text, next.is_admin_only ? 1 : 0, cosmeticId]
  );
  return getCosmetic(cosmeticId);
}

async function setCosmeticActive(cosmeticId, isActive) {
  if (provider === 'supabase') {
    return normalizeItem(assertResult(await getSupabaseAdminClient().from('cosmetic_items').update({
      is_active: isActive, updated_at: new Date().toISOString()
    }).eq('id', cosmeticId).select().single()));
  }
  await run('UPDATE cosmetic_items SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isActive ? 1 : 0, cosmeticId]);
  return getCosmetic(cosmeticId);
}

module.exports = {
  emptyEquips,
  decoratePublicUsers,
  decorateAuthorRows,
  listCosmetics,
  getCosmetic,
  getOwnedCosmetics,
  getEquippedCosmetics,
  getOwnership,
  addOwnership,
  equipCosmetic,
  unequipCosmetic,
  createCosmetic,
  updateCosmetic,
  setCosmeticActive
};
