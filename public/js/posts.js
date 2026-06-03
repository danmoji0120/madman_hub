let postCategories = [];
let viewer = null;

function categoryOptions({ includeAll = false, includeAdminOnly = true } = {}) {
  const options = postCategories
    .filter((category) => includeAdminOnly || !category.adminOnly)
    .map((category) => `<option value="${API.escape(category.code)}">${API.escape(category.label)}</option>`);
  if (includeAll) options.unshift('<option value="">전체 카테고리</option>');
  return options.join('');
}

function selectedFilters() {
  return {
    q: document.querySelector('#post-search').value.trim(),
    category: document.querySelector('#post-category-filter').value,
    tag: document.querySelector('#post-tag-filter').value.trim(),
    sort: document.querySelector('#post-sort').value
  };
}

function postQuery(filters = selectedFilters()) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

function tagBadges(tags) {
  return (tags || []).map((tag) => `<span class="badge">${API.escape(tag)}</span>`).join(' ');
}

async function loadViewer() {
  if (!API.token) return;
  try {
    const data = await API.request('/api/dashboard');
    viewer = data.me;
  } catch {
    viewer = null;
  }
}

async function loadCategories() {
  const data = await API.request('/api/posts/categories');
  postCategories = data.categories;
  document.querySelector('#post-category-filter').innerHTML = categoryOptions({ includeAll: true });
  document.querySelector('#post-category').innerHTML = categoryOptions({
    includeAdminOnly: ['admin', 'owner'].includes(viewer?.role)
  });
}

async function loadPosts() {
  const root = document.querySelector('#posts-list');
  try {
    const query = postQuery();
    const data = await API.request(`/api/posts${query ? `?${query}` : ''}`);
    root.innerHTML = data.posts.map((post) => `
      <article class="card post-card">
        <span class="badge">${API.escape(post.categoryLabel)}</span>
        <span class="badge">${API.escape(post.targetName || '관련 대상 없음')}</span>
        <h2><a href="/post.html?id=${post.id}">${API.escape(post.title)}</a></h2>
        <p>${API.escape(post.body)}</p>
        ${post.tags.length ? `<p>${tagBadges(post.tags)}</p>` : ''}
        <p class="meta">작성자 <span class="${API.escape(post.cosmetics?.nicknameColorClass || '')}">${API.escape(post.authorName || '알 수 없음')}</span> ${post.isAnonymous ? '' : renderTitleBadge({ authorTitle: post.authorTitle, authorTitleData: post.authorTitleData, authorTitleRarity: post.authorTitleRarity }, { compact: true })} · ${API.escape(post.createdAt)}</p>
      </article>
    `).join('') || '<p class="empty-state">조건에 맞는 게시글이 없습니다.</p>';
  } catch (error) {
    root.innerHTML = `<p class="empty-state">${API.escape(error.message)}</p>`;
  }
}

async function loadCommunityConfig() {
  const data = await API.request('/api/posts/config');
  document.querySelector('#anonymous-post-cost').textContent = data.config.anonymousPostCost
    ? `비용 ${data.config.anonymousPostCost}P`
    : '무료';
}

async function loadRandomPost(button) {
  button.disabled = true;
  try {
    const { category, tag } = selectedFilters();
    const query = postQuery({ category, tag });
    const data = await API.request(`/api/posts/random${query ? `?${query}` : ''}`);
    location.href = `/post.html?id=${data.post.id}`;
  } catch (error) {
    document.querySelector('#random-post-result').textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function searchPosts() {
  loadPosts();
}

function resetPostFilters() {
  document.querySelector('#post-search').value = '';
  document.querySelector('#post-category-filter').value = '';
  document.querySelector('#post-tag-filter').value = '';
  document.querySelector('#post-sort').value = 'latest';
  loadPosts();
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
        category: document.querySelector('#post-category').value,
        title: document.querySelector('#post-title').value,
        targetName: document.querySelector('#post-target').value,
        tags: document.querySelector('#post-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
        body: document.querySelector('#post-body').value,
        isAnonymous: document.querySelector('#post-anonymous').checked
      })
    });
    event.target.reset();
    const achievements = data.unlockedAchievements.map((item) => item.name).join(', ');
    message.textContent = achievements ? `게시글 작성 완료! 업적 [${achievements}]을 받았습니다.` : '게시글 작성 완료!';
    await loadPosts();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function initPosts() {
  await Promise.all([loadViewer(), loadCommunityConfig()]);
  await loadCategories();
  await loadPosts();
}

initPosts();
