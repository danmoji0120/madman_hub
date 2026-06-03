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

  card.className = `card ${me.cosmetics?.profileFrameClass || ''} ${me.cosmetics?.profileBackgroundClass || ''}`;
  card.innerHTML = `
    <h2>내 상태</h2>
    ${renderTitleBadge(me)}
    <h3 class="${escapeHtml(me.cosmetics?.nicknameColorClass || '')}">${escapeHtml(me.nickname || me.display_name)}</h3>
    <a class="meta" href="/cosmetics.html">꾸미기 상점 보기</a>
    <div class="stat-row">
      <span>보유 포인트</span>
      <strong class="point">${formatPoints(me.points.balance)}</strong>
    </div>
    <p class="meta">${me.checkedInToday ? '오늘 출석 완료' : '오늘 출석 보상을 받을 수 있습니다.'}</p>
    <button class="button" onclick="checkIn()" ${me.checkedInToday ? 'disabled' : ''}>
      ${me.checkedInToday ? '오늘 출석 완료' : `출석하고 ${formatPoints(10)} 받기`}
    </button>
  `;
}

function renderMadman(member) {
  const card = document.querySelector('#today-card');

  if (!member) {
    card.innerHTML = '<h2>오늘의 미친놈</h2><p class="empty-state">아직 등록된 거주민이 없습니다.</p>';
    return;
  }

  card.className = `card ${member.cosmetics?.profileFrameClass || ''} ${member.cosmetics?.profileBackgroundClass || ''}`;
  card.innerHTML = `
    <h2>오늘의 미친놈</h2>
    <p class="point ${escapeHtml(member.cosmetics?.nicknameColorClass || '')}">${escapeHtml(member.nickname || member.display_name)}</p>
    <p>${renderTitleBadge(member)}</p>
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
    <a class="meta" href="/post.html?id=${post.id}">상세 보기</a>
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

function renderDailyMissions(data) {
  const card = document.querySelector('#daily-missions-card');
  if (!API.token) return;
  card.innerHTML = `
    <div class="section-heading"><h2>오늘의 관찰 과제</h2><span class="badge">${data.completedCount}/${data.totalCount}</span></div>
    <div class="mission-list">${data.missions.slice(0, 5).map((mission) => `
      <div class="mission-item">
        <div><strong>${escapeHtml(mission.title)}</strong><br /><span class="meta">${mission.progress}/${mission.target} · ${formatPoints(mission.rewardPoints)}</span></div>
        ${mission.completed && !mission.claimed ? `<button class="button secondary inline small-button" onclick="claimMission('${mission.code}')">보상 받기</button>` : `<span class="meta">${mission.claimed ? '수령 완료' : '진행 중'}</span>`}
      </div>
    `).join('')}</div>
    <div class="mission-list">${data.bonuses.map((bonus) => `
      <div class="mission-item">
        <div><strong>${escapeHtml(bonus.title)}</strong><br /><span class="meta">보너스 ${formatPoints(bonus.rewardPoints)}</span></div>
        ${bonus.claimable && !bonus.claimed ? `<button class="button secondary inline small-button" onclick="claimMissionBonus('${bonus.code}')">보너스 받기</button>` : `<span class="meta">${bonus.claimed ? '수령 완료' : '조건 미달'}</span>`}
      </div>
    `).join('')}</div>
  `;
}

async function loadDailyMissions() {
  if (!API.token) return;
  renderDailyMissions(await API.request('/api/missions/daily'));
}

async function claimMission(code) {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await API.request(`/api/missions/daily/${code}/claim`, { method: 'POST' });
    message.textContent = `미션 보상 ${formatPoints(data.rewardPoints)}를 받았습니다.`;
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function claimMissionBonus(code) {
  const message = document.querySelector('#dashboard-message');
  try {
    const data = await API.request(`/api/missions/daily/bonus/${code}/claim`, { method: 'POST' });
    message.textContent = `미션 보너스 ${formatPoints(data.rewardPoints)}를 받았습니다.`;
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
}

function renderRecentPosts(posts) {
  const root = document.querySelector('#recent-posts-list');

  root.innerHTML = posts.map((post) => `
    <a class="quote-preview" href="/post.html?id=${post.id}">
      <span class="badge">${escapeHtml(post.target_name || '대상 없음')}</span>
      <strong>${escapeHtml(post.title)}</strong>
      <p>${escapeHtml(post.body)}</p>
    </a>
  `).join('') || '<p class="empty-state">아직 게시글이 없습니다.</p>';
}

function feedText(item) {
  const name = escapeHtml(item.nickname || item.displayName || '누군가');
  const metadata = item.metadata || {};
  const messages = {
    user_registered: `${name} 님이 격리소에 입장했습니다.`,
    daily_checkin: `${name} 님이 출석하고 ${escapeHtml(formatPoints(metadata.rewardAmount || 10))}를 받았습니다.`,
    guestbook_posted: `${name} 님이 방명록을 남겼습니다.`,
    post_created: `${name} 님이 게시글을 작성했습니다.`,
    comment_created: `${metadata.isAnonymous ? '익명의 누군가' : name} 님이 게시글에 댓글을 남겼습니다.`,
    title_purchased: `${name} 님이 ${renderTitleBadge({ name: metadata.titleName || '', rarity: metadata.titleRarity || metadata.rarity, cssClass: metadata.titleCssClass }, { compact: true })} 칭호를 구매했습니다.`,
    title_equipped: `${name} 님이 ${renderTitleBadge({ name: metadata.titleName || '', rarity: metadata.titleRarity || metadata.rarity, cssClass: metadata.titleCssClass }, { compact: true })} 칭호를 장착했습니다.`,
    admin_title_granted: `${name} 님이 ${renderTitleBadge({ name: metadata.titleName || '', rarity: metadata.titleRarity || metadata.rarity, cssClass: metadata.titleCssClass }, { compact: true })} 칭호를 지급했습니다.`,
    season_reward_title_granted: `${name} 님이 시즌 보상 ${renderTitleBadge({ name: metadata.titleName || '', rarity: metadata.titleRarity || metadata.rarity, cssClass: metadata.titleCssClass }, { compact: true })} 칭호를 받았습니다.`,
    achievement_unlocked: `${name} 님이 업적 [${escapeHtml(metadata.achievementName || '')}]을 달성했습니다.`,
    song_recommended: `${metadata.isAnonymous ? '익명의 누군가' : name} 님이 노래를 추천했습니다.`,
    daily_missions_completed_all: `${name} 님이 오늘의 관찰 과제를 모두 완료했습니다.`
    ,
    game_big_win: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 ${escapeHtml(formatPoints(metadata.payoutAmount || 0))}를 획득했습니다.`,
    game_jackpot: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 잭팟 ${escapeHtml(formatPoints(metadata.payoutAmount || 0))}를 터뜨렸습니다.`,
    game_big_loss: `${name} 님이 ${escapeHtml(metadata.gameName || '카지노')}에서 ${escapeHtml(formatPoints(metadata.betAmount || 0))}를 잃었습니다.`,
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
      <span>${escapeHtml(item.result)} · ${escapeHtml(formatPoints(item.netAmount))}</span>
    </div>
  `).join('') || '<p class="empty-state">아직 카지노 기록이 없습니다.</p>';
}

