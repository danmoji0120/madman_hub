const TOTAL_DAILY_LIMIT = 30;

const games = {
  roulette: {
    code: 'roulette',
    name: '룰렛',
    type: 'instant',
    minBet: 10,
    dailyLimit: 20,
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
    dailyLimit: 10,
    rules: '21을 넘지 않으면서 딜러보다 높은 합계를 만드세요. 딜러는 17 이상까지 굴립니다.',
    payoutTable: [
      { label: '일반 승리', multiplier: 2 },
      { label: '정확히 21 승리', multiplier: 2.5 },
      { label: '무승부', multiplier: 1 }
    ]
  },
  crash: {
    code: 'crash',
    name: '크래시',
    type: 'session',
    minBet: 10,
    dailyLimit: 10,
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
    minBet: 30,
    fixedBet: 30,
    dailyLimit: 10,
    rules: '고정 참가비 30P. 방아쇠를 당긴 뒤 생존 보상을 받고 멈추거나 계속 도전하세요.',
    rewardTable: { 1: 40, 2: 65, 3: 110, 4: 190, 5: 350 }
  }
};

function getGame(gameCode) {
  return games[gameCode];
}

function getPublicGames() {
  return Object.values(games).map((game) => ({
    ...game,
    maxBetRule: game.fixedBet ? `${game.fixedBet}P fixed` : 'min(500P, balance * 0.5)',
    totalDailyLimit: TOTAL_DAILY_LIMIT
  }));
}

module.exports = {
  TOTAL_DAILY_LIMIT,
  games,
  getGame,
  getPublicGames
};
