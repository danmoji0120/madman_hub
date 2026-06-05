(() => {
  const escapeHtml = window.API?.escape || ((value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;'));

  const IA_TABS = [
    { key: 'home', label: '홈', action: 'openHomeView()' },
    { key: 'activity', label: '활동', action: 'openActivityPanel()' },
    { key: 'community', label: '커뮤니티', action: 'openCommunityPanel()' },
    { key: 'casino', label: '카지노', action: 'openCasinoPanel()' },
    { key: 'shop', label: '상점', action: 'openShopPanel()' },
    { key: 'mercenary', label: '용병단', action: 'openMercenaryPanel()' },
    { key: 'season', label: '시즌', action: 'openSeasonPanel()' },
    { key: 'account', label: '내 정보', action: 'openAccountPanel()' }
  ];

  const IA_VIEW_KEYS = IA_TABS.map((tab) => tab.key);
  let iaActivityLoaded = false;
  let iaNavRendering = false;
  let iaNavUnreadCount = 0;

  function formatPointsSafe(value) {
    if (typeof window.formatPoints === 'function') return window.formatPoints(value || 0);
    return `${Number(value || 0).toLocaleString('ko-KR')} P`;
  }

  function progressText(item = {}) {
    const current = Number(item.progress ?? item.current ?? item.count ?? 0);
    const target = Number(item.target ?? item.required ?? item.goal ?? 0);
    if (!target) return item.completed ? '완료' : '진행 중';
    return `${Math.min(current, target)}/${target}`;
  }

  function missionReward(item = {}) {
    return formatPointsSafe(item.rewardPoints ?? item.reward_points ?? item.reward ?? 0);
  }

  function normalizeMissionPayload(payload = {}) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.missions)) return payload.missions;
    if (Array.isArray(payload.today)) return payload.today;
    if (Array.isArray(payload.weekly)) return payload.weekly;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
  }

  function renderIaNav(unreadCount = iaNavUnreadCount) {
    const nav = document.querySelector('#main-nav');
    if (!nav || iaNavRendering) return;
    const currentKeys = Array.from(nav.querySelectorAll('[data-top-tab]')).map((item) => item.dataset.topTab).join('|');
    const desiredKeys = IA_VIEW_KEYS.join('|');
    if (currentKeys === desiredKeys) {
      updateIaActiveState();
      return;
    }
    iaNavRendering = true;
    iaNavUnreadCount = Number(unreadCount || 0);
    const unreadLabel = iaNavUnreadCount > 99 ? '99+' : String(iaNavUnreadCount || '');
    nav.innerHTML = IA_TABS.map((tab) => {
      const label = tab.key === 'account' && iaNavUnreadCount > 0 ? `${tab.label} ${unreadLabel}` : tab.label;
      return `<button type="button" class="nav-tab-button" data-top-tab="${escapeHtml(tab.key)}" onclick="${escapeHtml(tab.action)}">${escapeHtml(label)}</button>`;
    }).join('');
    iaNavRendering = false;
    updateIaActiveState();
  }

  function updateIaActiveState(activeKey) {
    const visible = document.querySelector('[data-main-view]:not([hidden])');
    const key = activeKey || visible?.dataset?.mainView || 'home';
    document.querySelectorAll('[data-top-tab]').forEach((button) => {
      const active = button.dataset.topTab === key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function ensureIaPanels() {
    const root = document.querySelector('#main-view-root');
    if (!root) return;
    if (!document.querySelector('#activity-panel')) {
      root.insertAdjacentHTML('beforeend', `
        <section class="card main-view home-tab-panel activity-panel" id="activity-panel" data-main-view="activity" hidden>
          <div class="section-heading">
            <div><span class="badge">활동</span><h2>포인트 수급실</h2></div>
            <button class="button secondary inline small-button" type="button" onclick="openHomeView()">홈으로 접기</button>
          </div>
          <div id="activity-shell" class="ia-panel-shell"></div>
        </section>
      `);
    }
    if (!document.querySelector('#shop-panel')) {
      root.insertAdjacentHTML('beforeend', `
        <section class="card main-view home-tab-panel shop-panel" id="shop-panel" data-main-view="shop" hidden>
          <div class="section-heading">
            <div><span class="badge">상점</span><h2>포인트 소비소</h2></div>
            <button class="button secondary inline small-button" type="button" onclick="openHomeView()">홈으로 접기</button>
          </div>
          <div class="ia-card-grid">
            <a class="ia-action-card" href="/shop.html"><span class="badge">상점</span><strong>칭호 상점</strong><p class="meta">포인트로 칭호를 사고 장착할 준비를 합니다.</p></a>
            <a class="ia-action-card" href="/cosmetics.html"><span class="badge">꾸미기</span><strong>꾸미기 상점</strong><p class="meta">프로필 프레임과 배경을 손봅니다.</p></a>
            <article class="ia-action-card is-locked"><span class="badge">보급품</span><strong>보급품 창고</strong><p class="meta">광산/용병단 소모품을 위한 예정 구역입니다.</p></article>
          </div>
        </section>
      `);
    }
    if (!document.querySelector('#mercenary-panel')) {
      root.insertAdjacentHTML('beforeend', `
        <section class="card main-view home-tab-panel mercenary-panel" id="mercenary-panel" data-main-view="mercenary" hidden>
          <div class="section-heading">
            <div><span class="badge">준비 중</span><h2>용병단</h2></div>
            <button class="button secondary inline small-button" type="button" onclick="openHomeView()">홈으로 접기</button>
          </div>
          <div class="ia-card-grid mercenary-planner-grid">
            ${['내 용병', '고용소', '훈련소', '의무실', '임무', '전투 기록', '랭킹'].map((title) => `
              <article class="ia-action-card is-locked">
                <span class="badge">예정</span>
                <strong>${escapeHtml(title)}</strong>
                <p class="meta">고용, 성장, 치료비, 임무 파견을 위한 용병단 콘텐츠 슬롯입니다.</p>
              </article>
            `).join('')}
          </div>
        </section>
      `);
    }
  }

  function switchIaView(tabKey = 'home', { scroll = true } = {}) {
    ensureIaPanels();
    renderIaNav();
    const nextKey = IA_VIEW_KEYS.includes(tabKey) ? tabKey : 'home';
    document.querySelectorAll('[data-main-view]').forEach((view) => {
      view.hidden = view.dataset.mainView !== nextKey;
    });
    updateIaActiveState(nextKey);
    if (scroll) (document.querySelector('#main-view-root') || document.querySelector('main'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderActivityShellLoading() {
    const shell = document.querySelector('#activity-shell');
    if (!shell) return;
    shell.innerHTML = '<div class="ia-card-grid"><article class="ia-action-card"><span class="badge">확인 중</span><strong>활동 정보를 불러오는 중</strong><p class="meta">일일/주간미션과 광산 상태를 확인합니다.</p></article></div>';
  }

  function renderMissionList(items = [], scope = 'daily') {
    if (!items.length) return '<p class="empty-state">표시할 미션이 없습니다.</p>';
    return `<div class="mission-list ia-mission-list">
      ${items.slice(0, 8).map((mission) => {
        const code = mission.code || mission.id;
        const claimed = Boolean(mission.claimed);
        const completed = Boolean(mission.completed);
        const status = claimed ? '수령 완료' : completed ? '수령 가능' : progressText(mission);
        return `
          <div class="mission-item ia-mission-item">
            <div>
              <strong>${escapeHtml(mission.title || mission.name || code || '미션')}</strong><br />
              <span class="meta">${escapeHtml(status)} · ${escapeHtml(missionReward(mission))}</span>
            </div>
            ${completed && !claimed && code
              ? `<button class="button secondary inline small-button" type="button" onclick="claimIaMission('${escapeHtml(scope)}','${escapeHtml(code)}')">보상 받기</button>`
              : `<span class="badge">${escapeHtml(status)}</span>`}
          </div>
        `;
      }).join('')}
    </div>`;
  }

  function renderActivityShell(data = {}) {
    const shell = document.querySelector('#activity-shell');
    if (!shell) return;
    const dailyItems = normalizeMissionPayload(data.daily);
    const weeklyItems = normalizeMissionPayload(data.weekly);
    const mine = data.mine || {};
    const mineEarned = mine.todayEarned ?? mine.today_earned ?? mine.earnedToday ?? 0;
    const mineState = mine.mineState || mine.mine_state || mine.stateLabel || mine.state || '광맥 확인 중';

    shell.innerHTML = `
      <section class="ia-activity-overview">
        <article class="ia-action-card ia-attendance-card">
          <span class="badge">출석</span>
          <strong>오늘의 생존 확인</strong>
          <p class="meta">홈에서도 출석할 수 있지만, 활동 탭에서 수급 흐름을 한눈에 봅니다.</p>
          <button class="button inline" type="button" data-home-action="checkin">출석하기</button>
        </article>
        <a class="ia-action-card" href="/mine.html">
          <span class="badge">광산</span>
          <strong>격리소 광산</strong>
          <p class="meta">오늘 채굴 수익 ${escapeHtml(formatPointsSafe(mineEarned))} · 광맥 상태 ${escapeHtml(mineState)}</p>
          <span class="button secondary inline small-button">광산 열기</span>
        </a>
      </section>
      <section class="ia-card-grid ia-mission-grid">
        <article class="card ia-mission-card">
          <div class="section-heading"><div><span class="badge">일일</span><h3>일일미션</h3></div></div>
          ${renderMissionList(dailyItems, 'daily')}
        </article>
        <article class="card ia-mission-card">
          <div class="section-heading"><div><span class="badge">주간</span><h3>주간미션</h3></div></div>
          ${renderMissionList(weeklyItems, 'weekly')}
        </article>
      </section>
      <section class="ia-card-grid">
        <article class="ia-action-card is-quiet"><span class="badge">기록</span><strong>보상 기록</strong><p class="meta">출석, 미션, 광산 보상 내역은 포인트 기록과 광산 로그에 남습니다.</p></article>
        <article class="ia-action-card is-quiet"><span class="badge">원칙</span><strong>벌 곳과 태울 곳 분리</strong><p class="meta">포인트는 활동에서 벌고, 카지노와 상점과 용병단에서 씁니다.</p></article>
      </section>
    `;
  }

  async function loadActivityPanel() {
    ensureIaPanels();
    renderIaNav();
    if (!window.API?.request) {
      renderActivityShell({});
      return;
    }
    renderActivityShellLoading();
    const [daily, weekly, mine] = await Promise.allSettled([
      API.request('/api/missions/daily'),
      API.request('/api/missions/weekly'),
      API.request('/api/mine/status')
    ]);
    renderActivityShell({
      daily: daily.status === 'fulfilled' ? daily.value : {},
      weekly: weekly.status === 'fulfilled' ? weekly.value : {},
      mine: mine.status === 'fulfilled' ? mine.value.status || mine.value.result || mine.value : {}
    });
    iaActivityLoaded = true;
  }

  window.claimIaMission = async function claimIaMission(scope, code) {
    const message = document.querySelector('#dashboard-message');
    try {
      const data = await API.request(`/api/missions/${encodeURIComponent(scope)}/${encodeURIComponent(code)}/claim`, { method: 'POST' });
      if (message) message.textContent = `미션 보상 ${formatPointsSafe(data.rewardPoints)}를 받았습니다.`;
      iaActivityLoaded = false;
      await loadActivityPanel();
      window.loadDashboard?.();
    } catch (error) {
      if (message) message.textContent = error.message || '미션 보상을 받을 수 없습니다.';
    }
  };

  window.openActivityPanel = function openActivityPanel(options = {}) {
    switchIaView('activity', options);
    if (!iaActivityLoaded) loadActivityPanel();
  };

  window.openShopPanel = function openShopPanel(options = {}) {
    switchIaView('shop', options);
  };

  window.openMercenaryPanel = function openMercenaryPanel(options = {}) {
    switchIaView('mercenary', options);
  };

  const originalOpenHome = window.openHomeView;
  window.openHomeView = function openHomeViewPatched(options = {}) {
    if (typeof originalOpenHome === 'function') originalOpenHome(options);
    else switchIaView('home', options);
    setTimeout(() => {
      renderIaNav();
      updateIaActiveState('home');
      patchHomeSummaryCards();
    }, 0);
  };

  const originalRenderNav = window.renderMainNavigation;
  window.renderMainNavigation = function renderMainNavigationPatched(me, unreadCount = 0) {
    iaNavUnreadCount = Number(unreadCount || 0);
    if (typeof originalRenderNav === 'function') originalRenderNav(me, unreadCount);
    setTimeout(() => renderIaNav(iaNavUnreadCount), 0);
  };

  function patchHomeSummaryCards() {
    const casinoCard = document.querySelector('#home-casino-gate-card');
    if (casinoCard && !casinoCard.dataset.iaPatched) {
      casinoCard.dataset.iaPatched = 'true';
      casinoCard.className = 'card home-card home-activity-summary-card';
      casinoCard.innerHTML = `
        <div class="section-heading">
          <div><span class="badge">간편 확인</span><h2>오늘 수급 요약</h2></div>
          <button class="button secondary inline small-button" type="button" data-home-action="activity">활동 탭</button>
        </div>
        <p class="meta">홈은 확인만 합니다. 포인트 수급은 활동 탭에서 진행하세요.</p>
      `;
    }
    const teaserCard = document.querySelector('#home-teaser-card');
    if (teaserCard && !teaserCard.dataset.iaPatched) {
      teaserCard.dataset.iaPatched = 'true';
      teaserCard.innerHTML = `
        <div class="section-heading"><div><span class="badge">다음 성장축</span><h2>상점 · 용병단 준비</h2></div></div>
        <div class="home-teaser-grid">
          <button class="home-mini-card ia-mini-button" type="button" data-home-action="shop"><strong>상점</strong><p class="meta">칭호, 꾸미기, 보급품을 쓰는 포인트 소비처.</p></button>
          <button class="home-mini-card ia-mini-button" type="button" data-home-action="mercenary"><strong>용병단</strong><p class="meta">고용, 훈련, 의무실, 임무가 들어올 장기 콘텐츠 탭.</p></button>
        </div>
      `;
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-home-action]');
    if (!target) return;
    const action = target.dataset.homeAction;
    if (action === 'activity') {
      event.preventDefault();
      openActivityPanel();
    }
    if (action === 'shop') {
      event.preventDefault();
      openShopPanel();
    }
    if (action === 'mercenary') {
      event.preventDefault();
      openMercenaryPanel();
    }
  }, true);

  function openIaHash() {
    const key = String(window.location.hash || '').replace(/^#/, '').trim();
    if (key === 'activity') return openActivityPanel({ scroll: false });
    if (key === 'shop') return openShopPanel({ scroll: false });
    if (key === 'mercenary') return openMercenaryPanel({ scroll: false });
    return null;
  }

  window.addEventListener('hashchange', openIaHash);

  const navObserver = new MutationObserver(() => renderIaNav(iaNavUnreadCount));
  const homeObserver = new MutationObserver(() => patchHomeSummaryCards());

  function bootIaTabs() {
    ensureIaPanels();
    renderIaNav(iaNavUnreadCount);
    patchHomeSummaryCards();
    const nav = document.querySelector('#main-nav');
    if (nav) navObserver.observe(nav, { childList: true });
    const home = document.querySelector('#home-view');
    if (home) homeObserver.observe(home, { childList: true, subtree: true });
    openIaHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootIaTabs);
  else bootIaTabs();
})();
