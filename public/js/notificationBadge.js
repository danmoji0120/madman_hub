(async function initNotificationBadge() {
  if (!window.API || !API.token) return;
  if (document.querySelector('#main-nav')) return;
  const nav = document.querySelector('.nav-links');
  if (!nav || document.querySelector('#nav-notification-link')) return;
  const link = document.createElement('a');
  link.id = 'nav-notification-link';
  link.className = 'notification-nav-link';
  link.href = '/notifications.html';
  link.innerHTML = '알림 <span class="header-notification-count" id="header-notification-count" hidden>0</span>';
  nav.appendChild(link);

  try {
    const data = await API.request('/api/notifications/unread-count');
    const badge = document.querySelector('#header-notification-count');
    const count = Number(data.unreadCount || 0);
    if (badge && count > 0) {
      badge.hidden = false;
      badge.textContent = count > 99 ? '99+' : String(count);
    }
  } catch {
    // Badge is decorative; page-level API errors handle auth state.
  }
})();
