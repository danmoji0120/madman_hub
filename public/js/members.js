async function loadMembers() {
  const root = document.querySelector('#members-list');
  const data = await API.request('/api/members');

  root.innerHTML = data.members.map((member) => `
    <article class="card">
      <span class="badge">${API.escape(member.role)}</span>
      <h2>${API.escape(member.nickname || member.display_name)}</h2>
      <h3>${API.escape(member.title || '수상한 거주민')}</h3>
      <p>${API.escape(member.bio || '설명 없음')}</p>
      <p class="meta">위험도: ${'★'.repeat(member.danger_level || 1)}</p>
      <p class="point">${member.balance || 0}P</p>
    </article>
  `).join('');
}

loadMembers();
