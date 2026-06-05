const casinoEscape = API.escape;
let blackjackSessionId = null;
let crashSessionId = null;
let crashInterval = null;
let russianSessionId = null;
let slotSpinInProgress = false;

const SLOT_SYMBOLS = {
  cherry: '🍒',
  bell: '🔔',
  star: '⭐',
  diamond: '💎',
  seven: '7️⃣',
  bb: 'BB',
  skull: '💀'
};
const SLOT_SYMBOL_KEYS = Object.keys(SLOT_SYMBOLS);

function casinoMessage(text) {
  document.querySelector('#casino-message').textContent = text;
}

function requireLogin() {
  if (API.token) return true;
  casinoMessage('플레이하려면 먼저 로그인하세요.');
  return false;
}

async function withButton(button, action) {
  if (!requireLogin()) return;
  button.disabled = true;
  try {
    await action();
    await loadCasinoAccount();
    await loadCasinoHistory();
  } catch (error) {
    casinoMessage(error.message);
  } finally {
    button.disabled = false;
  }
}

function inputAmount(id) {
  return Number(document.querySelector(id).value);
}

function setDisabled(id, disabled) {
  document.querySelector(id).disabled = disabled;
}

function syncBlackjackControls() {
  const active = Boolean(blackjackSessionId);
  setDisabled('#blackjack-start', active);
  setDisabled('#blackjack-hit', !active);
  setDisabled('#blackjack-stand', !active);
}

function syncRussianControls(session = null) {
  const active = Boolean(russianSessionId);
  setDisabled('#russian-start', active);
  setDisabled('#russian-pull', !active);
  setDisabled('#russian-cashout', !active || !session?.state.canCashout);
}

function formatLimit(limit, remaining) {
  return limit > 0 ? `${remaining}회 남음` : '무제한';
}

function renderGames(games) {
  document.querySelector('#casino-games').innerHTML = games.map((game) => {
    const rows = game.payoutTable
      ? game.payoutTable.map((item) => `<li>${casinoEscape(item.label)}${item.weight ? ` · ${casinoEscape(item.weight)}%` : ` · ${casinoEscape(item.multiplier)}x`}</li>`).join('')
      : Object.entries(game.rewardTable || {}).map(([count, payout]) => `<li>${casinoEscape(count)}회 생존 · ${casinoEscape(formatPoints(payout))}</li>`).join('');
    return `<article><strong>${casinoEscape(game.name)}</strong><p class="meta">${casinoEscape(game.rules)}</p><ul>${rows}</ul></article>`;
  }).join('');
}

async function loadCasinoAccount() {
  if (!API.token) return;
  const data = await API.request('/api/casino/me/limits');
  document.querySelector('#casino-points').textContent = formatPoints(data.account.balance);
  document.querySelector('#casino-limit-note').textContent = `오늘 ${data.totalPlayed}회 플레이 · ${formatLimit(data.totalDailyLimit, data.totalRemaining)}`;
}

async function loadCasinoHistory() {
  if (!API.token) return;
  const data = await API.request('/api/casino/history?limit=30');
  document.querySelector('#casino-history').innerHTML = data.results.map((item) => `
    <div class="casino-history-item">
      <strong>${casinoEscape(item.gameCode)}</strong>
      <span>${casinoEscape(item.result)} · 베팅 ${casinoEscape(formatPoints(item.betAmount))} · 지급 ${casinoEscape(formatPoints(item.payoutAmount))} · 순변동 ${casinoEscape(formatPoints(item.netAmount))}</span>
    </div>
  `).join('') || '<p class="empty-state">아직 카지노 기록이 없습니다.</p>';
}

