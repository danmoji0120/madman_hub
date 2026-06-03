const crypto = require('crypto');
const { provider } = require('../db');
const {
  createGameSession,
  createAtomicGameSession,
  getGameSessionById,
  getActiveSession,
  listActiveSessions,
  updateGameSession,
  createGameResult,
  completeAtomicGameSession,
  createAtomicInstantGameResult,
  listMyGameResults,
  countTodayGameResults,
  countTodayAllGameResults
} = require('../repositories/casino.repo');
const { ensurePointAccount, addPointTransaction } = require('./points.service');
const { logActivity } = require('./activity.service');
const { checkAndUnlockAchievements, unlockAchievementCodes } = require('./achievement.service');
const {
  TOTAL_DAILY_LIMIT,
  MAX_BET,
  MAX_BET_BALANCE_RATIO,
  games,
  getGame,
  getPublicGames
} = require('./casino.config');
const { incrementMission } = require('./dailyMissions.service');
const { formatPoints } = require('../utils/formatNumbers');

function casinoError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function randomInt(minInclusive, maxInclusive) {
  return crypto.randomInt(minInclusive, maxInclusive + 1);
}

function randomDecimal(minInclusive, maxInclusive) {
  const min = Math.ceil(minInclusive * 100);
  const max = Math.floor(maxInclusive * 100);
  return randomInt(min, max) / 100;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = randomInt(1, total);
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items.at(-1);
}

function sumDice(dice) {
  return dice.reduce((sum, value) => sum + value, 0);
}

function maxBetFor(account, game) {
  if (game.fixedBet) return game.fixedBet;
  const limits = [account.balance];
  if (MAX_BET > 0) limits.push(MAX_BET);
  if (MAX_BET_BALANCE_RATIO > 0) limits.push(Math.floor(account.balance * MAX_BET_BALANCE_RATIO));
  return Math.min(...limits);
}

function remainingFor(limit, count) {
  return limit > 0 ? Math.max(0, limit - count) : null;
}

async function validateBet({ userId, gameCode, betAmount, fixedBet = null }) {
  const game = getGame(gameCode);
  if (!game) throw casinoError('지원하지 않는 카지노 게임입니다.');
  if (!Number.isInteger(betAmount) || !Number.isFinite(betAmount) || betAmount <= 0) {
    throw casinoError('베팅 포인트는 0보다 큰 정수여야 합니다.');
  }

  const account = await ensurePointAccount(userId);
  const expectedFixedBet = fixedBet ?? game.fixedBet;
  const maxBet = maxBetFor(account, game);
  if (expectedFixedBet && betAmount !== expectedFixedBet) {
    throw casinoError(`${game.name} 참가비는 ${formatPoints(expectedFixedBet)} 고정입니다.`);
  }
  if (betAmount < game.minBet) throw casinoError(`최소 베팅은 ${formatPoints(game.minBet)}입니다.`);
  if (betAmount > maxBet) throw casinoError(`현재 최대 베팅은 ${formatPoints(maxBet)}입니다.`);
  if (betAmount > account.balance) throw casinoError('포인트가 부족합니다.');

  const [allPlayed, gamePlayed] = await Promise.all([
    countTodayAllGameResults(userId),
    countTodayGameResults(userId, gameCode)
  ]);
  if (TOTAL_DAILY_LIMIT > 0 && allPlayed >= TOTAL_DAILY_LIMIT) {
    throw casinoError('오늘의 전체 카지노 플레이 제한을 초과했습니다.', 429);
  }
  if (game.dailyLimit > 0 && gamePlayed >= game.dailyLimit) {
    throw casinoError(`오늘의 ${game.name} 플레이 제한을 초과했습니다.`, 429);
  }

  return {
    account,
    maxBet,
    remainingPlays: remainingFor(game.dailyLimit, gamePlayed),
    remainingAllPlays: remainingFor(TOTAL_DAILY_LIMIT, allPlayed)
  };
}

async function chargeBet({ userId, gameCode, betAmount }) {
  const game = getGame(gameCode);
  return addPointTransaction({
    userId,
    amount: -betAmount,
    type: 'game_bet',
    reason: `${game.name} 베팅`,
    sourcePlatform: 'hub-casino',
    createdBy: userId
  });
}

