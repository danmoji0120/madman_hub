const SEASON_STATUSES = ['scheduled', 'active', 'ended', 'archived'];

const SEASON_RANKING_CATEGORIES = [
  { code: 'activity_score', label: '활동 종합', description: '출석, 게시글, 댓글, 노래추천, 미션, 카지노 플레이 합계' },
  { code: 'point_earned', label: '포인트 획득', description: '시즌 중 획득한 포인트' },
  { code: 'point_spent', label: '포인트 소비', description: '시즌 중 사용한 포인트' },
  { code: 'net_points', label: '포인트 순증감', description: '획득 포인트와 사용 포인트의 합계' },
  { code: 'casino_profit', label: '카지노 수익', description: '카지노 순수익 합계' },
  { code: 'casino_loss', label: '카지노 대참사', description: '카지노 순손실 합계' },
  { code: 'casino_plays', label: '카지노 플레이', description: '카지노 게임 완료 횟수' },
  { code: 'post_count', label: '게시글 작성', description: '공개 게시글 작성 수' },
  { code: 'comment_count', label: '댓글 작성', description: '공개 댓글 작성 수' },
  { code: 'song_count', label: '노래추천', description: '공개 노래추천 수' },
  { code: 'daily_mission_count', label: '일일 미션', description: '완료한 일일 미션 수' },
  { code: 'cosmetic_spent', label: '꾸미기 소비', description: '꾸미기 아이템 구매에 사용한 포인트' },
  { code: 'attendance_count', label: '출석', description: '시즌 중 출석 수' }
];

function getSeasonRankingCategory(code) {
  return SEASON_RANKING_CATEGORIES.find((category) => category.code === code);
}

module.exports = { SEASON_STATUSES, SEASON_RANKING_CATEGORIES, getSeasonRankingCategory };
