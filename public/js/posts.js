let postCategories = [];
let viewer = null;
let postsInitialized = false;
let postsInFlightKey = null;
let postsInFlightPromise = null;
let viewerLoadPromise = null;
let activePostsTab = 'list';

function isPostsPerfEnabled() {
  try {
    return localStorage.DEBUG_PERF === 'true' || localStorage.DEBUG_DASHBOARD === 'true';
  } catch (error) {
    return false;
  }
}

function postsPerfLog(message) {
  if (isPostsPerfEnabled()) console.log(`[perf] ${message}`);
}

function isAdminViewer() {
  return ['admin', 'owner'].includes(viewer?.role);
}

function categoryOptions({ includeAll = false, includeAdminOnly = true } = {}) {
  const options = postCategories
    .filter((category) => includeAdminOnly || !category.adminOnly)
    .map((category) => `<option value="${API.escape(category.code)}">${API.escape(category.label)}</option>`);
  if (includeAll) options.unshift('<option value="">전체 카테고리</option>');
  return options.join('');
}

function renderCategoryControls() {
  const filter = document.querySelector('#post-category-filter');
  const writer = document.querySelector('#post-category');
  if (filter) filter.innerHTML = categoryOptions({ includeAll: true, includeAdminOnly: true });
  if (writer) writer.innerHTML = categoryOptions({ includeAdminOnly: isAdminViewer() });
}

