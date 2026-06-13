const mercenaries = [
  {
    name: '리아',
    rarity: 'C',
    role: '돌격 직원',
    level: 7,
    plus: 2,
    status: '잔고장 있음',
    injured: false,
    quote: '저 이번엔 안 다치죠? 저번에도 그렇게 말했잖아요.',
    meta: '저임금 선봉 · 약자 사냥 특화',
  },
  {
    name: '쿠로',
    rarity: 'B',
    role: '야간 처리반',
    level: 11,
    plus: 3,
    status: '정상 근무 중',
    injured: false,
    quote: '말 걸지 마세요. 퇴근 시간만 알려주세요.',
    meta: '후열 정리 · 첫 턴 속도 증가',
  },
  {
    name: '나나',
    rarity: 'C',
    role: '의료 담당',
    level: 9,
    plus: 1,
    status: '정상 근무 중',
    injured: false,
    quote: '제가 치료하는 입장인데 왜 제가 입원하죠?',
    meta: '회복 · 불평 누적 중',
  },
  {
    name: '마리',
    rarity: 'C',
    role: '방패 직원',
    level: 8,
    plus: 4,
    status: '의무실 입원',
    injured: true,
    quote: '맞는 건 자신 있어요. 자랑은 아니지만요.',
    meta: '맞기 전문 · 치료비 저렴',
  },
];

const feed = [
  '<strong>BB 채널 속보</strong> 정상인 사무소가 민수 사무소의 커피머신까지 털었습니다.',
  '<strong>굴욕 보고</strong> 철수 사무소가 3연속 방어 실패를 기록했습니다. 문단속 교육이 필요합니다.',
  '<strong>산재 알림</strong> 리아가 또 넘어졌습니다. 본인은 바닥이 공격했다고 주장 중입니다.',
];

const logs = {
  raid: [
    '정상인 사무소 처리반이 철수 사무소 뒷문으로 진입했습니다. 비상벨은 이미 고장 나 있었습니다.',
    '1턴: 리아가 선봉으로 뛰쳐나갔습니다. 말릴 시간이 없었습니다.',
    '1턴: 쿠로가 상대 후열의 퇴근 동선을 차단했습니다.',
    '2턴: 나나가 “이건 추가수당감이에요”라며 아군을 치료했습니다.',
    '3턴: 철수 사무소의 에이스가 책상 너머로 굴러떨어졌습니다.',
    '결과: 습격 성공. 시즌 점수 +10. BB 채널 박제 완료.',
  ],
  mission: [
    '현상금 사냥 의뢰를 수락했습니다. 계약서 하단의 작은 글씨는 아무도 읽지 않았습니다.',
    '리아가 목표를 발견하자마자 뛰쳐나갔습니다.',
    '쿠로는 조용히 뒤를 잡았고, 나나는 뒤에서 산재 양식을 꺼냈습니다.',
    '결과: 성공. 40P와 경험치 25를 획득했습니다. 리아는 경상입니다. 늘 그렇죠.',
  ],
  contract: [
    '암시장 면접이 시작되었습니다. 신원 확인은 생략했습니다.',
    'B급 야간 처리반 후보가 문을 열고 들어왔습니다.',
    '후보자: “복지는 됐고, 퇴근만 지켜주세요.”',
    '계약 성사. 포인트 500P가 사라졌습니다. 선배의 판단력도 같이 사라진 듯합니다.',
  ],
  revenge: [
    '복수 요청서를 개봉했습니다. 종이에서 분노와 미납 치료비 냄새가 납니다.',
    '철수 사무소가 선배의 야간 당직조를 털고 간 기록이 확인되었습니다.',
    '복수 가능 시간: 21시간. 권장 대응: 지금 당장 찾아가서 책상을 엎기.',
  ],
};

