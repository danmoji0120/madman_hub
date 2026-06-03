function titleBadgeClass(value) {
  const cleaned = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{0,64}$/.test(cleaned) ? cleaned : '';
}

const TITLE_BADGE_RARITIES = new Set([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'event',
  'admin',
  'punishment',
  'anonymous'
]);

const TITLE_SEASON_STYLES = new Set([
  'dominator',
  'disaster',
  'fortune',
  'archivist',
  'battle',
  'upset'
]);

function titleBadgeData(title) {
  if (typeof title === 'string') return { name: title };
  const data = title || {};
  const nested = data.equippedTitleData
    || data.equipped_title_data
    || data.titleData
    || data.title_data
    || data.authorTitleData
    || data.author_title_data;
  if (nested) return nested;
  return {
    ...data,
    name: data.name
      || data.titleName
      || data.title_name
      || data.equippedTitleName
      || data.equipped_title_name
      || data.equippedTitle
      || data.equipped_title
      || data.authorTitle
      || data.author_title
      || data.title,
    rarity: data.rarity
      || data.titleRarity
      || data.title_rarity
      || data.equippedTitleRarity
      || data.equipped_title_rarity
      || data.authorTitleRarity
      || data.author_title_rarity
  };
}

function renderTitleBadge(title, options = {}) {
  const data = options.anonymous ? { name: '익명', rarity: 'anonymous' } : titleBadgeData(title);
  if (!data?.name && !options.allowEmpty) return '';
  const rawRarity = String(data.rarity || 'common').trim().toLowerCase();
  const rarity = TITLE_BADGE_RARITIES.has(rawRarity) ? rawRarity : 'common';
  const cssClass = titleBadgeClass(data.cssClass || data.css_class || '');
  const isSeasonReward = data.category === 'season' || data.sourceType === 'season_reward' || data.source_type === 'season_reward';
  const rawSeasonStyle = String(data.seasonStyle || data.season_style || '').trim();
  const seasonStyleClass = isSeasonReward && TITLE_SEASON_STYLES.has(rawSeasonStyle)
    ? ` title-season-${rawSeasonStyle}`
    : '';
  const compact = options.compact ? ' title-badge-compact' : '';
  const rarityText = isSeasonReward ? (options.seasonLabel || 'SEASON') : rarity.toUpperCase();
  const rarityLabel = options.showRarityLabel || isSeasonReward
    ? `<span class="title-rarity-label ${isSeasonReward ? 'season-reward-label' : ''}">${API.escape(rarityText)}</span>`
    : '';
  const icon = data.icon ? `<span class="title-icon">${API.escape(data.icon)}</span>` : '';
  const name = data.name || '수상한 거주민';
  const seasonClass = isSeasonReward ? ' title-season-reward' : '';
  return `<span class="title-badge title-rarity-${rarity}${seasonClass}${seasonStyleClass} ${cssClass}${compact}">${rarityLabel}${icon}${API.escape(name)}</span>`;
}
