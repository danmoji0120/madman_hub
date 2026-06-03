const casinoBalanceConfig = {
  russianRoulette: {
    baseBet: 30,
    cashoutPayouts: {
      1: 32,
      2: 38,
      3: 58,
      4: 105,
      5: 210
    },
    targetReturnRate: { min: 0.85, max: 0.93 }
  },
  diceBlackjack: {
    winPayoutMultiplier: 1.85,
    specialWinPayoutMultiplier: 2.15,
    tiePolicy: 'push',
    dealerHitUntil: 16,
    dealerStandAt: 17,
    targetReturnRate: { min: 0.92, max: 0.97 }
  },
  roulette: {
    targetReturnRate: { min: 0.9, max: 0.96 }
  },
  crash: {
    targetReturnRate: { min: 0.9, max: 0.96 }
  }
};

function targetForGame(gameKey) {
  if (gameKey === 'russian_roulette') return casinoBalanceConfig.russianRoulette.targetReturnRate;
  if (gameKey === 'dice_blackjack') return casinoBalanceConfig.diceBlackjack.targetReturnRate;
  if (gameKey === 'roulette') return casinoBalanceConfig.roulette.targetReturnRate;
  if (gameKey === 'crash') return casinoBalanceConfig.crash.targetReturnRate;
  return { min: 0.9, max: 0.96 };
}

function balanceStatus(returnRate, gameKey = '') {
  const target = targetForGame(gameKey);
  if (returnRate > 1.05) return { code: 'critical_user_edge', label: '유저 유리 / 즉시 조정 필요' };
  if (returnRate > 1) return { code: 'user_edge', label: '유저 약우세 / 관측 필요' };
  if (returnRate >= target.min && returnRate <= target.max) return { code: 'normal', label: '정상' };
  if (returnRate >= 0.8) return { code: 'house_edge', label: '카지노 강세 / 너무 짤 수 있음' };
  return { code: 'too_harsh', label: '과도한 너프 위험' };
}

module.exports = {
  casinoBalanceConfig,
  targetForGame,
  balanceStatus
};
