function titleQuery() {
  const params = new URLSearchParams();
  for (const id of ['title-rarity-filter', 'title-category-filter', 'title-availability-filter']) {
    const element = document.querySelector(`#${id}`);
    if (!element || !element.value) continue;
    if (id === 'title-rarity-filter') params.set('rarity', element.value);
    if (id === 'title-category-filter') params.set('category', element.value);
    if (id === 'title-availability-filter') {
      if (element.value === 'purchasable') params.set('purchasable', 'true');
      if (element.value === 'reward') params.set('purchasable', 'false');
      if (element.value === 'owned') params.set('owned', 'true');
    }
  }
  const q = document.querySelector('#title-search-filter')?.value.trim();
  if (q) params.set('q', q);
  return params.toString();
}

function renderShop(titles) {
  document.querySelector('#shop-titles').innerHTML = titles.map((title) => {
    const disabled = title.owned || !title.isPurchasable || title.isRewardOnly;
    const label = title.owned
      ? '보유 중'
      : title.isRewardOnly || !title.isPurchasable
        ? '보상 전용'
        : `${formatPoints(title.price)}로 구매`;
    return `
      <article class="title-card rarity-${API.escape(title.rarity)}">
        <div class="stat-row">
          ${renderTitleBadge(title, { showRarityLabel: true })}
          ${title.owned ? '<span class="owned-label">보유 중</span>' : ''}
        </div>
        <h2>${API.escape(title.name)}</h2>
        <p>${API.escape(title.description || '')}</p>
        ${title.flavorText ? `<p class="meta">${API.escape(title.flavorText)}</p>` : ''}
        <div class="title-meta-grid">
          <span class="badge">${API.escape(title.category)}</span>
          <span class="badge">${API.escape(title.sourceType)}</span>
          ${title.isRewardOnly ? '<span class="badge">reward only</span>' : ''}
        </div>
        ${title.unlockHint ? `<p class="meta">${API.escape(title.unlockHint)}</p>` : ''}
        <p class="point">${formatPoints(title.price)}</p>
        <button class="button secondary" onclick="buyTitle(${title.id})" ${disabled ? 'disabled' : ''}>${label}</button>
      </article>
    `;
  }).join('') || '<p class="empty-state">조건에 맞는 칭호가 없습니다.</p>';
}

async function loadShop() {
  const message = document.querySelector('#shop-message');
  try {
    const query = titleQuery();
    const data = await API.request(`/api/shop/titles${query ? `?${query}` : ''}`);
    renderShop(data.titles);

    if (API.token) {
      const points = await API.request('/api/points/me');
      document.querySelector('#shop-points').textContent = formatPoints(points.account.balance);
      document.querySelector('#shop-account-hint').textContent = '구매한 칭호는 프로필에서 장착할 수 있습니다.';
    }
  } catch (error) {
    console.error('title shop load failed', error);
    message.textContent = error.message;
  }
}

async function buyTitle(titleId) {
  const message = document.querySelector('#shop-message');
  if (!API.token) {
    message.textContent = '칭호를 구매하려면 로그인해 주세요.';
    return;
  }

  try {
    const data = await API.request(`/api/shop/titles/${titleId}/buy`, { method: 'POST' });
    message.textContent = data.alreadyOwned ? data.message : `${data.title.name} 칭호를 구매했습니다.`;
    await loadShop();
  } catch (error) {
    message.textContent = error.message;
  }
}

for (const id of ['title-rarity-filter', 'title-category-filter', 'title-availability-filter', 'title-search-filter']) {
  document.querySelector(`#${id}`)?.addEventListener('change', loadShop);
  document.querySelector(`#${id}`)?.addEventListener('input', () => {
    if (id === 'title-search-filter') loadShop();
  });
}

loadShop();
