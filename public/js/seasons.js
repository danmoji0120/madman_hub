const seasonSelect = document.querySelector('#season-select');
const categorySelect = document.querySelector('#season-category');
const message = document.querySelector('#season-message');
let seasons = [];
let categories = [];

function renderSeasonSummary(season) {
  document.querySelector('#season-summary').innerHTML = `
    <span class="badge">${API.escape(season.status)}</span>
    <h2>${API.escape(season.name)}</h2>
    <p>${API.escape(season.description || '설명 없음')}</p>
    <p class="meta">${API.escape(season.startsAt)} ~ ${API.escape(season.endsAt)}</p>
  `;
}

function renderRankings(items) {
  document.querySelector('#season-ranking-list').innerHTML = items.map((item) => `
    <article class="season-rank-card ${API.escape(item.cosmetics?.profileFrameClass || '')} ${API.escape(item.cosmetics?.profileBackgroundClass || '')}">
      <strong class="season-rank-number">#${item.rank}</strong>
      <div>
        <strong class="${API.escape(item.cosmetics?.nicknameColorClass || '')}">${API.escape(item.nickname || item.displayName)}</strong>
        ${renderTitleBadge(item, { compact: true })}
        <p class="meta">${API.escape(item.displayName || '')}</p>
      </div>
      <strong class="season-rank-score">${API.escape(item.formattedScore || item.score)}</strong>
    </article>
  `).join('') || '<p class="empty-state">아직 집계된 기록이 없습니다.</p>';
}

async function loadRanking() {
  const seasonId = Number(seasonSelect.value);
  const category = categorySelect.value;
  const season = seasons.find((item) => item.id === seasonId);
  if (!season) return;
  try {
    const ended = ['ended', 'archived'].includes(season.status);
    const path = ended
      ? `/api/seasons/hall-of-fame?seasonId=${seasonId}&category=${encodeURIComponent(category)}`
      : `/api/seasons/${seasonId}/rankings?category=${encodeURIComponent(category)}`;
    const data = await API.request(path);
    renderSeasonSummary(data.season);
    renderRankings(ended ? data.entries : data.rankings);
    document.querySelector('#ranking-mode').textContent = ended ? 'HALL OF FAME' : 'LIVE';
    document.querySelector('#ranking-title').textContent = data.category?.label || '시즌 랭킹';
  } catch (error) {
    message.textContent = error.message;
  }
}

function renderRankingSummary(data) {
  const featured = ['pointEarned', 'pointSpent', 'casinoLoss', 'postCount', 'cosmeticSpent', 'attendanceCount'];
  document.querySelector('#season-ranking-summary').innerHTML = featured.map((key) => {
    const items = data.rankings[key] || [];
    const category = categories.find((item) => key === item.code.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()));
    return `
      <article class="hall-of-fame-card">
        <strong>${API.escape(category?.label || key)}</strong>
        ${items.slice(0, 3).map((item) => `<p class="meta">#${item.rank} ${API.escape(item.nickname)} · ${API.escape(item.formattedScore)}</p>`).join('') || '<p class="meta">기록 없음</p>'}
      </article>
    `;
  }).join('');
}

function renderHallOfFame(data) {
  document.querySelector('#hall-of-fame-list').innerHTML = data.seasons.map((season) => `
    <article class="hall-of-fame-card">
      <span class="badge">${API.escape(season.status)}</span>
      <h3>${API.escape(season.name)}</h3>
      <p class="meta">저장 기록 ${season.entries.length}개</p>
      <button class="button secondary inline small-button" onclick="selectHallOfFame(${season.id})">기록 보기</button>
    </article>
  `).join('') || '<p class="empty-state">아직 종료된 시즌이 없습니다.</p>';
}

async function selectHallOfFame(seasonId) {
  seasonSelect.value = String(seasonId);
  await loadRanking();
}

async function init() {
  try {
    const data = await API.request('/api/seasons');
    seasons = data.seasons;
    categories = data.categories;
    seasonSelect.innerHTML = seasons.map((season) => `
      <option value="${season.id}" ${season.isActive ? 'selected' : ''}>${API.escape(season.name)} (${API.escape(season.status)})</option>
    `).join('');
    categorySelect.innerHTML = categories.map((category) => `
      <option value="${API.escape(category.code)}">${API.escape(category.label)}</option>
    `).join('');
    if (!seasons.length) {
      message.textContent = '등록된 시즌이 없습니다.';
      return;
    }
    const [summary, hall] = await Promise.all([
      API.request('/api/seasons/current/rankings?limit=3'),
      API.request('/api/seasons/hall-of-fame')
    ]);
    renderRankingSummary(summary);
    renderHallOfFame(hall);
    await loadRanking();
  } catch (error) {
    message.textContent = error.message;
  }
}

document.querySelector('#season-load').addEventListener('click', loadRanking);
seasonSelect.addEventListener('change', loadRanking);
categorySelect.addEventListener('change', loadRanking);
init();
