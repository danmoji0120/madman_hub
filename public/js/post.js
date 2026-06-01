const postId = Number(new URLSearchParams(location.search).get('id'));
const postMessage = document.querySelector('#post-message');

function tagBadges(tags) {
  return (tags || []).map((tag) => `<span class="badge">${API.escape(tag)}</span>`).join(' ');
}

function renderPost(post) {
  document.querySelector('#post-detail').innerHTML = `
    <span class="badge">${API.escape(post.categoryLabel)}</span>
    <span class="badge">${API.escape(post.targetName || '관련 대상 없음')}</span>
    <h1>${API.escape(post.title)}</h1>
    <p>${API.escape(post.body)}</p>
    <p class="meta">작성자 ${API.escape(post.authorName || '알 수 없음')} · ${API.escape(post.createdAt)}</p>
    ${post.tags.length ? `<p>${tagBadges(post.tags)}</p>` : ''}
  `;
}

function renderComments(comments) {
  document.querySelector('#comments-list').innerHTML = comments.map((comment) => `
    <article class="comment-item">
      <strong>${API.escape(comment.authorName)}</strong>
      <p>${API.escape(comment.body)}</p>
      <span class="meta">${API.escape(comment.createdAt)}</span>
    </article>
  `).join('') || '<p class="empty-state">아직 댓글이 없습니다.</p>';
}

function renderCommentForm() {
  const root = document.querySelector('#comment-form-card');
  if (!API.token) {
    root.innerHTML = '<p><a href="/login.html">로그인</a>하면 댓글을 작성할 수 있습니다.</p>';
    return;
  }
  root.innerHTML = `
    <form onsubmit="submitComment(event)">
      <h2>댓글 작성</h2>
      <textarea class="textarea" id="comment-body" maxlength="1000" placeholder="댓글 내용"></textarea>
      <label class="checkbox-label"><input type="checkbox" id="comment-anonymous" /> 익명으로 작성 <span class="meta" id="anonymous-comment-cost">비용 확인 중</span></label>
      <button class="button" id="comment-submit" type="submit">댓글 남기기</button>
    </form>
  `;
}

async function loadCommunityConfig() {
  const data = await API.request('/api/posts/config');
  const root = document.querySelector('#anonymous-comment-cost');
  if (!root) return;
  root.textContent = data.config.anonymousCommentCost ? `비용 ${data.config.anonymousCommentCost}P` : '무료';
}

async function loadComments() {
  const data = await API.request(`/api/posts/${postId}/comments`);
  renderComments(data.comments);
}

async function submitComment(event) {
  event.preventDefault();
  const button = document.querySelector('#comment-submit');
  button.disabled = true;
  try {
    const data = await API.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: document.querySelector('#comment-body').value,
        isAnonymous: document.querySelector('#comment-anonymous').checked
      })
    });
    event.target.reset();
    postMessage.textContent = data.rewardAmount ? `댓글을 남겼습니다. ${data.rewardAmount}P를 받았습니다.` : '댓글을 남겼습니다.';
    await loadComments();
  } catch (error) {
    postMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function initPost() {
  renderCommentForm();
  await loadCommunityConfig();
  if (!Number.isInteger(postId) || postId < 1) {
    postMessage.textContent = '올바른 게시글 ID가 필요합니다.';
    return;
  }
  try {
    const data = await API.request(`/api/posts/${postId}`);
    renderPost(data.post);
    await loadComments();
  } catch (error) {
    document.querySelector('#post-detail').innerHTML = `<p class="empty-state">${API.escape(error.message)}</p>`;
    document.querySelector('#comments-list').innerHTML = '';
  }
}

initPost();
