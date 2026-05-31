async function loadPosts() {
  const root = document.querySelector('#posts-list');
  const data = await API.request('/api/posts');

  root.innerHTML = data.posts.map((post) => `
    <article class="card post-card">
      <span class="badge">${API.escape(post.targetName || '대상 없음')}</span>
      <h2>${API.escape(post.title)}</h2>
      <p>${API.escape(post.body)}</p>
      <p class="meta">작성자: ${API.escape(post.authorName || '알 수 없음')} · ${API.escape(post.createdAt)}</p>
    </article>
  `).join('') || '<p class="empty-state">아직 게시글이 없습니다.</p>';
}

async function postArticle(event) {
  event.preventDefault();
  const message = document.querySelector('#message');

  if (!API.token) {
    message.textContent = '게시글을 작성하려면 로그인해 주세요.';
    return;
  }

  try {
    const data = await API.request('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: document.querySelector('#post-title').value,
        targetName: document.querySelector('#post-target').value,
        body: document.querySelector('#post-body').value
      })
    });

    document.querySelector('#post-title').value = '';
    document.querySelector('#post-target').value = '';
    document.querySelector('#post-body').value = '';
    const achievements = data.unlockedAchievements.map((item) => item.name).join(', ');
    message.textContent = achievements ? `게시글 작성 완료! 5P와 업적 [${achievements}]을 받았습니다.` : '게시글 작성 완료! 5P를 받았습니다.';
    await loadPosts();
  } catch (error) {
    message.textContent = error.message;
  }
}

loadPosts();
