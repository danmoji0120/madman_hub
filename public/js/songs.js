function safeUrl(value) {
  return /^https?:\/\//i.test(value || '') ? value : '#';
}

function songCard(song) {
  return `
    <article class="card song-card">
      <h2>${API.escape(song.title)}</h2>
      <p class="meta">${API.escape(song.artist || '아티스트 미상')} · ${API.escape(song.authorName)} · ${API.escape(song.createdAt)}</p>
      <p>${API.escape(song.reason || '추천 이유 없음')}</p>
      <div class="tag-list">${song.tags.map((tag) => `<span class="tag">${API.escape(tag)}</span>`).join('')}</div>
      <a class="button secondary inline small-button" href="${API.escape(safeUrl(song.url))}" target="_blank" rel="noopener noreferrer">링크 열기</a>
    </article>
  `;
}

async function loadSongs() {
  const data = await API.request('/api/songs');
  document.querySelector('#songs-list').innerHTML = data.songs.map(songCard).join('') || '<p class="empty-state">아직 추천된 노래가 없습니다.</p>';
}

async function loadTodaySong() {
  try {
    const data = await API.request('/api/songs/today');
    document.querySelector('#today-song').innerHTML = songCard(data.song);
  } catch (error) {
    document.querySelector('#today-song').textContent = error.message;
  }
}

async function loadSongConfig() {
  const data = await API.request('/api/songs/config');
  document.querySelector('#anonymous-song-cost').textContent = data.config.anonymousSongCost ? `비용 ${formatPoints(data.config.anonymousSongCost)}` : '무료';
  document.querySelector('#song-reward-policy').textContent = `작성 보상 ${formatPoints(data.config.songRewardPoints)} · 일일 ${data.config.songRewardDailyLimit || '무제한'}회`;
}

async function loadRandomSong(button) {
  button.disabled = true;
  try {
    const data = await API.request('/api/songs/random');
    document.querySelector('#random-song').innerHTML = `${songCard(data.song)}${data.rewarded ? `<p class="reward-badge">${formatSignedPoints(data.rewardPoints)} 지급</p>` : ''}`;
  } catch (error) {
    document.querySelector('#random-song').textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function recommendSong(event) {
  event.preventDefault();
  const message = document.querySelector('#song-message');
  if (!API.token) {
    message.textContent = '노래를 추천하려면 로그인해 주세요.';
    return;
  }
  try {
    const data = await API.request('/api/songs', {
      method: 'POST',
      body: JSON.stringify({
        title: document.querySelector('#song-title').value,
        artist: document.querySelector('#song-artist').value,
        url: document.querySelector('#song-url').value,
        reason: document.querySelector('#song-reason').value,
        tags: document.querySelector('#song-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
        isAnonymous: document.querySelector('#song-anonymous').checked
      })
    });
    event.target.reset();
    message.textContent = `추천을 등록했습니다. ${formatSignedPoints(data.rewardPoints)}`;
    await Promise.all([loadSongs(), loadTodaySong()]);
  } catch (error) {
    message.textContent = error.message;
  }
}

Promise.all([loadSongs(), loadTodaySong(), loadSongConfig()]);
