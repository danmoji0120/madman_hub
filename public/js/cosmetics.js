let cosmeticsType = '';
let cosmeticsOwnedOnly = false;

function previewClasses(item) {
  return item.type === 'profile_frame'
    ? item.cssClass
    : item.type === 'profile_background'
      ? item.cssClass
      : '';
}

function renderCosmetics(items) {
  const visible = cosmeticsOwnedOnly ? items.filter((item) => item.owned) : items;
  document.querySelector('#cosmetics-shop').innerHTML = visible.map((item) => `
    <article class="cosmetic-item-card ${API.escape(previewClasses(item))}">
      <div class="stat-row">
        <span class="badge">${API.escape(item.type)}</span>
        <span class="badge">${API.escape(item.rarity)}</span>
      </div>
      <div class="cosmetic-preview ${API.escape(item.cssClass)}">${API.escape(item.previewText || item.name)}</div>
      <h2>${API.escape(item.name)}</h2>
      <p>${API.escape(item.description || '')}</p>
      <p class="point">${item.price}P</p>
      ${renderActions(item)}
    </article>
  `).join('') || '<p class="empty-state">조건에 맞는 꾸미기 아이템이 없습니다.</p>';
}

function renderActions(item) {
  if (!item.owned) return `<button class="button secondary" onclick="buyCosmetic(${item.id})">구매</button>`;
  if (item.equipped) return `<button class="button secondary" onclick="unequipCosmetic('${item.type}')">장착 중 / 해제</button>`;
  return `<button class="button secondary" onclick="equipCosmetic('${item.type}', ${item.id})">장착</button>`;
}

async function loadCosmetics() {
  const query = cosmeticsType ? `?type=${encodeURIComponent(cosmeticsType)}` : '';
  const data = await API.request(`/api/cosmetics/shop${query}`);
  renderCosmetics(data.items);
  if (API.token) {
    const points = await API.request('/api/points/me');
    document.querySelector('#cosmetics-points').textContent = `${points.account.balance}P`;
  }
}

function setCosmeticFilter(type) {
  cosmeticsType = type;
  cosmeticsOwnedOnly = false;
  loadCosmetics();
}

function setOwnedOnly() {
  cosmeticsOwnedOnly = true;
  loadCosmetics();
}

async function buyCosmetic(id) {
  const message = document.querySelector('#cosmetics-message');
  if (!API.token) {
    message.textContent = '구매하려면 로그인해 주세요.';
    return;
  }
  try {
    const data = await API.request(`/api/cosmetics/${id}/buy`, { method: 'POST' });
    message.textContent = data.alreadyOwned ? '이미 보유한 아이템입니다.' : `${data.cosmetic.name} 구매 완료`;
    await loadCosmetics();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function equipCosmetic(type, cosmeticId) {
  await changeEquip('/api/me/cosmetics/equip', { type, cosmeticId }, '장착했습니다.');
}

async function unequipCosmetic(type) {
  await changeEquip('/api/me/cosmetics/unequip', { type }, '장착을 해제했습니다.');
}

async function changeEquip(path, body, successMessage) {
  const message = document.querySelector('#cosmetics-message');
  try {
    await API.request(path, { method: 'POST', body: JSON.stringify(body) });
    message.textContent = successMessage;
    await loadCosmetics();
  } catch (error) {
    message.textContent = error.message;
  }
}

loadCosmetics().catch((error) => {
  document.querySelector('#cosmetics-message').textContent = error.message;
});
