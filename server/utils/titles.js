const TITLE_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'event', 'admin', 'punishment'];
const TITLE_CATEGORIES = ['shop', 'achievement', 'season', 'casino', 'activity', 'event', 'admin', 'punishment', 'legacy'];
const TITLE_SOURCE_TYPES = ['purchase', 'achievement', 'season_reward', 'admin_grant', 'event_reward', 'system_grant', 'legacy'];

function toBoolean(value) {
  return value === true || value === 1 || value === '1';
}

function sanitizeCssClass(value) {
  const cleaned = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{0,64}$/.test(cleaned) ? cleaned : '';
}

function normalizeTitle(row = {}) {
  const category = row.category || 'shop';
  const sourceType = row.sourceType || row.source_type || 'purchase';
  const cssClass = sanitizeCssClass(row.cssClass || row.css_class || '');
  const flavorText = row.flavorText ?? row.flavor_text ?? '';
  const unlockHint = row.unlockHint ?? row.unlock_hint ?? '';
  const isPurchasable = row.isPurchasable ?? row.is_purchasable ?? row.isPurchasableFlag ?? 1;
  const isRewardOnly = row.isRewardOnly ?? row.is_reward_only ?? 0;
  const isLimited = row.isLimited ?? row.is_limited ?? 0;
  const isActive = row.isActive ?? row.is_active ?? 1;
  const displayOrder = Number(row.displayOrder ?? row.display_order ?? 0);

  return {
    ...row,
    category,
    source_type: sourceType,
    sourceType,
    is_purchasable: toBoolean(isPurchasable),
    isPurchasable: toBoolean(isPurchasable),
    is_reward_only: toBoolean(isRewardOnly),
    isRewardOnly: toBoolean(isRewardOnly),
    display_order: displayOrder,
    displayOrder,
    flavor_text: flavorText,
    flavorText,
    unlock_hint: unlockHint,
    unlockHint,
    css_class: cssClass,
    cssClass,
    icon: row.icon || '',
    is_limited: toBoolean(isLimited),
    isLimited: toBoolean(isLimited),
    starts_at: row.startsAt ?? row.starts_at ?? null,
    startsAt: row.startsAt ?? row.starts_at ?? null,
    ends_at: row.endsAt ?? row.ends_at ?? null,
    endsAt: row.endsAt ?? row.ends_at ?? null,
    is_active: toBoolean(isActive),
    isActive: toBoolean(isActive),
    owned: toBoolean(row.owned),
    equipped: toBoolean(row.equipped)
  };
}

function validateTitleTaxonomy({ rarity, category, sourceType }) {
  if (rarity && !TITLE_RARITIES.includes(rarity)) return 'rarity is invalid.';
  if (category && !TITLE_CATEGORIES.includes(category)) return 'category is invalid.';
  if (sourceType && !TITLE_SOURCE_TYPES.includes(sourceType)) return 'sourceType is invalid.';
  return '';
}

module.exports = {
  TITLE_RARITIES,
  TITLE_CATEGORIES,
  TITLE_SOURCE_TYPES,
  normalizeTitle,
  sanitizeCssClass,
  toBoolean,
  validateTitleTaxonomy
};
