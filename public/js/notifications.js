const notificationMessage = document.querySelector('#notifications-message');
const notificationList = document.querySelector('#notification-list');
const notificationSummary = document.querySelector('#notifications-summary');

function notificationTypeLabel(type) {
  const labels = {
    post_new: '새 글',
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
    admin_notice: '관리자 공지',
    system_notice: '시스템',
    event_notice: '이벤트'
  };
  return labels[type] || type;
}

function renderNotification(item) {
  const actor = item.actor?.anonymous ? '익명' : (item.actor?.nickname || item.actor?.displayName || '');
  return `
    <article class="notification-card ${item.isRead ? '' : 'unread'} notification-importance-${API.escape(item.importance)}">
      <div class="section-heading">
        <div>
          <span class="badge notification-type">${API.escape(notificationTypeLabel(item.type))}</span>
          <span class="badge">${API.escape(item.importance)}</span>
          <h3>${API.escape(item.title)}</h3>
        </div>
        <span class="notification-time">${API.escape(item.createdAt || '')}</span>
      </div>
      <p>${API.escape(item.message)}</p>
      ${actor ? `<p class="meta">발생: ${API.escape(actor)} ${item.actor && !item.actor.anonymous ? renderTitleBadge(item.actor, { compact: true }) : ''}</p>` : ''}
      <div class="notification-actions">
        ${item.targetUrl ? `<button class="button inline small-button" onclick="openNotification(${item.id}, '${encodeURIComponent(item.targetUrl)}')">이동</button>` : ''}
        ${item.isRead ? '' : `<button class="button secondary inline small-button" onclick="markNotificationRead(${item.id})">읽음</button>`}
        <button class="button secondary inline small-button danger-button" onclick="deleteNotification(${item.id})">삭제</button>
      </div>
    </article>
  `;
}

function selectedFilter() {
  const value = document.querySelector('#notification-filter').value;
  if (value === 'unread') return { unreadOnly: true };
  return value ? { type: value } : {};
}

async function loadNotifications() {
  if (!API.token) {
    location.href = '/login.html';
    return;
  }
  try {
    const params = new URLSearchParams({ limit: '50' });
    const filter = selectedFilter();
    if (filter.unreadOnly) params.set('unreadOnly', 'true');
    if (filter.type) params.set('type', filter.type);
    const data = await API.request(`/api/notifications?${params}`);
    notificationSummary.textContent = `안읽음 ${data.unreadCount || 0}개`;
    notificationList.innerHTML = data.items.map(renderNotification).join('') || '<p class="empty-state">아직 알림이 없습니다. 오늘은 얌전했네요.</p>';
  } catch (error) {
    notificationMessage.textContent = error.message;
  }
}

async function markNotificationRead(id) {
  await API.request(`/api/notifications/${id}/read`, { method: 'PATCH' });
  await loadNotifications();
}

async function markAllNotificationsRead() {
  await API.request('/api/notifications/read-all', { method: 'PATCH', body: JSON.stringify(selectedFilter()) });
  await loadNotifications();
}

async function deleteNotification(id) {
  await API.request(`/api/notifications/${id}`, { method: 'DELETE' });
  await loadNotifications();
}

async function openNotification(id, encodedTargetUrl) {
  await API.request(`/api/notifications/${id}/read`, { method: 'PATCH' });
  location.href = decodeURIComponent(encodedTargetUrl);
}

loadNotifications();
