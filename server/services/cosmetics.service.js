const { provider, run } = require('../db');
const { ensurePointAccount, addPointTransaction } = require('./points.service');
const { logActivity } = require('./activity.service');
const { buyCosmeticTransaction } = require('../repositories/rpc.repo');
const {
  listCosmetics,
  getCosmetic,
  getOwnedCosmetics,
  getEquippedCosmetics,
  getOwnership,
  addOwnership,
  equipCosmetic: saveEquip,
  unequipCosmetic: saveUnequip,
  createCosmetic,
  updateCosmetic,
  setCosmeticActive
} = require('../repositories/cosmetics.repo');
const { COSMETIC_TYPES, COSMETIC_RARITIES } = require('../config/cosmetics.config');

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function validateType(value, required = false) {
  const type = typeof value === 'string' ? value.trim() : '';
  if (!type && !required) return '';
  if (!COSMETIC_TYPES.includes(type)) throw httpError(400, '꾸미기 타입이 올바르지 않습니다.');
  return type;
}

function validateRarity(value, required = false) {
  const rarity = typeof value === 'string' ? value.trim() : '';
  if (!rarity && !required) return '';
  if (!COSMETIC_RARITIES.includes(rarity)) throw httpError(400, '희귀도가 올바르지 않습니다.');
  return rarity;
}