function renderMercenaries() {
  const root = document.getElementById('merc-card-grid');
  if (!root) return;
  root.innerHTML = mercenaries.map((merc) => `
    <article class="proto-merc-card ${merc.injured ? 'is-injured' : ''}">
      <div class="merc-art" data-role="${escapeHtml(merc.role)}">
        <span class="merc-rarity">${escapeHtml(merc.rarity)}</span>
      </div>
      <div class="merc-info">
        <div>
          <h3>${escapeHtml(merc.name)}</h3>
          <div class="merc-meta">Lv.${merc.level} · +${merc.plus}강 · ${escapeHtml(merc.meta)}</div>
        </div>
        <span class="status-chip ${merc.injured ? 'injured' : ''}">${escapeHtml(merc.status)}</span>
        <div class="merc-quote">“${escapeHtml(merc.quote)}”</div>
      </div>
    </article>
  `).join('');
}

function renderFeed(extra) {
  const root = document.getElementById('office-feed');
  if (!root) return;
  const items = extra ? [extra, ...feed] : feed;
  root.innerHTML = items.map((item) => `<div class="feed-item">${item}</div>`).join('');
}

function setBattleLog(type) {
  const root = document.getElementById('battle-log');
  if (!root) return;
  root.innerHTML = (logs[type] || logs.raid).map((line) => `<li>${escapeHtml(line)}</li>`).join('');
}

function openGameTab(tabName) {
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tabName;
  });
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
}

function showToast(message) {
  const toast = document.getElementById('office-toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function handleAction(action) {
  switch (action) {
    case 'raid':
      openGameTab('raid');
      setBattleLog('raid');
      renderFeed('<strong>BB 채널 속보</strong> 정상인 사무소가 철수 사무소를 3턴 만에 털었습니다. 철수 소장은 아직 현실을 받아들이지 못하고 있습니다.');
      updateText('raid-count', '3곳');
      showToast('습격 성공. 전광판 박제까지 완료됐습니다. 아주 저급하고 훌륭하네요♡');
      break;
    case 'mission':
      openGameTab('raid');
      setBattleLog('mission');
      renderFeed('<strong>의뢰 보고</strong> 현상금 사냥이 성공했습니다. 리아는 또 다쳤지만 본인은 괜찮다고 우기고 있습니다.');
      showToast('사고 의뢰판 결과가 작성됐습니다. 종이 냄새가 피곤하네요.');
      break;
    case 'contract':
      openGameTab('staff');
      setBattleLog('contract');
      renderFeed('<strong>계약 알림</strong> 신원 미상의 B급 직원이 사무소에 합류했습니다. 도망가기 전에 굴리세요.');
      showToast('암시장 면접 완료. 포인트와 양심이 같이 차감됐습니다.');
      break;
    case 'revenge':
      openGameTab('raid');
      setBattleLog('revenge');
      showToast('복수 요청서를 열었습니다. 뒤끝은 훌륭한 접속 동기랍니다♡');
      break;
    case 'treat':
      openGameTab('clinic');
      updateText('office-balance', '2,060P');
      updateText('injury-count', '0명 입원');
      document.getElementById('clinic-bed').innerHTML = `
        <div class="clinic-portrait">퇴원</div>
        <div>
          <span class="office-kicker">처리 완료</span>
          <h3>리아가 산재 처리실에서 탈출했습니다</h3>
          <p>치료비 420P가 청구되었습니다. 리아는 “다음엔 월급도 같이 올려주세요”라고 말했습니다.</p>
          <strong>남은 치료비: 0P</strong>
        </div>
      `;
      renderFeed('<strong>의무실 알림</strong> 리아가 퇴원했습니다. 치료비 420P는 소장님의 지갑을 찢고 나갔습니다.');
      showToast('치료 완료. 선배의 포인트가 건강 대신 희생됐습니다.');
      break;
    case 'ignore':
      showToast('누워 있게 했습니다. 복지는 없지만 운영비는 아꼈네요. 정말 악덕입니다♡');
      break;
    default:
      showToast('아직 연결되지 않은 지시입니다. 선배 손가락만 바빴네요.');
  }
}

function updateText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('click', (event) => {
  const tabButton = event.target.closest('[data-tab]');
  if (tabButton) {
    openGameTab(tabButton.dataset.tab);
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  handleAction(button.dataset.action);
});

renderMercenaries();
renderFeed();
openGameTab('home');
