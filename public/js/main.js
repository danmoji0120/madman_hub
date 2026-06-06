const escapeHtml = API.escape;
const dashboardPerf = window.HubPerfLogger?.createScope?.('dashboard');
const COMMUNITY_CACHE_TTL_MS = 45 * 1000;
const COMMUNITY_DEFAULT_TAB = 'latest';
const COMMUNITY_TABS = [
  { key: 'latest', label: '최신글' },
  { key: 'popular', label: '인기글' },
  { key: 'comments', label: '댓글' },
  { key: 'songs', label: '노래추천' },
  { key: 'random', label: '랜덤글' }
];
const SEASON_CACHE_TTL_MS = 50 * 1000;
const SEASON_DEFAULT_TAB = 'overview';
const SEASON_TABS = [
  { key: 'overview', label: '시즌 현황' },
  { key: 'ranking', label: '랭킹' },
  { key: 'hall', label: '명예의 전당' },
  { key: 'mine', label: '내 시즌 기록' }
];
const SEASON_TITLE_CATEGORIES = [
  { code: 'activity_score', label: '활동 종합' },
  { code: 'casino_loss', label: '카지노 대참사' },
  { code: 'point_earned', label: '포인트 획득' },
  { code: 'community_activity', label: '커뮤니티 활동' }
];
const CASINO_CACHE_TTL_MS = 50 * 1000;
const CASINO_DEFAULT_TAB = 'games';
const CASINO_TABS = [
  { key: 'games', label: '게임' },
  { key: 'mine', label: '내 기록' },
  { key: 'disasters', label: '대참사' },
  { key: 'balance', label: '밸런스 안내' }
];
const ACCOUNT_CACHE_TTL_MS = 50 * 1000;
const ACCOUNT_DEFAULT_TAB = 'profile';
const ACCOUNT_TABS = [
  { key: 'profile', label: '프로필' },
  { key: 'titles', label: '칭호' },
  { key: 'cosmetics', label: '꾸미기' },
  { key: 'shop', label: '상점' },
  { key: 'achievements', label: '업적' },
  { key: 'notifications', label: '알림' },
  { key: 'settings', label: '설정' },
  { key: 'admin', label: '관리자', adminOnly: true },
  { key: 'logout', label: '로그아웃', authOnly: true }
];
const communityCache = new Map();
const seasonCache = new Map();
const casinoCache = new Map();
const accountCache = new Map();
const MERCENARY_CACHE_TTL_MS = 45 * 1000;
let mercenaryCache = null;
const ACTIVITY_CACHE_TTL_MS = 45 * 1000;
let activityCache = null;
let activityShellRendered = false;
let activityLoaded = false;
let communityShellRendered = false;
let activeCommunityTab = COMMUNITY_DEFAULT_TAB;
let seasonShellRendered = false;
let activeSeasonTab = SEASON_DEFAULT_TAB;
let activeSeasonRankingCategory = 'activity_score';
let casinoShellRendered = false;
let activeCasinoTab = CASINO_DEFAULT_TAB;
let accountShellRendered = false;
let activeAccountTab = ACCOUNT_DEFAULT_TAB;
let latestDashboardSummary = null;
let activeTopTab = 'home';
let deferredPwaPrompt = null;
let pwaWaitingRegistration = null;
let pwaUpdateReloading = false;
const PWA_INSTALL_DISMISS_KEY = 'madmenPwaInstallDismissUntil';
const PWA_INSTALL_INSTALLED_KEY = 'madmenPwaInstalled';
const PWA_INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const PWA_INSTALL_SHORT_DISMISS_MS = 24 * 60 * 60 * 1000;
let pwaInstallToastTimer = null;

function dashboardRequest(path, options = {}) {
  return API.request(path, { ...options, perfScope: 'dashboard' });
}

function measureDashboard(label, fn) {
  if (dashboardPerf?.measure) return dashboardPerf.measure(label, fn);
  return fn();
}

function isAdminUser(me) {
  return ['admin', 'owner'].includes(me?.role);
}

function safeInternalUrl(value, fallback = '#') {
  const url = String(value || '').trim();
  if (!url || !url.startsWith('/') || url.startsWith('//') || /[\r\n]/.test(url)) return fallback;
  return url;
}

function safeExternalUrl(value, fallback = '#') {
  const url = String(value || '').trim();
  if (!url || /[\r\n]/.test(url)) return fallback;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
  } catch (error) {
    return fallback;
  }
}

function isPwaDebugEnabled() {
  try {
    return localStorage.DEBUG_PWA === 'true';
  } catch (error) {
    return false;
  }
}

function logPwa(message, detail) {
  if (!isPwaDebugEnabled()) return;
  if (detail === undefined) {
    console.log(`[pwa] ${message}`);
    return;
  }
  console.log(`[pwa] ${message}`, detail);
}

function isStandalonePwa() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
}

function supportsPwaInstallPrompt() {
  return Boolean(deferredPwaPrompt);
}

function truncateText(value, maxLength = 92) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function renderRetryButton({ label = '다시 시도', onClick = '', compact = true } = {}) {
  if (!onClick) return '';
  const sizeClass = compact ? ' small-button' : '';
  return `<button class="button secondary inline state-retry-button${sizeClass}" type="button" onclick="${escapeHtml(onClick)}">${escapeHtml(label)}</button>`;
}

function renderPanelState(type, options = {}) {
  const {
    title = '',
    description = '',
    icon = '',
    actionHtml = '',
    retryOnClick = '',
    retryLabel = '다시 시도',
    compact = true,
    rows = 2
  } = options;
  const classes = ['state-card', type];
  if (compact) classes.push('compact');
  const skeleton = type === 'loading'
    ? `<div class="state-skeleton">${Array.from({ length: Math.max(1, rows) }, (_, index) => `<div class="state-skeleton-row ${index === rows - 1 ? 'short' : ''}"></div>`).join('')}</div>`
    : '';
  const actions = actionHtml || renderRetryButton({ label: retryLabel, onClick: retryOnClick, compact });

  return `
    <div class="${classes.join(' ')}">
      ${icon ? `<span class="state-icon">${escapeHtml(icon)}</span>` : ''}
      ${title ? `<strong class="state-title">${escapeHtml(title)}</strong>` : ''}
      ${description ? `<p class="state-description">${escapeHtml(description)}</p>` : ''}
      ${skeleton}
      ${actions ? `<div class="state-actions">${actions}</div>` : ''}
    </div>
  `;
}

function renderLoadingState(options = {}) {
  return renderPanelState('loading', options);
}

function renderEmptyState(options = {}) {
  return renderPanelState('empty', options);
}

function renderErrorState(options = {}) {
  return renderPanelState('error', options);
}

function parseHomeDate(value) {
  if (!value) return null;
  const normalized = String(value).trim()
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
    .replace(/T(\d):/, 'T0$1:')
    .replace(/\s+([+-]\d{2}:?\d{2})$/, '$1');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHomeDateOnly(value) {
  const date = parseHomeDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHomeDate(value) {
  const date = parseHomeDate(value);
  if (!date) return String(value || '');
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatHomeDateOnly(value);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return '방금 전';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}일 전`;
  return formatHomeDateOnly(value);
}

function renderNavItem(link) {
  if (link.action === 'logout') {
    return '<button type="button" onclick="API.logout()">로그아웃</button>';
  }
  return `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
}

function renderNavGroup(label, links) {
  return `
    <details class="nav-group">
      <summary>${escapeHtml(label)}</summary>
      <div class="nav-menu">
        ${links.map(renderNavItem).join('')}
      </div>
    </details>
  `;
}

function renderMainNavigation(me, unreadCount = 0) {
  const nav = document.querySelector('#main-nav');
  if (!nav) return;

  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount || '');
  nav.innerHTML = `
    <button type="button" class="nav-tab-button" data-top-tab="home" onclick="openHomeView()">홈</button>
    <button type="button" class="nav-tab-button" data-top-tab="activity" onclick="openActivityPanel()">활동</button>
    <button type="button" class="nav-tab-button" data-top-tab="community" onclick="openCommunityPanel()">커뮤니티</button>
    <button type="button" class="nav-tab-button" data-top-tab="casino" onclick="openCasinoPanel()">카지노</button>
    <button type="button" class="nav-tab-button" data-top-tab="shop" onclick="openShopPanel()">상점</button>
    <button type="button" class="nav-tab-button" data-top-tab="mercenary" onclick="openMercenaryPanel()">용병단</button>
    <button type="button" class="nav-tab-button" data-top-tab="season" onclick="openSeasonPanel()">시즌</button>
    <button type="button" class="nav-tab-button" data-top-tab="account" onclick="openAccountPanel()">내 정보</button>
    ${me ? '' : '<a href="/login.html">로그인</a>'}
  `;
}

function renderHeroActions(me) {
  const actions = document.querySelector('#hero-actions');
  const navAuth = document.querySelector('#nav-auth') || { set innerHTML(value) {} };
  if (!actions) return;

  if (me) {
    actions.innerHTML = '<a class="button inline" href="/profile.html">내 프로필 보기</a>';
    navAuth.innerHTML = '<button onclick="API.logout()">로그아웃</button>';
    return;
  }

  actions.innerHTML = `
    <a class="button inline" href="/login.html">로그인</a>
    <a class="button secondary inline" href="/register.html">회원가입</a>
  `;
  navAuth.innerHTML = '<a href="/login.html">로그인</a>';
}

function setHomeLoading(isLoading) {
  const card = document.querySelector('#home-loading-card');
  if (!card) return;
  card.hidden = !isLoading;
  if (isLoading) {
    card.innerHTML = `
      ${renderLoadingState({
        title: '홈 요약을 불러오는 중',
        description: '필요한 카드만 먼저 가져오고 있습니다.',
        rows: 2
      })}
    `;
  }
}

function renderHomeError(error) {
  const message = document.querySelector('#dashboard-message');
  const card = document.querySelector('#home-loading-card');
  if (message) {
    message.textContent = '홈 요약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (card) {
    card.hidden = false;
    card.innerHTML = renderErrorState({
      title: '홈 요약 로딩 실패',
      description: error?.message || '요약 API 응답을 받을 수 없습니다.',
      retryOnClick: 'loadDashboard()',
      compact: false
    });
  }
}

function renderGuestHome() {
  closeActivityPanel();
  closeCommunityPanel();
  closeCasinoPanel();
  closeShopPanel();
  closeMercenaryPanel();
  closeSeasonPanel();
  closeAccountPanel();
  latestDashboardSummary = null;
  renderHeroActions(null);
  renderMainNavigation(null, 0);
  setHomeLoading(false);

  document.querySelector('#my-status-card').innerHTML = `
    <h2>내 정보 요약</h2>
    <p>로그인하면 포인트, 대표 칭호, 출석 상태를 바로 볼 수 있습니다.</p>
    <div class="hero-actions">
      <a class="button inline" href="/login.html">로그인</a>
      <a class="button secondary inline" href="/register.html">회원가입</a>
    </div>
  `;
  document.querySelector('#daily-missions-card').innerHTML = '<h2>오늘 할 일</h2><p class="meta">로그인하면 일일 미션 요약이 표시됩니다.</p>';
  document.querySelector('#recent-notifications-card').innerHTML = '<h2>최근 알림</h2><p class="meta">로그인하면 댓글, 멘션, 시즌 보상 알림을 볼 수 있습니다.</p>';
  document.querySelector('#recent-posts-list').innerHTML = '<p class="empty-state">로그인 후 최근 글 미리보기를 확인해 보세요.</p>';
  document.querySelector('#popular-posts-list').innerHTML = '<p class="empty-state">로그인 후 인기글 미리보기를 확인해 보세요.</p>';
  document.querySelector('#season-summary-card').innerHTML = '<h2>시즌 칭호 요약</h2><p class="empty-state">로그인하면 현재 시즌 대표 칭호 경쟁을 볼 수 있습니다.</p>';
  document.querySelector('#my-season-titles-card').innerHTML = '<h2>내 시즌 칭호</h2><p class="meta">아직 로그인하지 않았습니다.</p>';
}

function renderHomeProfile(summary) {
  const card = document.querySelector('#my-status-card');
  const me = summary.me || {};
  const points = summary.points || {};
  const attendance = summary.attendance || {};
  const balance = points.formattedBalance || formatPoints(points.balance || 0);
  const avatarUrl = me.avatarUrl || me.avatar_url;
  const title = me.equippedTitle || me.equippedTitleData || me.titleData;

  card.className = `card ${escapeHtml(me.cosmetics?.profileFrameClass || '')} ${escapeHtml(me.cosmetics?.profileBackgroundClass || '')}`.trim();
  card.innerHTML = `
    <div class="section-heading">
      <h2>내 정보 요약</h2>
      <a class="meta" href="/profile.html">프로필</a>
    </div>
    <div class="home-profile-row">
      ${avatarUrl ? `<img class="home-avatar" src="${escapeHtml(avatarUrl)}" alt="" />` : '<div class="home-avatar placeholder">M</div>'}
      <div>
        ${renderTitleBadge(title, { compact: true }) || '<span class="badge">대표 칭호 없음</span>'}
        <h3 class="${escapeHtml(me.cosmetics?.nicknameColorClass || '')}">${escapeHtml(me.nickname || me.displayName || '이름 없는 거주민')}</h3>
      </div>
    </div>
    <div class="stat-row">
      <span>보유 포인트</span>
      <strong class="point">${escapeHtml(balance)}</strong>
    </div>
    <p class="meta">${attendance.checkedToday ? '오늘 출석 완료' : '오늘 출석 보상을 받을 수 있습니다.'}</p>
    <button class="button" onclick="checkIn()" ${attendance.canCheckIn === false || attendance.checkedToday ? 'disabled' : ''}>
      ${attendance.checkedToday ? '오늘 출석 완료' : `출석하고 ${formatPoints(attendance.todayReward || 30)} 받기`}
    </button>
  `;
}

function renderHomeDailyMissions(data = {}, weekly = {}) {
  const card = document.querySelector('#daily-missions-card');
  const missions = Array.isArray(data.today) ? data.today : [];
  const completedCount = Number(data.completedCount || 0);
  const totalCount = Number(data.totalCount || missions.length || 0);
  const weeklyCompleted = Number(weekly.completedCount || 0);
  const weeklyTotal = Number(weekly.totalCount || 0);

  card.innerHTML = `
    <div class="section-heading">
      <h2>오늘 할 일</h2>
      <span class="badge">${completedCount}/${totalCount}</span>
    </div>
    ${weeklyTotal ? `<p class="meta">주간 처방전 ${weeklyCompleted}/${weeklyTotal} · 이번 주 목표 보상은 주간미션에서 확인하세요.</p>` : ''}
    <div class="mission-list">
      ${missions.slice(0, 5).map((mission) => {
        const code = mission.code || mission.id;
        const status = mission.claimed ? '수령 완료' : mission.completed ? '완료' : '진행 중';
        return `
          <div class="mission-item">
            <div>
              <strong>${escapeHtml(mission.title)}</strong><br />
              <span class="meta">${formatPoints(mission.rewardPoints || 0)} · ${escapeHtml(status)}</span>
            </div>
            ${mission.completed && !mission.claimed && code
              ? `<button class="button secondary inline small-button" onclick="claimMission('${escapeHtml(code)}')">보상 받기</button>`
              : `<span class="meta">${escapeHtml(status)}</span>`}
          </div>
        `;
      }).join('') || '<p class="empty-state">오늘 표시할 미션이 없습니다.</p>'}
    </div>
  `;
}

function notificationLabel(type) {
  const labels = {
    post_comment: '댓글',
    comment_reply: '답글',
    mention: '멘션',
    title_granted: '칭호',
    title_revoked: '칭호 회수',
    season_rank: '시즌',
    season_hall_of_fame: '명예의 전당',
    casino_jackpot: '카지노 대박',
    casino_disaster: '카지노 대참사',
    casino_drawdown: '추락',
    admin_notice: '공지',
    system_notice: '시스템',
    event_notice: '이벤트'
  };
  return labels[type] || type || '알림';
}

function renderHomeNotifications(data = {}) {
  const card = document.querySelector('#recent-notifications-card');
  const items = Array.isArray(data.recent) ? data.recent.slice(0, 3) : [];
  const unreadCount = Number(data.unreadCount || 0);

  card.innerHTML = `
    <div class="section-heading">
      <h2>최근 알림</h2>
      <a class="meta" href="/notifications.html">전체 보기</a>
    </div>
    <p class="meta">안 읽은 알림 ${escapeHtml(unreadCount)}개</p>
    <div class="notification-list">
      ${items.map((item) => `
        <a class="notification-card ${item.isRead ? '' : 'unread'}" href="${escapeHtml(safeInternalUrl(item.targetUrl || item.target_url, '/notifications.html'))}">
          <span class="home-notification-meta">
            <span class="badge">${escapeHtml(notificationLabel(item.type))}</span>
            <span class="meta">${escapeHtml(formatHomeDate(item.createdAt || item.created_at))}</span>
          </span>
          <strong>${escapeHtml(item.title)}</strong>
          <p class="meta home-notification-body">${escapeHtml(truncateText(item.body || item.message, 86))}</p>
        </a>
      `).join('') || '<p class="empty-state">아직 알림이 없습니다.</p>'}
    </div>
  `;
}

