const DAILY_MISSIONS = [
  { code: 'checkin', title: '오늘 출석', description: '출석 체크를 완료하세요.', target: 1, rewardPoints: 10 },
  { code: 'create_post', title: '기록문 작성', description: '게시글을 1개 작성하세요.', target: 1, rewardPoints: 15 },
  { code: 'create_comment', title: '증언 남기기', description: '댓글을 1개 작성하세요.', target: 1, rewardPoints: 10 },
  { code: 'view_random_post', title: '과거 기록 열람', description: '랜덤 게시글을 1개 확인하세요.', target: 1, rewardPoints: 5 },
  { code: 'recommend_song', title: '치료용 소음 제출', description: '노래를 1곡 추천하세요.', target: 1, rewardPoints: 15 },
  { code: 'view_random_song', title: '랜덤 소음 청취', description: '랜덤 노래를 1개 확인하세요.', target: 1, rewardPoints: 5 },
  { code: 'play_casino', title: '위험 행동 관찰', description: '카지노 게임을 1회 플레이하세요.', target: 1, rewardPoints: 10 },
  { code: 'mine_dig_5', title: '격리소 광산 작업', description: '광산에서 5회 채굴하세요.', target: 5, rewardPoints: 20, actionCode: 'mine_dig' }
];

const DAILY_MISSION_BONUSES = [
  { code: 'complete_3', title: '관찰 과제 3개 완료', requiredCompleted: 3, rewardPoints: 15 },
  { code: 'complete_all', title: '관찰 과제 전체 완료', requiredCompleted: 'all', rewardPoints: 25 }
];

const WEEKLY_MISSIONS = [
  { code: 'weekly_checkin_5', title: '이번 주 출석 5회', description: '이번 주에 5번 출석하세요.', target: 5, rewardPoints: 80, actionCode: 'checkin' },
  { code: 'weekly_comments_10', title: '댓글 10개 작성', description: '이번 주 댓글을 10개 남기세요.', target: 10, rewardPoints: 80, actionCode: 'create_comment' },
  { code: 'weekly_content_3', title: '글/노래추천 합산 3개', description: '게시글 또는 노래추천을 합산 3개 작성하세요.', target: 3, rewardPoints: 80, actionCodes: ['create_post', 'recommend_song'] },
  { code: 'weekly_mine_50', title: '광산 50회 채굴', description: '이번 주 광산에서 50회 채굴하세요.', target: 50, rewardPoints: 80, actionCode: 'mine_dig' },
  { code: 'weekly_casino_20', title: '카지노 20회 참여', description: '이번 주 카지노 게임을 20회 플레이하세요.', target: 20, rewardPoints: 80, actionCode: 'play_casino' }
];

const WEEKLY_MISSION_BONUSES = [
  { code: 'weekly_complete_5', title: '주간미션 5개 완료 보너스', requiredCompleted: 5, rewardPoints: 200 }
];

module.exports = { DAILY_MISSIONS, DAILY_MISSION_BONUSES, WEEKLY_MISSIONS, WEEKLY_MISSION_BONUSES };
