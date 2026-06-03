const assert = require('assert');
const { casinoBalanceConfig } = require('../server/config/casinoBalance.config');

function seededRandom(seed = 7) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function simulateRussianRoulette(iterations = 10000) {
  const bet = casinoBalanceConfig.russianRoulette.baseBet;
  return Object.entries(casinoBalanceConfig.russianRoulette.cashoutPayouts).map(([stepText, payout]) => {
    const step = Number(stepText);
    const surviveProbability = (6 - step) / 6;
    const expectedPayout = payout * surviveProbability;
    return {
      cashoutStep: step,
      bet,
      payout,
      expectedReturnRate: expectedPayout / bet,
      expectedNet: expectedPayout - bet,
      iterations
    };
  });
}

function simulateDiceBlackjack(iterations = 10000, seed = 7) {
  const random = seededRandom(seed);
  const die = () => 1 + Math.floor(random() * 6);
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const betAmount = 100;
  let totalBet = 0;
  let totalPayout = 0;
  const config = casinoBalanceConfig.diceBlackjack;

  for (let index = 0; index < iterations; index += 1) {
    totalBet += betAmount;
    const playerDice = [die(), die()];
    const dealerDice = [die(), die()];
    while (sum(playerDice) < config.dealerStandAt) playerDice.push(die());
    const playerTotal = sum(playerDice);
    if (playerTotal > 21) continue;
    while (sum(dealerDice) <= config.dealerHitUntil) dealerDice.push(die());
    const dealerTotal = sum(dealerDice);
    if (dealerTotal > 21 || playerTotal > dealerTotal) {
      totalPayout += Math.floor(betAmount * (playerTotal === 21
        ? config.specialWinPayoutMultiplier
        : config.winPayoutMultiplier));
    } else if (playerTotal === dealerTotal && config.tiePolicy === 'push') {
      totalPayout += betAmount;
    }
  }

  return {
    iterations,
    totalBet,
    totalPayout,
    returnRate: totalPayout / totalBet,
    net: totalPayout - totalBet
  };
}

function runAssertions() {
  const russian = simulateRussianRoulette(10000);
  const stepTwo = russian.find((item) => item.cashoutStep === 2);
  assert.ok(stepTwo.expectedReturnRate < 1, `Russian step 2 return rate too high: ${stepTwo.expectedReturnRate}`);
  const blackjack = simulateDiceBlackjack(50000);
  assert.ok(blackjack.returnRate < 1.05, `Blackjack return rate too high: ${blackjack.returnRate}`);
  return { russian, blackjack };
}

if (require.main === module) {
  const result = runAssertions();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  simulateRussianRoulette,
  simulateDiceBlackjack,
  runAssertions
};