function postAuthorLabel(post) {
  return post.authorNickname || post.authorName || post.author_name || '익명';
}

function renderPostPreviewList(rootId, posts = [], options = {}) {
  const root = document.querySelector(rootId);
  if (!root) return;
  const list = Array.isArray(posts) ? posts.slice(0, 3) : [];

  root.innerHTML = list.map((post) => `
    <a class="summary-post-card" href="/post.html?id=${escapeHtml(post.id)}">
      <span class="badge">${escapeHtml(post.categoryLabel || post.category || '게시글')}</span>
      <strong>${escapeHtml(post.title)}</strong>
      <span class="meta">
        ${escapeHtml(postAuthorLabel(post))}
        ${post.authorTitle ? renderTitleBadge(post.authorTitle, { compact: true }) : ''}
        · 댓글 ${escapeHtml(post.commentCount ?? post.comment_count ?? 0)}개
        ${options.showScore ? ` · 점수 ${escapeHtml(post.score || 0)}` : ''}
      </span>
      <span class="meta">${escapeHtml(formatHomeDate(post.createdAt || post.created_at))}</span>
    </a>
  `).join('') || renderEmptyState({
    title: options.emptyTitle || '표시할 글이 없습니다',
    description: options.emptyText || '조금 뒤에 다시 확인해 주세요.'
  });
}

function renderHomePosts(community = {}) {
  renderPostPreviewList('#recent-posts-list', community.recentPosts, {
    emptyTitle: '아직 최근 글이 없습니다',
    emptyText: '새 글이 올라오면 여기에 3개까지 표시됩니다.'
  });
  renderPostPreviewList('#popular-posts-list', community.popularPosts, {
    emptyTitle: '아직 인기글이 없습니다',
    emptyText: '댓글이 쌓이면 인기글 미리보기가 채워집니다.',
    showScore: true
  });
}

function communityCacheKey(tabKey) {
  return `community:${tabKey}`;
}

function getCommunityCachedData(tabKey) {
  const cached = communityCache.get(communityCacheKey(tabKey));
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > COMMUNITY_CACHE_TTL_MS) {
    communityCache.delete(communityCacheKey(tabKey));
    return null;
  }
  return cached.data;
}

function setCommunityCachedData(tabKey, data) {
  communityCache.set(communityCacheKey(tabKey), {
    cachedAt: Date.now(),
    data
  });
}

function invalidateCommunityCache(tabKey) {
  if (tabKey) {
    communityCache.delete(communityCacheKey(tabKey));
    return;
  }
  communityCache.clear();
}

function communityTabLabel(tabKey) {
  return COMMUNITY_TABS.find((tab) => tab.key === tabKey)?.label || tabKey;
}