async function payOut({ userId, gameCode, amount, reason, type = 'game_payout' }) {
  if (!amount) return ensurePointAccount(userId);
  if (!Number.isInteger(amount) || amount < 0) throw casinoError('잘못된 카지노 지급액입니다.');
  return addPointTransaction({
    userId,
    amount,
    type,
    reason: reason || `${getGame(gameCode).name} 지급`,
    sourcePlatform: 'hub-casino',
    createdBy: userId
  });
}

async function refundBet({ userId, gameCode, betAmount }) {
  return payOut({
    userId,
    gameCode,
    amount: betAmount,
    type: 'game_refund',
    reason: `${getGame(gameCode).name} 세션 생성 실패 환불`
  });
}

async function checkCasinoAchievements(userId) {
  const results = await listMyGameResults(userId, 500, 0);
  const codes = new Set();
  if (results.length) codes.add('CASINO_FIRST_BET');
  if (results.some((item) => item.netAmount > 0)) codes.add('CASINO_FIRST_WIN');
  if (results.some((item) => item.netAmount < 0)) codes.add('CASINO_FIRST_LOSS');
  if (results.some((item) => item.gameCode === 'roulette' && item.state.multiplier >= 20)) codes.add('ROULETTE_JACKPOT');
  if (results.some((item) => item.gameCode === 'dice_blackjack' && item.result === 'blackjack_21')) codes.add('BLACKJACK_21');
  if (results.some((item) => item.gameCode === 'crash' && item.state.cashoutMultiplier >= 5)) codes.add('CRASH_5X');
  if (results.some((item) => item.gameCode === 'crash' && item.state.cashoutMultiplier >= 20)) codes.add('CRASH_20X');
  if (results.some((item) => item.gameCode === 'russian_roulette' && item.state.survivedCount >= 5)) codes.add('RUSSIAN_MAX_SURVIVE');
  if (results.some((item) => item.netAmount <= -100)) codes.add('CASINO_BIG_LOSS');
  if (results.some((item) => item.netAmount >= 200)) codes.add('CASINO_BIG_WIN');
  return unlockAchievementCodes(userId, [...codes]);
}

async function logCasinoFeedIfNeeded(gameResult) {
  const game = getGame(gameResult.gameCode);
  const metadata = {
    gameCode: gameResult.gameCode,
    gameName: game.name,
    betAmount: gameResult.betAmount,
    payoutAmount: gameResult.payoutAmount,
    netAmount: gameResult.netAmount,
    multiplier: gameResult.state.multiplier ?? gameResult.state.cashoutMultiplier,
    survivedCount: gameResult.state.survivedCount
  };
  let action = null;

  if (gameResult.gameCode === 'roulette') {
    if (gameResult.state.multiplier >= 20) action = 'game_jackpot';
    else if (gameResult.state.multiplier >= 5) action = 'game_big_win';
    else if (gameResult.betAmount >= 100 && gameResult.payoutAmount === 0) action = 'game_big_loss';
  } else if (gameResult.gameCode === 'dice_blackjack') {
    if (gameResult.payoutAmount >= gameResult.betAmount * 2.5 || (gameResult.netAmount > 0 && gameResult.betAmount >= 100)) action = 'game_big_win';
    else if (gameResult.betAmount >= 100 && gameResult.payoutAmount === 0) action = 'game_big_loss';
  } else if (gameResult.gameCode === 'crash') {
    if (gameResult.state.cashoutMultiplier >= 20) action = 'game_jackpot';
    else if (gameResult.state.cashoutMultiplier >= 5) action = 'game_cashout';
    else if (gameResult.result === 'bust' && gameResult.betAmount >= 100) action = 'game_big_loss';
  } else if (gameResult.gameCode === 'russian_roulette') {
    if (gameResult.state.survivedCount >= 5) action = 'game_jackpot';
    else if (gameResult.state.survivedCount >= 4) action = 'game_big_win';
    else if (gameResult.result === 'dead' && gameResult.state.survivedCount >= 3) action = 'game_big_loss';
  }

  await logActivity({
    userId: gameResult.userId,
    action: 'casino_played',
    platform: 'hub-casino',
    metadata,
    isPublic: false
  });
  if (action) {
    await logActivity({
      userId: gameResult.userId,
      action,
      platform: 'hub-casino',
      metadata,
      isPublic: true
    });
  }
}