async function loadCasinoSummary() {
  const root = document.querySelector('#casino-summary-card');
  if (!root || !API.token) return;
  const data = await API.request('/api/casino/stats/me');
  const games = data.games || [];
  root.innerHTML = `
    <div class="section-heading"><h2>내 카지노 기록</h2><span class="badge">${data.season ? API.escape(data.season.name) : 'no season'}</span></div>
    <div class="metric-grid">
      <article class="metric-card"><span class="meta">최고점</span><strong>${formatPoints(data.peakBalance)}</strong></article>
      <article class="metric-card"><span class="meta">현재 잔고</span><strong>${formatPoints(data.currentBalance)}</strong></article>
      <article class="metric-card"><span class="meta">추락폭</span><strong>${formatPoints(data.drawdown)}</strong></article>
      <article class="metric-card"><span class="meta">카지노 Net</span><strong>${formatSignedPoints(data.casinoNet)}</strong></article>
      <article class="metric-card"><span class="meta">단일 최대 승리</span><strong>${formatPoints(data.biggestWin)}</strong></article>
      <article class="metric-card"><span class="meta">단일 최대 손실</span><strong>${formatPoints(data.biggestLoss)}</strong></article>
      <article class="metric-card"><span class="meta">회전율</span><strong>${formatPercent(data.pointTurnover)}</strong></article>
    </div>
    <div class="casino-history">
      ${games.map((item) => `<div class="casino-history-item"><strong>${API.escape(item.gameKey)}</strong><span>${formatCount(item.plays)} · bet ${formatPoints(item.totalBet)} · payout ${formatPoints(item.totalPayout)} · net ${formatSignedPoints(item.netProfit)}</span></div>`).join('') || '<p class="empty-state">아직 카지노 기록이 없습니다.</p>'}
    </div>
  `;
}

async function playRoulette(button) {
  await withButton(button, async () => {
    const data = await API.request('/api/casino/roulette/play', {
      method: 'POST',
      body: JSON.stringify({ betAmount: inputAmount('#roulette-bet') })
    });
    document.querySelector('.roulette-wheel').textContent = data.result.label;
    document.querySelector('#roulette-result').textContent = `${data.result.label} · 지급 ${formatPoints(data.result.payoutAmount)} · 순변동 ${formatPoints(data.result.netAmount)}`;
  });
}

function slotLabel(symbol) {
  return SLOT_SYMBOLS[symbol] || '?';
}

function randomSlotLabel() {
  return slotLabel(SLOT_SYMBOL_KEYS[Math.floor(Math.random() * SLOT_SYMBOL_KEYS.length)]);
}

function setSlotResultClass(kind) {
  const result = document.querySelector('#slot-result');
  result.classList.remove('jackpot', 'win', 'loss');
  if (kind) result.classList.add(kind);
}

function slotResultKind(result) {
  if (!result || result.payoutAmount <= 0) return 'loss';
  if (result.result === 'bb_triple' || result.result === 'seven_triple' || Number(result.multiplier) >= 45) return 'jackpot';
  return 'win';
}

function slotResultMessage(result) {
  const payout = formatPoints(result.payoutAmount || 0);
  const net = formatSignedPoints(result.netAmount || 0);
  const matchedLabel = slotLabel(result.matchedSymbol);

  if (result.result === 'bb_triple') return `BB JACKPOT! 지급 ${payout} · 순변동 ${net}`;
  if (result.result === 'seven_triple') return `777 잭팟! 지급 ${payout} · 순변동 ${net}`;
  if (result.result === 'skull_triple') return `해골 3개 · 포인트가 격리소 바닥으로 사라졌습니다. 순변동 ${net}`;
  if (result.matchCount === 3) return `${matchedLabel} 3개 적중 · 지급 ${payout} · 순변동 ${net}`;
  if (result.matchCount === 2 && result.matchedSymbol === 'skull') return `해골 2개 · 지급 ${payout} · 순변동 ${net}`;
  if (result.matchCount === 2) return `${matchedLabel} 2개 적중 · 지급 ${payout} · 순변동 ${net}`;
  return `꽝 · 지급 ${payout} · 순변동 ${net}`;
}

