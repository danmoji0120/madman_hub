function parseTags(value) {
  try {
    const tags = JSON.parse(value || '[]');
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    return [];
  }
}

function renderProfile(user) {
  const tags = parseTags(user.tags);
  const tagList = tags.map((tag) => `<span class="tag">${API.escape(tag)}</span>`).join('');

  const card = document.querySelector('#profile-card');
  const cosmetics = user.cosmetics || {};
  card.className = `card ${cosmetics.profileFrameClass || ''} ${cosmetics.profileBackgroundClass || ''}`;
  card.innerHTML = `
    <h1 class="${API.escape(cosmetics.nicknameColorClass || '')}">${API.escape(user.nickname || user.display_name)}</h1>
    ${renderTitleBadge(user)}
    <p>${API.escape(user.bio || '자기소개가 없습니다.')}</p>
    <p class="meta">위험도: ${'★'.repeat(user.danger_level || 1)}</p>
    <p class="meta">좋아하는 문장: ${API.escape(user.favorite_quote || '아직 없음')}</p>
    <div class="tag-list">${tagList}</div>
    <p class="meta">권한: ${API.escape(user.role)}</p>
  `;

  document.querySelector('#profile-nickname').value = user.nickname || '';
  document.querySelector('#profile-bio').value = user.bio || '';
  document.querySelector('#profile-danger-level').value = String(user.danger_level || 3);
  document.querySelector('#profile-favorite-quote').value = user.favorite_quote || '';
  document.querySelector('#profile-tags').value = tags.join(', ');
  document.querySelector('#profile-theme').value = user.profile_theme || 'neon';
  document.querySelector('#profile-avatar-url').value = user.avatar_url || '';
}

function renderCosmetics(data) {
  document.querySelector('#owned-cosmetics').innerHTML = data.items.map((item) => `
    <article class="cosmetic-item-card ${API.escape(item.type === 'nickname_color' ? '' : item.cssClass)}">
      <span class="badge">${API.escape(item.rarity)}</span>
      <h3 class="${item.type === 'nickname_color' ? API.escape(item.cssClass) : ''}">${API.escape(item.name)}</h3>
      <button class="button secondary" onclick="${item.equipped ? `unequipCosmetic('${item.type}')` : `equipCosmetic('${item.type}', ${item.id})`}">
        ${item.equipped ? '장착 중 / 해제' : '장착'}
      </button>
    </article>
  `).join('') || '<p class="empty-state">보유한 꾸미기 아이템이 없습니다.</p>';
}

function renderTitles(data) {
  document.querySelector('#owned-titles').innerHTML = data.titles.map((title) => `
    <article class="title-card rarity-${API.escape(title.rarity)}">
      ${renderTitleBadge(title, { showRarityLabel: true })}
      <h3>${API.escape(title.name)}</h3>
      <p>${API.escape(title.description || '')}</p>
      ${title.flavorText ? `<p class="meta">${API.escape(title.flavorText)}</p>` : ''}
      <div class="title-meta-grid">
        <span class="badge">${API.escape(title.category || 'shop')}</span>
        <span class="badge">${API.escape(title.sourceType || title.source || 'purchase')}</span>
        ${title.isRewardOnly ? '<span class="badge">reward only</span>' : ''}
      </div>
      ${title.unlockHint ? `<p class="meta">${API.escape(title.unlockHint)}</p>` : ''}
      <button class="button secondary" onclick="equipTitle(${title.id})" ${title.equipped ? 'disabled' : ''}>
        ${title.equipped ? '장착 중' : '장착하기'}
      </button>
    </article>
  `).join('') || '<p class="empty-state">보유한 칭호가 없습니다.</p>';
}

function renderTransactions(transactions) {
  document.querySelector('#transactions').innerHTML = transactions.map((item) => `
    <div class="transaction-item">
      <strong>${formatSignedPoints(item.amount)}</strong>
      <p>${API.escape(item.reason)}</p>
      <p class="meta">${API.escape(item.type)} · ${API.escape(item.created_at)}</p>
    </div>
  `).join('') || '<p class="meta">아직 거래 내역이 없습니다.</p>';
}

function renderAchievements(data) {
  const items = [
    ...data.unlocked.map((item) => ({ ...item, unlocked: true })),
    ...data.locked.map((item) => ({ ...item, unlocked: false }))
  ];

  document.querySelector('#profile-achievements').innerHTML = items.map((item) => `
    <article class="achievement-card ${item.unlocked ? 'unlocked' : 'locked'}">
      <span class="reward-badge">${item.unlocked ? '달성' : '미달성'}</span>
      <h3>${API.escape(item.name)}</h3>
      <p>${API.escape(item.description || '')}</p>
      <p class="meta">보상 ${formatPoints(item.reward_points)}</p>
    </article>
  `).join('') || '<p class="empty-state">업적이 없습니다.</p>';
}