function selectedFilters() {
  return {
    q: document.querySelector('#post-search')?.value.trim() || '',
    category: document.querySelector('#post-category-filter')?.value || '',
    tag: document.querySelector('#post-tag-filter')?.value.trim() || '',
    sort: document.querySelector('#post-sort')?.value || 'latest'
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

function renderPostAuthor(post) {
  const authorName = post.authorName || post.author_name || '이름 없는 거주민';
  const colorClass = API.escape(post.cosmetics?.nicknameColorClass || '');
  const titleBadge = post.isAnonymous
    ? ''
    : renderTitleBadge({
      authorTitle: post.authorTitle,
      authorTitleData: post.authorTitleData,
      authorTitleRarity: post.authorTitleRarity
    }, { compact: true });
  return `<span class="${colorClass}">${API.escape(authorName)}</span> ${titleBadge}`;
}

function renderPosts(posts = []) {
  const root = document.querySelector('#posts-list');
  if (!root) return;

  root.innerHTML = posts.map((post) => `
    <article class="card post-card">
      <div class="post-card-badges">
        <span class="badge">${API.escape(post.categoryLabel || post.category || '게시글')}</span>
        <span class="badge">${API.escape(post.targetName || post.target_name || '관련 대상 없음')}</span>
      </div>
      <h2><a href="/post.html?id=${encodeURIComponent(post.id)}">${API.escape(post.title)}</a></h2>
      <p>${API.escape(post.body)}</p>
      ${post.tags?.length ? `<p>${tagBadges(post.tags)}</p>` : ''}
      <p class="meta">작성자 ${renderPostAuthor(post)} · ${API.escape(post.createdAt || post.created_at || '')}</p>
    </article>
  `).join('') || '<p class="empty-state">조건에 맞는 게시글이 없습니다.</p>';
}

async function loadViewer() {
  if (!API.token) {
    viewer = null;
    return null;
  }
  if (viewerLoadPromise) return viewerLoadPromise;

  viewerLoadPromise = API.request('/api/me')
    .then((data) => {
      viewer = data.user || data.me || null;
      postsPerfLog('posts viewer loaded after list');
      return viewer;
    })
    .catch(() => {
      viewer = null;
      return null;
    })
    .finally(() => {
      viewerLoadPromise = null;
      renderCategoryControls();
      updateWriteAuthState();
    });

  return viewerLoadPromise;
}

function loadViewerForCategoryPermissions() {
  loadViewer();
}

async function loadCategories() {
  const data = await API.request('/api/posts/categories');
  postCategories = Array.isArray(data.categories) ? data.categories : [];
  renderCategoryControls();
}

async function loadPosts({ force = false } = {}) {
  const root = document.querySelector('#posts-list');
  const query = postQuery();
  const requestPath = `/api/posts${query ? `?${query}` : ''}`;

  if (!force && postsInFlightKey === requestPath && postsInFlightPromise) {
    postsPerfLog('posts duplicate load skipped');
    return postsInFlightPromise;
  }

  postsPerfLog(`posts list load start ${requestPath}`);
  const startedAt = performance.now();
  postsInFlightKey = requestPath;
  postsInFlightPromise = (async () => {
    try {
      if (root && !root.innerHTML.trim()) root.innerHTML = '<p class="empty-state">게시글을 불러오는 중입니다.</p>';
      const data = await API.request(requestPath);
      renderPosts(data.posts || []);
      postsPerfLog(`posts list load done ${Math.round(performance.now() - startedAt)}ms`);
      return data;
    } catch (error) {
      if (root) root.innerHTML = `<p class="empty-state">${API.escape(error.message)}</p>`;
      return null;
    } finally {
      postsInFlightKey = null;
      postsInFlightPromise = null;
    }
  })();

  return postsInFlightPromise;
}

async function loadCommunityConfig() {
  try {
    const data = await API.request('/api/posts/config');
    const cost = document.querySelector('#anonymous-post-cost');
    if (cost) {
      cost.textContent = data.config?.anonymousPostCost
        ? `비용 ${formatPoints(data.config.anonymousPostCost)}`
        : '무료';
    }
  } catch (error) {
    const cost = document.querySelector('#anonymous-post-cost');
    if (cost) cost.textContent = '비용 확인 중';
  }
}

async function loadRandomPost(button) {
  button.disabled = true;
  try {
    const { category, tag } = selectedFilters();
    const query = postQuery({ category, tag });
    const data = await API.request(`/api/posts/random${query ? `?${query}` : ''}`);
    location.href = `/post.html?id=${encodeURIComponent(data.post.id)}`;
  } catch (error) {
    document.querySelector('#random-post-result').textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function setPostsTab(tabKey, { updateHash = true } = {}) {
  activePostsTab = tabKey === 'write' ? 'write' : 'list';
  document.querySelector('#posts-list-panel').hidden = activePostsTab !== 'list';
  document.querySelector('#posts-write-panel').hidden = activePostsTab !== 'write';
  document.querySelector('#posts-list-tab-button')?.classList.toggle('active', activePostsTab === 'list');
  document.querySelector('#posts-write-tab-button')?.classList.toggle('active', activePostsTab === 'write');

  if (updateHash) {
    if (activePostsTab === 'write') {
      if (location.hash !== '#write') location.hash = 'write';
    } else if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }
}

function openPostsWriteTab() {
  postsPerfLog('posts write tab open');
  setPostsTab('write');
  updateWriteAuthState();
}

function openPostsListTab(options = {}) {
  setPostsTab('list', options);
}

function cancelPostWrite() {
  document.querySelector('#message').textContent = '';
  openPostsListTab();
}

function updateWriteAuthState() {
  const login = document.querySelector('#post-write-login');
  const form = document.querySelector('#post-form');
  const requiresLogin = !API.token;
  if (login) login.hidden = !requiresLogin;
  if (form) form.hidden = requiresLogin;
}

function searchPosts() {
  loadPosts({ force: true });
}

function resetPostFilters() {
  document.querySelector('#post-search').value = '';
  document.querySelector('#post-category-filter').value = '';
  document.querySelector('#post-tag-filter').value = '';
  document.querySelector('#post-sort').value = 'latest';
  loadPosts({ force: true });
}

async function postArticle(event) {
  event.preventDefault();
  const message = document.querySelector('#message');
  if (!API.token) {
    message.textContent = '게시글을 작성하려면 로그인해 주세요.';
    updateWriteAuthState();
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
    const achievements = (data.unlockedAchievements || []).map((item) => item.name).join(', ');
    const doneMessage = achievements ? `게시글 작성 완료! 업적 [${achievements}]을 받았습니다.` : '게시글 작성 완료!';
    message.textContent = doneMessage;
    document.querySelector('#posts-list-message').textContent = doneMessage;
    openPostsListTab();
    await loadPosts({ force: true });
  } catch (error) {
    message.textContent = error.message;
  }
}

async function initPosts() {
  if (postsInitialized) return;
  postsInitialized = true;
  postsPerfLog('posts init start');

  updateWriteAuthState();
  renderCategoryControls();
  setPostsTab(location.hash === '#write' ? 'write' : 'list', { updateHash: false });

  const postsPromise = loadPosts();
  const configPromise = loadCommunityConfig();
  const categoriesPromise = loadCategories();
  await Promise.allSettled([postsPromise, configPromise, categoriesPromise]);

  loadViewerForCategoryPermissions();
}

window.addEventListener('hashchange', () => {
  setPostsTab(location.hash === '#write' ? 'write' : 'list', { updateHash: false });
  updateWriteAuthState();
});

initPosts();
