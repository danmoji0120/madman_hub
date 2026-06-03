const { provider, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { normalizeTitle } = require('../utils/titles');

const TITLE_BADGE_COLUMNS = `
  id, name, description, price, rarity, category, source_type,
  is_purchasable, is_reward_only, display_order, flavor_text,
  unlock_hint, css_class, icon, is_limited, is_active
`;

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function getTitleBadgesByNames(names) {
  const uniqueNames = [...new Set(names.map((name) => String(name || '').trim()).filter(Boolean))];
  if (!uniqueNames.length) return new Map();

  let rows;
  if (provider === 'supabase') {
    rows = assertResult(await getSupabaseAdminClient()
      .from('titles')
      .select(TITLE_BADGE_COLUMNS.replace(/\s+/g, ' ').trim())
      .in('name', uniqueNames)) || [];
  } else {
    rows = await all(
      `SELECT ${TITLE_BADGE_COLUMNS} FROM titles WHERE name IN (${uniqueNames.map(() => '?').join(',')})`,
      uniqueNames
    );
  }

  return new Map(rows.map((row) => [row.name, normalizeTitle(row)]));
}

function attachTitleBadge(row, title, prefix = 'title') {
  if (!title) return row;
  const camelData = `${prefix}Data`;
  const snakeData = `${prefix.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}_data`;
  const camelRarity = `${prefix}Rarity`;
  const snakeRarity = `${prefix.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}_rarity`;
  return {
    ...row,
    [camelData]: title,
    [snakeData]: title,
    [camelRarity]: title.rarity,
    [snakeRarity]: title.rarity
  };
}

module.exports = {
  getTitleBadgesByNames,
  attachTitleBadge
};
