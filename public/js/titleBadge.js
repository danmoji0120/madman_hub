function titleBadgeClass(value) {
  const cleaned = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{0,64}$/.test(cleaned) ? cleaned : '';
}

function renderTitleBadge(title, options = {}) {
  const data = typeof title === 'string' ? { name: title } : (title || {});
  const rarity = titleBadgeClass(data.rarity || 'common');
  const cssClass = titleBadgeClass(data.cssClass || data.css_class || '');
  const compact = options.compact ? ' title-badge-compact' : '';
  const rarityLabel = options.showRarityLabel
    ? `<span class="title-rarity-label">${API.escape(String(data.rarity || 'common').toUpperCase())}</span>`
    : '';
  const icon = data.icon ? `<span class="title-icon">${API.escape(data.icon)}</span>` : '';
  return `<span class="title-badge title-rarity-${rarity || 'common'} ${cssClass}${compact}">${rarityLabel}${icon}${API.escape(data.name || data.title || '수상한 거주민')}</span>`;
}