async function recordGameResult(input) {
  const saved = await createGameResult({
    ...input,
    netAmount: input.payoutAmount - input.betAmount
  });
  await logCasinoFeedIfNeeded(saved);
  await incrementMission(saved.userId, 'play_casino');
  const [casinoAchievements, coreAchievements] = await Promise.all([
    checkCasinoAchievements(saved.userId),
    checkAndUnlockAchievements(saved.userId)
  ]);
  return {
    gameResult: saved,
    unlockedAchievements: [...casinoAchievements, ...coreAchievements]
  };
}

function sanitizeBlackjackSession(session) {
  const { playerDice, dealerDice, dealerReveal, phase, playerTotal, dealerTotal } = session.state;
  return {
    id: session.id,
    gameCode: session.gameCode,
    betAmount: session.betAmount,
    status: session.status,
    state: {
      playerDice,
      dealerDicePublic: dealerReveal ? dealerDice : [dealerDice[0], null],
      playerTotal,
      dealerVisibleTotal: dealerReveal ? dealerTotal : dealerDice[0],
      phase
    }
  };
}

function sanitizeCrashSession(session) {
  const { serverStartTime, speedPerSecond, maxMultiplier } = session.state;
  return {
    id: session.id,
    gameCode: session.gameCode,
    betAmount: session.betAmount,
    status: session.status,
    state: { serverStartTime, speedPerSecond, maxMultiplier }
  };
}

function sanitizeRussianSession(session, reveal = false) {
  const { bulletPosition, currentChamber, survivedCount, maxSurvive } = session.state;
  return {
    id: session.id,
    gameCode: session.gameCode,
    betAmount: session.betAmount,
    status: session.status,
    state: {
      currentChamber,
      survivedCount,
      maxSurvive,
      canCashout: session.status === 'active' && survivedCount >= 1,
      cashoutReward: games.russian_roulette.rewardTable[survivedCount] || 0,
      ...(reveal ? { bulletPosition } : {})
    }
  };
}

async function requireOwnedActiveSession({ userId, sessionId, gameCode }) {
  const session = await getGameSessionById(sessionId);
  if (!session || session.gameCode !== gameCode) throw casinoError('게임 세션을 찾을 수 없습니다.', 404);
  if (session.userId !== userId) throw casinoError('다른 사용자의 게임 세션에는 접근할 수 없습니다.', 403);
  if (session.status !== 'active') throw casinoError('이미 완료된 게임 세션입니다.', 409);
  return session;
}

async function startSession({ userId, gameCode, betAmount, state }) {
  if (await getActiveSession(userId, gameCode)) throw casinoError('이미 진행 중인 게임 세션이 있습니다.', 409);
  await validateBet({ userId, gameCode, betAmount, fixedBet: getGame(gameCode).fixedBet });
  if (provider === 'supabase') {
    return createAtomicGameSession({ userId, gameCode, betAmount, state });
  }
  await chargeBet({ userId, gameCode, betAmount });
  try {
    const session = await createGameSession({ userId, gameCode, betAmount, state });
    return { session, account: await ensurePointAccount(userId) };
  } catch (error) {
    await refundBet({ userId, gameCode, betAmount }).catch(() => {});
    throw error;
  }
}

