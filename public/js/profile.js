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
      <strong>${item.amount > 0 ? '+' : ''}${item.amount}P</strong>
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
      <p class="meta">보상 ${item.reward_points}P</p>
    </article>
  `).join('') || '<p class="empty-state">업적이 없습니다.</p>';
}

async function loadProfile() {
  try {
    const [data, tx, titleData, achievementData, cosmeticsData] = await Promise.all([
      API.request('/api/me'),
      API.request('/api/me/transactions'),
      API.request('/api/me/titles'),
      API.request('/api/me/achievements'),
      API.request('/api/me/cosmetics')
    ]);

    renderProfile(data.user);
    renderTitles(titleData);
    renderTransactions(tx.transactions);
    renderAchievements(achievementData);
    renderCosmetics(cosmeticsData);
    document.querySelector('#points-card .point').textContent = `${data.points.balance}P`;
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
