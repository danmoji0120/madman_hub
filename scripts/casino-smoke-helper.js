const assert = require('assert');
const { addPointTransaction } = require('../server/services/points.service');
const { casinoBalanceConfig } = require('../server/config/casinoBalance.config');
const { getSupabaseAdminClient } = require('../server/supabaseClient');
const { runAssertions: runBalanceAssertions } = require('./casino-balance-sim');

async function safeDebugRequest(request, route, options = {}) {
  try {
    return await request(route, options);
  } catch (error) {
    return { error: error.message };
  }
}

async function debugCasinoState(label, request, auth) {
  const [limits, history, transactions, feed, achievements] = await Promise.all([
    safeDebugRequest(request, '/api/casino/me/limits', { headers: auth }),
    safeDebugRequest(request, '/api/casino/history?limit=50', { headers: auth }),
    safeDebugRequest(request, '/api/me/transactions', { headers: auth }),
    safeDebugRequest(request, '/api/feed?limit=50'),
    safeDebugRequest(request, '/api/me/achievements', { headers: auth })
  ]);
  console.error('Casino smoke debug:', {
    label,
    dbProvider: process.env.DB_PROVIDER || 'sqlite',
    tokenPrefix: String(auth.Authorization || '').slice(0, 15),
    limits,
    history,
    recentTransactions: transactions.transactions?.slice(0, 20),
    feedItems: feed.items,
    achievements
  });
}