async function finalizeSession({ session, status, result, payoutAmount, state, payoutType = 'game_payout' }) {
  if (provider === 'supabase') {
    const completed = await completeAtomicGameSession({
      sessionId: session.id,
      userId: session.userId,
      status,
      result,
      state,
      payoutAmount,
      payoutType
    });
    await logCasinoFeedIfNeeded(completed.result);
    await incrementMission(session.userId, 'play_casino');
    const [casinoAchievements, coreAchievements] = await Promise.all([
      checkCasinoAchievements(session.userId),
      checkAndUnlockAchievements(session.userId)
    ]);
    return {
      session: completed.session,
      result: completed.result,
      account: completed.account,
      unlockedAchievements: [...casinoAchievements, ...coreAchievements]
    };
  }

  if (payoutAmount > 0) {
    await payOut({
      userId: session.userId,
      gameCode: session.gameCode,
      amount: payoutAmount,
      type: payoutType,
      reason: `${getGame(session.gameCode).name} 결과 지급`
    });
  }
  const updated = await updateGameSession(session.id, { status, state });
  const recorded = await recordGameResult({
    userId: session.userId,
    gameCode: session.gameCode,
    betAmount: session.betAmount,
    payoutAmount,
    result,
    state
  });
  return {
    session: updated,
    result: recorded.gameResult,
    account: await ensurePointAccount(session.userId),
    unlockedAchievements: recorded.unlockedAchievements
  };
}

async function playRoulette(userId, betAmount) {
  await validateBet({ userId, gameCode: 'roulette', betAmount });
  const slot = weightedPick(games.roulette.payoutTable);
  const payoutAmount = Math.floor(betAmount * slot.multiplier);
  const result = slot.multiplier >= 20 ? 'jackpot' : slot.multiplier >= 2 ? 'win' : slot.multiplier === 1 ? 'push' : 'loss';
  const state = { multiplier: slot.multiplier, slotLabel: slot.label, rollTableVersion: 'roulette-v1' };
  if (provider === 'supabase') {
    const saved = await createAtomicInstantGameResult({
      userId,
      gameCode: 'roulette',
      betAmount,
      payoutAmount,
      payoutType: result === 'jackpot' ? 'game_jackpot' : result === 'push' ? 'game_refund' : 'game_payout',
      result,
      state
    });
    await logCasinoFeedIfNeeded(saved.result);
    await incrementMission(userId, 'play_casino');
    const [casinoAchievements, coreAchievements] = await Promise.all([
      checkCasinoAchievements(userId),
      checkAndUnlockAchievements(userId)
    ]);
    return {
      game: 'roulette',
      result: {
        multiplier: slot.multiplier,
        betAmount,
        payoutAmount,
        netAmount: payoutAmount - betAmount,
        label: slot.label
      },
      account: saved.account,
      unlockedAchievements: [...casinoAchievements, ...coreAchievements]
    };
  }

  await chargeBet({ userId, gameCode: 'roulette', betAmount });
  if (payoutAmount > 0) {
    await payOut({
      userId,
      gameCode: 'roulette',
      amount: payoutAmount,
      type: result === 'jackpot' ? 'game_jackpot' : result === 'push' ? 'game_refund' : 'game_payout',
      reason: `룰렛 ${slot.label} 지급`
    });
  }
  const recorded = await recordGameResult({
    userId,
    gameCode: 'roulette',
    betAmount,
    payoutAmount,
    result,
    state
  });
  return {
    game: 'roulette',
    result: {
      multiplier: slot.multiplier,
      betAmount,
      payoutAmount,
      netAmount: payoutAmount - betAmount,
      label: slot.label
    },
    account: await ensurePointAccount(userId),
    unlockedAchievements: recorded.unlockedAchievements
  };
}

async function startDiceBlackjack(userId, betAmount) {
  const playerDice = [randomInt(1, 6), randomInt(1, 6)];
  const dealerDice = [randomInt(1, 6), randomInt(1, 6)];
  const started = await startSession({
    userId,
    gameCode: 'dice_blackjack',
    betAmount,
    state: {
      playerDice,
      dealerDice,
      dealerReveal: false,
      phase: 'player_turn',
      playerTotal: sumDice(playerDice),
      dealerTotal: sumDice(dealerDice)
    }
  });
  return { ...started, session: sanitizeBlackjackSession(started.session) };
}