function renderCommunityShell() {
  const root = document.querySelector('#community-shell');
  if (!root || communityShellRendered) return;

  root.innerHTML = `
    <div class="community-tabs" role="tablist" aria-label="커뮤니티 세부탭">
      ${COMMUNITY_TABS.map((tab) => `
        <button
          type="button"
          class="community-tab-button"
          data-community-tab="${escapeHtml(tab.key)}"
          onclick="loadCommunityTab('${escapeHtml(tab.key)}')"
        >
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
    <div class="community-tab-panel" id="community-tab-panel"></div>
  `;
  communityShellRendered = true;
}

function setCommunityActiveTab(tabKey) {
  activeCommunityTab = tabKey;
  document.querySelectorAll('[data-community-tab]').forEach((button) => {
    const isActive = button.dataset.communityTab === tabKey;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setCommunityPanelContent(html) {
  const panel = document.querySelector('#community-tab-panel');
  if (panel) panel.innerHTML = html;
}

function renderCommunityLoading(tabKey) {
  setCommunityPanelContent(renderLoadingState({
    title: `${communityTabLabel(tabKey)}을 불러오는 중`,
    description: '해당 탭에 필요한 데이터만 가져오고 있습니다.',
    rows: 2
  }));
}

function renderCommunityEmpty(title, message, actionHtml = '') {
  return renderEmptyState({ title, description: message, actionHtml });
}

function renderCommunityError(tabKey, error) {
  const status = error?.status ? ` (${error.status})` : '';
  setCommunityPanelContent(renderErrorState({
    title: `${communityTabLabel(tabKey)}을 불러오지 못했습니다${status}`,
    description: '잠시 후 다시 시도해 주세요.',
    retryOnClick: `loadCommunityTab('${escapeHtml(tabKey)}', { force: true })`
  }));
}

function communityPostLink(post) {
  return `/post.html?id=${encodeURIComponent(post.id)}`;
}

function renderCommunityPostList(posts = [], options = {}) {
  const items = Array.isArray(posts) ? posts : [];
  if (!items.length) {
    return renderCommunityEmpty(
      options.emptyTitle || '표시할 글이 없습니다',
      options.emptyMessage || '조금 뒤에 다시 확인해 주세요.',
      options.actionHtml || '<a class="button secondary inline small-button" href="/posts.html">게시판 보기</a>'
    );
  }

  return `
    <div class="community-list">
      ${items.map((post) => `
        <a class="community-list-item" href="${escapeHtml(communityPostLink(post))}">
          <span class="community-item-main">
            <span class="badge">${escapeHtml(post.categoryLabel || post.category || '게시글')}</span>
            <strong>${escapeHtml(post.title || '제목 없는 글')}</strong>
          </span>
          <span class="community-item-meta meta">
            ${escapeHtml(postAuthorLabel(post))}
            ${post.authorTitle ? renderTitleBadge(post.authorTitle, { compact: true }) : ''}
            · 댓글 ${escapeHtml(post.commentCount ?? post.comment_count ?? 0)}개
            ${options.showScore ? ` · 점수 ${escapeHtml(post.score || 0)}` : ''}
            · ${escapeHtml(formatHomeDate(post.createdAt || post.created_at))}
          </span>
        </a>
      `).join('')}
    </div>
    ${options.footerHtml || ''}
  `;
}

function renderCommunitySongs(songs = []) {
  const items = Array.isArray(songs) ? songs : [];
  if (!items.length) {
    return renderCommunityEmpty(
      '아직 노래추천이 없습니다',
      '첫 곡을 놓고 가면 이 탭이 덜 쓸쓸해집니다.',
      '<a class="button secondary inline small-button" href="/songs.html">노래 추천하기</a>'
    );
  }

  return `
    <div class="community-list">
      ${items.map((song) => {
        const url = safeExternalUrl(song.url || song.link || song.youtubeUrl || song.youtube_url);
        const title = song.title || song.name || '제목 없는 노래';
        const artist = song.artist ? ` · ${song.artist}` : '';
        return `
          <a class="community-list-item" href="${escapeHtml(url === '#' ? '/songs.html' : url)}" ${url === '#' ? '' : 'target="_blank" rel="noopener noreferrer"'}>
            <span class="community-item-main">
              <span class="badge">노래추천</span>
              <strong>${escapeHtml(title)}${escapeHtml(artist)}</strong>
            </span>
            <span class="community-item-meta meta">
              ${escapeHtml(song.recommendedBy || song.authorNickname || song.authorName || song.author_name || '익명')}
              · ${escapeHtml(formatHomeDate(song.createdAt || song.created_at))}
            </span>
          </a>
        `;
      }).join('')}
    </div>
    <div class="community-footer-actions">
      <a class="button secondary inline small-button" href="/songs.html">노래추천 전체 보기</a>
    </div>
  `;
}

function renderCommunityRandom(post) {
  if (!post) {
    return renderCommunityEmpty(
      '뽑을 글이 없습니다',
      '랜덤글 후보가 아직 없습니다.',
      '<a class="button secondary inline small-button" href="/posts.html">게시판 보기</a>'
    );
  }

  return `
    <div class="community-random-card">
      ${renderCommunityPostList([post], { footerHtml: '' })}
      <div class="community-footer-actions">
        <a class="button inline small-button" href="${escapeHtml(communityPostLink(post))}">글 보러가기</a>
        <button class="button secondary inline small-button" type="button" onclick="rerollCommunityRandom()">또 뽑기</button>
      </div>
    </div>
  `;
}

function renderCommunityUnavailable(title, message) {
  return renderCommunityEmpty(
    title,
    message,
    '<a class="button secondary inline small-button" href="/posts.html">커뮤니티 보기</a>'
  );
}

function renderCommunityTabData(tabKey, data = {}) {
  if (data.unavailable) {
    setCommunityPanelContent(renderCommunityUnavailable(data.title, data.message));
    return;
  }

  if (tabKey === 'latest') {
    setCommunityPanelContent(renderCommunityPostList(data.posts, {
      emptyTitle: '최근 글이 없습니다',
      emptyMessage: '홈에는 가벼운 미리보기만 두고, 자세한 탐색은 여기서 시작합니다.',
      footerHtml: '<div class="community-footer-actions"><a class="button secondary inline small-button" href="/posts.html">게시판 전체 보기</a><a class="button inline small-button" href="/posts.html">글쓰기</a></div>'
    }));
    return;
  }

  if (tabKey === 'songs') {
    setCommunityPanelContent(renderCommunitySongs(data.songs));
    return;
  }

  if (tabKey === 'random') {
    setCommunityPanelContent(renderCommunityRandom(data.post));
  }
}

async function fetchCommunityTabData(tabKey) {
  if (tabKey === 'latest') {
    const data = await dashboardRequest('/api/posts?limit=12');
    return { posts: data.posts || data.items || [] };
  }

  if (tabKey === 'popular') {
    return {
      unavailable: true,
      title: '인기글 상세 목록은 후속 작업에서 제공됩니다',
      message: '현재 홈 summary의 인기글 3개만 제공 중입니다. 서버 API를 새로 만들지 않는 이번 범위에서는 안내 상태로 둡니다.'
    };
  }

  if (tabKey === 'comments') {
    return {
      unavailable: true,
      title: '댓글 목록은 후속 작업에서 제공됩니다',
      message: '최근 댓글 전용 API가 아직 없어, 서버 변경 없는 이번 작업에서는 별도 호출하지 않습니다.'
    };
  }

  if (tabKey === 'songs') {
    const data = await dashboardRequest('/api/songs?limit=12');
    return { songs: data.songs || data.items || [] };
  }

  if (tabKey === 'random') {
    const data = await dashboardRequest('/api/posts/random');
    return { post: data.post || data.item || null };
  }

  return {
    unavailable: true,
    title: '준비 중인 탭입니다',
    message: '아직 연결된 커뮤니티 데이터가 없습니다.'
  };
}

async function loadCommunityTab(tabKey = COMMUNITY_DEFAULT_TAB, options = {}) {
  renderCommunityShell();
  const nextTabKey = COMMUNITY_TABS.some((tab) => tab.key === tabKey) ? tabKey : COMMUNITY_DEFAULT_TAB;
  setCommunityActiveTab(nextTabKey);

  const cached = options.force ? null : getCommunityCachedData(nextTabKey);
  if (cached) {
    dashboardPerf?.log(`community ${nextTabKey} cache hit`);
    renderCommunityTabData(nextTabKey, cached);
    return;
  }

  renderCommunityLoading(nextTabKey);
  const startedAt = window.HubPerfLogger?.now?.() ?? Date.now();

  try {
    const data = await fetchCommunityTabData(nextTabKey);
    setCommunityCachedData(nextTabKey, data);
    renderCommunityTabData(nextTabKey, data);
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(`community ${nextTabKey} load ${duration}ms`);
  } catch (error) {
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(`community ${nextTabKey} load failed ${error?.status || error?.message || ''} ${duration}ms`.trim());
    renderCommunityError(nextTabKey, error);
  }
}

function openCommunityPanel(tabKey = COMMUNITY_DEFAULT_TAB) {
  const panel = document.querySelector('#community-panel');
  if (!panel) return;
  dashboardPerf?.log('community tab open');
  panel.hidden = false;
  renderCommunityShell();
  loadCommunityTab(tabKey);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeCommunityPanel() {
  const panel = document.querySelector('#community-panel');
  if (panel) panel.hidden = true;
}

function rerollCommunityRandom() {
  invalidateCommunityCache('random');
  loadCommunityTab('random', { force: true });
}

function casinoCacheKey(tabKey) {
  return `casino:${tabKey}`;
}

function getCasinoCachedData(tabKey) {
  const cached = casinoCache.get(casinoCacheKey(tabKey));
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CASINO_CACHE_TTL_MS) {
    casinoCache.delete(casinoCacheKey(tabKey));
    return null;
  }
  return cached.data;
}

function setCasinoCachedData(tabKey, data) {
  casinoCache.set(casinoCacheKey(tabKey), {
    cachedAt: Date.now(),
    data
  });
}

function casinoTabLabel(tabKey) {
  return CASINO_TABS.find((tab) => tab.key === tabKey)?.label || tabKey;
}

function casinoGameLabel(gameKey) {
  const labels = {
    roulette: '룰렛',
    dice_blackjack: '주사위 블랙잭',
    crash: '크래시',
    russian_roulette: '러시안 룰렛'
  };
  return labels[gameKey] || gameKey || '카지노';
}

function casinoEventLabel(type) {
  const labels = {
    jackpot: '대박',
    disaster: '대참사',
    biggest_win: '최대 승리',
    biggest_loss: '최대 손실',
    peak_balance: '최고점',
    drawdown: '추락',
    suspicious_loop: '관측',
    high_turnover: '회전율'
  };
  return labels[type] || notificationLabel(type);
}

function casinoSignedPoints(value) {
  if (typeof formatSignedPoints === 'function') return formatSignedPoints(value);
  const amount = Number(value || 0);
  return `${amount > 0 ? '+' : ''}${formatPoints(amount)}`;
}

function renderCasinoShell() {
  const root = document.querySelector('#casino-shell');
  if (!root || casinoShellRendered) return;

  root.innerHTML = `
    <div class="community-tabs casino-tabs" role="tablist" aria-label="카지노 세부탭">
      ${CASINO_TABS.map((tab) => `
        <button
          type="button"
          class="community-tab-button casino-tab-button"
          data-casino-tab="${escapeHtml(tab.key)}"
          onclick="loadCasinoTab('${escapeHtml(tab.key)}')"
        >
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
    <div class="casino-tab-panel" id="casino-tab-panel"></div>
  `;
  casinoShellRendered = true;
}

function setCasinoActiveTab(tabKey) {
  activeCasinoTab = tabKey;
  document.querySelectorAll('[data-casino-tab]').forEach((button) => {
    const isActive = button.dataset.casinoTab === tabKey;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setCasinoPanelContent(html) {
  const panel = document.querySelector('#casino-tab-panel');
  if (panel) panel.innerHTML = html;
}

function renderCasinoLoading(tabKey) {
  setCasinoPanelContent(renderLoadingState({
    title: `${casinoTabLabel(tabKey)}을 불러오는 중`,
    description: '카지노 상세 데이터는 이 탭에서만 가져옵니다.',
    rows: 2
  }));
}

function renderCasinoError(tabKey, error) {
  const status = error?.status ? ` (${error.status})` : '';
  setCasinoPanelContent(renderErrorState({
    title: `${casinoTabLabel(tabKey)}을 불러오지 못했습니다${status}`,
    description: '잠시 후 다시 시도해 주세요.',
    retryOnClick: `loadCasinoTab('${escapeHtml(tabKey)}', { force: true })`
  }));
}

function renderCasinoGames() {
  setCasinoPanelContent(`
    <div class="casino-lazy-game-grid">
      ${[
        ['룰렛', '0x부터 20x까지 즉시 추첨합니다.', '/casino.html#roulette-result'],
        ['주사위 블랙잭', '동점은 push. 딜러보다 높게, 21을 넘기지 않게.', '/casino.html#blackjack-result'],
        ['크래시', '서버가 정한 배율에 닿기 전에 탈출하세요.', '/casino.html#crash-result'],
        ['러시안 룰렛', '30 P 고정. 깊게 들어갈수록 보상도 위험도 커집니다.', '/casino.html#russian-result']
      ].map(([title, body, href]) => `
        <a class="casino-lazy-game-card" href="${escapeHtml(href)}">
          <span class="badge">GAME</span>
          <strong>${escapeHtml(title)}</strong>
          <p class="meta">${escapeHtml(body)}</p>
          <span class="meta">카지노 페이지에서 플레이</span>
        </a>
      `).join('')}
    </div>
  `);
}

function renderCasinoMyStats(data = {}) {
  const games = Array.isArray(data.games) ? data.games : [];
  setCasinoPanelContent(`
    <div class="casino-mine-grid">
      <div class="metric-grid">
        <article class="metric-card"><span class="meta">시즌 최고점</span><strong>${escapeHtml(formatPoints(data.peakBalance || 0))}</strong></article>
        <article class="metric-card"><span class="meta">현재 포인트</span><strong>${escapeHtml(formatPoints(data.currentBalance || 0))}</strong></article>
        <article class="metric-card"><span class="meta">최고점 대비 추락</span><strong>${escapeHtml(formatPoints(data.drawdown || 0))}</strong></article>
        <article class="metric-card"><span class="meta">카지노 순손익</span><strong>${escapeHtml(casinoSignedPoints(data.casinoNet || 0))}</strong></article>
        <article class="metric-card"><span class="meta">단일 최대 승리</span><strong>${escapeHtml(formatPoints(data.biggestWin || 0))}</strong></article>
        <article class="metric-card"><span class="meta">단일 최대 손실</span><strong>${escapeHtml(formatPoints(data.biggestLoss || 0))}</strong></article>
        <article class="metric-card"><span class="meta">포인트 회전율</span><strong>${escapeHtml(formatPercent(data.pointTurnover || 0))}</strong></article>
      </div>
      <div class="casino-game-stat-list">
        ${games.map((game) => `
          <article class="community-list-item">
            <span class="community-item-main">
              <span class="badge">${escapeHtml(casinoGameLabel(game.gameKey || game.game_key))}</span>
              <strong>${escapeHtml(casinoSignedPoints(game.netProfit || game.net_profit || 0))}</strong>
            </span>
            <span class="community-item-meta meta">
              ${escapeHtml(game.plays || 0)}회 · 베팅 ${escapeHtml(formatPoints(game.totalBet || game.total_bet || 0))}
              · 지급 ${escapeHtml(formatPoints(game.totalPayout || game.total_payout || 0))}
              · 최대승 ${escapeHtml(formatPoints(game.biggestWin || game.biggest_win || 0))}
              · 최대손실 ${escapeHtml(formatPoints(game.biggestLoss || game.biggest_loss || 0))}
            </span>
          </article>
        `).join('') || '<p class="empty-state">아직 이번 시즌 카지노 기록이 없습니다.</p>'}
      </div>
    </div>
  `);
}

function renderCasinoDisasters(data = {}) {
  const events = Array.isArray(data.events) ? data.events.slice(0, 8) : [];
  if (!events.length) {
    setCasinoPanelContent(renderCommunityEmpty(
      '아직 공개 대참사가 없습니다',
      '대박이나 대참사가 발생하면 여기에 조용히, 그러나 확실히 남습니다.',
      '<a class="button secondary inline small-button" href="/casino.html">카지노 페이지 보기</a>'
    ));
    return;
  }

  setCasinoPanelContent(`
    <div class="casino-event-list">
      ${events.map((event) => `
        <article class="community-list-item">
          <span class="community-item-main">
            <span class="badge">${escapeHtml(casinoEventLabel(event.type || event.eventType || event.event_type))}</span>
            <strong>${escapeHtml(event.nickname || event.displayName || event.metadata?.nickname || '이름 없는 거주민')}</strong>
          </span>
          <span class="meta">${escapeHtml(event.message || '')}</span>
          <span class="community-item-meta meta">
            ${escapeHtml(casinoGameLabel(event.gameKey || event.game_key))}
            · ${escapeHtml(formatPoints(event.amount || 0))}
            · ${escapeHtml(formatHomeDate(event.createdAt || event.created_at))}
          </span>
        </article>
      `).join('')}
    </div>
  `);
}

function renderCasinoBalanceGuide() {
  setCasinoPanelContent(`
    <div class="casino-balance-guide">
      <article class="community-empty">
        <strong>카지노는 포인트를 찍어내는 기계가 아닙니다</strong>
        <p class="meta">대박 가능성은 남겨두되, 장기적으로는 안전한 반복 수익이 생기지 않도록 관측 중입니다.</p>
      </article>
      <div class="casino-lazy-game-grid">
        <article class="casino-lazy-game-card">
          <span class="badge">러시안 룰렛</span>
          <strong>초반 캐시아웃은 작게</strong>
          <p class="meta">1~2발은 시드머니 광산이 되지 않도록 낮게, 3발 이상부터 유혹이 커지는 구조입니다.</p>
        </article>
        <article class="casino-lazy-game-card">
          <span class="badge">주사위 블랙잭</span>
          <strong>동점은 반환</strong>
          <p class="meta">동점은 베팅액 반환입니다. 딜러가 웃고 있어도 너무 믿지는 마세요.</p>
        </article>
      </div>
      <p class="meta">정확한 환급률과 밸런스 수치는 관리자 통계에서 관측합니다.</p>
    </div>
  `);
}

async function fetchCasinoTabData(tabKey) {
  if (tabKey === 'games') return { static: true };
  if (tabKey === 'mine') return dashboardRequest('/api/casino/stats/me');
  if (tabKey === 'disasters') return dashboardRequest('/api/casino/events?limit=8');
  if (tabKey === 'balance') return { static: true };
  return { unavailable: true };
}

function renderCasinoTabData(tabKey, data = {}) {
  if (tabKey === 'games') {
    renderCasinoGames();
    return;
  }
  if (tabKey === 'mine') {
    renderCasinoMyStats(data);
    return;
  }
  if (tabKey === 'disasters') {
    renderCasinoDisasters(data);
    return;
  }
  if (tabKey === 'balance') {
    renderCasinoBalanceGuide();
  }
}

async function loadCasinoTab(tabKey = CASINO_DEFAULT_TAB, options = {}) {
  renderCasinoShell();
  const nextTabKey = CASINO_TABS.some((tab) => tab.key === tabKey) ? tabKey : CASINO_DEFAULT_TAB;
  setCasinoActiveTab(nextTabKey);

  const cached = options.force ? null : getCasinoCachedData(nextTabKey);
  if (cached) {
    dashboardPerf?.log(`casino ${nextTabKey} cache hit`);
    renderCasinoTabData(nextTabKey, cached);
    return;
  }

  renderCasinoLoading(nextTabKey);
  const startedAt = window.HubPerfLogger?.now?.() ?? Date.now();

  try {
    const data = await fetchCasinoTabData(nextTabKey);
    setCasinoCachedData(nextTabKey, data);
    renderCasinoTabData(nextTabKey, data);
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(nextTabKey === 'games' || nextTabKey === 'balance'
      ? `casino ${nextTabKey} render`
      : `casino ${nextTabKey} load ${duration}ms`);
  } catch (error) {
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(`casino ${nextTabKey} load failed ${error?.status || error?.message || ''} ${duration}ms`.trim());
    renderCasinoError(nextTabKey, error);
  }
}

function openCasinoPanel(tabKey = CASINO_DEFAULT_TAB) {
  const panel = document.querySelector('#casino-panel');
  if (!panel) return;
  dashboardPerf?.log('casino tab open');
  panel.hidden = false;
  renderCasinoShell();
  loadCasinoTab(tabKey);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeCasinoPanel() {
  const panel = document.querySelector('#casino-panel');
  if (panel) panel.hidden = true;
}

function simpleCacheKey(prefix, tabKey) {
  return `${prefix}:${tabKey}`;
}

function getTimedCachedData(cache, prefix, tabKey, ttl) {
  const key = simpleCacheKey(prefix, tabKey);
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > ttl) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

function setTimedCachedData(cache, prefix, tabKey, data) {
  cache.set(simpleCacheKey(prefix, tabKey), {
    cachedAt: Date.now(),
    data
  });
}

function renderShortcutCards(cards = []) {
  return `
    <div class="shortcut-card-grid">
      ${cards.map((card) => `
        <a class="shortcut-card" href="${escapeHtml(card.href)}">
          <span class="badge">${escapeHtml(card.badge || 'LINK')}</span>
          <strong>${escapeHtml(card.title)}</strong>
          <p class="meta">${escapeHtml(card.body || '')}</p>
        </a>
      `).join('')}
    </div>
  `;
}

function renderPwaInstallCard() {
  if (isStandalonePwa()) {
    return `
      <div class="shortcut-card pwa-install-card" id="pwa-install-card">
        <span class="badge">APP</span>
        <strong>앱 모드로 실행 중</strong>
        <p class="meta">Madmen Hub가 설치형 앱처럼 열려 있습니다.</p>
      </div>
    `;
  }

  if (supportsPwaInstallPrompt()) {
    return `
      <div class="shortcut-card pwa-install-card" id="pwa-install-card">
        <span class="badge">PWA</span>
        <strong>Madmen Hub 설치</strong>
        <p class="meta">홈 화면이나 앱 목록에서 바로 열 수 있게 설치합니다. 푸시 알림 권한은 요청하지 않습니다.</p>
        <button class="button inline small-button" type="button" onclick="promptPwaInstall()">앱 설치</button>
      </div>
    `;
  }

  return `
    <div class="shortcut-card pwa-install-card" id="pwa-install-card">
      <span class="badge">PWA</span>
      <strong>앱 설치 안내</strong>
      <p class="meta">이 브라우저에서는 설치 버튼이 아직 준비되지 않았습니다. 브라우저 메뉴의 홈 화면에 추가 또는 앱 설치를 이용해 주세요.</p>
    </div>
  `;
}

function refreshPwaInstallCard() {
  const card = document.querySelector('#pwa-install-card');
  if (card) card.outerHTML = renderPwaInstallCard();
}

async function promptPwaInstall() {
  if (!deferredPwaPrompt) {
    refreshPwaInstallCard();
    showPwaInstallToast({ force: true });
    return;
  }

  const promptEvent = deferredPwaPrompt;
  deferredPwaPrompt = null;
  removePwaInstallToast();

  try {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    const outcome = choice?.outcome || 'closed';
    logPwa(`install prompt ${outcome}`);

    if (outcome === 'accepted') {
      markPwaInstalled();
    } else {
      dismissPwaInstallToast(PWA_INSTALL_SHORT_DISMISS_MS);
    }
  } catch (error) {
    logPwa('install prompt failed', error?.message || error);
    showPwaInstallToast({ force: true });
  } finally {
    refreshPwaInstallCard();
  }
}

function pwaStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function pwaStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // localStorage가 막힌 환경에서는 조용히 무시합니다.
  }
}

function isPwaInstallDismissed() {
  const until = Number(pwaStorageGet(PWA_INSTALL_DISMISS_KEY) || 0);
  return Number.isFinite(until) && until > Date.now();
}

function isPwaInstalledByUser() {
  return pwaStorageGet(PWA_INSTALL_INSTALLED_KEY) === 'true';
}

function isLikelyMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || window.innerWidth <= 768;
}

function isLikelyIosBrowser() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function shouldShowPwaInstallToast({ force = false } = {}) {
  if (isStandalonePwa()) return false;
  if (isPwaInstalledByUser()) return false;
  if (!force && isPwaInstallDismissed()) return false;

  return supportsPwaInstallPrompt() || isLikelyMobileBrowser() || force;
}

function getPwaInstallGuideText() {
  if (supportsPwaInstallPrompt()) {
    return '버튼을 누르면 브라우저 설치창이 열립니다.';
  }

  if (isLikelyIosBrowser()) {
    return 'Safari 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택해 주세요.';
  }

  if (isLikelyMobileBrowser()) {
    return '브라우저 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택해 주세요.';
  }

  return '주소창 또는 브라우저 메뉴에 설치 아이콘이 보이면 앱처럼 고정할 수 있습니다.';
}

function removePwaInstallToast() {
  if (pwaInstallToastTimer) {
    clearTimeout(pwaInstallToastTimer);
    pwaInstallToastTimer = null;
  }

  document.querySelector('#pwa-install-toast')?.remove();
}

function dismissPwaInstallToast(ms = PWA_INSTALL_DISMISS_MS) {
  pwaStorageSet(PWA_INSTALL_DISMISS_KEY, String(Date.now() + ms));
  removePwaInstallToast();
}

function markPwaInstalled() {
  pwaStorageSet(PWA_INSTALL_INSTALLED_KEY, 'true');
  removePwaInstallToast();
}

function showPwaInstallToast({ force = false, delay = 0 } = {}) {
  if (!shouldShowPwaInstallToast({ force })) return;

  if (pwaInstallToastTimer) {
    clearTimeout(pwaInstallToastTimer);
    pwaInstallToastTimer = null;
  }

  const render = () => {
    if (!shouldShowPwaInstallToast({ force })) return;
    if (document.querySelector('#pwa-install-toast')) return;

    const canPrompt = supportsPwaInstallPrompt();
    const toast = document.createElement('aside');
    toast.className = 'pwa-install-toast';
    toast.id = 'pwa-install-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="pwa-install-toast-copy">
        <span class="badge">APP</span>
        <strong>격리소 앱 설치 가능</strong>
        <p>${escapeHtml(getPwaInstallGuideText())}</p>
      </div>
      <div class="pwa-install-toast-actions">
        <button class="button inline small-button" type="button" data-pwa-install-toast-action="install">
          ${canPrompt ? '앱으로 받기' : '설치 방법 보기'}
        </button>
        <button class="button secondary inline small-button" type="button" data-pwa-install-toast-action="later">나중에</button>
        <button class="pwa-install-toast-close" type="button" data-pwa-install-toast-action="close" aria-label="앱 설치 안내 닫기">×</button>
      </div>
    `;

    document.body.appendChild(toast);
  };

  if (delay > 0) {
    pwaInstallToastTimer = setTimeout(render, delay);
  } else {
    render();
  }
}

function schedulePwaInstallToast() {
  showPwaInstallToast({ delay: 1200 });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-pwa-install-toast-action]');
  if (!button) return;

  const action = button.dataset.pwaInstallToastAction;
  event.preventDefault();

  if (action === 'install') {
    if (supportsPwaInstallPrompt()) {
      promptPwaInstall();
      return;
    }

    showPwaInstallToast({ force: true });
    return;
  }

  if (action === 'later') {
    dismissPwaInstallToast();
    return;
  }

  if (action === 'close') {
    dismissPwaInstallToast(PWA_INSTALL_SHORT_DISMISS_MS);
  }
});

function accountTabLabel(tabKey) {
  return ACCOUNT_TABS.find((tab) => tab.key === tabKey)?.label || tabKey;
}

function getVisibleAccountTabs() {
  const me = latestDashboardSummary?.me;
  return ACCOUNT_TABS.filter((tab) => {
    if (tab.adminOnly) return isAdminUser(me);
    if (tab.authOnly) return Boolean(me?.id);
    return true;
  });
}

function renderAccountShell() {
  const root = document.querySelector('#account-shell');
  if (!root || accountShellRendered) return;
  const visibleTabs = getVisibleAccountTabs();

  root.innerHTML = `
    <div class="community-tabs account-tabs" role="tablist" aria-label="내 정보 세부탭">
      ${visibleTabs.map((tab) => `
        <button
          type="button"
          class="community-tab-button account-tab-button"
          data-account-tab="${escapeHtml(tab.key)}"
          onclick="loadAccountTab('${escapeHtml(tab.key)}')"
        >
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
    <div class="account-tab-panel" id="account-tab-panel"></div>
  `;
  accountShellRendered = true;
}

function setAccountActiveTab(tabKey) {
  activeAccountTab = tabKey;
  document.querySelectorAll('[data-account-tab]').forEach((button) => {
    const isActive = button.dataset.accountTab === tabKey;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setAccountPanelContent(html) {
  const panel = document.querySelector('#account-tab-panel');
  if (panel) panel.innerHTML = html;
}

function renderAccountLoading(tabKey) {
  setAccountPanelContent(renderLoadingState({
    title: `${accountTabLabel(tabKey)}을 여는 중`,
    description: '필요한 바로가기와 요약만 준비합니다.',
    rows: 2
  }));
}

function renderAccountProfile() {
  const summary = latestDashboardSummary || {};
  const me = summary.me || {};
  const points = summary.points || {};
  if (!me.id) {
    setAccountPanelContent(renderCommunityEmpty(
      '로그인이 필요합니다',
      '프로필과 보유 칭호는 로그인 후 확인할 수 있습니다.',
      '<a class="button inline small-button" href="/login.html">로그인</a>'
    ));
    return;
  }
  const avatarUrl = me.avatarUrl || me.avatar_url;
  const title = me.equippedTitle || me.equippedTitleData || me.titleData;
  setAccountPanelContent(`
    <div class="account-profile-summary">
      <div class="home-profile-row">
        ${avatarUrl ? `<img class="home-avatar" src="${escapeHtml(avatarUrl)}" alt="" />` : '<div class="home-avatar placeholder">M</div>'}
        <div>
          ${renderTitleBadge(title, { compact: true }) || '<span class="badge">대표 칭호 없음</span>'}
          <h3>${escapeHtml(me.nickname || me.displayName || '이름 없는 거주민')}</h3>
          <p class="meta">보유 포인트 ${escapeHtml(points.formattedBalance || formatPoints(points.balance || 0))}</p>
        </div>
      </div>
      ${renderShortcutCards([
        { badge: 'PROFILE', title: '내 프로필 보기', body: '프로필, 대표 칭호, 시즌 기록을 확인합니다.', href: '/profile.html' },
        { badge: 'EDIT', title: '프로필 수정', body: '닉네임, 소개, 설정은 기존 프로필 화면에서 수정합니다.', href: '/profile.html#profile-editor' }
      ])}
    </div>
  `);
}

function renderAccountTitles() {
  const summary = latestDashboardSummary || {};
  const equippedTitle = summary.me?.equippedTitle || summary.me?.equippedTitleData || summary.me?.titleData;
  const seasonTitles = Array.isArray(summary.season?.mySeasonRewardTitles) ? summary.season.mySeasonRewardTitles.slice(0, 4) : [];
  setAccountPanelContent(`
    <div class="account-link-section">
      <div class="home-season-title-list">
        ${equippedTitle ? `<div class="home-season-title-item">${renderTitleBadge(equippedTitle, { compact: true })}<span class="meta">현재 대표 칭호</span></div>` : ''}
        ${seasonTitles.map((item) => `<div class="home-season-title-item">${renderTitleBadge(item.title, { compact: true })}<span class="meta">${escapeHtml(item.reason || item.categoryLabel || '시즌 보상')}</span></div>`).join('')}
      </div>
      ${renderShortcutCards([
        { badge: 'TITLES', title: '보유 칭호 관리', body: '전체 보유 칭호와 장착은 프로필 화면에서 확인합니다.', href: '/profile.html#owned-titles' },
        { badge: 'SHOP', title: '칭호 상점', body: '구매 가능한 칭호는 기존 상점에서 확인합니다.', href: '/shop.html' }
      ])}
    </div>
  `);
}

function renderAccountCosmetics() {
  setAccountPanelContent(renderShortcutCards([
    { badge: 'COSMETICS', title: '꾸미기 보관함', body: '프로필 프레임과 배경 장식은 꾸미기 페이지에서 관리합니다.', href: '/cosmetics.html' },
    { badge: 'PROFILE', title: '프로필에서 확인', body: '현재 적용된 장식은 프로필 화면에서 확인할 수 있습니다.', href: '/profile.html' }
  ]));
}

function renderAccountShop() {
  setAccountPanelContent(renderShortcutCards([
    { badge: 'SHOP', title: '칭호 상점', body: '상품 목록과 구매는 기존 상점 화면에서 진행합니다.', href: '/shop.html' },
    { badge: 'COSMETIC', title: '꾸미기 상점', body: '장식 구매와 장착은 꾸미기 화면으로 이동합니다.', href: '/cosmetics.html' }
  ]));
}

function renderAccountAchievements() {
  setAccountPanelContent(renderShortcutCards([
    { badge: 'ACHIEVEMENT', title: '업적 보기', body: '업적 목록과 달성 상태는 프로필 화면에서 확인합니다.', href: '/profile.html#profile-achievements' },
    { badge: 'MISSION', title: '오늘 할 일', body: '일일 미션 보상은 홈 카드에서 바로 받을 수 있습니다.', href: '/' }
  ]));
}

function renderAccountNotifications(data = {}) {
  const items = Array.isArray(data.items) ? data.items.slice(0, 10) : [];
  if (!latestDashboardSummary?.me?.id) {
    setAccountPanelContent(renderCommunityEmpty(
      '로그인이 필요합니다',
      '알림 센터는 로그인 후 확인할 수 있습니다.',
      '<a class="button inline small-button" href="/login.html">로그인</a>'
    ));
    return;
  }
  setAccountPanelContent(`
    <div class="notification-list more-notification-list">
      ${items.map((item) => `
        <a class="notification-card ${item.isRead ? '' : 'unread'}" href="${escapeHtml(safeInternalUrl(item.targetUrl || item.target_url, '/notifications.html'))}">
          <span class="home-notification-meta">
            <span class="badge">${escapeHtml(notificationLabel(item.type))}</span>
            <span class="meta">${escapeHtml(formatHomeDate(item.createdAt || item.created_at))}</span>
          </span>
          <strong>${escapeHtml(item.title)}</strong>
          <p class="meta home-notification-body">${escapeHtml(truncateText(item.body || item.message, 92))}</p>
        </a>
      `).join('') || '<p class="empty-state">아직 알림이 없습니다.</p>'}
    </div>
    <div class="community-footer-actions">
      <a class="button secondary inline small-button" href="/notifications.html">알림 센터 전체 보기</a>
    </div>
  `);
}

function renderAccountSettings() {
  setAccountPanelContent(renderShortcutCards([
    { badge: 'SETTINGS', title: '프로필 설정', body: '현재 설정은 프로필 편집 화면에서 관리합니다.', href: '/profile.html#profile-editor' },
    { badge: 'SOON', title: '추가 설정 준비 중', body: '푸시 알림과 세부 앱 설정은 후속 작업에서 확장합니다.', href: '/profile.html#profile-editor' }
  ]));
  const panel = document.querySelector('#account-tab-panel');
  if (panel) {
    panel.insertAdjacentHTML('beforeend', `
      <div class="shortcut-card-grid pwa-install-grid">
        ${renderPwaInstallCard()}
      </div>
    `);
  }
}

function renderAccountAdmin() {
  const me = latestDashboardSummary?.me;
  if (!isAdminUser(me)) {
    setAccountPanelContent(renderCommunityEmpty('접근할 수 없습니다', '관리자 메뉴는 관리자와 owner에게만 표시됩니다.'));
    return;
  }
  setAccountPanelContent(renderShortcutCards([
    { badge: 'ADMIN', title: '관리자 페이지', body: '관리자 통계와 운영 도구는 기존 관리자 화면에서 확인합니다.', href: '/admin.html' }
  ]));
}

function renderAccountLogout() {
  setAccountPanelContent(`
    <div class="community-empty">
      <strong>로그아웃</strong>
      <p class="meta">현재 세션을 종료합니다. 기존 인증 로직을 그대로 사용합니다.</p>
      <button class="button inline small-button" type="button" onclick="API.logout()">로그아웃</button>
    </div>
  `);
}

function renderAccountTabData(tabKey, data = {}) {
  if (tabKey === 'profile') renderAccountProfile();
  if (tabKey === 'titles') renderAccountTitles();
  if (tabKey === 'cosmetics') renderAccountCosmetics();
  if (tabKey === 'shop') renderAccountShop();
  if (tabKey === 'achievements') renderAccountAchievements();
  if (tabKey === 'notifications') renderAccountNotifications(data);
  if (tabKey === 'settings') renderAccountSettings();
  if (tabKey === 'admin') renderAccountAdmin();
  if (tabKey === 'logout') renderAccountLogout();
}

async function fetchAccountTabData(tabKey) {
  if (tabKey === 'notifications' && latestDashboardSummary?.me?.id) {
    return dashboardRequest('/api/notifications?limit=10');
  }
  return { static: true, tabKey };
}

async function loadAccountTab(tabKey = ACCOUNT_DEFAULT_TAB, options = {}) {
  renderAccountShell();
  const visibleTabs = getVisibleAccountTabs();
  const nextTabKey = visibleTabs.some((tab) => tab.key === tabKey) ? tabKey : ACCOUNT_DEFAULT_TAB;
  setAccountActiveTab(nextTabKey);

  const cached = options.force ? null : getTimedCachedData(accountCache, 'account', nextTabKey, ACCOUNT_CACHE_TTL_MS);
  if (cached) {
    dashboardPerf?.log(`account ${nextTabKey} cache hit`);
    renderAccountTabData(nextTabKey, cached);
    return;
  }

  renderAccountLoading(nextTabKey);
  const startedAt = window.HubPerfLogger?.now?.() ?? Date.now();
  try {
    const data = await fetchAccountTabData(nextTabKey);
    setTimedCachedData(accountCache, 'account', nextTabKey, data);
    renderAccountTabData(nextTabKey, data);
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(nextTabKey === 'profile' ? `account profile render ${duration}ms` : `account ${nextTabKey} fallback`);
  } catch (error) {
    setAccountPanelContent(renderErrorState({
      title: `${accountTabLabel(nextTabKey)}을 열지 못했습니다`,
      description: '잠시 후 다시 시도해 주세요.',
      retryOnClick: `loadAccountTab('${escapeHtml(nextTabKey)}', { force: true })`
    }));
  }
}

function openAccountPanel(tabKey = ACCOUNT_DEFAULT_TAB) {
  const panel = document.querySelector('#account-panel');
  if (!panel) return;
  dashboardPerf?.log('account tab open');
  panel.hidden = false;
  renderAccountShell();
  loadAccountTab(tabKey);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAccountPanel() {
  const panel = document.querySelector('#account-panel');
  if (panel) panel.hidden = true;
}

function seasonCacheKey(tabKey, detail = '') {
  return detail ? `season:${tabKey}:${detail}` : `season:${tabKey}`;
}

function getSeasonCachedData(tabKey, detail = '') {
  const key = seasonCacheKey(tabKey, detail);
  const cached = seasonCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > SEASON_CACHE_TTL_MS) {
    seasonCache.delete(key);
    return null;
  }
  return cached.data;
}

function setSeasonCachedData(tabKey, detail, data) {
  seasonCache.set(seasonCacheKey(tabKey, detail), {
    cachedAt: Date.now(),
    data
  });
}

function seasonTabLabel(tabKey) {
  return SEASON_TABS.find((tab) => tab.key === tabKey)?.label || tabKey;
}

function seasonScoreText(category, item) {
  if (typeof item === 'number') return formatRankingScore(category, item);
  if (!item) return '';
  return item.formattedScore || item.formatted_score || formatRankingScore(item.category || category, item.score || 0);
}

function renderSeasonShell() {
  const root = document.querySelector('#season-shell');
  if (!root || seasonShellRendered) return;

  root.innerHTML = `
    <div class="community-tabs season-tabs" role="tablist" aria-label="시즌 세부탭">
      ${SEASON_TABS.map((tab) => `
        <button
          type="button"
          class="community-tab-button season-tab-button"
          data-season-tab="${escapeHtml(tab.key)}"
          onclick="loadSeasonTab('${escapeHtml(tab.key)}')"
        >
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
    <div class="season-tab-panel" id="season-tab-panel"></div>
  `;
  seasonShellRendered = true;
}

function setSeasonActiveTab(tabKey) {
  activeSeasonTab = tabKey;
  document.querySelectorAll('[data-season-tab]').forEach((button) => {
    const isActive = button.dataset.seasonTab === tabKey;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setSeasonPanelContent(html) {
  const panel = document.querySelector('#season-tab-panel');
  if (panel) panel.innerHTML = html;
}

function renderSeasonLoading(tabKey) {
  setSeasonPanelContent(renderLoadingState({
    title: `${seasonTabLabel(tabKey)}을 불러오는 중`,
    description: '시즌 상세 데이터는 이 탭에서만 가져옵니다.',
    rows: 2
  }));
}

function renderSeasonError(tabKey, error, detail = '') {
  const status = error?.status ? ` (${error.status})` : '';
  setSeasonPanelContent(renderErrorState({
    title: `${seasonTabLabel(tabKey)}을 불러오지 못했습니다${status}`,
    description: '잠시 후 다시 시도해 주세요.',
    retryOnClick: `loadSeasonTab('${escapeHtml(tabKey)}', { force: true, detail: '${escapeHtml(detail)}' })`
  }));
}

function renderSeasonOverview(data = {}) {
  const season = data.currentSeason;
  const titleSummary = Array.isArray(data.titleSummary) ? data.titleSummary.slice(0, 4) : [];

  if (!season) {
    setSeasonPanelContent(renderCommunityEmpty(
      '진행 중인 시즌이 없습니다',
      '시즌이 열리면 대표 칭호 경쟁이 여기에 표시됩니다.',
      '<a class="button secondary inline small-button" href="/seasons.html">시즌 페이지 보기</a>'
    ));
    return;
  }

  setSeasonPanelContent(`
    <div class="season-detail-overview">
      <div class="season-detail-head">
        <div>
          <span class="badge">${escapeHtml(season.status || 'active')}</span>
          <h3>${escapeHtml(season.name || '현재 시즌')}</h3>
          <p class="meta">${escapeHtml(formatHomeDateOnly(season.startsAt))} ~ ${escapeHtml(formatHomeDateOnly(season.endsAt))}</p>
        </div>
        <a class="button secondary inline small-button" href="/seasons.html">전체 시즌 페이지</a>
      </div>
      <div class="season-title-summary-list season-detail-title-grid">
        ${titleSummary.map((item) => {
          const leader = item.leader;
          const score = leader ? seasonScoreText(item.category, leader) : '';
          return `
            <div class="season-title-summary-item">
              <div class="season-title-summary-head">${renderTitleBadge(item.title)}</div>
              <span class="meta">${escapeHtml(item.categoryLabel || item.category)}</span>
              ${leader
                ? `<strong>${escapeHtml(leader.nickname || '이름 없는 거주민')}</strong><span class="season-title-summary-score">${escapeHtml(score)}</span>`
                : '<span class="meta">아직 1위 기록이 없습니다.</span>'}
            </div>
          `;
        }).join('') || '<p class="empty-state">시즌 칭호 요약이 없습니다.</p>'}
      </div>
    </div>
  `);
}

function renderSeasonRankingControls(category) {
  return `
    <div class="season-ranking-controls">
      ${SEASON_TITLE_CATEGORIES.map((item) => `
        <button
          type="button"
          class="community-tab-button season-category-button ${item.code === category ? 'active' : ''}"
          onclick="loadSeasonRankingCategory('${escapeHtml(item.code)}')"
        >
          ${escapeHtml(item.label)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderSeasonRanking(data = {}, category = activeSeasonRankingCategory) {
  const items = Array.isArray(data.rankings) ? data.rankings.slice(0, 20) : [];
  const categoryLabel = data.category?.label || SEASON_TITLE_CATEGORIES.find((item) => item.code === category)?.label || category;

  setSeasonPanelContent(`
    ${renderSeasonRankingControls(category)}
    <div class="season-ranking-compact-list">
      <div class="section-heading">
        <h3>${escapeHtml(categoryLabel)} 랭킹</h3>
        <a class="meta" href="/seasons.html">자세히 보기</a>
      </div>
      ${items.map((item) => `
        <article class="season-compact-rank-item">
          <strong class="season-rank-number">#${escapeHtml(item.rank || '-')}</strong>
          <span>
            <strong>${escapeHtml(item.nickname || item.displayName || '이름 없는 거주민')}</strong>
            ${renderTitleBadge(item, { compact: true })}
          </span>
          <strong class="season-rank-score">${escapeHtml(seasonScoreText(category, item))}</strong>
        </article>
      `).join('') || '<p class="empty-state">아직 집계된 기록이 없습니다.</p>'}
    </div>
  `);
}

function renderSeasonHallOfFame(data = {}) {
  const seasons = Array.isArray(data.seasons) ? data.seasons : [];
  if (!seasons.length) {
    setSeasonPanelContent(renderCommunityEmpty(
      '아직 명예의 전당이 없습니다',
      '종료된 시즌이 생기면 대표 기록이 여기에 박제됩니다.',
      '<a class="button secondary inline small-button" href="/seasons.html">시즌 페이지 보기</a>'
    ));
    return;
  }

  setSeasonPanelContent(`
    <div class="season-hall-compact-list">
      ${seasons.slice(0, 5).map((season) => {
        const entries = Array.isArray(season.entries) ? season.entries.slice(0, 4) : [];
        return `
          <article class="season-hall-compact-card">
            <div class="section-heading">
              <div>
                <span class="badge">${escapeHtml(season.status || 'ended')}</span>
                <h3>${escapeHtml(season.name || '종료 시즌')}</h3>
              </div>
              <a class="meta" href="/seasons.html?seasonId=${encodeURIComponent(season.id)}">보기</a>
            </div>
            ${entries.map((entry) => `
              <p class="meta">#${escapeHtml(entry.rank || '-')} ${escapeHtml(entry.nickname || entry.metadata?.nickname || '이름 없는 거주민')} · ${escapeHtml(entry.categoryLabel || entry.category || '기록')} · ${escapeHtml(seasonScoreText(entry.category, entry))}</p>
            `).join('') || '<p class="meta">저장된 대표 기록이 없습니다.</p>'}
          </article>
        `;
      }).join('')}
    </div>
  `);
}

function renderSeasonRewardTitles(items = []) {
  const list = Array.isArray(items) ? items.slice(0, 4) : [];
  if (!list.length) return '<p class="empty-state">아직 시즌 대표 칭호가 없습니다.</p>';
  return `
    <div class="home-season-title-list">
      ${list.map((item) => `
        <div class="home-season-title-item">
          ${renderTitleBadge(item.title, { compact: true })}
          <span class="meta">${escapeHtml(item.seasonName || '')} · ${escapeHtml(item.reason || item.categoryLabel || '')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderMySeasonRecords(data = {}) {
  const summary = data.summary || {};
  const trophies = data.trophies || {};
  const rewardTitles = latestDashboardSummary?.season?.mySeasonRewardTitles || trophies.seasonRewardTitles || trophies.seasonTitleItems || [];
  const grouped = Array.isArray(trophies.groupedItems) ? trophies.groupedItems.slice(0, 5) : [];

  setSeasonPanelContent(`
    <div class="season-mine-grid">
      <section class="season-mine-section">
        <div class="section-heading">
          <h3>내 시즌 대표 칭호</h3>
          <a class="meta" href="/profile.html#season-trophies">프로필 기록</a>
        </div>
        ${renderSeasonRewardTitles(rewardTitles)}
      </section>
      <section class="season-mine-section">
        <h3>현재 시즌 요약</h3>
        ${summary.season
          ? `<p class="meta">${escapeHtml(summary.season.name || '현재 시즌')} · ${escapeHtml(summary.season.status || '')}</p>`
          : '<p class="meta">진행 중인 시즌 요약이 없습니다.</p>'}
        <div class="metric-grid">
          <div class="metric-card"><span>활동 종합</span><strong>${escapeHtml(seasonScoreText('activity_score', summary.activityScore || summary.activity_score || summary.activity || {}))}</strong></div>
          <div class="metric-card"><span>카지노 손익</span><strong>${escapeHtml(formatPoints(summary.casinoNet || summary.casino_net || 0))}</strong></div>
          <div class="metric-card"><span>최고점 추락</span><strong>${escapeHtml(formatPoints(summary.drawdown || 0))}</strong></div>
        </div>
      </section>
      <details class="season-mine-section season-trophy-details">
        <summary>세부 시즌 기록 보기</summary>
        <div class="season-trophy-mini-list">
          ${grouped.map((group) => `
            <article class="community-list-item">
              <span class="community-item-main"><strong>${escapeHtml(group.headline || group.groupLabel || '시즌 기록')}</strong></span>
              <span class="meta">${escapeHtml(group.summary || '')}</span>
            </article>
          `).join('') || '<p class="empty-state">표시할 세부 기록이 없습니다.</p>'}
        </div>
      </details>
    </div>
  `);
}

async function fetchSeasonTabData(tabKey, detail = '') {
  if (tabKey === 'overview') {
    return latestDashboardSummary?.season || { currentSeason: null, titleSummary: [] };
  }

  if (tabKey === 'ranking') {
    const category = detail || activeSeasonRankingCategory || 'activity_score';
    const data = await dashboardRequest(`/api/seasons/current/rankings/${encodeURIComponent(category)}?limit=12&offset=0`);
    return { ...data, categoryCode: category };
  }

  if (tabKey === 'hall') {
    return dashboardRequest('/api/seasons/hall-of-fame');
  }

  if (tabKey === 'mine') {
    const [summary, trophies] = await Promise.all([
      dashboardRequest('/api/me/season-summary'),
      dashboardRequest('/api/me/season-trophies?limit=12')
    ]);
    return { summary, trophies };
  }

  return { unavailable: true };
}

function renderSeasonTabData(tabKey, data = {}, detail = '') {
  if (tabKey === 'overview') {
    renderSeasonOverview(data);
    return;
  }
  if (tabKey === 'ranking') {
    renderSeasonRanking(data, detail || data.categoryCode || activeSeasonRankingCategory);
    return;
  }
  if (tabKey === 'hall') {
    renderSeasonHallOfFame(data);
    return;
  }
  if (tabKey === 'mine') {
    renderMySeasonRecords(data);
  }
}

async function loadSeasonTab(tabKey = SEASON_DEFAULT_TAB, options = {}) {
  renderSeasonShell();
  const nextTabKey = SEASON_TABS.some((tab) => tab.key === tabKey) ? tabKey : SEASON_DEFAULT_TAB;
  const detail = options.detail || (nextTabKey === 'ranking' ? activeSeasonRankingCategory : '');
  setSeasonActiveTab(nextTabKey);

  const cached = options.force ? null : getSeasonCachedData(nextTabKey, detail);
  if (cached) {
    const label = nextTabKey === 'ranking' ? `season ranking ${detail}` : `season ${nextTabKey}`;
    dashboardPerf?.log(`${label} cache hit`);
    renderSeasonTabData(nextTabKey, cached, detail);
    return;
  }

  renderSeasonLoading(nextTabKey);
  const startedAt = window.HubPerfLogger?.now?.() ?? Date.now();

  try {
    const data = await fetchSeasonTabData(nextTabKey, detail);
    setSeasonCachedData(nextTabKey, detail, data);
    renderSeasonTabData(nextTabKey, data, detail);
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    if (nextTabKey === 'ranking') {
      dashboardPerf?.log(`season ranking ${detail} load ${duration}ms`);
    } else {
      dashboardPerf?.log(`season ${nextTabKey} load ${duration}ms`);
    }
  } catch (error) {
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    if (nextTabKey === 'ranking') {
      dashboardPerf?.log(`season ranking ${detail} load failed ${error?.status || error?.message || ''} ${duration}ms`.trim());
    } else {
      dashboardPerf?.log(`season ${nextTabKey} load failed ${error?.status || error?.message || ''} ${duration}ms`.trim());
    }
    renderSeasonError(nextTabKey, error, detail);
  }
}

function loadSeasonRankingCategory(category) {
  activeSeasonRankingCategory = SEASON_TITLE_CATEGORIES.some((item) => item.code === category) ? category : 'activity_score';
  loadSeasonTab('ranking', { detail: activeSeasonRankingCategory });
}

function openSeasonPanel(tabKey = SEASON_DEFAULT_TAB) {
  const panel = document.querySelector('#season-panel');
  if (!panel) return;
  dashboardPerf?.log('season tab open');
  panel.hidden = false;
  renderSeasonShell();
  loadSeasonTab(tabKey);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeSeasonPanel() {
  const panel = document.querySelector('#season-panel');
  if (panel) panel.hidden = true;
}

function renderHomeSeason(season = {}) {
  const card = document.querySelector('#season-summary-card');
  const currentSeason = season.currentSeason;
  const titleSummary = Array.isArray(season.titleSummary) ? season.titleSummary.slice(0, 4) : [];

  if (!currentSeason) {
    card.innerHTML = `
      <div class="section-heading"><h2>시즌 칭호 요약</h2><a class="meta" href="/seasons.html">시즌 보기</a></div>
      <p class="empty-state">진행 중인 시즌이 없습니다.</p>
    `;
    return;
  }

  card.innerHTML = `
    <div class="section-heading">
      <h2>${escapeHtml(currentSeason.name || '현재 시즌')}</h2>
      <a class="meta" href="/seasons.html">시즌 보기</a>
    </div>
    <p class="meta compact-season-period">${escapeHtml(formatHomeDateOnly(currentSeason.startsAt))} ~ ${escapeHtml(formatHomeDateOnly(currentSeason.endsAt))}</p>
    <div class="season-title-summary-list">
      ${titleSummary.map((item) => {
        const leader = item.leader;
        const score = leader?.formattedScore || (leader ? formatRankingScore(item.category, leader.score) : '');
        return `
          <div class="season-title-summary-item">
            <div class="season-title-summary-head">
              ${renderTitleBadge(item.title)}
            </div>
            ${leader
              ? `<strong>${escapeHtml(leader.nickname || '이름 없는 거주민')}</strong><span class="season-title-summary-score">${escapeHtml(score)} <span class="meta">· ${escapeHtml(item.categoryLabel || item.category)}</span></span>`
              : '<span class="meta">아직 1위 기록이 없습니다.</span>'}
          </div>
        `;
      }).join('') || '<p class="empty-state">시즌 칭호 요약을 불러오지 못했습니다.</p>'}
    </div>
  `;
}

function renderMySeasonTitles(season = {}) {
  const card = document.querySelector('#my-season-titles-card');
  const items = Array.isArray(season.mySeasonRewardTitles) ? season.mySeasonRewardTitles.slice(0, 4) : [];

  card.innerHTML = `
    <div class="section-heading">
      <h2>내 시즌 칭호</h2>
      <a class="meta" href="/profile.html#season-trophies">프로필 기록</a>
    </div>
    <div class="home-season-title-list">
      ${items.map((item) => `
        <div class="home-season-title-item">
          ${renderTitleBadge(item.title, { compact: true })}
          <span class="meta">${escapeHtml(item.seasonName || '')} · ${escapeHtml(item.reason || item.categoryLabel || '')}</span>
        </div>
      `).join('') || '<p class="empty-state">아직 획득한 시즌 칭호가 없습니다.</p>'}
    </div>
  `;
}

function renderHomeHero(summary = {}) {
  const copy = document.querySelector('#home-hero-copy');
  const actions = document.querySelector('#hero-actions');
  const me = summary.me;
  const attendance = summary.attendance || {};
  const unreadCount = Number(summary.notifications?.unreadCount || 0);
  const missionTotal = Number(summary.dailyMissions?.totalCount || 0);
  const missionDone = Number(summary.dailyMissions?.completedCount || 0);
  const statusLabel = !me
    ? '외부인 감지'
    : attendance.checkedToday
      ? unreadCount > 0 ? '소동 감지 중' : '격리소 관제 중'
      : '출석 미확인';

  if (copy) {
    copy.innerHTML = `
      <span class="badge">${escapeHtml(statusLabel)}</span>
      <h1>격리소 상황판</h1>
      <p>
        ${me
          ? `오늘도 정상은 아닙니다. ${missionTotal ? `처방전 ${missionDone}/${missionTotal}건, ` : ''}읽지 않은 소동 ${unreadCount}건을 확인하세요.`
          : '출석하고, 소동을 확인하고, 포인트를 잃거나 벌 시간입니다. 먼저 격리소 출입 인증부터 해주세요.'}
      </p>
    `;
  }

  if (!actions) return;
  actions.innerHTML = me ? `
    <button class="button inline" type="button" data-home-action="checkin" ${attendance.canCheckIn === false || attendance.checkedToday ? 'disabled' : ''}>
      ${attendance.checkedToday ? '오늘도 격리 완료' : '출석하고 보상 받기'}
    </button>
    <button class="button secondary inline" type="button" data-home-action="community">소동 확인</button>
    <button class="button secondary inline" type="button" data-home-action="casino">카지노 입장</button>
  ` : `
    <a class="button inline" href="/login.html">로그인</a>
    <a class="button secondary inline" href="/register.html">회원가입</a>
  `;
}

function renderGuestHome() {
  closeActivityPanel();
  closeCommunityPanel();
  closeCasinoPanel();
  closeShopPanel();
  closeMercenaryPanel();
  closeSeasonPanel();
  closeAccountPanel();
  latestDashboardSummary = null;
  renderHomeHero({});
  renderMainNavigation(null, 0);
  setHomeLoading(false);

  document.querySelector('#my-status-card').className = 'card home-card home-status-card';
  document.querySelector('#my-status-card').innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">출입 대기</span>
        <h2>내 격리 상태</h2>
      </div>
    </div>
    <p class="meta">로그인하면 보유 포인트, 장착 칭호, 출석 상태가 관제실에 표시됩니다.</p>
    <div class="home-action-row">
      <a class="button inline" href="/login.html">로그인</a>
      <a class="button secondary inline" href="/register.html">회원가입</a>
    </div>
  `;
  document.querySelector('#daily-missions-card').innerHTML = renderEmptyState({
    title: '오늘의 처방전은 로그인 후 공개',
    description: '출석, 글쓰기, 댓글 같은 오늘 할 일이 여기에 정리됩니다.'
  });
  document.querySelector('#recent-notifications-card').innerHTML = renderEmptyState({
    title: '최근 소동 대기 중',
    description: '로그인하면 댓글, 멘션, 시즌 기록 같은 개인 소동을 보여줍니다.'
  });
  document.querySelector('#recent-posts-list').innerHTML = renderEmptyState({
    title: '소문판 접근 대기',
    description: '로그인 후 최근 글 3개를 가볍게 확인할 수 있습니다.'
  });
  document.querySelector('#popular-posts-list').innerHTML = renderEmptyState({
    title: '인기 소동 접근 대기',
    description: '격리소에서 반응이 많은 글이 여기에 뜹니다.'
  });
  document.querySelector('#season-summary-card').innerHTML = renderEmptyState({
    title: '시즌 관찰 기록 잠김',
    description: '로그인하면 이번 시즌 요주의 인물 4종을 확인할 수 있습니다.'
  });
  document.querySelector('#my-season-titles-card').innerHTML = renderEmptyState({
    title: '내 시즌 칭호 없음',
    description: '아직 출입 인증 전이라 붙은 딱지가 없습니다.'
  });
  renderHomeCasinoGate();
  renderHomeTeaserZone();
}

function renderHomeProfile(summary = {}) {
  const card = document.querySelector('#my-status-card');
  const me = summary.me || {};
  const points = summary.points || {};
  const attendance = summary.attendance || {};
  const balance = points.formattedBalance || formatPoints(points.balance || 0);
  const avatarUrl = me.avatarUrl || me.avatar_url;
  const title = me.equippedTitle || me.equippedTitleData || me.titleData;
  const checkedLabel = attendance.checkedToday ? '오늘도 격리 완료' : '출석 필요';

  card.className = `card home-card home-status-card ${escapeHtml(me.cosmetics?.profileFrameClass || '')} ${escapeHtml(me.cosmetics?.profileBackgroundClass || '')}`.trim();
  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">내 격리 상태</span>
        <h2>${escapeHtml(me.nickname || me.displayName || '이름 없는 거주민')}</h2>
      </div>
      <button class="button secondary inline small-button" type="button" data-home-action="account">내 정보</button>
    </div>
    <div class="home-profile-row">
      ${avatarUrl ? `<img class="home-avatar" src="${escapeHtml(avatarUrl)}" alt="" />` : '<div class="home-avatar placeholder">M</div>'}
      <div>
        ${renderTitleBadge(title, { compact: true }) || '<span class="badge">대표 칭호 없음</span>'}
        <p class="meta">장착 칭호</p>
      </div>
    </div>
    <div class="home-status-grid">
      <div class="home-mini-card">
        <span class="meta">보유 포인트</span>
        <strong class="point">${escapeHtml(balance)}</strong>
      </div>
      <div class="home-mini-card">
        <span class="meta">오늘 출석 상태</span>
        <strong>${escapeHtml(checkedLabel)}</strong>
      </div>
    </div>
    <button class="button" type="button" data-home-action="checkin" ${attendance.canCheckIn === false || attendance.checkedToday ? 'disabled' : ''}>
      ${attendance.checkedToday ? '오늘도 격리 완료' : `출석하고 ${formatPoints(attendance.todayReward || 30)} 받기`}
    </button>
  `;
}

function renderHomeDailyMissions(data = {}) {
  const card = document.querySelector('#daily-missions-card');
  const missions = Array.isArray(data.today) ? data.today : [];
  const completedCount = Number(data.completedCount || 0);
  const totalCount = Number(data.totalCount || missions.length || 0);

  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">처방 진행 ${completedCount}/${totalCount}</span>
        <h2>오늘의 처방전</h2>
      </div>
    </div>
    <p class="meta">아직 치료가 덜 끝난 업무입니다. 완료하면 보상부터 챙기세요.</p>
    <div class="mission-list">
      ${missions.slice(0, 5).map((mission) => {
        const code = mission.code || mission.id;
        const status = mission.claimed ? '보상 수령' : mission.completed ? '완료' : '진행 중';
        return `
          <div class="mission-item home-prescription-item">
            <div>
              <strong>${escapeHtml(mission.title)}</strong><br />
              <span class="meta">${escapeHtml(status)} · ${formatPoints(mission.rewardPoints || 0)}</span>
            </div>
            ${mission.completed && !mission.claimed && code
              ? `<button class="button secondary inline small-button" type="button" onclick="claimMission('${escapeHtml(code)}')">보상 받기</button>`
              : `<span class="badge">${escapeHtml(status)}</span>`}
          </div>
        `;
      }).join('') || renderEmptyState({
        title: '오늘 처방전 없음',
        description: '오늘은 이상할 정도로 조용합니다. 이럴 때가 더 수상합니다.'
      })}
    </div>
  `;
}

function incidentLabel(type) {
  const labels = {
    post_comment: '댓글 소동',
    comment_reply: '답글',
    mention: '멘션',
    title_granted: '칭호',
    title_revoked: '칭호 회수',
    season_rank: '시즌',
    season_hall_of_fame: '명예의 전당',
    casino_jackpot: '카지노 대박',
    casino_disaster: '카지노 대참사',
    casino_drawdown: '추락',
    admin_notice: '공지',
    system_notice: '시스템',
    event_notice: '이벤트'
  };
  return labels[type] || type || '소동';
}

function renderHomeNotifications(data = {}) {
  const card = document.querySelector('#recent-notifications-card');
  const items = Array.isArray(data.recent) ? data.recent.slice(0, 3) : [];
  const unreadCount = Number(data.unreadCount || 0);

  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">미확인 ${unreadCount}건</span>
        <h2>최근 소동</h2>
      </div>
      <a class="meta" href="/notifications.html">전체 보기</a>
    </div>
    <p class="meta">방금 격리소에서 벌어진 일입니다. 읽지 않았다고 없던 일이 되진 않습니다.</p>
    <div class="notification-list">
      ${items.map((item) => `
        <a class="notification-card ${item.isRead ? '' : 'unread'}" href="${escapeHtml(safeInternalUrl(item.targetUrl || item.target_url, '/notifications.html'))}">
          <span class="home-notification-meta">
            <span class="badge">${escapeHtml(incidentLabel(item.type))}</span>
            <span class="meta">${escapeHtml(formatHomeDate(item.createdAt || item.created_at))}</span>
          </span>
          <strong>${escapeHtml(item.title)}</strong>
          <p class="meta home-notification-body">${escapeHtml(truncateText(item.body || item.message, 86))}</p>
        </a>
      `).join('') || renderEmptyState({
        title: '아직 소동 없음',
        description: '놀림당할 일이 없었다니, 오늘은 얌전한 편입니다.'
      })}
    </div>
  `;
}

function renderCommandPostPreviewList(rootId, posts = [], options = {}) {
  const root = document.querySelector(rootId);
  if (!root) return;
  const list = Array.isArray(posts) ? posts.slice(0, 3) : [];

  root.innerHTML = list.map((post) => `
    <a class="summary-post-card" href="/post.html?id=${escapeHtml(post.id)}">
      <span class="badge">${escapeHtml(post.categoryLabel || post.category || '소문')}</span>
      <strong>${escapeHtml(post.title)}</strong>
      <span class="meta">
        ${escapeHtml(postAuthorLabel(post))}
        ${post.authorTitle ? renderTitleBadge(post.authorTitle, { compact: true }) : ''}
        · 댓글 ${escapeHtml(post.commentCount ?? post.comment_count ?? 0)}개
        ${options.showScore ? ` · 소동 점수 ${escapeHtml(post.score || 0)}` : ''}
      </span>
      <span class="meta">${escapeHtml(formatHomeDate(post.createdAt || post.created_at))}</span>
    </a>
  `).join('') || renderEmptyState({
    title: options.emptyTitle || '아직 소문 없음',
    description: options.emptyText || '조금 뒤에 다시 확인해 주세요.'
  });
}

function renderHomePosts(community = {}) {
  renderCommandPostPreviewList('#recent-posts-list', community.recentPosts, {
    emptyTitle: '방금 올라온 소문 없음',
    emptyText: '누군가 첫 소동을 올릴 때까지 관제실이 조용합니다.'
  });
  renderCommandPostPreviewList('#popular-posts-list', community.popularPosts, {
    emptyTitle: '인기 소동 없음',
    emptyText: '댓글이 붙고 반응이 쌓이면 여기가 금방 시끄러워집니다.',
    showScore: true
  });
}

function renderHomeSeason(season = {}) {
  const card = document.querySelector('#season-summary-card');
  const currentSeason = season.currentSeason;
  const titleSummary = Array.isArray(season.titleSummary) ? season.titleSummary.slice(0, 4) : [];

  if (!currentSeason) {
    card.innerHTML = `
      <div class="section-heading">
        <div>
          <span class="badge">기록 보관소 대기</span>
          <h2>시즌 관찰 기록</h2>
        </div>
        <button class="button secondary inline small-button" type="button" data-home-action="season">시즌 탭</button>
      </div>
      ${renderEmptyState({ title: '진행 중인 시즌 없음', description: '아직 관찰할 요주의 인물이 없습니다.' })}
    `;
    return;
  }

  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">이번 시즌 요주의 인물</span>
        <h2>시즌 관찰 기록</h2>
      </div>
      <button class="button secondary inline small-button" type="button" data-home-action="season">기록 보관소</button>
    </div>
    <p class="meta compact-season-period">${escapeHtml(currentSeason.name || '현재 시즌')} · ${escapeHtml(formatHomeDateOnly(currentSeason.startsAt))} ~ ${escapeHtml(formatHomeDateOnly(currentSeason.endsAt))}</p>
    <div class="season-title-summary-list">
      ${titleSummary.map((item) => {
        const leader = item.leader;
        const score = leader?.formattedScore || (leader ? formatRankingScore(item.category, leader.score) : '');
        return `
          <div class="season-title-summary-item">
            <div class="season-title-summary-head">
              ${renderTitleBadge(item.title)}
            </div>
            ${leader
              ? `<strong>${escapeHtml(leader.nickname || '이름 없는 거주민')}</strong><span class="season-title-summary-score">${escapeHtml(score)} <span class="meta">· ${escapeHtml(item.categoryLabel || item.category)}</span></span>`
              : '<span class="meta">아직 1위 기록이 없습니다.</span>'}
          </div>
        `;
      }).join('') || renderEmptyState({
        title: '시즌 칭호 관찰 실패',
        description: '시즌 탭에서 다시 확인해 주세요.'
      })}
    </div>
  `;
}

function renderMySeasonTitles(season = {}) {
  const card = document.querySelector('#my-season-titles-card');
  const items = Array.isArray(season.mySeasonRewardTitles) ? season.mySeasonRewardTitles.slice(0, 4) : [];

  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">내게 붙은 딱지</span>
        <h2>내 시즌 칭호</h2>
      </div>
      <button class="button secondary inline small-button" type="button" data-home-action="account">프로필</button>
    </div>
    <div class="home-season-title-list">
      ${items.map((item) => `
        <div class="home-season-title-item">
          ${renderTitleBadge(item.title, { compact: true })}
          <span class="meta">${escapeHtml(item.seasonName || '')} · ${escapeHtml(item.reason || item.categoryLabel || '시즌 보상')}</span>
        </div>
      `).join('') || renderEmptyState({
        title: '아직 획득한 시즌 칭호 없음',
        description: '이번 시즌에 눈에 띄면 여기 박제됩니다.'
      })}
    </div>
  `;
}

function renderHomeCasinoGate() {
  const card = document.querySelector('#home-casino-gate-card');
  if (!card) return;
  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">출입 주의</span>
        <h2>불법 도박장 입구</h2>
      </div>
      <button class="button secondary inline small-button" type="button" data-home-action="casino">카지노 탭</button>
    </div>
    <p class="meta">오늘도 포인트가 증발할 준비를 마쳤습니다. 대참사 기록과 내 카지노 통계는 카지노 탭에서 확인하세요.</p>
    <div class="home-mini-card home-mine-gate">
      <strong>격리소 광산</strong>
      <p class="meta">포인트는 여기서 캐고, 카지노에서는 잔고를 예능으로 가공하세요.</p>
      <a class="button secondary inline small-button" href="/mine.html">광산으로 이동</a>
    </div>
    <div class="home-action-row">
      <button class="button inline" type="button" data-home-action="casino">카지노 입장</button>
      <a class="button secondary inline" href="/casino.html">게임 화면 열기</a>
    </div>
  `;
}

function renderHomeTeaserZone() {
  const card = document.querySelector('#home-teaser-card');
  if (!card) return;
  card.innerHTML = `
    <div class="section-heading">
      <div>
        <span class="badge">준비 중</span>
        <h2>다음 개방 예정 구역</h2>
      </div>
    </div>
    <div class="home-teaser-grid">
      <button class="home-mini-card ia-mini-button" type="button" data-home-action="shop">
        <strong>의뢰소</strong>
        <p class="meta">포인트 벌이를 위한 합법적인 척하는 일거리.</p>
        <span class="badge">준비 중</span>
      </button>
      <button class="home-mini-card ia-mini-button" type="button" data-home-action="mercenary">
        <strong>용병단</strong>
        <p class="meta">고용하고, 굴리고, 다치면 치료비를 뜯기는 예정.</p>
        <span class="badge">문 잠김</span>
      </button>
    </div>
  `;
}

function renderHomeFromSummary(summary = {}) {
  latestDashboardSummary = summary;
  renderHomeHero(summary);
  renderMainNavigation(summary.me, summary.notifications?.unreadCount || 0);
  setHomeLoading(false);
  renderHomeProfile(summary);
  renderHomeDailyMissions(summary.dailyMissions, summary.weeklyMissions);
  renderHomeNotifications(summary.notifications);
  renderHomePosts(summary.community);
  renderHomeSeason(summary.season);
  renderMySeasonTitles(summary.season);
  renderHomeCasinoGate(summary);
  renderHomeTeaserZone();
  openMainViewFromHash({ scroll: false });
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-home-action]');
  if (!target) return;

  const action = target.dataset.homeAction;
  if (!action) return;
  event.preventDefault();

  if (action === 'checkin') {
    if (!target.disabled) checkIn();
    return;
  }
  if (action === 'activity') {
    openActivityPanel();
    return;
  }
  if (action === 'community') {
    openCommunityPanel();
    return;
  }
  if (action === 'casino') {
    openCasinoPanel();
    return;
  }
  if (action === 'season') {
    openSeasonPanel();
    return;
  }
  if (action === 'account') {
    openAccountPanel();
    return;
  }
  if (action === 'shop') {
    openShopPanel();
    return;
  }
  if (action === 'mercenary') {
    openMercenaryPanel();
  }
});

async function loadDashboard() {
  const message = document.querySelector('#dashboard-message');
  const dashboardStartedAt = window.HubPerfLogger?.now?.() ?? Date.now();
  dashboardPerf?.resetApis();
  dashboardPerf?.log('init start');
  if (message) message.textContent = '';

  if (!API.token) {
    renderGuestHome();
    openMainViewFromHash({ scroll: false });
    dashboardPerf?.log(`init total ${Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - dashboardStartedAt)}ms`);
    dashboardPerf?.apiSummary();
    return;
  }

  setHomeLoading(true);

  try {
    const data = await dashboardRequest('/api/dashboard/summary');
    const summary = data.summary || {};
    measureDashboard('render home summary', () => renderHomeFromSummary(summary));
  } catch (error) {
    if (error.status === 401) {
      API.token = null;
      renderGuestHome();
      if (message) message.textContent = '로그인이 만료되었습니다. 다시 로그인해 주세요.';
    } else {
      console.error('홈 요약 로딩 실패', error);
      renderHomeError(error);
    }
  } finally {
    dashboardPerf?.log(`init total ${Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - dashboardStartedAt)}ms`);
    dashboardPerf?.apiSummary();
  }
}

async function checkIn() {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await dashboardRequest('/api/checkin', { method: 'POST' });
    if (message) {
      message.textContent = data.alreadyCheckedIn
        ? data.message
        : `출석 완료! ${formatPoints(data.rewardAmount)}를 받았습니다.`;
    }
    await loadDashboard();
  } catch (error) {
    console.error('출석 처리 실패', error);
    if (message) message.textContent = error.message;
  }
}

async function claimMission(code) {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await dashboardRequest(`/api/missions/daily/${encodeURIComponent(code)}/claim`, { method: 'POST' });
    if (message) message.textContent = `미션 보상 ${formatPoints(data.rewardPoints)}를 받았습니다.`;
    await loadDashboard();
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

async function claimMissionBonus(code) {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await dashboardRequest(`/api/missions/daily/bonus/${encodeURIComponent(code)}/claim`, { method: 'POST' });
    if (message) message.textContent = `미션 보너스 ${formatPoints(data.rewardPoints)}를 받았습니다.`;
    await loadDashboard();
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

function debugActivity(...args) {
  try {
    if (localStorage.getItem('DEBUG_DASHBOARD') === 'true') console.log('[activity]', ...args);
  } catch (error) {
    // localStorage가 막힌 환경에서는 조용히 무시합니다.
  }
}

function activityMissionReward(item = {}) {
  return formatPoints(item.rewardPoints ?? item.reward_points ?? item.reward ?? 0);
}

function activityProgressText(item = {}) {
  const current = Number(item.progress ?? item.current ?? item.count ?? 0);
  const target = Number(item.target ?? item.required ?? item.goal ?? 0);
  if (!target) return item.completed ? '완료' : '진행 중';
  return `${Math.min(current, target)}/${target}`;
}

function normalizeActivityMissions(payload = {}) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.missions)) return payload.missions;
  if (Array.isArray(payload.data?.missions)) return payload.data.missions;
  if (Array.isArray(payload.summary?.missions)) return payload.summary.missions;
  if (Array.isArray(payload.today)) return payload.today;
  if (Array.isArray(payload.weekly)) return payload.weekly;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function normalizeActivityBonuses(payload = {}) {
  if (Array.isArray(payload?.bonuses)) return payload.bonuses;
  if (Array.isArray(payload?.data?.bonuses)) return payload.data.bonuses;
  if (Array.isArray(payload?.summary?.bonuses)) return payload.summary.bonuses;
  if (Array.isArray(payload?.bonusMissions)) return payload.bonusMissions;
  if (Array.isArray(payload?.bonus_missions)) return payload.bonus_missions;
  return [];
}

function renderActivityLoadError(label) {
  return `
    <div class="ia-panel-error">
      <strong>${escapeHtml(label)} 정보를 불러오지 못했습니다.</strong>
      <p class="meta">잠시 후 다시 열어 주세요. 다른 활동 탭은 계속 사용할 수 있습니다.</p>
    </div>
  `;
}

function renderActivityMissionList(items = [], scope = 'daily') {
  const missions = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!missions.length) return '<p class="empty-state">표시할 미션이 없습니다.</p>';
  return `<div class="mission-list ia-mission-list">
    ${missions.slice(0, 8).map((mission) => {
      const code = mission.code || mission.id;
      const claimed = Boolean(mission.claimed);
      const completed = Boolean(mission.completed);
      const status = claimed ? '수령 완료' : completed ? '수령 가능' : '진행 중';
      const progress = activityProgressText(mission);
      return `
        <div class="mission-item ia-mission-item">
          <div>
            <strong>${escapeHtml(mission.title || mission.name || code || '미션')}</strong><br />
            <span class="meta">${escapeHtml(progress)} · ${escapeHtml(status)} · ${escapeHtml(activityMissionReward(mission))}</span>
          </div>
          ${completed && !claimed && code
            ? `<button class="button secondary inline small-button" type="button" onclick="claimActivityMission('${escapeHtml(scope)}','${escapeHtml(code)}')">보상 받기</button>`
            : `<span class="badge">${escapeHtml(status)}</span>`}
        </div>
      `;
    }).join('')}
  </div>`;
}

function renderActivityBonusList(items = [], scope = 'daily') {
  if (!items.length) return '';
  return `<div class="ia-bonus-list">
    ${items.map((bonus) => {
      const code = bonus.code || bonus.id;
      const claimed = Boolean(bonus.claimed);
      const claimable = Boolean(bonus.claimable);
      const completedCount = Number(bonus.completedCount ?? bonus.completed_count ?? bonus.progress ?? 0);
      const required = bonus.requiredCompleted ?? bonus.required_completed ?? bonus.target ?? 0;
      const progress = required === 'all' ? `${completedCount}/전체` : `${completedCount}/${Number(required || 0)}`;
      const status = claimed ? '수령 완료' : claimable ? '수령 가능' : '진행 중';
      return `
        <div class="ia-bonus-item">
          <div>
            <strong>${escapeHtml(bonus.title || bonus.name || code || '보너스')}</strong><br />
            <span class="meta">${escapeHtml(progress)} · ${escapeHtml(status)} · ${escapeHtml(activityMissionReward(bonus))}</span>
          </div>
          ${claimable && !claimed && code
            ? `<button class="button secondary inline small-button" type="button" onclick="claimActivityMissionBonus('${escapeHtml(scope)}','${escapeHtml(code)}')">보너스 받기</button>`
            : `<span class="badge">${escapeHtml(status)}</span>`}
        </div>
      `;
    }).join('')}
  </div>`;
}

function renderActivityMineLogs(mine = {}) {
  const logs = (mine.recentLogs || mine.recent_logs || mine.logs || mine.history || []).slice(0, 3);
  if (!logs.length) return '<p class="meta">최근 채굴 기록은 아직 없습니다.</p>';
  return `<div class="ia-mine-log-list">
    ${logs.map((log) => {
      const label = log.resultLabel || log.result_label || log.label || log.resultCode || log.result_code || '채굴 결과';
      const reward = log.formattedRewardAmount || log.formatted_reward_amount || formatPoints(log.rewardAmount ?? log.reward_amount ?? 0);
      return `<div class="ia-mine-log-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(reward)}</strong></div>`;
    }).join('')}
  </div>`;
}

function renderActivityShellLoading() {
  const shell = document.querySelector('#activity-shell');
  if (!shell) return;
  shell.innerHTML = renderLoadingState({
    title: '활동 정보를 불러오는 중',
    description: '일일/주간미션과 광산 상태를 확인합니다.',
    rows: 3
  });
}

function renderActivityShell(data = {}) {
  const shell = document.querySelector('#activity-shell');
  if (!shell) return;
  const dailyItems = normalizeActivityMissions(data.daily);
  const weeklyItems = normalizeActivityMissions(data.weekly);
  const dailyBonuses = normalizeActivityBonuses(data.daily);
  const weeklyBonuses = normalizeActivityBonuses(data.weekly);
  const mine = data.mine || {};
  const dailyError = Boolean(data.daily?.error);
  const weeklyError = Boolean(data.weekly?.error);
  const mineError = Boolean(data.mine?.error);
  const mineEarned = mine.todayEarned ?? mine.today_earned ?? mine.earnedToday ?? 0;
  const mineState = mine.mineState || mine.mine_state || mine.stateLabel || mine.state || '광맥 확인 중';
  const mineEarnedLabel = mine.formattedTodayEarned || mine.formatted_today_earned || formatPoints(mineEarned);
  debugActivity('normalized', { dailyItems, weeklyItems });

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
        <p class="meta">오늘 채굴 수익 ${escapeHtml(mineEarnedLabel)} · 광맥 상태 ${escapeHtml(mineState)}</p>
        ${mineError ? renderActivityLoadError('광산') : renderActivityMineLogs(mine)}
        <span class="button secondary inline small-button">광산 열기</span>
      </a>
    </section>
    <section class="ia-card-grid ia-mission-grid">
      <article class="card ia-mission-card">
        <div class="section-heading"><div><span class="badge">일일</span><h3>일일미션</h3></div></div>
        ${dailyError ? renderActivityLoadError('일일미션') : renderActivityMissionList(dailyItems, 'daily')}
        ${dailyError ? '' : renderActivityBonusList(dailyBonuses, 'daily')}
      </article>
      <article class="card ia-mission-card">
        <div class="section-heading"><div><span class="badge">주간</span><h3>주간미션</h3></div></div>
        ${weeklyError ? renderActivityLoadError('주간미션') : renderActivityMissionList(weeklyItems, 'weekly')}
        ${weeklyError ? '' : renderActivityBonusList(weeklyBonuses, 'weekly')}
      </article>
    </section>
    <section class="ia-card-grid">
      <article class="ia-action-card is-quiet"><span class="badge">기록</span><strong>보상 기록</strong><p class="meta">출석, 미션, 광산 보상 내역은 포인트 기록과 광산 로그에 남습니다.</p></article>
      <article class="ia-action-card is-quiet"><span class="badge">원칙</span><strong>벌 곳과 태울 곳 분리</strong><p class="meta">포인트는 활동에서 벌고, 카지노와 상점과 용병단에서 씁니다.</p></article>
    </section>
  `;
}

async function loadActivityPanel(options = {}) {
  const shell = document.querySelector('#activity-shell');
  if (!shell) return;
  const cached = options.force ? null : activityCache;
  if (cached && Date.now() - cached.cachedAt <= ACTIVITY_CACHE_TTL_MS) {
    renderActivityShell(cached.data);
    activityLoaded = true;
    dashboardPerf?.log('activity cache hit');
    return;
  }

  renderActivityShellLoading();
  const [daily, weekly, mine] = await Promise.allSettled([
    dashboardRequest('/api/missions/daily'),
    dashboardRequest('/api/missions/weekly'),
    dashboardRequest('/api/mine/status')
  ]);
  debugActivity('daily result', daily);
  debugActivity('weekly result', weekly);
  debugActivity('mine result', mine);
  const dailyPayload = daily.status === 'fulfilled' ? daily.value : { error: true };
  const weeklyPayload = weekly.status === 'fulfilled' ? weekly.value : { error: true };
  const minePayload = mine.status === 'fulfilled' ? mine.value.status || mine.value.result || mine.value : { error: true };
  const dailyItems = normalizeActivityMissions(dailyPayload);
  const weeklyItems = normalizeActivityMissions(weeklyPayload);
  debugActivity('normalized before render', { dailyItems, weeklyItems });
  const data = { daily: dailyPayload, weekly: weeklyPayload, mine: minePayload };
  renderActivityShell(data);
  activityLoaded = daily.status === 'fulfilled'
    && weekly.status === 'fulfilled'
    && (dailyItems.length > 0 || weeklyItems.length > 0);
  if (activityLoaded) activityCache = { cachedAt: Date.now(), data };
}

function shouldReloadActivityPanel() {
  const shell = document.querySelector('#activity-shell');
  return !activityLoaded
    || !shell
    || !shell.textContent.trim()
    || shell.querySelectorAll('.ia-mission-item').length === 0;
}

async function claimActivityMission(scope, code) {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await dashboardRequest(`/api/missions/${encodeURIComponent(scope)}/${encodeURIComponent(code)}/claim`, { method: 'POST' });
    if (message) message.textContent = `미션 보상 ${formatPoints(data.rewardPoints)}를 받았습니다.`;
    activityCache = null;
    activityLoaded = false;
    await loadActivityPanel({ force: true });
    await loadDashboard();
  } catch (error) {
    if (message) message.textContent = error.message || '미션 보상을 받을 수 없습니다.';
  }
}

async function claimActivityMissionBonus(scope, code) {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await dashboardRequest(`/api/missions/${encodeURIComponent(scope)}/bonus/${encodeURIComponent(code)}/claim`, { method: 'POST' });
    if (message) message.textContent = `보너스 보상 ${formatPoints(data.rewardPoints)}를 받았습니다.`;
    activityCache = null;
    activityLoaded = false;
    await loadActivityPanel({ force: true });
    await loadDashboard();
  } catch (error) {
    if (message) message.textContent = error.message || '보너스 보상을 받을 수 없습니다.';
  }
}

function renderShopPanel() {
  const shell = document.querySelector('#shop-shell');
  if (!shell) return;
  shell.innerHTML = `
    <div class="ia-card-grid">
      <a class="ia-action-card" href="/shop.html"><span class="badge">상점</span><strong>칭호 상점</strong><p class="meta">포인트로 칭호를 사고 장착할 준비를 합니다.</p></a>
      <a class="ia-action-card" href="/cosmetics.html"><span class="badge">꾸미기</span><strong>꾸미기 상점</strong><p class="meta">프로필 프레임과 배경을 손봅니다.</p></a>
      <article class="ia-action-card is-locked"><span class="badge">보급품</span><strong>보급품 창고</strong><p class="meta">광산/용병단 소모품을 위한 예정 구역입니다.</p></article>
    </div>
  `;
}

function renderMercenaryPanel(options = {}) {
  loadMercenaryPanel(options);
}

function mercenaryDebug(...args) {
  try {
    if (localStorage.DEBUG_DASHBOARD === 'true') console.log('[mercenary]', ...args);
  } catch (error) {}
}

function mercenaryMessage(message) {
  const target = document.querySelector('#dashboard-message');
  if (target) target.textContent = message || '';
}

function mercenaryCanUseCache() {
  return mercenaryCache && Date.now() - mercenaryCache.cachedAt < MERCENARY_CACHE_TTL_MS;
}

function renderMercenaryPortrait(item = {}) {
  if (item.illustrationUrl) {
    return `<div class="mercenary-portrait"><img src="${escapeHtml(safeInternalUrl(item.illustrationUrl, item.illustrationUrl))}" alt="${escapeHtml(item.name || '용병')} 초상화"></div>`;
  }
  const rarity = String(item.rarity || 'N').toLowerCase();
  return `
    <div class="mercenary-portrait mercenary-placeholder rarity-${escapeHtml(rarity)}">
      <span>${escapeHtml(item.rarity || 'N')}</span>
      <strong>${escapeHtml(item.roleLabel || item.role || '용병')}</strong>
    </div>
  `;
}

function renderMercenaryStats(item = {}) {
  return `
    <div class="mercenary-stats">
      <span>공 ${escapeHtml(item.attack || 0)}</span>
      <span>방 ${escapeHtml(item.defense || 0)}</span>
      <span>지 ${escapeHtml(item.support || 0)}</span>
      <span>기 ${escapeHtml(item.tech || 0)}</span>
      <span>운 ${escapeHtml(item.luck || 0)}</span>
    </div>
  `;
}

function renderMercenaryBadges(item = {}) {
  return `
    <div class="mercenary-badges">
      <span class="badge mercenary-rarity rarity-${escapeHtml(String(item.rarity || 'N').toLowerCase())}">${escapeHtml(item.rarity || 'N')}</span>
      <span class="badge">성능 ${escapeHtml(item.performanceGrade || 'N')}</span>
      ${item.limited ? '<span class="badge">한정</span>' : ''}
      ${item.rarity === 'EX' ? '<span class="badge">EX 한정</span>' : ''}
      ${item.rescueInsured ? '<span class="badge rescue">응급구조</span>' : ''}
    </div>
  `;
}

function renderMercenaryCard(item = {}) {
  const isDead = item.status === 'dead';
  return `
    <article class="mercenary-card ${isDead ? 'is-dead' : ''}">
      ${renderMercenaryPortrait(item)}
      <div class="mercenary-card-body">
        ${renderMercenaryBadges(item)}
        <h3>${escapeHtml(item.name || '이름 없는 용병')}</h3>
        <p class="meta">${escapeHtml(item.roleLabel || item.role || '')} · Lv.${escapeHtml(item.level || 1)} · 전투력 ${escapeHtml(item.power || 0)}</p>
        <p class="meta">${escapeHtml(item.rarityNote || '')} · 상태 ${escapeHtml(item.statusLabel || item.status || '')}</p>
        ${renderMercenaryStats(item)}
        ${isDead ? '<p class="meta danger-text">전사 처리되어 임무, 치료, 응급구조 가입이 불가합니다.</p>' : ''}
      </div>
    </article>
  `;
}

function renderMercenaryOverview(summary = {}, account = {}) {
  const metrics = [
    ['보유', summary.total || 0],
    ['임무 중', summary.deployed || 0],
    ['의무실', summary.hospitalized || 0],
    ['전사', summary.dead || 0],
    ['응급구조', summary.rescueInsured || 0],
    ['완료 대기', summary.claimableRuns || 0],
    ['총 전투력', summary.totalPower || 0],
    ['잔고', account.formattedBalance || formatPoints(account.balance || 0)]
  ];
  return `
    <section class="mercenary-section mercenary-overview">
      <div class="section-heading">
        <div>
          <span class="badge">용병단 관제</span>
          <h2>격리소 용병단</h2>
          <p class="meta">모든 용병단 활동은 이 탭 안에서 진행됩니다.</p>
        </div>
        <button class="button secondary inline small-button" type="button" data-mercenary-action="refresh">새로고침</button>
      </div>
      <div class="mercenary-metric-grid">
        ${metrics.map(([label, value]) => `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}
      </div>
      <div class="mercenary-rule-card">
        <p>일반 고용소에서는 N/R 절차 생성 용병만 등장합니다.</p>
        <p>SR/SSR/EX는 고유 캐릭터이며 특수 계약, 시즌, 이벤트, 고난도 임무 등으로 획득합니다.</p>
        <p>EX는 성능 등급이 아니라 한정 표시입니다. 실제 성능은 성능 등급으로 따로 표시됩니다.</p>
      </div>
    </section>
  `;
}

function renderMercenaryCandidates(items = []) {
  return `
    <section class="mercenary-section">
      <div class="section-heading">
        <div>
          <span class="badge">고용소</span>
          <h2>일반 고용 후보</h2>
          <p class="meta">일반 고용소 후보는 N/R만 등장하며, 같은 계열이 반복될 수 있습니다.</p>
        </div>
      </div>
      <div class="mercenary-card-grid">
        ${items.length ? items.map((item) => `
          <article class="mercenary-card candidate-card">
            ${renderMercenaryPortrait(item)}
            <div class="mercenary-card-body">
              ${renderMercenaryBadges(item)}
              <h3>${escapeHtml(item.name)}</h3>
              <p class="meta">${escapeHtml(item.roleLabel)} · 전투력 ${escapeHtml(item.power || 0)} · 고용비 ${escapeHtml(item.formattedHireCost || formatPoints(item.hireCost || 0))}</p>
              ${renderMercenaryStats(item)}
              <button class="button inline small-button" type="button" data-mercenary-action="hire" data-candidate-id="${escapeHtml(item.id)}">고용</button>
            </div>
          </article>
        `).join('') : renderEmptyState({ title: '고용 후보가 없습니다', description: '새로고침하면 일반 고용소 후보를 다시 확인합니다.', compact: true })}
      </div>
    </section>
  `;
}

function formatRemainingTime(targetAt) {
  if (!targetAt) return '알 수 없음';

  const target = new Date(targetAt).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (!Number.isFinite(target) || diffMs <= 0) {
    return '완료됨';
  }

  const totalSeconds = Math.ceil(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}일 ${hours}시간`;
  }

  if (hours > 0) {
    return `${hours}시간 ${String(minutes).padStart(2, '0')}분`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
  }

  return `${seconds}초`;
}

function formatShortDueTime(targetAt) {
  if (!targetAt) return '알 수 없음';

  const target = new Date(targetAt);
  if (Number.isNaN(target.getTime())) return '알 수 없음';

  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const dayDiff = Math.round((startOfTarget - startOfToday) / 86400000);
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');

  if (dayDiff === 0) return `오늘 ${hh}:${mm}`;
  if (dayDiff === 1) return `내일 ${hh}:${mm}`;

  return `${String(target.getMonth() + 1).padStart(2, '0')}.${String(target.getDate()).padStart(2, '0')} ${hh}:${mm}`;
}

function renderMercenaryRoster(items = []) {
  return `
    <section class="mercenary-section">
      <div class="section-heading"><div><span class="badge">내 용병</span><h2>보유 용병</h2></div></div>
      <div class="mercenary-card-grid">
        ${items.length ? items.map(renderMercenaryCard).join('') : renderEmptyState({ title: '아직 고용한 용병이 없습니다', description: '고용소에서 N/R 용병을 먼저 데려오세요.', compact: true })}
      </div>
    </section>
  `;
}

function renderMercenaryRescue(items = []) {
  const alive = items.filter((item) => item.status !== 'dead');
  return `
    <section class="mercenary-section">
      <div class="section-heading">
        <div><span class="badge">응급구조</span><h2>응급구조 서비스</h2><p class="meta">가입 용병은 사망 직전 의무실로 회수됩니다. 해지 시 환불은 없습니다.</p></div>
      </div>
      <div class="mercenary-list">
        ${alive.length ? alive.map((item) => {
          const disabled = ['deployed', 'hospitalized'].includes(item.status);
          return `
            <article class="mercenary-row">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="meta">${escapeHtml(item.rarity || '')} · 성능 ${escapeHtml(item.performanceGrade || '')} · ${escapeHtml(item.statusLabel || item.status || '')}</span>
              <span class="meta">가입비 ${escapeHtml(formatPoints(item.rescueCost || 0))} · 사용 ${escapeHtml(item.rescueUsedCount || 0)}회</span>
              ${item.rescueInsured
                ? `<button class="button secondary inline small-button" type="button" data-mercenary-action="rescue-cancel" data-mercenary-id="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''}>해지</button>`
                : `<button class="button inline small-button" type="button" data-mercenary-action="rescue-subscribe" data-mercenary-id="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''}>가입</button>`}
            </article>
          `;
        }).join('') : renderEmptyState({ title: '응급구조를 적용할 용병이 없습니다', description: '전사자는 가입할 수 없습니다.', compact: true })}
      </div>
    </section>
  `;
}

function renderMercenaryMissionPicker(mission, mercenaries = []) {
  const available = mercenaries.filter((item) => item.status === 'idle');
  if (!available.length) return '<p class="meta">투입 가능한 대기 용병이 없습니다.</p>';
  return `
    <div class="mercenary-picker">
      ${available.map((item) => `
        <label>
          <input type="checkbox" data-mercenary-pick data-mission-code="${escapeHtml(mission.code)}" value="${escapeHtml(item.id)}">
          ${escapeHtml(item.name)} · ${escapeHtml(item.roleLabel || item.role)} · ${escapeHtml(item.power || 0)}
        </label>
      `).join('')}
    </div>
  `;
}

function renderMercenaryMissions(missions = [], mercenaries = []) {
  return `
    <section class="mercenary-section">
      <div class="section-heading">
        <div><span class="badge">임무</span><h2>임무 파견</h2><p class="meta">임무는 시간이 걸리며, 완료 후 결과를 수령해야 보상과 경험치가 지급됩니다.</p></div>
      </div>
      <div class="mercenary-mission-grid">
        ${missions.map((mission) => `
          <article class="mercenary-mission-card">
            <span class="badge">${escapeHtml(mission.difficulty)}</span>
            <h3>${escapeHtml(mission.title)}</h3>
            <p class="meta">${escapeHtml(mission.description || '')}</p>
            <p class="meta">추천 ${escapeHtml((mission.recommendedRoleLabels || []).join(', '))}</p>
            <p class="meta">보상 ${escapeHtml(mission.rewardLabel)} · 수행 ${escapeHtml(mission.durationLabel)} · 부상 ${escapeHtml(mission.injuryRisk)}% · 사망 ${escapeHtml(mission.deathRisk)}%</p>
            ${renderMercenaryMissionPicker(mission, mercenaries)}
            <button class="button inline small-button" type="button" data-mercenary-action="start-mission" data-mission-code="${escapeHtml(mission.code)}">임무 시작</button>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function formatRemainingTime(targetAt) {
  if (!targetAt) return '알 수 없음';

  const targetTime = new Date(targetAt).getTime();
  if (!Number.isFinite(targetTime)) return '알 수 없음';

  const diffMs = targetTime - Date.now();

  if (diffMs <= 0) {
    return '완료됨';
  }

  const totalSeconds = Math.ceil(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}일 ${hours}시간`;
  }

  if (hours > 0) {
    return `${hours}시간 ${String(minutes).padStart(2, '0')}분`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
  }

  return `${seconds}초`;
}

function formatShortDueTime(targetAt) {
  if (!targetAt) return '알 수 없음';

  const target = new Date(targetAt);
  if (Number.isNaN(target.getTime())) return '알 수 없음';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const dayDiff = Math.round((targetDay - today) / 86400000);

  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');

  if (dayDiff === 0) return `오늘 ${hh}:${mm}`;
  if (dayDiff === 1) return `내일 ${hh}:${mm}`;

  return `${String(target.getMonth() + 1).padStart(2, '0')}.${String(target.getDate()).padStart(2, '0')} ${hh}:${mm}`;
}

function renderMercenaryRuns(runs = []) {
  return `
    <section class="mercenary-section">
      <div class="section-heading">
        <div>
          <span class="badge">진행 중</span>
          <h2>진행 중 임무</h2>
        </div>
      </div>
      <div class="mercenary-list">
        ${runs.length ? runs.map((run) => {
          const completesAt = getRunCompletesAt(run);
          const remainingText = formatRemainingTime(completesAt);
          const dueText = formatShortDueTime(completesAt);
          const isReady = run.readyToClaim || run.ready_to_claim || remainingText === '완료됨';

          return `
            <article class="mercenary-row">
              <strong>${escapeHtml(run.mission?.title || run.missionTitle || run.mission_title || run.missionCode || run.mission_code || '임무')}</strong>
              <span class="meta">${escapeHtml((run.mercenaries || []).map((item) => item.name).join(', '))}</span>
              <span class="meta">
                ${isReady ? '완료됨 · 결과 수령 가능' : `남은 시간 ${escapeHtml(remainingText)}`}
                · 완료 예정 ${escapeHtml(dueText)}
                · 성공률 ${escapeHtml(run.successRate ?? run.success_rate ?? 0)}%
              </span>
              <button
                class="button inline small-button"
                type="button"
                data-mercenary-action="claim-run"
                data-run-id="${escapeHtml(run.id)}"
                ${isReady ? '' : 'disabled'}
              >
                ${isReady ? '결과 받기' : '수행 중'}
              </button>
            </article>
          `;
        }).join('') : renderEmptyState({ title: '진행 중인 임무가 없습니다', description: '임무 카드에서 용병을 선택해 파견하세요.', compact: true })}
      </div>
    </section>
  `;
}

function getRunCompletesAt(run) {
  return run?.completesAt
    || run?.completes_at
    || run?.completeAt
    || run?.complete_at
    || run?.missionEndsAt
    || run?.mission_ends_at
    || null;
}

function renderMercenaryHospital(items = []) {
  const hospital = items.filter((item) => ['injured', 'hospitalized'].includes(item.status));
  return `
    <section class="mercenary-section">
      <div class="section-heading"><div><span class="badge">의무실</span><h2>치료 대기</h2></div></div>
      <div class="mercenary-list">
        ${hospital.length ? hospital.map((item) => `
          <article class="mercenary-row">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="meta">부상 단계 ${escapeHtml(item.injuryLevel || 1)} · 치료비 ${escapeHtml(formatPoints(item.treatmentCost || 0))}</span>
            <span class="meta">${item.rescueInsured ? '응급구조 가입 중' : '응급구조 미가입'}</span>
            <button class="button inline small-button" type="button" data-mercenary-action="treat" data-mercenary-id="${escapeHtml(item.id)}">치료</button>
          </article>
        `).join('') : renderEmptyState({ title: '의무실이 조용합니다', description: '다친 용병이 생기면 여기에서 치료합니다.', compact: true })}
      </div>
    </section>
  `;
}

function mercenaryResultLabel(result) {
  return {
    great_success: '대성공',
    success: '성공',
    partial_success: '부분 성공',
    fail: '실패',
    disaster: '대참사'
  }[result] || result || '기록';
}

function renderMercenaryHistory(items = []) {
  return `
    <section class="mercenary-section">
      <div class="section-heading"><div><span class="badge">기록</span><h2>최근 전투 기록</h2></div></div>
      <div class="mercenary-list">
        ${items.length ? items.slice(0, 10).map((run) => {
          const injuryCount = Object.keys(run.injuryResult || {}).length;
          const deathCount = Object.keys(run.deathResult || {}).length;
          const rescueCount = Object.keys(run.rescueResult || {}).length;
          return `
            <article class="mercenary-row">
              <strong>${escapeHtml(run.mission?.title || run.missionCode)} · ${escapeHtml(mercenaryResultLabel(run.result))}</strong>
              <span class="meta">보상 ${escapeHtml(run.rewardLabel || formatPoints(run.rewardPoints || 0))} · XP ${escapeHtml(run.xpGained || 0)}</span>
              <span class="meta">부상 ${escapeHtml(injuryCount)} · 전사 ${escapeHtml(deathCount)} · 응급회수 ${escapeHtml(rescueCount)}</span>
            </article>
          `;
        }).join('') : renderEmptyState({ title: '전투 기록이 없습니다', description: '첫 임무를 완료하면 기록이 남습니다.', compact: true })}
      </div>
    </section>
  `;
}

function renderMercenaryData(data = {}) {
  const shell = document.querySelector('#mercenary-shell');
  if (!shell) return;
  const mercenaries = data.mercenaries || [];
  shell.innerHTML = `
    <div class="mercenary-shell">
      ${renderMercenaryOverview(data.summary || {}, data.account || {})}
      ${renderMercenaryCandidates(data.candidates || [])}
      ${renderMercenaryRoster(mercenaries)}
      ${renderMercenaryRescue(mercenaries)}
      ${renderMercenaryMissions(data.missions || [], mercenaries)}
      ${renderMercenaryRuns(data.runningRuns || [])}
      ${renderMercenaryHospital(mercenaries)}
      ${renderMercenaryHistory(data.history || [])}
    </div>
  `;
}

async function loadMercenaryPanel(options = {}) {
  const shell = document.querySelector('#mercenary-shell');
  if (!shell) return;
  if (!options.force && mercenaryCanUseCache()) {
    mercenaryDebug('cache hit');
    renderMercenaryData(mercenaryCache.data);
    return;
  }
  shell.innerHTML = renderLoadingState({ title: '용병단을 여는 중', description: '고용소와 임무 기록을 확인하고 있습니다.', rows: 3 });
  try {
    const data = await dashboardRequest('/api/mercenaries/overview');
    mercenaryCache = { cachedAt: Date.now(), data };
    renderMercenaryData(data);
  } catch (error) {
    shell.innerHTML = renderErrorState({
      title: '용병단 정보를 불러오지 못했습니다',
      description: '잠시 뒤 다시 시도해 주세요.',
      actionHtml: '<button class="button secondary inline state-retry-button small-button" type="button" data-mercenary-action="mercenary-retry">다시 시도</button>'
    });
  }
}

function renderMercenaryPanel(options = {}) {
  loadMercenaryPanel(options);
}

function selectedMercenaryIdsForMission(missionCode) {
  const escaped = window.CSS?.escape ? CSS.escape(missionCode) : String(missionCode).replace(/"/g, '\\"');
  return [...document.querySelectorAll(`[data-mercenary-pick][data-mission-code="${escaped}"]:checked`)]
    .map((input) => Number(input.value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function handleMercenaryAction(action, target) {
  const id = target.dataset.mercenaryId;
  const candidateId = target.dataset.candidateId;
  const runId = target.dataset.runId;
  const missionCode = target.dataset.missionCode;
  const previousDisabled = target.disabled;
  target.disabled = true;
  try {
    if (action === 'refresh' || action === 'mercenary-retry') {
      mercenaryCache = null;
      await loadMercenaryPanel({ force: true });
      return;
    }
    if (action === 'hire') {
      await dashboardRequest(`/api/mercenaries/candidates/${encodeURIComponent(candidateId)}/hire`, { method: 'POST' });
      mercenaryMessage('용병을 고용했습니다.');
    } else if (action === 'rescue-subscribe') {
      await dashboardRequest(`/api/mercenaries/${encodeURIComponent(id)}/rescue/subscribe`, { method: 'POST' });
      mercenaryMessage('응급구조 서비스에 가입했습니다.');
    } else if (action === 'rescue-cancel') {
      await dashboardRequest(`/api/mercenaries/${encodeURIComponent(id)}/rescue/cancel`, { method: 'POST' });
      mercenaryMessage('응급구조 서비스를 해지했습니다. 환불은 없습니다.');
    } else if (action === 'start-mission') {
      const mercenaryIds = selectedMercenaryIdsForMission(missionCode);
      if (!mercenaryIds.length) throw new Error('투입할 용병을 1명 이상 선택해 주세요.');
      await dashboardRequest(`/api/mercenaries/missions/${encodeURIComponent(missionCode)}/start`, {
        method: 'POST',
        body: JSON.stringify({ mercenaryIds })
      });
      mercenaryMessage('임무를 시작했습니다. 완료 시간이 지나면 결과를 수령하세요.');
    } else if (action === 'claim-run') {
      const data = await dashboardRequest(`/api/mercenaries/runs/${encodeURIComponent(runId)}/claim`, { method: 'POST' });
      mercenaryMessage(`임무 결과: ${mercenaryResultLabel(data.result)} · 보상 ${formatPoints(data.rewardPoints || 0)}`);
    } else if (action === 'treat') {
      await dashboardRequest(`/api/mercenaries/${encodeURIComponent(id)}/treat`, { method: 'POST' });
      mercenaryMessage('치료가 완료되었습니다.');
    }
    mercenaryCache = null;
    await loadMercenaryPanel({ force: true });
  } catch (error) {
    mercenaryMessage(error.message || '용병단 처리 중 오류가 발생했습니다.');
    if (action === 'mercenary-retry') await loadMercenaryPanel({ force: true });
  } finally {
    target.disabled = previousDisabled;
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-mercenary-action]');
  if (!target) return;
  event.preventDefault();
  handleMercenaryAction(target.dataset.mercenaryAction, target);
});

function updateTopTabActiveState() {
  document.querySelectorAll('[data-top-tab]').forEach((button) => {
    const isActive = button.dataset.topTab === activeTopTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function scrollMainViewToTop() {
  const root = document.querySelector('#main-view-root') || document.querySelector('main');
  root?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchMainView(tabKey = 'home', { scroll = true } = {}) {
  const validTabs = ['home', 'activity', 'community', 'casino', 'shop', 'mercenary', 'season', 'account'];
  const nextTab = validTabs.includes(tabKey) ? tabKey : 'home';
  activeTopTab = nextTab;
  dashboardPerf?.log(`main view switch ${nextTab}`);
  document.querySelectorAll('[data-main-view]').forEach((view) => {
    view.hidden = view.dataset.mainView !== nextTab;
  });
  updateTopTabActiveState();
  if (scroll) scrollMainViewToTop();
}

function renderMainNavigation(me, unreadCount = 0) {
  const nav = document.querySelector('#main-nav');
  if (!nav) return;
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount || '');
  nav.innerHTML = `
    <button type="button" class="nav-tab-button" data-top-tab="home" onclick="openHomeView()">홈</button>
    <button type="button" class="nav-tab-button" data-top-tab="activity" onclick="openActivityPanel()">활동</button>
    <button type="button" class="nav-tab-button" data-top-tab="community" onclick="openCommunityPanel()">커뮤니티</button>
    <button type="button" class="nav-tab-button" data-top-tab="casino" onclick="openCasinoPanel()">카지노</button>
    <button type="button" class="nav-tab-button" data-top-tab="shop" onclick="openShopPanel()">상점</button>
    <button type="button" class="nav-tab-button" data-top-tab="mercenary" onclick="openMercenaryPanel()">용병단</button>
    <button type="button" class="nav-tab-button" data-top-tab="season" onclick="openSeasonPanel()">시즌</button>
    <button type="button" class="nav-tab-button" data-top-tab="account" onclick="openAccountPanel()">내 정보</button>
  `;
  updateTopTabActiveState();
}

function openHomeView(options = {}) {
  switchMainView('home', options);
}

function openActivityPanel(options = {}) {
  dashboardPerf?.log('activity tab open');
  switchMainView('activity', options);
  if (shouldReloadActivityPanel()) loadActivityPanel();
}

function closeActivityPanel() {
  openHomeView();
}

function openCommunityPanel(tabKey = COMMUNITY_DEFAULT_TAB, options = {}) {
  dashboardPerf?.log('community tab open');
  switchMainView('community', options);
  renderCommunityShell();
  loadCommunityTab(tabKey);
}

function closeCommunityPanel() {
  openHomeView();
}

function openCasinoPanel(tabKey = CASINO_DEFAULT_TAB, options = {}) {
  dashboardPerf?.log('casino tab open');
  switchMainView('casino', options);
  renderCasinoShell();
  loadCasinoTab(tabKey);
}

function closeCasinoPanel() {
  openHomeView();
}

function openShopPanel(options = {}) {
  dashboardPerf?.log('shop tab open');
  switchMainView('shop', options);
  renderShopPanel();
}

function closeShopPanel() {
  openHomeView();
}

function openMercenaryPanel(options = {}) {
  dashboardPerf?.log('mercenary tab open');
  switchMainView('mercenary', options);
  renderMercenaryPanel();
}

function closeMercenaryPanel() {
  openHomeView();
}

function openSeasonPanel(tabKey = SEASON_DEFAULT_TAB, options = {}) {
  dashboardPerf?.log('season tab open');
  switchMainView('season', options);
  renderSeasonShell();
  loadSeasonTab(tabKey);
}

function closeSeasonPanel() {
  openHomeView();
}

function openAccountPanel(tabKey = ACCOUNT_DEFAULT_TAB, options = {}) {
  dashboardPerf?.log('account tab open');
  switchMainView('account', options);
  renderAccountShell();
  loadAccountTab(tabKey);
}

function closeAccountPanel() {
  openHomeView();
}

function getMainViewFromHash() {
  const key = String(window.location.hash || '').replace(/^#/, '').trim();
  return ['home', 'activity', 'community', 'casino', 'shop', 'mercenary', 'season', 'account'].includes(key) ? key : '';
}

function openMainViewFromHash(options = {}) {
  const key = getMainViewFromHash();
  if (!key) return false;

  if (key === 'home') {
    openHomeView(options);
    return true;
  }
  if (key === 'activity') {
    openActivityPanel(options);
    return true;
  }
  if (key === 'community') {
    openCommunityPanel(COMMUNITY_DEFAULT_TAB, options);
    return true;
  }
  if (key === 'casino') {
    openCasinoPanel(CASINO_DEFAULT_TAB, options);
    return true;
  }
  if (key === 'shop') {
    openShopPanel(options);
    return true;
  }
  if (key === 'mercenary') {
    openMercenaryPanel(options);
    return true;
  }
  if (key === 'season') {
    openSeasonPanel(SEASON_DEFAULT_TAB, options);
    return true;
  }
  if (key === 'account') {
    openAccountPanel(ACCOUNT_DEFAULT_TAB, options);
    return true;
  }
  return false;
}

window.addEventListener('hashchange', () => {
  openMainViewFromHash({ scroll: true });
});

function showPwaUpdateBanner() {
  if (document.querySelector('#pwa-update-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'pwa-update-banner';
  banner.id = 'pwa-update-banner';
  banner.innerHTML = `
    <div class="pwa-update-copy">
      <strong>새 버전이 준비되었습니다.</strong>
      <span>새로고침하면 최신 화면으로 바뀝니다.</span>
    </div>
    <div class="pwa-update-actions">
      <button class="button inline small-button" type="button" onclick="applyPwaUpdate()">새로고침</button>
      <button class="button secondary inline small-button" type="button" onclick="dismissPwaUpdate()">나중에</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function dismissPwaUpdate() {
  document.querySelector('#pwa-update-banner')?.remove();
}

function applyPwaUpdate() {
  if (pwaWaitingRegistration?.waiting) {
    pwaUpdateReloading = true;
    pwaWaitingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return;
  }
  window.location.reload();
}

function watchPwaUpdate(registration) {
  if (!registration) return;
  if (registration.waiting && navigator.serviceWorker.controller) {
    pwaWaitingRegistration = registration;
    showPwaUpdateBanner();
  }

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    logPwa('service worker update found');
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        pwaWaitingRegistration = registration;
        showPwaUpdateBanner();
      }
    });
  });
}

function registerPwa() {
  if (!('serviceWorker' in navigator)) {
    logPwa('service worker not supported');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logPwa('service worker registered', registration.scope);
        watchPwaUpdate(registration);
      })
      .catch((error) => {
        logPwa('service worker registration failed', error?.message || error);
      });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!pwaUpdateReloading) return;
    window.location.reload();
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPwaPrompt = event;
  logPwa('beforeinstallprompt ready');
  refreshPwaInstallCard();
  schedulePwaInstallToast();
});

window.addEventListener('appinstalled', () => {
  deferredPwaPrompt = null;
  logPwa('app installed');
  markPwaInstalled();
  refreshPwaInstallCard();
});

registerPwa();
window.addEventListener('load', schedulePwaInstallToast);
loadDashboard();
