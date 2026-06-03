const POINT_SCORE_CATEGORIES = new Set([
  'point_earned',
  'point_spent',
  'net_points',
  'casino_profit',
  'casino_loss',
  'cosmetic_spent',
  'balance_peak',
  'drawdown',
  'casino_net_profit',
  'casino_net_loss',
  'biggest_casino_win',
  'biggest_casino_loss',
  'blackjack_profit',
  'balance',
  'amount',
  'points',
  'point'
]);

const COUNT_SCORE_CATEGORIES = new Set([
  'casino_plays',
  'post_count',
  'comment_count',
  'song_count',
  'daily_mission_count',
  'attendance_count',
  'activity_score'
]);

const PERCENT_SCORE_CATEGORIES = new Set([
  'drawdown_rate',
  'point_turnover'
]);

const koNumberFormatter = new Intl.NumberFormat('ko-KR');

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value, fallback = '0') {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return koNumberFormatter.format(number);
}

function formatPoints(value, options = {}) {
  const unit = options.longUnit ? '포인트' : 'P';
  return `${formatNumber(toFiniteNumber(value))} ${unit}`;
}

function formatCount(value, unit = '회') {
  return `${formatNumber(toFiniteNumber(value))}${unit}`;
}

function formatPercent(value) {
  const percent = toFiniteNumber(value) / 10;
  return `${koNumberFormatter.format(Number(percent.toFixed(1)))}%`;
}

function formatSignedPoints(value, options = {}) {
  const number = toFiniteNumber(value);
  return `${number > 0 ? '+' : ''}${formatPoints(number, options)}`;
}

function formatRankingScore(category, score, options = {}) {
  const normalizedCategory = String(category || '').trim();
  if (POINT_SCORE_CATEGORIES.has(normalizedCategory)) return formatPoints(score, options);
  if (PERCENT_SCORE_CATEGORIES.has(normalizedCategory)) return formatPercent(score);
  if (COUNT_SCORE_CATEGORIES.has(normalizedCategory)) return formatCount(score, options.unit || '회');
  return formatCount(score, options.unit || '회');
}
