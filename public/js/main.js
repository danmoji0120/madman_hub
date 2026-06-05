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
  { key: 'achievements', label: '업적' }
];
const MORE_CACHE_TTL_MS = 50 * 1000;
const MORE_DEFAULT_TAB = 'notifications';
const MORE_TABS = [
  { key: 'notifications', label: '알림' },
  { key: 'settings', label: '설정' },
  { key: 'admin', label: '관리자', adminOnly: true },
  { key: 'logout', label: '로그아웃', authOnly: true }
];
const communityCache = new Map();
const seasonCache = new Map();
const casinoCache = new Map();
const accountCache = new Map();
const moreCache = new Map();
let communityShellRendered = false;
let activeCommunityTab = COMMUNITY_DEFAULT_TAB;
let seasonShellRendered = false;
let activeSeasonTab = SEASON_DEFAULT_TAB;
let activeSeasonRankingCategory = 'activity_score';
let casinoShellRendered = false;
let activeCasinoTab = CASINO_DEFAULT_TAB;
let accountShellRendered = false;
let activeAccountTab = ACCOUNT_DEFAULT_TAB;
let moreShellRendered = false;
let activeMoreTab = MORE_DEFAULT_TAB;
let latestDashboardSummary = null;
let activeTopTab = 'home';
let deferredPwaPrompt = null;
let pwaWaitingRegistration = null;
let pwaUpdateReloading = false;

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
    <a href="/">홈</a>
    <button type="button" class="nav-tab-button" onclick="openCommunityPanel()">커뮤니티</button>
    <button type="button" class="nav-tab-button" onclick="openCasinoPanel()">카지노</button>
    <button type="button" class="nav-tab-button" onclick="openSeasonPanel()">시즌</button>
    <button type="button" class="nav-tab-button" onclick="openAccountPanel()">내 정보</button>
    <button type="button" class="nav-tab-button" onclick="openMorePanel()">더보기${unreadCount > 0 ? ` ${unreadLabel}` : ''}</button>
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
  closeCommunityPanel();
  closeCasinoPanel();
  closeSeasonPanel();
  closeAccountPanel();
  closeMorePanel();
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
      ${attendance.checkedToday ? '오늘 출석 완료' : `출석하고 ${formatPoints(attendance.todayReward || 10)} 받기`}
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
      <h2>오늘 할 일</h2>
      <span class="badge">${completedCount}/${totalCount}</span>
    </div>
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
    return;
  }

  const promptEvent = deferredPwaPrompt;
  deferredPwaPrompt = null;
  try {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    logPwa(`install prompt ${choice?.outcome || 'closed'}`);
  } catch (error) {
    logPwa('install prompt failed', error?.message || error);
  } finally {
    refreshPwaInstallCard();
  }
}

function accountTabLabel(tabKey) {
  return ACCOUNT_TABS.find((tab) => tab.key === tabKey)?.label || tabKey;
}

