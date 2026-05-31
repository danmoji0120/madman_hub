function renderShop(titles) {
  document.querySelector('#shop-titles').innerHTML = titles.map((title) => {
    const isAdmin = title.rarity === 'admin';
    const disabled = title.owned || isAdmin;
    const label = isAdmin ? '관리자 전용' : title.owned ? '보유 중' : `${title.price}P로 구매`;

    return `
      <article class="title-card rarity-${API.escape(title.rarity)}">
        <div class="stat-row">
          <span class="badge">${API.escape(title.rarity)}</span>
          ${title.owned ? '<span class="owned-label">보유 중</span>' : ''}
        </div>
        <h2>${API.escape(title.name)}</h2>
        <p>${API.escape(title.description || '')}</p>
        <p class="point">${title.price}P</p>
        <button class="button secondary" onclick="buyTitle(${title.id})" ${disabled ? 'disabled' : ''}>${label}</button>
      </article>
    `;
  }).join('');
}

async function loadShop() {
  const message = document.querySelector('#shop-message');

  try {
    const data = await API.request('/api/shop/titles');
    renderShop(data.titles);

    if (API.token) {
      const points = await API.request('/api/points/me');
      document.querySelector('#shop-points').textContent = `${points.account.balance}P`;
      document.querySelector('#shop-account-hint').textContent = '구매한 칭호는 내 프로필에서 장착할 수 있습니다.';
    }
  } catch (error) {
    console.error('칭호 상점 로딩 실패', error);
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

loadShop();
