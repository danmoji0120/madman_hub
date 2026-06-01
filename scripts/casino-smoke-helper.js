const assert = require('assert');
const { addPointTransaction } = require('../server/services/points.service');

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
    assert.strictEqual(publicGames.games.length, 4);
    assert.ok(publicGames.games.some((game) => game.code === 'roulette'));
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

    const [history, limits, transactions, achievements] = await Promise.all([
      request('/api/casino/history?limit=50', { headers: auth }),
      request('/api/casino/me/limits', { headers: auth }),
      request('/api/me/transactions', { headers: auth }),
      request('/api/me/achievements', { headers: auth })
    ]);
    assert.ok(history.results.length >= 35);
    assert.ok(limits.totalPlayed >= 35);
    assert.strictEqual(limits.totalDailyLimit, 0);
    assert.strictEqual(limits.totalRemaining, null);
    assert.strictEqual(limits.activeSessions.length, 0);
    assert.ok(transactions.transactions.some((item) => item.type === 'game_bet'));
    assert.ok(achievements.unlocked.some((item) => item.code === 'CASINO_FIRST_BET'));
  } catch (error) {
    await debugCasinoState('runCasinoSmoke', request, auth);
    throw error;
  }
}

module.exports = {
  runCasinoSmoke
};