function renderAccountShell() {
  const root = document.querySelector('#account-shell');
  if (!root || accountShellRendered) return;

  root.innerHTML = `
    <div class="community-tabs account-tabs" role="tablist" aria-label="내 정보 세부탭">
      ${ACCOUNT_TABS.map((tab) => `
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

function renderAccountTabData(tabKey) {
  if (tabKey === 'profile') renderAccountProfile();
  if (tabKey === 'titles') renderAccountTitles();
  if (tabKey === 'cosmetics') renderAccountCosmetics();
  if (tabKey === 'shop') renderAccountShop();
  if (tabKey === 'achievements') renderAccountAchievements();
}

async function fetchAccountTabData(tabKey) {
  return { static: true, tabKey };
}

async function loadAccountTab(tabKey = ACCOUNT_DEFAULT_TAB, options = {}) {
  renderAccountShell();
  const nextTabKey = ACCOUNT_TABS.some((tab) => tab.key === tabKey) ? tabKey : ACCOUNT_DEFAULT_TAB;
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

function getVisibleMoreTabs() {
  const me = latestDashboardSummary?.me;
  return MORE_TABS.filter((tab) => {
    if (tab.adminOnly) return isAdminUser(me);
    if (tab.authOnly) return Boolean(me?.id);
    return true;
  });
}

function moreTabLabel(tabKey) {
  return MORE_TABS.find((tab) => tab.key === tabKey)?.label || tabKey;
}

function renderMoreShell() {
  const root = document.querySelector('#more-shell');
  if (!root) return;
  const visibleTabs = getVisibleMoreTabs();
  root.innerHTML = `
    <div class="community-tabs more-tabs" role="tablist" aria-label="더보기 항목">
      ${visibleTabs.map((tab) => `
        <button
          type="button"
          class="community-tab-button more-tab-button"
          data-more-tab="${escapeHtml(tab.key)}"
          onclick="loadMoreTab('${escapeHtml(tab.key)}')"
        >
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
    <div class="more-tab-panel" id="more-tab-panel"></div>
  `;
  moreShellRendered = true;
}

function setMoreActiveTab(tabKey) {
  activeMoreTab = tabKey;
  document.querySelectorAll('[data-more-tab]').forEach((button) => {
    const isActive = button.dataset.moreTab === tabKey;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function setMorePanelContent(html) {
  const panel = document.querySelector('#more-tab-panel');
  if (panel) panel.innerHTML = html;
}

function renderMoreLoading(tabKey) {
  setMorePanelContent(renderLoadingState({
    title: `${moreTabLabel(tabKey)}을 여는 중`,
    description: '더보기 항목은 열 때만 준비합니다.',
    rows: 2
  }));
}

function renderMoreNotifications(data = {}) {
  const items = Array.isArray(data.items) ? data.items.slice(0, 10) : [];
  if (!latestDashboardSummary?.me?.id) {
    setMorePanelContent(renderCommunityEmpty(
      '로그인이 필요합니다',
      '알림 센터는 로그인 후 확인할 수 있습니다.',
      '<a class="button inline small-button" href="/login.html">로그인</a>'
    ));
    return;
  }
  setMorePanelContent(`
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

function renderMoreSettings() {
  setMorePanelContent(renderShortcutCards([
    { badge: 'SETTINGS', title: '프로필 설정', body: '현재 설정은 프로필 편집 화면에서 관리합니다.', href: '/profile.html#profile-editor' },
    { badge: 'SOON', title: '추가 설정 준비 중', body: '푸시 알림과 세부 앱 설정은 후속 작업에서 확장합니다.', href: '/profile.html#profile-editor' }
  ]));
  const panel = document.querySelector('#more-tab-panel');
  if (panel) {
    panel.insertAdjacentHTML('beforeend', `
      <div class="shortcut-card-grid pwa-install-grid">
        ${renderPwaInstallCard()}
      </div>
    `);
  }
}

function renderMoreAdmin() {
  const me = latestDashboardSummary?.me;
  if (!isAdminUser(me)) {
    setMorePanelContent(renderCommunityEmpty('접근할 수 없습니다', '관리자 메뉴는 관리자와 owner에게만 표시됩니다.'));
    return;
  }
  setMorePanelContent(renderShortcutCards([
    { badge: 'ADMIN', title: '관리자 페이지', body: '관리자 통계와 운영 도구는 기존 관리자 화면에서 확인합니다.', href: '/admin.html' }
  ]));
}

function renderMoreLogout() {
  setMorePanelContent(`
    <div class="community-empty">
      <strong>로그아웃</strong>
      <p class="meta">현재 세션을 종료합니다. 기존 인증 로직을 그대로 사용합니다.</p>
      <button class="button inline small-button" type="button" onclick="API.logout()">로그아웃</button>
    </div>
  `);
}

function renderMoreTabData(tabKey, data = {}) {
  if (tabKey === 'notifications') renderMoreNotifications(data);
  if (tabKey === 'settings') renderMoreSettings();
  if (tabKey === 'admin') renderMoreAdmin();
  if (tabKey === 'logout') renderMoreLogout();
}

async function fetchMoreTabData(tabKey) {
  if (tabKey === 'notifications' && latestDashboardSummary?.me?.id) {
    return dashboardRequest('/api/notifications?limit=10');
  }
  return { static: true, tabKey };
}

async function loadMoreTab(tabKey = MORE_DEFAULT_TAB, options = {}) {
  if (!moreShellRendered) renderMoreShell();
  const visibleTabs = getVisibleMoreTabs();
  const nextTabKey = visibleTabs.some((tab) => tab.key === tabKey) ? tabKey : MORE_DEFAULT_TAB;
  setMoreActiveTab(nextTabKey);

  const cached = options.force ? null : getTimedCachedData(moreCache, 'more', nextTabKey, MORE_CACHE_TTL_MS);
  if (cached) {
    dashboardPerf?.log(`more ${nextTabKey} cache hit`);
    renderMoreTabData(nextTabKey, cached);
    return;
  }

  renderMoreLoading(nextTabKey);
  const startedAt = window.HubPerfLogger?.now?.() ?? Date.now();
  try {
    const data = await fetchMoreTabData(nextTabKey);
    setTimedCachedData(moreCache, 'more', nextTabKey, data);
    renderMoreTabData(nextTabKey, data);
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(nextTabKey === 'notifications' && latestDashboardSummary?.me?.id
      ? `more notifications load ${duration}ms`
      : `more ${nextTabKey} render`);
  } catch (error) {
    const duration = Math.round((window.HubPerfLogger?.now?.() ?? Date.now()) - startedAt);
    dashboardPerf?.log(`more ${nextTabKey} load failed ${error?.status || error?.message || ''} ${duration}ms`.trim());
    setMorePanelContent(renderErrorState({
      title: `${moreTabLabel(nextTabKey)}을 열지 못했습니다`,
      description: '잠시 후 다시 시도해 주세요.',
      retryOnClick: `loadMoreTab('${escapeHtml(nextTabKey)}', { force: true })`
    }));
  }
}

function openMorePanel(tabKey = MORE_DEFAULT_TAB) {
  const panel = document.querySelector('#more-panel');
  if (!panel) return;
  dashboardPerf?.log('more tab open');
  panel.hidden = false;
  renderMoreShell();
  loadMoreTab(tabKey);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeMorePanel() {
  const panel = document.querySelector('#more-panel');
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
  closeCommunityPanel();
  closeCasinoPanel();
  closeSeasonPanel();
  closeAccountPanel();
  closeMorePanel();
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
      ${attendance.checkedToday ? '오늘도 격리 완료' : `출석하고 ${formatPoints(attendance.todayReward || 10)} 받기`}
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
      <div class="home-mini-card">
        <strong>의뢰소</strong>
        <p class="meta">포인트 벌이를 위한 합법적인 척하는 일거리.</p>
        <span class="badge">준비 중</span>
      </div>
      <div class="home-mini-card">
        <strong>용병단</strong>
        <p class="meta">고용하고, 굴리고, 다치면 치료비를 뜯기는 예정.</p>
        <span class="badge">문 잠김</span>
      </div>
    </div>
  `;
}

function renderHomeFromSummary(summary = {}) {
  latestDashboardSummary = summary;
  renderHomeHero(summary);
  renderMainNavigation(summary.me, summary.notifications?.unreadCount || 0);
  setHomeLoading(false);
  renderHomeProfile(summary);
  renderHomeDailyMissions(summary.dailyMissions);
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
  const validTabs = ['home', 'community', 'casino', 'season', 'account', 'more'];
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
    <button type="button" class="nav-tab-button" data-top-tab="community" onclick="openCommunityPanel()">커뮤니티</button>
    <button type="button" class="nav-tab-button" data-top-tab="casino" onclick="openCasinoPanel()">카지노</button>
    <button type="button" class="nav-tab-button" data-top-tab="season" onclick="openSeasonPanel()">시즌</button>
    <button type="button" class="nav-tab-button" data-top-tab="account" onclick="openAccountPanel()">내 정보</button>
    <button type="button" class="nav-tab-button" data-top-tab="more" onclick="openMorePanel()">더보기${unreadCount > 0 ? ` ${unreadLabel}` : ''}</button>
  `;
  updateTopTabActiveState();
}

function openHomeView(options = {}) {
  switchMainView('home', options);
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

function openMorePanel(tabKey = MORE_DEFAULT_TAB, options = {}) {
  dashboardPerf?.log('more tab open');
  switchMainView('more', options);
  renderMoreShell();
  loadMoreTab(tabKey);
}

function closeMorePanel() {
  openHomeView();
}

function getMainViewFromHash() {
  const key = String(window.location.hash || '').replace(/^#/, '').trim();
  return ['home', 'community', 'casino', 'season', 'account', 'more'].includes(key) ? key : '';
}

function openMainViewFromHash(options = {}) {
  const key = getMainViewFromHash();
  if (!key) return false;

  if (key === 'home') {
    openHomeView(options);
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
  if (key === 'season') {
    openSeasonPanel(SEASON_DEFAULT_TAB, options);
    return true;
  }
  if (key === 'account') {
    openAccountPanel(ACCOUNT_DEFAULT_TAB, options);
    return true;
  }
  if (key === 'more') {
    openMorePanel(MORE_DEFAULT_TAB, options);
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
});

window.addEventListener('appinstalled', () => {
  deferredPwaPrompt = null;
  logPwa('app installed');
  refreshPwaInstallCard();
});

registerPwa();
loadDashboard();