async function runCasinoSmoke({ request, auth, userId, runPrefix }) {
  try {
    const publicGames = await request('/api/casino/games');
    assert.strictEqual(publicGames.games.length, 5);
    assert.ok(publicGames.games.some((game) => game.code === 'roulette'));
    const slotGame = publicGames.games.find((game) => game.code === 'slot_machine');
    const russianGame = publicGames.games.find((game) => game.code === 'russian_roulette');
    const blackjackGame = publicGames.games.find((game) => game.code === 'dice_blackjack');
    assert.ok(slotGame);
    assert.strictEqual(slotGame.name, '격리소 머신');
    assert.strictEqual(slotGame.minBet, 10);
    assert.strictEqual(slotGame.maxBet, 300);
    assert.strictEqual(slotGame.dailyLimit, 50);
    assert.strictEqual(slotGame.payoutTable.find((item) => item.symbol === 'bb' && item.matchCount === 3).multiplier, 120);
    assert.strictEqual(slotGame.payoutTable.find((item) => item.symbol === 'skull' && item.matchCount === 3).multiplier, 0);
    assert.strictEqual(russianGame.fixedBet, casinoBalanceConfig.russianRoulette.baseBet);
    assert.strictEqual(russianGame.rewardTable['1'], casinoBalanceConfig.russianRoulette.cashoutPayouts[1]);
    assert.strictEqual(russianGame.rewardTable['2'], casinoBalanceConfig.russianRoulette.cashoutPayouts[2]);
    assert.strictEqual(russianGame.rewardTable['3'], casinoBalanceConfig.russianRoulette.cashoutPayouts[3]);
    assert.strictEqual(russianGame.rewardTable['4'], casinoBalanceConfig.russianRoulette.cashoutPayouts[4]);
    assert.strictEqual(russianGame.rewardTable['5'], casinoBalanceConfig.russianRoulette.cashoutPayouts[5]);
    assert.strictEqual(blackjackGame.payoutTable.find((item) => item.label === '일반 승리').multiplier, casinoBalanceConfig.diceBlackjack.winPayoutMultiplier);
    assert.strictEqual(blackjackGame.payoutTable.find((item) => item.label === '정확히 21 승리').multiplier, casinoBalanceConfig.diceBlackjack.specialWinPayoutMultiplier);
    assert.strictEqual(blackjackGame.payoutTable.find((item) => item.label === '동점 push').multiplier, 1);
    const balanceSimulation = runBalanceAssertions();
    assert.ok(balanceSimulation.russian.find((item) => item.cashoutStep === 2).expectedReturnRate < 1);
    assert.ok(balanceSimulation.blackjack.returnRate >= 0.88 && balanceSimulation.blackjack.returnRate <= 1.02);
    await request('/api/casino/roulette/play', { method: 'POST' }, 401);

    await addPointTransaction({
      userId,
      amount: 2000,
      type: 'smoke_test_funding',
      reason: 'casino smoke funding',
      sourcePlatform: 'smoke-test',
      createdBy: userId
    });

    const before = await request('/api/casino/me/limits', { headers: auth });
    assert.ok(before.account.balance >= 2000);
    assert.strictEqual(before.totalPlayed, 0);
    assert.strictEqual(before.totalDailyLimit, 0);
    assert.strictEqual(before.totalRemaining, null);
    await request('/api/casino/roulette/play', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 0 })
    }, 400);
    await request('/api/casino/roulette/play', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: -10 })
    }, 400);
    await request('/api/casino/roulette/play', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: '10' })
    }, 400);
    await request('/api/casino/roulette/play', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 999999 })
    }, 400);

    const roulette = await request('/api/casino/roulette/play', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 10, payoutAmount: 999999, multiplier: 999999, result: 'jackpot' })
    });
    assert.strictEqual(roulette.game, 'roulette');
    assert.ok([0, 0.5, 1, 2, 3, 5, 20].includes(roulette.result.multiplier));
    assert.strictEqual(roulette.result.payoutAmount, Math.floor(10 * roulette.result.multiplier));
    for (let index = 0; index < 30; index += 1) {
      await request('/api/casino/roulette/play', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ betAmount: 10 })
      });
    }

    const slot = await request('/api/casino/slot-machine/play', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 10, reels: ['bb', 'bb', 'bb'], payoutAmount: 999999 })
    });
    assert.strictEqual(slot.game, 'slot_machine');
    assert.ok(Array.isArray(slot.result.reels));
    assert.strictEqual(slot.result.reels.length, 3);
    assert.ok(slot.result.reels.every((symbol) => casinoBalanceConfig.slotMachine.symbols.some((item) => item.key === symbol)));
    assert.ok(Number.isFinite(slot.result.multiplier));
    assert.strictEqual(slot.result.payoutAmount, Math.floor(10 * slot.result.multiplier));
    assert.strictEqual(slot.result.netAmount, slot.result.payoutAmount - 10);
    assert.strictEqual(slot.state.rollTableVersion, 'slot-machine-v1');

    const blackjack = await request('/api/casino/dice-blackjack/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 20, dealerDice: [6, 6], result: 'blackjack_21' })
    });
    assert.strictEqual(blackjack.session.gameCode, 'dice_blackjack');
    assert.strictEqual(blackjack.session.state.dealerDicePublic.length, 2);
    assert.strictEqual(blackjack.session.state.dealerDicePublic[1], null);
    assert.strictEqual(Object.hasOwn(blackjack.session.state, 'dealerDice'), false);
    await request('/api/casino/dice-blackjack/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 20 })
    }, 409);

    const otherRegistration = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${runPrefix}casino-other@example.com`,
        password: 'secret123',
        displayName: 'Casino Other'
      })
    });
    const otherAuth = {
      Authorization: `Bearer ${otherRegistration.token}`,
      'Content-Type': 'application/json'
    };
    await request(`/api/casino/dice-blackjack/${blackjack.session.id}/hit`, { method: 'POST', headers: otherAuth }, 403);
    const blackjackHit = await request(`/api/casino/dice-blackjack/${blackjack.session.id}/hit`, { method: 'POST', headers: auth });
    assert.ok(blackjackHit.session.state.playerDice.length >= 3);
    if (!blackjackHit.result) {
      assert.strictEqual(blackjackHit.session.state.dealerDicePublic[1], null);
    }
    const blackjackResult = blackjackHit.result || await request(`/api/casino/dice-blackjack/${blackjack.session.id}/stand`, { method: 'POST', headers: auth });
    assert.ok(blackjackResult.result);
    assert.ok(blackjackResult.session.state.dealerDicePublic.every((die) => Number.isInteger(die)));
    await request(`/api/casino/dice-blackjack/${blackjack.session.id}/stand`, { method: 'POST', headers: auth }, 409);
    const nextBlackjack = await request('/api/casino/dice-blackjack/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 20 })
    });
    assert.notStrictEqual(nextBlackjack.session.id, blackjack.session.id);
    await request(`/api/casino/dice-blackjack/${nextBlackjack.session.id}/stand`, { method: 'POST', headers: auth });
    await request(`/api/casino/dice-blackjack/${nextBlackjack.session.id}/hit`, { method: 'POST', headers: auth }, 409);

    const crash = await request('/api/casino/crash/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ betAmount: 10, crashMultiplier: 50, payoutAmount: 999999 })
    });
    assert.strictEqual(Object.hasOwn(crash.session.state, 'crashMultiplier'), false);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const crashResult = await request(`/api/casino/crash/${crash.session.id}/cashout`, { method: 'POST', headers: auth });
    assert.ok(['cashout', 'bust'].includes(crashResult.result.outcome));
    assert.ok(Number.isFinite(crashResult.result.crashMultiplier));
    await request(`/api/casino/crash/${crash.session.id}/cashout`, { method: 'POST', headers: auth }, 409);

    const russian = await request('/api/casino/russian-roulette/start', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ bulletPosition: 6, payoutAmount: 999999 })
    });
    assert.strictEqual(Object.hasOwn(russian.session.state, 'bulletPosition'), false);
    await request(`/api/casino/russian-roulette/${russian.session.id}/cashout`, { method: 'POST', headers: auth }, 400);
    const pulled = await request(`/api/casino/russian-roulette/${russian.session.id}/pull`, { method: 'POST', headers: auth });
    if (!pulled.result) {
      assert.strictEqual(pulled.session.state.currentChamber, 1);
      assert.strictEqual(pulled.session.state.survivedCount, 1);
      assert.strictEqual(Object.hasOwn(pulled.session.state, 'bulletPosition'), false);
      const russianCashout = await request(`/api/casino/russian-roulette/${russian.session.id}/cashout`, { method: 'POST', headers: auth });
      assert.strictEqual(russianCashout.result.result, 'survived');
      assert.ok(Number.isInteger(russianCashout.session.state.bulletPosition));
    } else {
      assert.ok(['dead', 'survived_max'].includes(pulled.result.result));
      assert.ok(Number.isInteger(pulled.session.state.bulletPosition));
    }
    await request(`/api/casino/russian-roulette/${russian.session.id}/pull`, { method: 'POST', headers: auth }, 409);

    await addPointTransaction({
      userId,
      amount: 50000,
      type: 'smoke_peak_funding',
      reason: 'casino smoke peak funding',
      sourcePlatform: 'smoke-test',
      createdBy: userId
    });
    await addPointTransaction({
      userId,
      amount: -20000,
      type: 'smoke_drawdown_spend',
      reason: 'casino smoke drawdown spend',
      sourcePlatform: 'smoke-test',
      createdBy: userId
    });

    const [history, limits, transactions, achievements, stats, leaderboard, seasonDrawdown, mySeasonSummary] = await Promise.all([
      request('/api/casino/history?limit=50', { headers: auth }),
      request('/api/casino/me/limits', { headers: auth }),
      request('/api/me/transactions', { headers: auth }),
      request('/api/me/achievements', { headers: auth }),
      request('/api/casino/stats/me', { headers: auth }),
      request('/api/casino/stats/leaderboard?category=drawdown&limit=20'),
      request('/api/seasons/current/rankings/drawdown?limit=20'),
      request('/api/me/season-summary', { headers: auth })
    ]);
    assert.ok(history.results.length >= 36);
    assert.ok(history.results.some((item) => item.gameCode === 'slot_machine'));
    assert.ok(limits.totalPlayed >= 36);
    assert.strictEqual(limits.totalDailyLimit, 0);
    assert.strictEqual(limits.totalRemaining, null);
    assert.strictEqual(limits.activeSessions.length, 0);
    assert.ok(transactions.transactions.some((item) => item.type === 'game_bet'));
    assert.ok(achievements.unlocked.some((item) => item.code === 'CASINO_FIRST_BET'));
    assert.ok(stats.games.length > 0);
    assert.ok(stats.games.some((item) => item.gameKey === 'slot_machine'));
    assert.ok(stats.peakBalance >= 50000);
    assert.ok(stats.drawdown >= 20000);
    assert.ok(stats.biggestWin >= 0);
    assert.ok(stats.biggestLoss >= 0);
    assert.ok(leaderboard.rows.some((item) => item.userId === userId && item.formattedScore.includes(' P')));
    assert.ok(seasonDrawdown.rankings.some((item) => item.userId === userId && item.formattedScore.includes(' P')));
    assert.ok(mySeasonSummary.stats.balance_peak >= 50000);
    assert.ok(mySeasonSummary.drawdown >= 20000);
    assert.ok(!/\dP/.test(leaderboard.rows.map((item) => item.formattedScore).join(' ')));

    await request('/api/admin/casino/stats', { headers: auth }, 403);
    if (process.env.DB_PROVIDER === 'supabase') {
      const client = getSupabaseAdminClient();
      const { count: statCount, error: statError } = await client.from('casino_user_stats').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (statError) throw statError;
      assert.ok(statCount > 0);
      const { count: peakCount, error: peakError } = await client.from('season_user_point_peaks').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (peakError) throw peakError;
      assert.ok(peakCount > 0);
    }
  } catch (error) {
    await debugCasinoState('runCasinoSmoke', request, auth);
    throw error;
  }
}

module.exports = {
  runCasinoSmoke
};