async function hitDiceBlackjack(userId, sessionId) {
  const session = await requireOwnedActiveSession({ userId, sessionId, gameCode: 'dice_blackjack' });
  if (session.state.phase !== 'player_turn') throw casinoError('지금은 주사위를 굴릴 수 없습니다.', 409);
  const state = { ...session.state, playerDice: [...session.state.playerDice, randomInt(1, 6)] };
  state.playerTotal = sumDice(state.playerDice);
  if (state.playerTotal <= 21) {
    return {
      game: 'dice_blackjack',
      session: sanitizeBlackjackSession(await updateGameSession(session.id, { status: 'active', state })),
      account: await ensurePointAccount(userId)
    };
  }
  state.dealerReveal = true;
  state.phase = 'completed';
  const finalized = await finalizeSession({ session, status: 'busted', result: 'player_bust', payoutAmount: 0, state });
  return { game: 'dice_blackjack', ...finalized, session: sanitizeBlackjackSession(finalized.session) };
}

async function standDiceBlackjack(userId, sessionId) {
  const session = await requireOwnedActiveSession({ userId, sessionId, gameCode: 'dice_blackjack' });
  const state = { ...session.state, dealerDice: [...session.state.dealerDice], dealerReveal: true, phase: 'completed' };
  while (sumDice(state.dealerDice) < 17) state.dealerDice.push(randomInt(1, 6));
  state.dealerTotal = sumDice(state.dealerDice);
  state.playerTotal = sumDice(state.playerDice);

  let result;
  let payoutAmount;
  if (state.dealerTotal > 21) {
    result = state.playerTotal === 21 ? 'blackjack_21' : 'dealer_bust';
    payoutAmount = Math.floor(session.betAmount * (state.playerTotal === 21 ? 2.5 : 2));
  } else if (state.playerTotal > state.dealerTotal) {
    result = state.playerTotal === 21 ? 'blackjack_21' : 'player_win';
    payoutAmount = Math.floor(session.betAmount * (state.playerTotal === 21 ? 2.5 : 2));
  } else if (state.playerTotal === state.dealerTotal) {
    result = 'push';
    payoutAmount = session.betAmount;
  } else {
    result = 'dealer_win';
    payoutAmount = 0;
  }
  const finalized = await finalizeSession({
    session,
    status: 'completed',
    result,
    payoutAmount,
    state,
    payoutType: result === 'push' ? 'game_refund' : 'game_payout'
  });
  return { game: 'dice_blackjack', ...finalized, session: sanitizeBlackjackSession(finalized.session) };
}

function createCrashMultiplier() {
  const bucket = weightedPick([
    { min: 1.05, max: 1.5, weight: 50 },
    { min: 1.5, max: 3, weight: 30 },
    { min: 3, max: 8, weight: 15 },
    { min: 8, max: 20, weight: 4 },
    { min: 20, max: 50, weight: 1 }
  ]);
  return randomDecimal(bucket.min, bucket.max);
}

async function startCrash(userId, betAmount) {
  const started = await startSession({
    userId,
    gameCode: 'crash',
    betAmount,
    state: {
      serverStartTime: new Date().toISOString(),
      crashMultiplier: createCrashMultiplier(),
      speedPerSecond: games.crash.speedPerSecond,
      maxMultiplier: games.crash.maxMultiplier
    }
  });
  return { ...started, session: sanitizeCrashSession(started.session) };
}

async function cashoutCrash(userId, sessionId) {
  const session = await requireOwnedActiveSession({ userId, sessionId, gameCode: 'crash' });
  const elapsedSeconds = Math.max(0, (Date.now() - new Date(session.state.serverStartTime).getTime()) / 1000);
  const currentMultiplier = Math.floor(Math.min(
    session.state.maxMultiplier,
    1 + elapsedSeconds * session.state.speedPerSecond
  ) * 100) / 100;
  const busted = currentMultiplier >= session.state.crashMultiplier;
  const payoutAmount = busted ? 0 : Math.floor(session.betAmount * currentMultiplier);
  const state = {
    ...session.state,
    cashoutMultiplier: currentMultiplier
  };
  const finalized = await finalizeSession({
    session,
    status: busted ? 'busted' : 'cashed_out',
    result: busted ? 'bust' : 'cashout',
    payoutAmount,
    state
  });
  return {
    game: 'crash',
    ...finalized,
    session: sanitizeCrashSession(finalized.session),
    result: {
      outcome: busted ? 'bust' : 'cashout',
      betAmount: session.betAmount,
      cashoutMultiplier: currentMultiplier,
      crashMultiplier: session.state.crashMultiplier,
      payoutAmount,
      netAmount: payoutAmount - session.betAmount
    }
  };
}

