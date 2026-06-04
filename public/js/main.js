const escapeHtml = API.escape;
const dashboardPerf = window.HubPerfLogger?.createScope?.('dashboard');

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

function truncateText(value, maxLength = 92) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
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
  const communityLinks = [
    { label: '최신글', href: '/posts.html' },
    { label: '인기글', href: '/posts.html?sort=popular' },
    { label: '댓글', href: '/posts.html#comments' },
    { label: '노래추천', href: '/songs.html' },
    { label: '랜덤글', href: '/posts.html#random-post-result' }
  ];
  const myLinks = [
    { label: '프로필', href: '/profile.html' },
    { label: '칭호', href: '/profile.html#owned-titles' },
    { label: '꾸미기', href: '/cosmetics.html' },
    { label: '상점', href: '/shop.html' },
    { label: '업적', href: '/profile.html#profile-achievements' }
  ];
  const moreLinks = [
    { label: `알림${unreadCount > 0 ? ` ${unreadLabel}` : ''}`, href: '/notifications.html' },
    { label: '설정', href: '/profile.html#profile-editor' }
  ];
  if (isAdminUser(me)) {
    moreLinks.push({ label: '관리자', href: '/admin.html' });
  }
  if (me) {
    moreLinks.push({ label: '로그아웃', action: 'logout' });
  }

  nav.innerHTML = `
    <a href="/">홈</a>
    ${renderNavGroup('커뮤니티', communityLinks)}
    <a href="/casino.html">카지노</a>
    <a href="/seasons.html">시즌</a>
    ${renderNavGroup('내 정보', myLinks)}
    ${renderNavGroup('더보기', moreLinks)}
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
      <h2>홈 요약을 불러오는 중</h2>
      <p class="meta">필요한 카드만 먼저 가져오고 있습니다.</p>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
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
    card.innerHTML = `
      <h2>홈 요약 로딩 실패</h2>
      <p class="meta">${escapeHtml(error?.message || '요약 API 응답을 받을 수 없습니다.')}</p>
      <button class="button secondary inline" type="button" onclick="loadDashboard()">다시 시도</button>
    `;
  }
}

function renderGuestHome() {
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
          <span class="badge">${escapeHtml(notificationLabel(item.type))}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p class="meta">${escapeHtml(truncateText(item.body || item.message, 100))}</p>
          <span class="meta">${escapeHtml(item.createdAt || item.created_at || '')}</span>
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
      <span class="meta">${escapeHtml(post.createdAt || post.created_at || '')}</span>
    </a>
  `).join('') || `<p class="empty-state">${escapeHtml(options.emptyText || '표시할 글이 없습니다.')}</p>`;
}

function renderHomePosts(community = {}) {
  renderPostPreviewList('#recent-posts-list', community.recentPosts, {
    emptyText: '아직 최근 글이 없습니다.'
  });
  renderPostPreviewList('#popular-posts-list', community.popularPosts, {
    emptyText: '아직 인기글이 없습니다.',
    showScore: true
  });
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
    <p class="meta">${escapeHtml(currentSeason.startsAt || '')} ~ ${escapeHtml(currentSeason.endsAt || '')}</p>
    <div class="season-title-summary-list">
      ${titleSummary.map((item) => {
        const leader = item.leader;
        const score = leader?.formattedScore || (leader ? formatRankingScore(item.category, leader.score) : '');
        return `
          <div class="season-title-summary-item">
            <div>
              <span class="badge">${escapeHtml(item.categoryLabel || item.category)}</span>
              ${renderTitleBadge(item.title, { compact: true })}
            </div>
            ${leader
              ? `<strong>${escapeHtml(leader.nickname || '이름 없는 거주민')}</strong><span class="meta">${escapeHtml(score)} ${leader.extraLabel ? `· ${escapeHtml(leader.extraLabel)}` : ''}</span>`
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

function renderHomeFromSummary(summary = {}) {
  renderHeroActions(summary.me);
  renderMainNavigation(summary.me, summary.notifications?.unreadCount || 0);
  setHomeLoading(false);
  renderHomeProfile(summary);
  renderHomeDailyMissions(summary.dailyMissions);
  renderHomeNotifications(summary.notifications);
  renderHomePosts(summary.community);
  renderHomeSeason(summary.season);
  renderMySeasonTitles(summary.season);
}

async function loadDashboard() {
  const message = document.querySelector('#dashboard-message');
  const dashboardStartedAt = window.HubPerfLogger?.now?.() ?? Date.now();
  dashboardPerf?.resetApis();
  dashboardPerf?.log('init start');
  if (message) message.textContent = '';

  if (!API.token) {
    renderGuestHome();
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

loadDashboard();
