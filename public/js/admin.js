const adminMessage = document.querySelector('#admin-message');
let loadedAdminTitles = [];
let loadedAdminCosmetics = [];
let loadedAdminSeasons = [];

function showAdminMessage(message = '') {
  adminMessage.textContent = message;
}

function shortText(value, length = 90) {
  const text = String(value || '');
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function adminActionText(action) {
  const labels = {
    admin_role_updated: '유저 권한 변경',
    admin_points_granted: '포인트 지급',
    admin_points_revoked: '포인트 회수',
    admin_quote_hidden: '게시글 숨김',
    admin_quote_unhidden: '게시글 숨김 해제',
    admin_guestbook_hidden: '방명록 숨김',
    admin_guestbook_unhidden: '방명록 숨김 해제',
    admin_comment_hidden: '댓글 숨김',
    admin_comment_unhidden: '댓글 숨김 해제',
    admin_song_hidden: '노래추천 숨김',
    admin_song_unhidden: '노래추천 복구',
    admin_title_created: '칭호 생성',
    admin_title_updated: '칭호 수정',
    admin_title_disabled: '칭호 비활성화',
    admin_title_enabled: '칭호 활성화',
    admin_title_granted: '칭호 지급',
    admin_title_revoked: '칭호 회수',
    admin_season_created: '시즌 생성',
    admin_season_updated: '시즌 수정',
    admin_season_ended: '시즌 종료',
    admin_season_hall_of_fame_generated: '명예의 전당 재생성'
  };
  return labels[action] || action;
}

function options(currentRole) {
  return ['owner', 'admin', 'member', 'guest'].map((role) => (
    `<option value="${role}" ${role === currentRole ? 'selected' : ''}>${role}</option>`
  )).join('');
}

async function loadOverview() {
  try {
    const data = await API.request('/api/admin/overview');
    const metrics = [
      ['총 유저', data.totalUsers],
      ['관리자', data.totalAdmins],
      ['전체 포인트', formatPoints(data.totalPointBalance)],
      ['포인트 거래', data.totalPointTransactions],
      ['게시글', `${data.totalQuotes} / 숨김 ${data.hiddenQuotes}`],
      ['방명록', `${data.totalGuestbookEntries} / 숨김 ${data.hiddenGuestbookEntries}`],
      ['칭호', `${data.totalTitles} / 활성 ${data.activeTitles}`],
      ['업적', `${data.totalAchievements} / 달성 ${data.totalUserAchievements}`]
    ];

    document.querySelector('#overview-metrics').innerHTML = metrics.map(([label, value]) => `
      <article class="metric-card"><span class="meta">${API.escape(label)}</span><strong>${API.escape(value)}</strong></article>
    `).join('');
    document.querySelector('#recent-users').innerHTML = data.recentUsers.map((item) => `
      <div><strong>${API.escape(item.display_name)}</strong> · ${API.escape(item.role)}<br /><span class="meta">${API.escape(item.email)} · ${API.escape(item.created_at)}</span></div>
    `).join('') || '<p class="empty-state">내역 없음</p>';
    document.querySelector('#recent-transactions').innerHTML = data.recentTransactions.map((item) => `
      <div><strong>${API.escape(item.display_name)} ${formatSignedPoints(item.amount)}</strong> · ${API.escape(item.reason)}</div>
    `).join('') || '<p class="empty-state">내역 없음</p>';
    document.querySelector('#recent-title-purchases').innerHTML = data.recentTitlePurchases.map((item) => `
      <div><strong>${API.escape(item.display_name)}</strong> · ${API.escape(item.reason)}</div>
    `).join('') || '<p class="empty-state">내역 없음</p>';
    document.querySelector('#recent-admin-logs').innerHTML = data.recentAdminLogs.map((item) => `
      <div><strong>${API.escape(adminActionText(item.action))}</strong> · ${API.escape(item.display_name || `ID ${item.user_id}`)}<br />
      <span class="meta">${API.escape(shortText(item.metadata, 140))} · ${API.escape(item.created_at)}</span></div>
    `).join('') || '<p class="empty-state">로그 없음</p>';
    document.querySelector('#recent-quotes').innerHTML = data.recentQuotes.map((item) => `
      <div class="${item.is_hidden ? 'status-hidden' : ''}"><strong>${API.escape(item.title)}</strong> · ${API.escape(item.author_name || '-')}<br /><span class="meta">${API.escape(shortText(item.body))}</span></div>
    `).join('') || '<p class="empty-state">내역 없음</p>';
    document.querySelector('#recent-guestbook').innerHTML = data.recentGuestbook.map((item) => `
      <div class="${item.is_hidden ? 'status-hidden' : ''}"><strong>${API.escape(item.nickname)}</strong><br /><span class="meta">${API.escape(shortText(item.body))}</span></div>
    `).join('') || '<p class="empty-state">내역 없음</p>';
    document.querySelector('#recent-achievement-unlocks').innerHTML = data.recentAchievementUnlocks.map((item) => `
      <div><strong>${API.escape(item.name)}</strong> · ${API.escape(item.display_name)}<br /><span class="meta">${API.escape(item.unlocked_at)}</span></div>
    `).join('') || '<p class="empty-state">내역 없음</p>';
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function loadAdminUsers() {
  const query = encodeURIComponent(document.querySelector('#user-search').value.trim());
  const role = encodeURIComponent(document.querySelector('#user-role-filter').value);

  try {
    const data = await API.request(`/api/admin/users?q=${query}&role=${role}`);
    document.querySelector('#admin-users').innerHTML = data.users.map((user) => `
      <tr>
        <td>${user.id}</td>
        <td><strong>${API.escape(user.nickname || user.display_name)}</strong><br /><span class="meta">${API.escape(user.email)}<br />가입 ${API.escape(user.created_at)}<br />로그인 ${API.escape(user.last_login_at || '-')}</span></td>
        <td>${renderTitleBadge(user, { allowEmpty: true }) || '-'}<br /><span class="meta">보유 ${user.owned_title_count}</span></td>
        <td>${formatPoints(user.balance)}<br /><span class="meta">획득 ${formatPoints(user.total_earned)} / 사용 ${formatPoints(user.total_spent)}</span></td>
        <td><span class="meta">게시글 ${user.quote_count}<br />방명록 ${user.guestbook_count}</span></td>
        <td><select class="input compact-input" id="role-${user.id}">${options(user.role)}</select><button class="button secondary small-button" onclick="updateRole(${user.id})">적용</button></td>
      </tr>
    `).join('');
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function updateRole(userId) {
  try {
    await API.request(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: document.querySelector(`#role-${userId}`).value })
    });
    showAdminMessage('권한을 변경했습니다.');
    await refreshAdmin();
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function grantPoints() {
  try {
    await API.request('/api/admin/points/grant', {
      method: 'POST',
      body: JSON.stringify({
        userId: Number(document.querySelector('#target-user-id').value),
        amount: Number(document.querySelector('#point-amount').value),
        reason: document.querySelector('#point-reason').value.trim()
      })
    });
    showAdminMessage('포인트 조정을 반영했습니다.');
    await refreshAdmin();
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function loadAdminQuotes() {
  const query = encodeURIComponent(document.querySelector('#quote-search').value.trim());
  const category = encodeURIComponent(document.querySelector('#quote-category-filter').value);
  const tag = encodeURIComponent(document.querySelector('#quote-tag-filter').value.trim());
  const userId = encodeURIComponent(document.querySelector('#quote-user-filter').value.trim());
  const includeHidden = document.querySelector('#quote-hidden').checked;
  try {
    const data = await API.request(`/api/admin/posts?q=${query}&category=${category}&tag=${tag}&userId=${userId}&includeHidden=${includeHidden}`);
    document.querySelector('#admin-quotes').innerHTML = data.quotes.map((quote) => `
      <tr class="${quote.is_hidden ? 'status-hidden' : ''}">
        <td>${quote.id}</td>
        <td><span class="badge">${API.escape(quote.categoryLabel)}</span><br /><strong>${API.escape(quote.title)}</strong> · ${API.escape(quote.target_name || '관련자 미상')}<br /><span class="meta">${API.escape(shortText(quote.body))}</span></td>
        <td>${API.escape(quote.author_name || '-')} ${quote.isAnonymous ? '<span class="badge">익명</span>' : ''}<br /><span class="meta">${quote.isAnonymous ? `실제: ${API.escape(quote.realAuthorName || '-')} · ` : ''}${API.escape(quote.created_at)}</span></td>
        <td>${quote.is_hidden ? `숨김<br /><span class="meta">${API.escape(quote.hidden_reason || '-')}</span>` : '공개'}</td>
        <td><button class="button secondary small-button ${quote.is_hidden ? '' : 'danger-button'}" onclick="toggleQuote(${quote.id}, ${!quote.is_hidden})">${quote.is_hidden ? '숨김 해제' : '숨김'}</button></td>
      </tr>
    `).join('');
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function toggleQuote(quoteId, hidden) {
  const reason = hidden ? (prompt('숨김 사유를 입력하세요.') || '') : '';
  await updateHidden(`/api/admin/posts/${quoteId}/hidden`, { hidden, reason }, loadAdminQuotes);
}

async function loadAdminGuestbook() {
  const query = encodeURIComponent(document.querySelector('#guestbook-search').value.trim());
  const includeHidden = document.querySelector('#guestbook-hidden').checked;
  try {
    const data = await API.request(`/api/admin/guestbook?q=${query}&includeHidden=${includeHidden}`);
    document.querySelector('#admin-guestbook').innerHTML = data.entries.map((entry) => `
      <tr class="${entry.is_hidden ? 'status-hidden' : ''}">
        <td>${entry.id}</td>
        <td><strong>${API.escape(entry.nickname)}</strong><br /><span class="meta">${API.escape(shortText(entry.body))}</span></td>
        <td>${API.escape(entry.author_name || '-')}<br /><span class="meta">${API.escape(entry.created_at)}</span></td>
        <td>${entry.is_hidden ? `숨김<br /><span class="meta">${API.escape(entry.hidden_reason || '-')}</span>` : '공개'}</td>
        <td><button class="button secondary small-button ${entry.is_hidden ? '' : 'danger-button'}" onclick="toggleGuestbook(${entry.id}, ${!entry.is_hidden})">${entry.is_hidden ? '숨김 해제' : '숨김'}</button></td>
      </tr>
    `).join('');
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function toggleGuestbook(entryId, hidden) {
  const reason = hidden ? (prompt('숨김 사유를 입력하세요.') || '') : '';
  await updateHidden(`/api/admin/guestbook/${entryId}/hidden`, { hidden, reason }, loadAdminGuestbook);
}

async function loadAdminComments() {
  const query = encodeURIComponent(document.querySelector('#comment-search').value.trim());
  const postId = encodeURIComponent(document.querySelector('#comment-post-id').value.trim());
  const userId = encodeURIComponent(document.querySelector('#comment-user-id').value.trim());
  const includeHidden = document.querySelector('#comment-hidden').checked;
  try {
    const data = await API.request(`/api/admin/comments?q=${query}&postId=${postId}&userId=${userId}&includeHidden=${includeHidden}`);
    document.querySelector('#admin-comments').innerHTML = data.comments.map((comment) => `
      <tr class="${comment.isHidden ? 'status-hidden' : ''}">
        <td>${comment.id}</td>
        <td><strong>${API.escape(comment.postTitle || `게시글 ${comment.postId}`)}</strong><br /><span class="meta">${API.escape(shortText(comment.body))}</span></td>
        <td>${API.escape(comment.authorName || '-')} ${comment.isAnonymous ? '<span class="badge">익명</span>' : ''}<br /><span class="meta">${comment.isAnonymous ? `실제: ${API.escape(comment.realAuthorName || '-')} · ` : ''}ID ${API.escape(comment.userId || '-')} · ${API.escape(comment.createdAt)}</span></td>
        <td>${comment.isHidden ? `숨김<br /><span class="meta">${API.escape(comment.hiddenReason || '-')}</span>` : '공개'}</td>
        <td><button class="button secondary small-button ${comment.isHidden ? '' : 'danger-button'}" onclick="toggleComment(${comment.id}, ${!comment.isHidden})">${comment.isHidden ? '숨김 해제' : '숨김'}</button></td>
      </tr>
    `).join('') || '<tr><td colspan="5">댓글 없음</td></tr>';
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function toggleComment(commentId, hidden) {
  const reason = hidden ? (prompt('숨김 사유를 입력하세요.') || '') : '';
  await updateHidden(`/api/admin/comments/${commentId}/hidden`, { hidden, reason }, loadAdminComments);
}

async function loadAdminSongs() {
  const query = encodeURIComponent(document.querySelector('#song-admin-search').value.trim());
  const userId = encodeURIComponent(document.querySelector('#song-admin-user-id').value.trim());
  const includeHidden = document.querySelector('#song-admin-hidden').checked;
  try {
    const data = await API.request(`/api/admin/songs?q=${query}&userId=${userId}&includeHidden=${includeHidden}`);
    document.querySelector('#admin-songs').innerHTML = data.songs.map((song) => `
      <tr class="${song.isHidden ? 'status-hidden' : ''}">
        <td>${song.id}</td>
        <td><strong>${API.escape(song.title)}</strong> · ${API.escape(song.artist || '-')}<br /><span class="meta">${API.escape(shortText(song.reason))}</span></td>
        <td>${API.escape(song.authorName)} ${song.isAnonymous ? '<span class="badge">익명</span>' : ''}<br /><span class="meta">${song.isAnonymous ? `실제: ${API.escape(song.realAuthorName || '-')} · ` : ''}ID ${API.escape(song.userId || '-')}</span></td>
        <td>${song.isHidden ? `숨김<br /><span class="meta">${API.escape(song.hiddenReason || '-')}</span>` : '공개'}</td>
        <td><button class="button secondary small-button ${song.isHidden ? '' : 'danger-button'}" onclick="toggleSong(${song.id}, ${!song.isHidden})">${song.isHidden ? '복구' : '숨김'}</button></td>
      </tr>
    `).join('') || '<tr><td colspan="5">노래추천 없음</td></tr>';
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function toggleSong(songId, hidden) {
  const reason = hidden ? (prompt('숨김 사유를 입력하세요.') || '') : '';
  await updateHidden(`/api/admin/songs/${songId}/hidden`, { hidden, reason }, loadAdminSongs);
}

async function updateHidden(path, body, reload) {
  try {
    await API.request(path, { method: 'PATCH', body: JSON.stringify(body) });
    showAdminMessage('공개 상태를 변경했습니다.');
    await Promise.all([reload(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function loadAdminTitles() {
  const query = encodeURIComponent(document.querySelector('#title-search').value.trim());
  const includeInactive = document.querySelector('#title-inactive').checked;
  try {
    const data = await API.request(`/api/admin/titles?q=${query}&includeInactive=${includeInactive}`);
    loadedAdminTitles = data.titles;
    document.querySelector('#admin-titles').innerHTML = data.titles.map((title) => `
      <tr class="${title.is_active ? '' : 'status-inactive'}">
        <td>${title.id}</td>
        <td>${renderTitleBadge(title, { showRarityLabel: true })}<br /><strong>${API.escape(title.name)}</strong><br /><span class="meta">${API.escape(title.description || '-')}</span><br /><span class="meta">${API.escape(title.category || 'shop')} · ${API.escape(title.sourceType || title.source_type || 'purchase')} · ${title.isRewardOnly ? 'reward only' : 'purchasable'}</span></td>
        <td>${formatPoints(title.price)}</td>
        <td>${title.owner_count}</td>
        <td>${title.is_active ? '<span class="status-active">활성</span>' : '비활성'}<br /><span class="meta">${API.escape(title.updated_at || '-')}</span></td>
        <td><button class="button secondary small-button" onclick="editTitle(${title.id})">수정</button>
        <button class="button secondary small-button" onclick="grantTitle(${title.id})">지급</button>
        <button class="button secondary small-button danger-button" onclick="revokeTitle(${title.id})">회수</button>
        <button class="button secondary small-button ${title.is_active ? 'danger-button' : ''}" onclick="toggleTitle(${title.id}, ${!title.is_active})">${title.is_active ? '비활성화' : '활성화'}</button></td>
      </tr>
    `).join('');
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function loadAdminCosmetics() {
  const query = encodeURIComponent(document.querySelector('#cosmetic-search').value.trim());
  try {
    const data = await API.request(`/api/admin/cosmetics?q=${query}`);
    loadedAdminCosmetics = data.items;
    document.querySelector('#admin-cosmetics').innerHTML = data.items.map((item) => `
      <tr class="${item.isActive ? '' : 'status-inactive'}">
        <td>${item.id}</td><td><strong>${API.escape(item.name)}</strong><br /><span class="meta">${API.escape(item.code)} · ${API.escape(item.cssClass)}</span></td>
        <td>${API.escape(item.type)}<br /><span class="badge">${API.escape(item.rarity)}</span></td>
        <td>${formatPoints(item.price)}</td><td>${item.isActive ? '활성' : '비활성'}</td>
        <td><button class="button secondary small-button" onclick="editCosmetic(${item.id})">수정</button>
        <button class="button secondary small-button ${item.isActive ? 'danger-button' : ''}" onclick="toggleCosmetic(${item.id}, ${!item.isActive})">${item.isActive ? '비활성화' : '활성화'}</button></td>
      </tr>
    `).join('');
  } catch (error) { showAdminMessage(error.message); }
}

async function createCosmetic(event) {
  event.preventDefault();
  try {
    await API.request('/api/admin/cosmetics', { method: 'POST', body: JSON.stringify({
      code: document.querySelector('#new-cosmetic-code').value, name: document.querySelector('#new-cosmetic-name').value,
      type: document.querySelector('#new-cosmetic-type').value, rarity: document.querySelector('#new-cosmetic-rarity').value,
      price: Number(document.querySelector('#new-cosmetic-price').value), cssClass: document.querySelector('#new-cosmetic-class').value
    }) });
    event.target.reset(); showAdminMessage('꾸미기 아이템을 생성했습니다.'); await loadAdminCosmetics();
  } catch (error) { showAdminMessage(error.message); }
}

async function editCosmetic(id) {
  const item = loadedAdminCosmetics.find((entry) => entry.id === id);
  if (!item) return;
  const name = prompt('이름', item.name); if (name === null) return;
  const cssClass = prompt('CSS class', item.cssClass); if (cssClass === null) return;
  try {
    await API.request(`/api/admin/cosmetics/${id}`, { method: 'PATCH', body: JSON.stringify({ name, cssClass }) });
    showAdminMessage('꾸미기 아이템을 수정했습니다.'); await loadAdminCosmetics();
  } catch (error) { showAdminMessage(error.message); }
}

async function toggleCosmetic(id, isActive) {
  try {
    await API.request(`/api/admin/cosmetics/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    showAdminMessage('꾸미기 활성 상태를 변경했습니다.'); await loadAdminCosmetics();
  } catch (error) { showAdminMessage(error.message); }
}

async function loadAdminSeasons() {
  try {
    const data = await API.request('/api/admin/seasons');
    loadedAdminSeasons = data.seasons;
    document.querySelector('#admin-seasons').innerHTML = data.seasons.map((season) => `
      <tr>
        <td>${season.id}</td>
        <td><strong>${API.escape(season.name)}</strong><br /><span class="meta">${API.escape(season.code)} · ${API.escape(season.description || '-')}</span></td>
        <td><span class="meta">${API.escape(season.startsAt)}<br />${API.escape(season.endsAt)}</span></td>
        <td>${season.isActive ? '<span class="status-active">active</span>' : API.escape(season.status)}</td>
        <td>
          <button class="button secondary small-button" onclick="editSeason(${season.id})">수정</button>
          <button class="button secondary small-button" onclick="previewSeason(${season.id})">미리보기</button>
          ${season.status === 'scheduled' ? `<button class="button secondary small-button" onclick="activateSeason(${season.id})">활성화</button>` : ''}
          ${!['ended', 'archived'].includes(season.status) ? `<button class="button secondary small-button danger-button" onclick="endSeason(${season.id})">종료</button>` : ''}
          ${['ended', 'archived'].includes(season.status) ? `<button class="button secondary small-button" onclick="regenerateHallOfFame(${season.id})">명예의 전당 재생성</button>` : ''}
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5">등록된 시즌 없음</td></tr>';
  } catch (error) { showAdminMessage(error.message); }
}

async function loadAdminCasinoStats() {
  try {
    const data = await API.request('/api/admin/casino/stats?limit=10');
    const totals = data.totals || {};
    document.querySelector('#admin-casino-metrics').innerHTML = [
      ['총 플레이', formatCount(totals.plays || 0)],
      ['총 베팅', formatPoints(totals.totalBet || 0)],
      ['총 지급', formatPoints(totals.totalPayout || 0)],
      ['전체 Net', formatSignedPoints(totals.netProfit || 0)]
    ].map(([label, value]) => `<article class="metric-card"><span class="meta">${API.escape(label)}</span><strong>${API.escape(value)}</strong></article>`).join('');
    document.querySelector('#admin-casino-games').innerHTML = (data.gameStats || []).map((item) => `
      <tr>
        <td>${API.escape(item.gameKey)}</td>
        <td>${formatCount(item.plays || 0)}</td>
        <td>${formatPoints(item.totalBet || 0)}</td>
        <td>${formatPoints(item.totalPayout || 0)}</td>
        <td>${formatSignedPoints(item.netProfit || 0)}</td>
        <td>${formatPercent(Math.round(Number(item.returnRate || 0) * 1000))}</td>
      </tr>
    `).join('') || '<tr><td colspan="6">기록 없음</td></tr>';
    document.querySelector('#admin-casino-loops').innerHTML = (data.suspiciousLoops || []).map((item) => `
      <div><strong>${API.escape(item.nickname || item.display_name || `ID ${item.userId}`)}</strong> · ${API.escape(item.formattedScore)} · <span class="meta">${API.escape(item.extraLabel || '')}</span></div>
    `).join('') || '<p class="meta">의심 루프 후보 없음</p>';
  } catch (error) { showAdminMessage(error.message); }
}

async function createSeason(event) {
  event.preventDefault();
  try {
    await API.request('/api/admin/seasons', { method: 'POST', body: JSON.stringify({
      code: document.querySelector('#new-season-code').value.trim(),
      name: document.querySelector('#new-season-name').value.trim(),
      description: document.querySelector('#new-season-description').value.trim(),
      startsAt: document.querySelector('#new-season-start').value,
      endsAt: document.querySelector('#new-season-end').value
    }) });
    event.target.reset();
    showAdminMessage('시즌을 생성했습니다.');
    await loadAdminSeasons();
  } catch (error) { showAdminMessage(error.message); }
}

async function editSeason(id) {
  const season = loadedAdminSeasons.find((item) => item.id === id);
  if (!season) return;
  const name = prompt('시즌 이름', season.name); if (name === null) return;
  const description = prompt('시즌 설명', season.description || ''); if (description === null) return;
  try {
    await API.request(`/api/admin/seasons/${id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) });
    showAdminMessage('시즌을 수정했습니다.');
    await loadAdminSeasons();
  } catch (error) { showAdminMessage(error.message); }
}

async function activateSeason(id) {
  try {
    await API.request(`/api/admin/seasons/${id}/activate`, { method: 'POST' });
    showAdminMessage('시즌을 활성화했습니다.');
    await loadAdminSeasons();
  } catch (error) { showAdminMessage(error.message); }
}

async function endSeason(id) {
  if (!confirm('시즌을 종료하고 명예의 전당을 확정할까요?')) return;
  try {
    await API.request(`/api/admin/seasons/${id}/end`, { method: 'POST' });
    showAdminMessage('시즌을 종료하고 명예의 전당을 저장했습니다.');
    await loadAdminSeasons();
  } catch (error) { showAdminMessage(error.message); }
}

async function previewSeason(id) {
  try {
    const data = await API.request(`/api/admin/seasons/${id}/preview-rankings?limit=3`);
    const earned = data.rankings.pointEarned || [];
    showAdminMessage(`시즌 미리보기: 포인트 획득 TOP ${earned.length} · ${earned.map((item) => `${item.nickname} ${formatRankingScore(item.category, item.score)}`).join(', ') || '기록 없음'}`);
  } catch (error) { showAdminMessage(error.message); }
}

async function regenerateHallOfFame(id) {
  if (!confirm('저장된 명예의 전당을 현재 집계로 다시 생성할까요?')) return;
  try {
    const data = await API.request(`/api/admin/seasons/${id}/generate-hall-of-fame`, { method: 'POST' });
    showAdminMessage(`명예의 전당 ${data.hallOfFameEntries}개 기록을 다시 저장했습니다.`);
  } catch (error) { showAdminMessage(error.message); }
}

async function createTitle(event) {
  event.preventDefault();
  try {
    await API.request('/api/admin/titles', {
      method: 'POST',
      body: JSON.stringify({
        name: document.querySelector('#new-title-name').value,
        description: document.querySelector('#new-title-description').value,
        price: Number(document.querySelector('#new-title-price').value),
        rarity: document.querySelector('#new-title-rarity').value,
        category: document.querySelector('#new-title-category')?.value || 'shop',
        sourceType: document.querySelector('#new-title-source-type')?.value || 'purchase',
        cssClass: document.querySelector('#new-title-css-class')?.value || '',
        flavorText: document.querySelector('#new-title-flavor')?.value || '',
        unlockHint: document.querySelector('#new-title-unlock-hint')?.value || '',
        isPurchasable: Boolean(document.querySelector('#new-title-purchasable')?.checked),
        isRewardOnly: Boolean(document.querySelector('#new-title-reward-only')?.checked),
        isActive: true
      })
    });
    event.target.reset();
    showAdminMessage('칭호를 생성했습니다.');
    await Promise.all([loadAdminTitles(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function editTitle(titleId) {
  const title = loadedAdminTitles.find((item) => item.id === titleId);
  if (!title) return;

  const name = prompt('칭호 이름', title.name);
  if (name === null) return;
  const description = prompt('칭호 설명', title.description || '');
  if (description === null) return;
  const price = Number(prompt('가격', String(title.price)));
  const rarity = prompt('등급: common, uncommon, rare, epic, legendary, event, admin, punishment', title.rarity);
  if (rarity === null) return;
  const category = prompt('category', title.category || 'shop');
  if (category === null) return;
  const sourceType = prompt('sourceType', title.sourceType || title.source_type || 'purchase');
  if (sourceType === null) return;
  const cssClass = prompt('CSS class', title.cssClass || title.css_class || '');
  if (cssClass === null) return;
  const flavorText = prompt('flavor text', title.flavorText || title.flavor_text || '');
  if (flavorText === null) return;
  const unlockHint = prompt('unlock hint', title.unlockHint || title.unlock_hint || '');
  if (unlockHint === null) return;
  const isPurchasable = confirm('구매 가능 칭호로 설정할까요?');
  const isRewardOnly = confirm('보상 전용 칭호로 설정할까요?');

  try {
    await API.request(`/api/admin/titles/${titleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description, price, rarity, category, sourceType, cssClass, flavorText, unlockHint, isPurchasable, isRewardOnly })
    });
    showAdminMessage('칭호를 수정했습니다.');
    await Promise.all([loadAdminTitles(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function toggleTitle(titleId, isActive) {
  try {
    await API.request(`/api/admin/titles/${titleId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
    showAdminMessage('칭호 활성 상태를 변경했습니다.');
    await Promise.all([loadAdminTitles(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function grantTitle(titleId) {
  const userId = Number(prompt('지급할 유저 ID'));
  if (!Number.isInteger(userId) || userId < 1) return;
  const reason = prompt('지급 사유', 'admin grant') || '';
  const sourceType = prompt('sourceType', 'admin_grant') || 'admin_grant';
  const sourceId = prompt('sourceId', '') || null;
  try {
    const data = await API.request(`/api/admin/users/${userId}/titles/${titleId}/grant`, {
      method: 'POST',
      body: JSON.stringify({ reason, sourceType, sourceId })
    });
    showAdminMessage(data.alreadyOwned ? '이미 보유 중인 칭호입니다.' : '칭호를 지급했습니다.');
    await Promise.all([loadAdminTitles(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function revokeTitle(titleId) {
  const userId = Number(prompt('회수할 유저 ID'));
  if (!Number.isInteger(userId) || userId < 1) return;
  const reason = prompt('회수 사유', 'admin revoke') || '';
  try {
    const data = await API.request(`/api/admin/users/${userId}/titles/${titleId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    showAdminMessage(data.removed ? '칭호를 회수했습니다.' : '대상 유저가 해당 칭호를 보유하지 않았습니다.');
    await Promise.all([loadAdminTitles(), loadOverview(), loadAdminUsers()]);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

async function refreshAdmin() {
  await Promise.all([loadOverview(), loadAdminUsers(), loadAdminQuotes(), loadAdminGuestbook(), loadAdminComments(), loadAdminSongs(), loadAdminTitles(), loadAdminCosmetics(), loadAdminSeasons(), loadAdminCasinoStats()]);
}

refreshAdmin();