function renderCasinoSummary(data) {
  const root = document.querySelector('#casino-summary-card');
  if (!root) return;
  root.innerHTML = `
    <h2>카지노/포인트 기록</h2>
    <div class="metric-grid">
      <article class="metric-card"><span class="meta">시즌 최고점</span><strong>${formatPoints(data.peakBalance)}</strong></article>
      <article class="metric-card"><span class="meta">현재 포인트</span><strong>${formatPoints(data.currentBalance)}</strong></article>
      <article class="metric-card"><span class="meta">최고점 대비 추락</span><strong>${formatPoints(data.drawdown)}</strong></article>
      <article class="metric-card"><span class="meta">카지노 순손익</span><strong>${formatSignedPoints(data.casinoNet)}</strong></article>
      <article class="metric-card"><span class="meta">단일 최대 승리</span><strong>${formatPoints(data.biggestWin)}</strong></article>
      <article class="metric-card"><span class="meta">단일 최대 손실</span><strong>${formatPoints(data.biggestLoss)}</strong></article>
      <article class="metric-card"><span class="meta">포인트 회전율</span><strong>${formatPercent(data.pointTurnover)}</strong></article>
    </div>
  `;
}

function renderSeasonTrophies(data) {
  const root = document.querySelector('#season-trophies');
  const titleRoot = document.querySelector('#season-reward-titles');
  if (!root) return;
  const items = data.items || [];
  const rewardTitles = items.filter((item) => item.titleData);
  if (titleRoot) {
    titleRoot.innerHTML = rewardTitles.slice(0, 5).map((item) => `
      <article class="season-trophy-card featured">
        <div class="season-trophy-title">
          ${renderTitleBadge(item.titleData, { showRarityLabel: true })}
          <strong>${API.escape(item.trophyLabel || item.categoryLabel || '시즌 보상')}</strong>
        </div>
        <p class="meta">${API.escape(item.seasonName || '')} · ${API.escape(item.formattedScore || formatRankingScore(item.category, item.score || 0))}</p>
      </article>
    `).join('') || '<p class="empty-state">아직 시즌 보상 칭호가 없습니다. 기록표는 기회를 기다리는 중입니다.</p>';
  }
  root.innerHTML = items.map((item) => {
    const score = item.formattedScore || formatRankingScore(item.category, item.score || 0);
    return `
      <article class="season-trophy-card ${item.isFeatured ? 'featured' : ''}">
        <div class="season-trophy-title">
          ${item.titleData ? renderTitleBadge(item.titleData, { showRarityLabel: true }) : '<span class="badge">season</span>'}
          <strong>${API.escape(item.trophyLabel || `${item.seasonName || '시즌'} ${item.categoryLabel || item.category}`)}</strong>
        </div>
        <p class="season-trophy-score">${API.escape(score)}</p>
        <p>${API.escape(item.trophyDescription || '이 기록은 프로필에 남는 시즌 박제입니다.')}</p>
        <p class="meta">${API.escape(item.seasonName || '')} · ${API.escape(item.categoryLabel || item.category)} · #${API.escape(item.rank || '-')}</p>
      </article>
    `;
  }).join('') || '<p class="empty-state">아직 시즌 박제 기록이 없습니다. 오늘은 기록표가 조용하네요.</p>';
}

async function loadProfile() {
  try {
    const [data, tx, titleData, achievementData, cosmeticsData, casinoSummary, seasonTrophies] = await Promise.all([
      API.request('/api/me'),
      API.request('/api/me/transactions'),
      API.request('/api/me/titles'),
      API.request('/api/me/achievements'),
      API.request('/api/me/cosmetics'),
      API.request('/api/me/casino-summary'),
      API.request('/api/me/season-trophies?limit=5')
    ]);

    renderProfile(data.user);
    renderTitles(titleData);
    renderTransactions(tx.transactions);
    renderAchievements(achievementData);
    renderCosmetics(cosmeticsData);
    renderCasinoSummary(casinoSummary);
    renderSeasonTrophies(seasonTrophies);
    document.querySelector('#points-card .point').textContent = formatPoints(data.points.balance);
  } catch (error) {
    location.href = '/login.html';
  }
}

async function equipCosmetic(type, cosmeticId) {
  await updateCosmeticEquip('/api/me/cosmetics/equip', { type, cosmeticId }, '꾸미기 아이템을 장착했습니다.');
}

async function unequipCosmetic(type) {
  await updateCosmeticEquip('/api/me/cosmetics/unequip', { type }, '꾸미기 아이템 장착을 해제했습니다.');
}

async function updateCosmeticEquip(path, body, message) {
  try {
    await API.request(path, { method: 'POST', body: JSON.stringify(body) });
    document.querySelector('#profile-message').textContent = message;
    await loadProfile();
  } catch (error) {
    document.querySelector('#profile-message').textContent = error.message;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const message = document.querySelector('#profile-message');
  const tags = document.querySelector('#profile-tags').value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  try {
    await API.request('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        nickname: document.querySelector('#profile-nickname').value,
        bio: document.querySelector('#profile-bio').value,
        dangerLevel: Number(document.querySelector('#profile-danger-level').value),
        favoriteQuote: document.querySelector('#profile-favorite-quote').value,
        tags,
        profileTheme: document.querySelector('#profile-theme').value,
        avatarUrl: document.querySelector('#profile-avatar-url').value
      })
    });

    message.textContent = '프로필을 저장했습니다.';
    await loadProfile();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function equipTitle(titleId) {
  const message = document.querySelector('#profile-message');

  try {
    const data = await API.request('/api/me/title/equip', {
      method: 'POST',
      body: JSON.stringify({ titleId })
    });
    message.textContent = `${data.equippedTitle} 칭호를 장착했습니다.`;
    await loadProfile();
  } catch (error) {
    message.textContent = error.message;
  }
}

loadProfile();
