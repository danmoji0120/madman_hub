async function loadGuestbook() {
  const root = document.querySelector('#guestbook-list');
  const data = await API.request('/api/guestbook');

  root.innerHTML = data.entries.map((entry) => `
    <article class="card">
      <h3>${API.escape(entry.nickname || entry.author_name || '익명의 수상한 자')}</h3>
      <p>${API.escape(entry.body)}</p>
      <p class="meta">${API.escape(entry.created_at)}</p>
    </article>
  `).join('');
}

async function postGuestbook(event) {
  event.preventDefault();

  const body = document.querySelector('#guestbook-body').value.trim();
  const message = document.querySelector('#message');

  try {
    await API.request('/api/guestbook', {
      method: 'POST',
      body: JSON.stringify({ body })
    });

    document.querySelector('#guestbook-body').value = '';
    message.textContent = '';
    await loadGuestbook();
  } catch (error) {
    message.textContent = error.message;
  }
}

loadGuestbook();