function renderCasinoEvents(items) {
  const root = document.querySelector('#recent-casino-events-list');
  if (!root) return;
  root.innerHTML = (items || []).map((item) => `
    <div class="feed-item"><span class="timeline-dot"></span><div>${escapeHtml(item.message || '')}<br /><span class="meta">${escapeHtml(item.createdAt || '')}</span></div></div>
  `).join('') || '<p class="empty-state">아직 박제된 카지노 사건이 없습니다.</p>';
}

function renderLeaderboard(leaderboard) {
  const root = document.querySelector('#leaderboard-list');

  root.innerHTML = leaderboard.map((member, index) => `
    <div class="rank-item">
      <strong class="${escapeHtml(member.cosmetics?.nicknameColorClass || '')}">${index + 1}. ${escapeHtml(member.nickname || member.display_name)}</strong>
      <span>${formatPoints(member.balance)}</span>
    </div>
  `).join('') || '<p class="empty-state">아직 랭킹이 비어 있습니다.</p>';
}

function renderSeasonSummary(summary) {
  const card = document.querySelector('#season-summary-card');
  if (!summary?.season) {
    card.innerHTML = '<h2>현재 시즌 랭킹</h2><p class="empty-state">진행 중인 시즌이 없습니다.</p>';
    return;
  }
  const earned = summary.rankings.pointEarned || [];
  const activity = summary.rankings.activityScore || [];
  card.innerHTML = `
    <div class="section-heading"><h2>${escapeHtml(summary.season.name)}</h2><a class="meta" href="/seasons.html">전체 랭킹 보기</a></div>
    <p class="meta">${escapeHtml(summary.season.startsAt)} ~ ${escapeHtml(summary.season.endsAt)}</p>
    <div class="season-dashboard-grid">
      <div><strong>포인트 획득 TOP 3</strong>${earned.map((item) => `<p class="meta">#${item.rank} ${escapeHtml(item.nickname)} ${renderTitleBadge(item, { compact: true })} · ${escapeHtml(formatRankingScore(item.category, item.score))}</p>`).join('') || '<p class="meta">기록 없음</p>'}</div>
      <div><strong>활동 종합 TOP 3</strong>${activity.map((item) => `<p class="meta">#${item.rank} ${escapeHtml(item.nickname)} ${renderTitleBadge(item, { compact: true })} · ${escapeHtml(formatRankingScore(item.category, item.score))}</p>`).join('') || '<p class="meta">기록 없음</p>'}</div>
    </div>
  `;
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
    renderCasinoEvents(data.recentCasinoEvents || []);
    renderSeasonSummary(data.seasonSummary);
    await loadDailyMissions();
  } catch (error) {
    console.error('대시보드 로딩 실패', error);
    message.textContent = '대시보드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}

async function checkIn() {
  const message = document.querySelector('#dashboard-message');

  try {
    const data = await API.request('/api/checkin', { method: 'POST' });
    message.textContent = data.alreadyCheckedIn ? data.message : `출석 완료! ${formatPoints(data.rewardAmount)}를 받았습니다.`;
    await loadDashboard();
  } catch (error) {
    console.error('출석 처리 실패', error);
    message.textContent = error.message;
  }
}

loadDashboard();