async function startRussianRoulette(userId, betAmount = 30) {
  const started = await startSession({
    userId,
    gameCode: 'russian_roulette',
    betAmount,
    state: {
      bulletPosition: randomInt(1, 6),
      currentChamber: 0,
      survivedCount: 0,
      maxSurvive: 5
    }
  });
  return { ...started, session: sanitizeRussianSession(started.session) };
}

async function pullRussianRoulette(userId, sessionId) {
  const session = await requireOwnedActiveSession({ userId, sessionId, gameCode: 'russian_roulette' });
  const state = { ...session.state, currentChamber: session.state.currentChamber + 1 };
  if (state.currentChamber === state.bulletPosition) {
    const finalized = await finalizeSession({ session, status: 'busted', result: 'dead', payoutAmount: 0, state });
    return { game: 'russian_roulette', ...finalized, session: sanitizeRussianSession(finalized.session, true) };
  }
  state.survivedCount += 1;
  if (state.survivedCount >= state.maxSurvive) {
    const payoutAmount = games.russian_roulette.rewardTable[state.survivedCount];
    const finalized = await finalizeSession({
      session,
      status: 'completed',
      result: 'survived_max',
      payoutAmount,
      payoutType: 'game_jackpot',
      state
    });
    return { game: 'russian_roulette', ...finalized, session: sanitizeRussianSession(finalized.session, true) };
  }
  return {
    game: 'russian_roulette',
    session: sanitizeRussianSession(await updateGameSession(session.id, { status: 'active', state })),
    account: await ensurePointAccount(userId)
  };
}

async function cashoutRussianRoulette(userId, sessionId) {
  const session = await requireOwnedActiveSession({ userId, sessionId, gameCode: 'russian_roulette' });
  if (session.state.survivedCount < 1) throw casinoError('한 번 이상 생존한 뒤에 멈출 수 있습니다.');
  const payoutAmount = games.russian_roulette.rewardTable[session.state.survivedCount];
  const finalized = await finalizeSession({
    session,
    status: 'cashed_out',
    result: 'survived',
    payoutAmount,
    state: session.state
  });
  return { game: 'russian_roulette', ...finalized, session: sanitizeRussianSession(finalized.session, true) };
}

async function getMyLimits(userId) {
  const [account, allPlayed, activeSessions, ...gameCounts] = await Promise.all([
    ensurePointAccount(userId),
    countTodayAllGameResults(userId),
    listActiveSessions(userId),
    ...Object.values(games).map((game) => countTodayGameResults(userId, game.code))
  ]);
  return {
    account,
    totalDailyLimit: TOTAL_DAILY_LIMIT,
    totalPlayed: allPlayed,
    totalRemaining: remainingFor(TOTAL_DAILY_LIMIT, allPlayed),
    games: Object.values(games).map((game, index) => ({
      code: game.code,
      name: game.name,
      minBet: game.minBet,
      maxBet: maxBetFor(account, game),
      played: gameCounts[index],
      dailyLimit: game.dailyLimit,
      remaining: remainingFor(game.dailyLimit, gameCounts[index])
    })),
    activeSessions: activeSessions.map((session) => ({
      id: session.id,
      gameCode: session.gameCode,
      betAmount: session.betAmount,
      status: session.status,
      createdAt: session.createdAt
    }))
  };
}

module.exports = {
  getPublicGames,
  getMyLimits,
  listMyGameResults,
  validateBet,
  playRoulette,
  startDiceBlackjack,
  hitDiceBlackjack,
  standDiceBlackjack,
  startCrash,
  cashoutCrash,
  startRussianRoulette,
  pullRussianRoulette,
  cashoutRussianRoulette
};
