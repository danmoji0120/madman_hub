const DAILY_MISSIONS = [
  { code: 'checkin', title: '오늘의 출석', description: '출석 체크를 완료하세요.', target: 1, rewardPoints: 5 },
  { code: 'create_post', title: '기록문 작성', description: '게시글을 1개 작성하세요.', target: 1, rewardPoints: 5 },
  { code: 'create_comment', title: '증언 남기기', description: '댓글을 1개 작성하세요.', target: 1, rewardPoints: 3 },
  { code: 'view_random_post', title: '과거 기록 열람', description: '랜덤 게시글을 1개 확인하세요.', target: 1, rewardPoints: 2 },
  { code: 'recommend_song', title: '치료용 음원 제출', description: '노래를 1곡 추천하세요.', target: 1, rewardPoints: 5 },
  { code: 'view_random_song', title: '랜덤 음원 청취', description: '랜덤 노래를 1개 확인하세요.', target: 1, rewardPoints: 2 },
  { code: 'play_casino', title: '위험 행동 관찰', description: '카지노 게임을 1회 플레이하세요.', target: 1, rewardPoints: 3 }
];

const DAILY_MISSION_BONUSES = [
  { code: 'complete_3', title: '관찰 과제 3개 완료', requiredCompleted: 3, rewardPoints: 10 },
  { code: 'complete_all', title: '관찰 과제 전체 완료', requiredCompleted: 'all', rewardPoints: 25 }
];

module.exports = { DAILY_MISSIONS, DAILY_MISSION_BONUSES };
