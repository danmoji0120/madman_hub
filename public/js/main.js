const escapeHtml = API.escape;

function renderHeroActions(me) {
  const actions = document.querySelector('#hero-actions');
  const navAuth = document.querySelector('#nav-auth');

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

function renderMyStatus(me) {
  const card = document.querySelector('#my-status-card');

  if (!me) {
    card.innerHTML = `
      <h2>내 상태</h2>
      <p>로그인하면 포인트와 출석 보상을 받을 수 있습니다.</p>
      <div class="hero-actions">
        <a class="button inline" href="/login.html">로그인</a>
        <a class="button secondary inline" href="/register.html">회원가입</a>
      </div>
    `;
    return;
  }

  card.innerHTML = `
    <h2>내 상태</h2>
    <span class="badge">${escapeHtml(me.title || '수상한 거주민')}</span>
    <h3>${escapeHtml(me.nickname || me.display_name)}</h3>
    <div class="stat-row">
      <span>보유 포인트</span>
      <strong class="point">${me.points.balance}P</strong>
    </div>
    <p class="meta">${me.checkedInToday ? '오늘 출석 완료' : '오늘 출석 보상을 받을 수 있습니다.'}</p>
    <button class="button" onclick="checkIn()" ${me.checkedInToday ? 'disabled' : ''}>
      ${me.checkedInToday ? '오늘 출석 완료' : '출석하고 10P 받기'}
    </button>
  `;
}

function renderMadman(member) {
  const card = document.querySelector('#today-card');

  if (!member) {
    card.innerHTML = '<h2>오늘의 미친놈</h2><p class="empty-state">아직 등록된 거주민이 없습니다.</p>';
    return;
  }

  card.innerHTML = `
    <h2>오늘의 미친놈</h2>
    <p class="point">${escapeHtml(member.nickname || member.display_name)}</p>
    <p>${escapeHtml(member.title || '수상한 거주민')}</p>
    <p class="meta">위험도: ${'★'.repeat(member.danger_level || 1)}</p>
  `;
}

function renderRandomPost(post) {
  const card = document.querySelector('#random-post-card');

  if (!post) {
    card.innerHTML = '<h2>랜덤 게시글</h2><p class="empty-state">아직 게시글이 없습니다.</p>';
    return;
  }

  card.innerHTML = `
    <h2>랜덤 게시글</h2>
    <span class="badge">${escapeHtml(post.target_name || '대상 없음')}</span>
    <h3>${escapeHtml(post.title)}</h3>
    <p class="quote-preview">${escapeHtml(post.body)}</p>
  `;
}

function renderRecentGuestbook(entries) {
  const root = document.querySelector('#recent-guestbook-list');

  root.innerHTML = entries.map((entry) => `
    <div class="guestbook-preview">
      <strong>${escapeHtml(entry.nickname || entry.author_name || '익명의 수상한 자')}</strong>
      <p>${escapeHtml(entry.body)}</p>
      <span class="meta">${escapeHtml(entry.created_at)}</span>
    </div>
  `).join('') || '<p class="empty-state">아직 방명록이 비어 있습니다.</p>';
}

function renderRecentPosts(posts) {
  const root = document.querySelector('#recent-posts-list');

  root.innerHTML = posts.map((post) => `
    <div class="quote-preview">
      <span class="badge">${escapeHtml(post.target_name || '대상 없음')}</span>
      <strong>${escapeHtml(post.title)}</strong>
      <p>${escapeHtml(post.body)}</p>
    </div>
  `).join('') || '<p class="empty-state">아직 게시글이 없습니다.</p>';
}

function feedText(item) {
  const name = escapeHtml(item.nickname || item.displayName || '누군가');
  const metadata = item.metadata || {};
  const messages = {
    user_registered: `${name} 님이 격리소에 입장했습니다.`,
    daily_checkin: `${name} 님이 출석하고 ${escapeHtml(metadata.rewardAmount || 10)}P를 받았습니다.`,
    guestbook_posted: `${name} 님이 방명록을 남겼습니다.`,
    post_created: `${name} 님이 게시글을 작성했습니다.`,
    title_purchased: `${name} 님이 [${escapeHtml(metadata.titleName || '')}] 칭호를 구매했습니다.`,
    title_equipped: `${name} 님이 [${escapeHtml(metadata.titleName || '')}] 칭호를 장착했습니다.`,
    achievement_unlocked: `${name} 님이 업적 [${escapeHtml(metadata.achievementName || '')}]을 달성했습니다.`
    ,
    game_big_win: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 ${escapeHtml(metadata.payoutAmount || 0)}P를 획득했습니다.`,
    game_jackpot: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 잭팟 ${escapeHtml(metadata.payoutAmount || 0)}P를 터뜨렸습니다.`,
    game_big_loss: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 ${escapeHtml(metadata.betAmount || 0)}P를 잃었습니다.`,
    game_cashout: `${name} 님이 크래시 ${escapeHtml(metadata.multiplier || 0)}x에서 탈출했습니다.`,
    game_bust: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 터졌습니다.`
  };
  return messages[item.action] || `${name} 님의 새 활동이 기록되었습니다.`;
}

function renderFeed(items) {
  document.querySelector('#recent-feed-list').innerHTML = items.map((item) => `
    <div class="feed-item"><span class="timeline-dot"></span><div>${feedText(item)}<br /><span class="meta">${escapeHtml(item.createdAt)}</span></div></div>
  `).join('') || '<p class="empty-state">아직 활동 기록이 없습니다.</p>';
}

function renderAchievements(items) {
  document.querySelector('#recent-achievements-list').innerHTML = items.map((item) => `
    <article class="achievement-card unlocked">
      <span class="reward-badge">업적</span>
      <strong>${escapeHtml(item.name)}</strong>
      <p class="meta">${escapeHtml(item.nickname || item.display_name)} 님이 달성</p>
    </article>
  `).join('') || '<p class="empty-state">아직 달성된 업적이 없습니다.</p>';
}

function renderCasinoResults(items) {
  document.querySelector('#recent-casino-list').innerHTML = items.map((item) => `
    <div class="casino-history-item">
      <strong>${escapeHtml(item.nickname || item.display_name || '익명 거주민')} · ${escapeHtml(item.gameCode)}</strong>
      <span>${escapeHtml(item.result)} · ${escapeHtml(item.netAmount)}P</span>
    </div>
  `).join('') || '<p class="empty-state">아직 카지노 기록이 없습니다.</p>';
}

function renderLeaderboard(leaderboard) {
  const root = document.querySelector('#leaderboard-list');

  root.innerHTML = leaderboard.map((member, index) => `
    <div class="rank-item">
      <strong>${index + 1}. ${escapeHtml(member.nickname || member.display_name)}</strong>
      <span>${member.balance}P</span>
    </div>
  `).join('') || '<p class="empty-state">아직 랭킹이 비어 있습니다.</p>';
}

async function loadDashboard() {
  const message = document.querySelector('#dashboard-message');

  try {
    const data = await API.request('/api/dashboard');
    renderHeroActions(data.me);
    renderMyStatus(data.me);
    renderMadman(data.madmanOfTheDay);
    renderRandomPost(data.randomPost || data.randomQuote);
    renderRecentGuestbook(data.recentGuestbook);
    renderRecentPosts(data.recentPosts || data.recentQuotes);
    renderLeaderboard(data.leaderboard);
    renderFeed(data.recentFeed);
    renderAchievements(data.recentAchievements);
    renderCasinoResults(data.recentCasinoResults || []);
  } catch (error) {
    console.error('대시보드 로딩 실패', error);
    message.textContent = '대시보드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}

async function checkIn() {
  const message = document.querySelector('#dashboard-message');

  try {
    const data = await API.request('/api/checkin', { method: 'POST' });
    message.textContent = data.alreadyCheckedIn ? data.message : `출석 완료! ${data.rewardAmount}P를 받았습니다.`;
    await loadDashboard();
  } catch (error) {
    console.error('출석 처리 실패', error);
    message.textContent = error.message;
  }
}

loadDashboard();