function cleanText(value, name, maxLength, required = false) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw httpError(400, `${name} 형식이 올바르지 않습니다.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw httpError(400, `${name}이 필요합니다.`);
  if (cleaned.length > maxLength) throw httpError(400, `${name}은 ${maxLength}자 이하여야 합니다.`);
  return cleaned;
}

function normalizeAdminInput(body, partial = false) {
  const code = cleanText(body.code, 'code', 60, !partial);
  const name = cleanText(body.name, 'name', 80, !partial);
  const description = cleanText(body.description, 'description', 300);
  const type = body.type === undefined && partial ? undefined : validateType(body.type, true);
  const rarity = body.rarity === undefined && partial ? undefined : validateRarity(body.rarity || 'common', true);
  const price = body.price;
  const cssClass = cleanText(body.cssClass ?? body.css_class, 'cssClass', 100, !partial);
  const previewText = cleanText(body.previewText ?? body.preview_text, 'previewText', 100);
  const isAdminOnly = body.isAdminOnly ?? body.is_admin_only;
  if (price !== undefined && (!Number.isInteger(price) || price < 0)) throw httpError(400, 'price는 0 이상의 정수여야 합니다.');
  if (isAdminOnly !== undefined && typeof isAdminOnly !== 'boolean') throw httpError(400, 'isAdminOnly는 boolean이어야 합니다.');
  return {
    ...(code !== undefined ? { code } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(rarity !== undefined ? { rarity } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(cssClass !== undefined ? { css_class: cssClass } : {}),
    ...(previewText !== undefined ? { preview_text: previewText } : {}),
    ...(isAdminOnly !== undefined ? { is_admin_only: isAdminOnly } : {})
  };
}

async function getShop({ userId = null, type = '', rarity = '' } = {}) {
  return listCosmetics({ activeOnly: true, type: validateType(type), rarity: validateRarity(rarity), userId });
}

async function buyCosmetic({ user, cosmeticId }) {
  if (provider === 'supabase') {
    const result = await buyCosmeticTransaction(user.id, cosmeticId);
    if (result.purchased) {
      await logActivity({ userId: user.id, action: 'cosmetic_purchased', metadata: { cosmeticId, itemName: result.cosmetic.name }, isPublic: true });
    }
    return result;
  }

  let started = false;
  try {
    await run('BEGIN IMMEDIATE TRANSACTION');
    started = true;
    const cosmetic = await getCosmetic(cosmeticId);
    if (!cosmetic || !cosmetic.isActive) throw httpError(404, '구매할 수 없는 꾸미기 아이템입니다.');
    if (cosmetic.isAdminOnly && !['admin', 'owner'].includes(user.role)) throw httpError(403, '관리자 전용 꾸미기 아이템입니다.');
    await ensurePointAccount(user.id);
    if (await getOwnership(user.id, cosmeticId)) {
      await run('ROLLBACK');
      started = false;
      return { purchased: false, alreadyOwned: true, cosmetic, account: await ensurePointAccount(user.id) };
    }
    if (cosmetic.price > 0) {
      await addPointTransaction({
        userId: user.id,
        amount: -cosmetic.price,
        type: 'cosmetic_purchase',
        reason: `꾸미기 아이템 구매: ${cosmetic.name}`,
        sourcePlatform: 'hub-cosmetics',
        sourceId: String(cosmetic.id),
        createdBy: user.id
      });
    }
    await addOwnership(user.id, cosmetic.id);
    await run('COMMIT');
    started = false;
    await logActivity({ userId: user.id, action: 'cosmetic_purchased', metadata: { cosmeticId, itemName: cosmetic.name }, isPublic: true });
    return { purchased: true, alreadyOwned: false, cosmetic, account: await ensurePointAccount(user.id) };
  } catch (error) {
    if (started) await run('ROLLBACK').catch(() => {});
    if (error.message === '포인트가 부족합니다.') throw httpError(400, error.message, 'insufficient_points');
    throw error;
  }
}

async function getMyCosmetics(userId) {
  return { items: await getOwnedCosmetics(userId), equips: await getEquippedCosmetics(userId) };
}

async function equipCosmetic({ userId, type, cosmeticId }) {
  const validType = validateType(type, true);
  const cosmetic = await getCosmetic(cosmeticId);
  if (!cosmetic || !(await getOwnership(userId, cosmeticId))) throw httpError(403, '보유한 꾸미기 아이템만 장착할 수 있습니다.');
  if (cosmetic.type !== validType) throw httpError(400, '아이템 타입과 장착 슬롯이 일치하지 않습니다.');
  await saveEquip(userId, validType, cosmeticId);
  return getEquippedCosmetics(userId);
}

async function unequipCosmetic({ userId, type }) {
  const validType = validateType(type, true);
  await saveUnequip(userId, validType);
  return getEquippedCosmetics(userId);
}

async function listAdminCosmetics({ type = '', rarity = '', q = '' } = {}) {
  return listCosmetics({ type: validateType(type), rarity: validateRarity(rarity), q: typeof q === 'string' ? q.trim() : '' });
}

async function createAdminCosmetic(body) {
  try {
    const input = normalizeAdminInput(body);
    return await createCosmetic({
      ...input,
      description: input.description || '',
      preview_text: input.preview_text || '',
      price: input.price ?? 0,
      rarity: input.rarity || 'common',
      is_admin_only: input.is_admin_only || false,
      is_active: true
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') throw httpError(409, '이미 존재하는 꾸미기 code입니다.');
    throw error;
  }
}

async function updateAdminCosmetic(cosmeticId, body) {
  if (!(await getCosmetic(cosmeticId))) throw httpError(404, '꾸미기 아이템을 찾을 수 없습니다.');
  return updateCosmetic(cosmeticId, normalizeAdminInput(body, true));
}

async function setAdminCosmeticActive(cosmeticId, isActive) {
  if (typeof isActive !== 'boolean') throw httpError(400, 'isActive는 boolean이어야 합니다.');
  if (!(await getCosmetic(cosmeticId))) throw httpError(404, '꾸미기 아이템을 찾을 수 없습니다.');
  return setCosmeticActive(cosmeticId, isActive);
}

module.exports = {
  httpError,
  getShop,
  buyCosmetic,
  getMyCosmetics,
  getEquippedCosmetics,
  equipCosmetic,
  unequipCosmetic,
  listAdminCosmetics,
  createAdminCosmetic,
  updateAdminCosmetic,
  setAdminCosmeticActive
};