function animateSlotMachineResult(data) {
  const result = data.result || {};
  const finalReels = Array.isArray(result.reels) ? result.reels : data.state?.reels || [];
  const reels = Array.from(document.querySelectorAll('[data-slot-reel]'));
  const status = document.querySelector('#slot-spin-status');
  const output = document.querySelector('#slot-result');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const stopTimes = reducedMotion ? [90, 150, 210] : [700, 1050, 1400];
  const intervals = [];

  setSlotResultClass(null);
  output.textContent = '릴 회전 중...';
  status.textContent = '도로록...';
  reels.forEach((reel) => {
    reel.classList.remove('stopped');
    reel.classList.add('spinning');
    reel.textContent = randomSlotLabel();
  });

  if (reducedMotion) {
    finalReels.forEach((symbol, index) => {
      const reel = reels[index];
      if (!reel) return;
      reel.textContent = slotLabel(symbol);
      reel.classList.remove('spinning');
      reel.classList.add('stopped');
    });
    status.textContent = '결과 공개';
    output.textContent = slotResultMessage(result);
    setSlotResultClass(slotResultKind(result));
    return Promise.resolve();
  }

  reels.forEach((reel, index) => {
    intervals[index] = setInterval(() => {
      reel.textContent = randomSlotLabel();
    }, 70 + index * 15);
  });

  return new Promise((resolve) => {
    stopTimes.forEach((time, index) => {
      setTimeout(() => {
        const reel = reels[index];
        clearInterval(intervals[index]);
        if (reel) {
          reel.textContent = slotLabel(finalReels[index]);
          reel.classList.remove('spinning');
          reel.classList.add('stopped');
        }
        status.textContent = index < 2 ? '딴' : '딴 · 결과 공개';
      }, time);
    });

    setTimeout(() => {
      status.textContent = '결과 공개';
      output.textContent = slotResultMessage(result);
      setSlotResultClass(slotResultKind(result));
      resolve();
    }, stopTimes[2] + 240);
  });
}

async function playSlotMachine(button) {
  if (!requireLogin() || slotSpinInProgress) return;
  slotSpinInProgress = true;
  button.disabled = true;

  try {
    const data = await API.request('/api/casino/slot-machine/play', {
      method: 'POST',
      body: JSON.stringify({ betAmount: inputAmount('#slot-bet') })
    });
    await animateSlotMachineResult(data);
    await loadCasinoAccount();
    await loadCasinoHistory();
    await loadCasinoSummary();
  } catch (error) {
    setSlotResultClass('loss');
    document.querySelector('#slot-spin-status').textContent = '릴 정지';
    document.querySelector('#slot-result').textContent = error.message;
    casinoMessage(error.message);
  } finally {
    slotSpinInProgress = false;
    button.disabled = false;
  }
}

function renderBlackjack(session) {
  const state = session.state;
  document.querySelector('#blackjack-dice').innerHTML = `
    <div><span class="meta">나</span> ${state.playerDice.map((die) => `<span class="die">${casinoEscape(die)}</span>`).join('')} <strong>${casinoEscape(state.playerTotal)}</strong></div>
    <div><span class="meta">딜러</span> ${state.dealerDicePublic.map((die) => `<span class="die">${casinoEscape(die ?? '?')}</span>`).join('')} <strong>${casinoEscape(state.dealerVisibleTotal)}</strong></div>
  `;
}

async function startBlackjack(button) {
  await withButton(button, async () => {
    const data = await API.request('/api/casino/dice-blackjack/start', {
      method: 'POST',
      body: JSON.stringify({ betAmount: inputAmount('#blackjack-bet') })
    });
    blackjackSessionId = data.session.id;
    renderBlackjack(data.session);
    syncBlackjackControls();
    document.querySelector('#blackjack-result').textContent = '진행 중';
  });
}

async function hitBlackjack(button) {
  if (!blackjackSessionId) return casinoMessage('먼저 블랙잭을 시작하세요.');
  await withButton(button, async () => {
    const data = await API.request(`/api/casino/dice-blackjack/${blackjackSessionId}/hit`, { method: 'POST' });
    renderBlackjack(data.session);
    document.querySelector('#blackjack-result').textContent = data.result ? `${data.result.result} · 지급 ${formatPoints(data.result.payoutAmount)}` : '계속 진행 중';
    if (data.result) {
      blackjackSessionId = null;
      syncBlackjackControls();
    }
  });
}

async function standBlackjack(button) {
  if (!blackjackSessionId) return casinoMessage('먼저 블랙잭을 시작하세요.');
  await withButton(button, async () => {
    const data = await API.request(`/api/casino/dice-blackjack/${blackjackSessionId}/stand`, { method: 'POST' });
    renderBlackjack(data.session);
    document.querySelector('#blackjack-result').textContent = `${data.result.result} · 지급 ${formatPoints(data.result.payoutAmount)}`;
    blackjackSessionId = null;
    syncBlackjackControls();
  });
}

