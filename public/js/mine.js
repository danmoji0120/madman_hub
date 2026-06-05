const mineState = {
  cooldownTimer: null,
  cooldownUntil: 0,
  digging: false
};

function escapeMineHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatMineDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return '방금 전';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분 전`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setMineMessage(message, type = '') {
  const target = document.querySelector('#mine-message');
  if (!target) return;
  target.textContent = message || '';
  target.className = `message ${type}`.trim();
}

function setMineButtonCooldown(remainingMs = 0) {
  const button = document.querySelector('#mine-dig-button');
  if (!button) return;
  clearInterval(mineState.cooldownTimer);
  mineState.cooldownUntil = remainingMs > 0 ? Date.now() + remainingMs : 0;

  const tick = () => {
    const left = Math.max(0, mineState.cooldownUntil - Date.now());
    if (!left) {
      clearInterval(mineState.cooldownTimer);
      mineState.cooldownTimer = null;
      button.disabled = mineState.digging;
      button.textContent = '채굴하기';
      return;
    }
    button.disabled = true;
    button.textContent = `광맥 정렬 중 ${Math.ceil(left / 1000)}초`;
  };

  tick();
  if (remainingMs > 0) mineState.cooldownTimer = setInterval(tick, 250);
}

function renderMineStatus(data) {
  const state = document.querySelector('#mine-state');
  const earned = document.querySelector('#mine-earned');
  const hint = document.querySelector('#mine-hint');
  if (state) state.textContent = data.mineState || '광맥 확인 중';
  if (earned) earned.textContent = data.formattedTodayEarned || formatPoints(data.todayEarned || 0);
  if (hint) hint.textContent = data.publicHint || '광맥이 조용히 숨을 고르고 있습니다.';
  setMineButtonCooldown(Number(data.cooldownRemainingMs || 0));
}

function renderMineHistory(items = []) {
  const target = document.querySelector('#mine-history');
  if (!target) return;
  if (!items.length) {
    target.innerHTML = '<p class="empty-state">아직 채굴 로그가 없습니다. 첫 삽은 늘 어색합니다.</p>';
    return;
  }
  target.innerHTML = items.map((item) => `
    <article class="mine-log-item">
      <div>
        <strong>${escapeMineHtml(item.resultLabel)}</strong>
        <span class="meta">${escapeMineHtml(item.mineState || '')} · ${escapeMineHtml(formatMineDate(item.createdAt))}</span>
      </div>
      <span class="point">${escapeMineHtml(item.formattedReward || formatPoints(item.rewardAmount || 0))}</span>
    </article>
  `).join('');
}

function renderMineResult(result) {
  const target = document.querySelector('#mine-result');
  if (!target || !result) return;
  const rewardClass = Number(result.rewardAmount || 0) > 0 ? 'win' : 'loss';
  target.className = `mine-result ${rewardClass}`;
  target.innerHTML = `
    <strong>${escapeMineHtml(result.label)}</strong>
    <p>${escapeMineHtml(result.message)}</p>
    <span class="badge">${escapeMineHtml(result.mineState)}</span>
  `;
}

async function loadMineStatus() {
  try {
    const data = await API.request('/api/mine/status');
    renderMineStatus(data);
    renderMineHistory(data.recentLogs || []);
  } catch (error) {
    setMineMessage(error.message || '광산 상태를 불러오지 못했습니다.', 'error');
  }
}

async function loadMineHistory() {
  try {
    const data = await API.request('/api/mine/history?limit=20');
    renderMineHistory(data.items || []);
  } catch (error) {
    setMineMessage(error.message || '채굴 로그를 불러오지 못했습니다.', 'error');
  }
}

async function digMine() {
  if (mineState.digging || Date.now() < mineState.cooldownUntil) return;
  const button = document.querySelector('#mine-dig-button');
  mineState.digging = true;
  if (button) {
    button.disabled = true;
    button.textContent = '채굴 중...';
  }
  setMineMessage('곡괭이가 격리소 바닥을 두드립니다...');
  try {
    const data = await API.request('/api/mine/dig', { method: 'POST' });
    renderMineResult(data.result);
    renderMineStatus({
      mineState: data.result.mineState,
      publicHint: data.result.publicHint,
      todayEarned: data.result.todayEarned,
      formattedTodayEarned: data.result.formattedTodayEarned,
      cooldownRemainingMs: 4000
    });
    await loadMineHistory();
    setMineMessage('채굴 완료. BB쨩이 노동 기록을 보관했습니다.');
  } catch (error) {
    if (error.status === 429 || error.retryAfterMs) {
      setMineButtonCooldown(Number(error.retryAfterMs || 3000));
      setMineMessage(error.message || '광맥을 다시 정렬하는 중입니다.', 'warn');
      return;
    }
    setMineMessage(error.message || '채굴에 실패했습니다.', 'error');
  } finally {
    mineState.digging = false;
    if (!mineState.cooldownUntil && button) {
      button.disabled = false;
      button.textContent = '채굴하기';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#mine-dig-button')?.addEventListener('click', digMine);
  document.querySelector('#mine-refresh-button')?.addEventListener('click', () => {
    loadMineStatus();
    loadMineHistory();
  });
  loadMineStatus();
});
