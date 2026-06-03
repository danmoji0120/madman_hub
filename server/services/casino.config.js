const { formatPoints } = require('../utils/formatNumbers');
const { casinoBalanceConfig } = require('../config/casinoBalance.config');

function nonNegativeNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function nonNegativeInteger(name, fallback) {
  return Math.floor(nonNegativeNumber(name, fallback));
}

const TOTAL_DAILY_LIMIT = nonNegativeInteger('CASINO_DAILY_LIMIT', 30);
const MAX_BET = nonNegativeInteger('CASINO_MAX_BET', 500);
const MAX_BET_BALANCE_RATIO = nonNegativeNumber('CASINO_MAX_BET_BALANCE_RATIO', 0.5);

const games = {
  roulette: {
    code: 'roulette',
    name: '룰렛',
    type: 'instant',
    minBet: 10,
    dailyLimit: nonNegativeInteger('CASINO_ROULETTE_DAILY_LIMIT', 20),
    rules: '베팅 후 서버가 0x부터 20x까지의 배율을 추첨합니다.',
    payoutTable: [
      { label: '0x', multiplier: 0, weight: 45 },
      { label: '0.5x', multiplier: 0.5, weight: 15 },
      { label: '1x', multiplier: 1, weight: 15 },
      { label: '2x', multiplier: 2, weight: 12 },
      { label: '3x', multiplier: 3, weight: 8 },
      { label: '5x', multiplier: 5, weight: 4 },
      { label: '20x', multiplier: 20, weight: 1 }
    ]
  },
  dice_blackjack: {
    code: 'dice_blackjack',
    name: '주사위 블랙잭',
    type: 'session',
    minBet: 20,
    dailyLimit: nonNegativeInteger('CASINO_BLACKJACK_DAILY_LIMIT', 10),
    rules: '21 이하에서 딜러보다 높은 합계를 만드세요. 딜러는 16 이하에서 굴리고 17 이상에서 멈춥니다. 동점은 베팅액 반환입니다.',
    payoutTable: [
      { label: '일반 승리', multiplier: casinoBalanceConfig.diceBlackjack.winPayoutMultiplier },
      { label: '정확히 21 승리', multiplier: casinoBalanceConfig.diceBlackjack.specialWinPayoutMultiplier },
      { label: '동점 push', multiplier: 1 }
    ]
  },
  crash: {
    code: 'crash',
    name: '크래시',
    type: 'session',
    minBet: 10,
    dailyLimit: nonNegativeInteger('CASINO_CRASH_DAILY_LIMIT', 10),
    rules: '서버가 정한 크래시 배율에 도달하기 전에 탈출하세요.',
    speedPerSecond: 0.35,
    maxMultiplier: 50,
    payoutTable: [
      { label: '1.05x ~ 1.50x', weight: 50 },
      { label: '1.50x ~ 3.00x', weight: 30 },
      { label: '3.00x ~ 8.00x', weight: 15 },
      { label: '8.00x ~ 20.00x', weight: 4 },
      { label: '20.00x ~ 50.00x', weight: 1 }
    ]
  },
  russian_roulette: {
    code: 'russian_roulette',
    name: '러시안 룰렛',
    type: 'session',
    minBet: casinoBalanceConfig.russianRoulette.baseBet,
    fixedBet: casinoBalanceConfig.russianRoulette.baseBet,
    dailyLimit: nonNegativeInteger('CASINO_RUSSIAN_DAILY_LIMIT', 10),
    rules: '초반 캐시아웃은 안전하지만 수익이 작습니다. 깊게 들어갈수록 보상은 커지지만, BB쨩은 책임지지 않아요.',
    rewardTable: casinoBalanceConfig.russianRoulette.cashoutPayouts
  }
};

function getGame(gameCode) {
  return games[gameCode];
}

function maxBetRule(game) {
  if (game.fixedBet) return `${formatPoints(game.fixedBet)} fixed`;
  const rules = [];
  if (MAX_BET > 0) rules.push(formatPoints(MAX_BET));
  if (MAX_BET_BALANCE_RATIO > 0) rules.push(`balance * ${MAX_BET_BALANCE_RATIO}`);
  return rules.length ? `min(${rules.join(', ')})` : 'balance only';
}

function getPublicGames() {
  return Object.values(games).map((game) => ({
    ...game,
    maxBetRule: maxBetRule(game),
    totalDailyLimit: TOTAL_DAILY_LIMIT
  }));
}

module.exports = {
  TOTAL_DAILY_LIMIT,
  MAX_BET,
  MAX_BET_BALANCE_RATIO,
  games,
  getGame,
  getPublicGames
};