async function startCrash(button) {
  await withButton(button, async () => {
    const data = await API.request('/api/casino/crash/start', {
      method: 'POST',
      body: JSON.stringify({ betAmount: inputAmount('#crash-bet') })
    });
    crashSessionId = data.session.id;
    const startedAt = Date.now();
    clearInterval(crashInterval);
    crashInterval = setInterval(() => {
      const multiplier = Math.floor((1 + (Date.now() - startedAt) / 1000 * 0.35) * 100) / 100;
      document.querySelector('#crash-value').textContent = `${multiplier.toFixed(2)}x`;
    }, 80);
    document.querySelector('#crash-result').textContent = '탈출 타이밍을 잡으세요.';
  });
}

async function restoreActiveCasinoSessions() {
  if (!API.token) return;

  const data = await API.request('/api/casino/sessions/active');
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];

  const blackjack = sessions.find((session) => session.gameCode === 'dice_blackjack');
  if (blackjack) {
    blackjackSessionId = blackjack.id;
    renderBlackjack(blackjack);
    syncBlackjackControls();
    document.querySelector('#blackjack-result').textContent = '진행 중인 게임을 복구했습니다.';
  }

  const russian = sessions.find((session) => session.gameCode === 'russian_roulette');
  if (russian) {
    russianSessionId = russian.id;
    renderRussian(russian);
    syncRussianControls(russian);
    document.querySelector('#russian-result').textContent = '진행 중인 게임을 복구했습니다.';
  }
}

async function cashoutCrash(button) {
  if (!crashSessionId) return casinoMessage('먼저 크래시를 시작하세요.');
  await withButton(button, async () => {
    const data = await API.request(`/api/casino/crash/${crashSessionId}/cashout`, { method: 'POST' });
    clearInterval(crashInterval);
    crashInterval = null;
    crashSessionId = null;
    document.querySelector('#crash-value').textContent = `${data.result.cashoutMultiplier.toFixed(2)}x`;
    document.querySelector('#crash-result').textContent = `${data.result.outcome} · 크래시 ${data.result.crashMultiplier}x · 지급 ${formatPoints(data.result.payoutAmount)}`;
  });
}

function renderRussian(session) {
  const state = session.state;
  document.querySelector('#russian-chambers').innerHTML = Array.from({ length: 6 }, (_, index) => (
    `<span class="chamber ${index < state.survivedCount ? 'safe' : ''}">${index + 1}</span>`
  )).join('');
  document.querySelector('#russian-result').textContent = `${state.survivedCount}회 생존 · 지금 멈추면 ${formatPoints(state.cashoutReward)}`;
}

async function startRussian(button) {
  await withButton(button, async () => {
    const data = await API.request('/api/casino/russian-roulette/start', { method: 'POST', body: '{}' });
    russianSessionId = data.session.id;
    renderRussian(data.session);
    syncRussianControls(data.session);
  });
}

async function pullRussian(button) {
  if (!russianSessionId) return casinoMessage('먼저 러시안 룰렛을 시작하세요.');
  await withButton(button, async () => {
    const data = await API.request(`/api/casino/russian-roulette/${russianSessionId}/pull`, { method: 'POST' });
    renderRussian(data.session);
    if (data.result) {
      document.querySelector('#russian-result').textContent = `${data.result.result} · 지급 ${formatPoints(data.result.payoutAmount)}`;
      russianSessionId = null;
    }
    syncRussianControls(data.session);
  });
}

async function cashoutRussian(button) {
  if (!russianSessionId) return casinoMessage('먼저 러시안 룰렛을 시작하세요.');
  await withButton(button, async () => {
    const data = await API.request(`/api/casino/russian-roulette/${russianSessionId}/cashout`, { method: 'POST' });
    renderRussian(data.session);
    document.querySelector('#russian-result').textContent = `${data.result.result} · 지급 ${formatPoints(data.result.payoutAmount)}`;
    russianSessionId = null;
    syncRussianControls(data.session);
  });
}

async function initCasino() {
  try {
    syncBlackjackControls();
    syncRussianControls();
    renderGames((await API.request('/api/casino/games')).games);
    await loadCasinoAccount();
    await loadCasinoHistory();
    await loadCasinoSummary();
    await restoreActiveCasinoSessions();
  } catch (error) {
    casinoMessage(error.message);
  }
}

window.addEventListener('beforeunload', () => clearInterval(crashInterval));
initCasino();
