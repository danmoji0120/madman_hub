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
  { code: 'community_activity', label: '커뮤니티 활동', description: '게시글×3 + 댓글×1 + 노래추천×2 통합 점수' },
  { code: 'daily_mission_count', label: '일일 미션', description: '완료한 일일 미션 수' },
  { code: 'cosmetic_spent', label: '꾸미기 소비', description: '꾸미기 아이템 구매에 사용한 포인트' },
  { code: 'attendance_count', label: '출석', description: '시즌 중 출석 수' },
  { code: 'balance_peak', label: '최고 보유 포인트', description: '시즌 중 기록한 최고 잔고' },
  { code: 'drawdown', label: '최고점 추락', description: '최고 잔고 대비 현재 잔고 하락폭' },
  { code: 'drawdown_rate', label: '추락률', description: '최고점 대비 하락률' },
  { code: 'casino_net_profit', label: '카지노 순수익', description: '카지노 전체 순이익' },
  { code: 'casino_net_loss', label: '카지노 순손실', description: '카지노 전체 순손실 절댓값' },
  { code: 'biggest_casino_win', label: '단일 최대 승리', description: '카지노 단일 결과 최대 순이익' },
  { code: 'biggest_casino_loss', label: '단일 최대 손실', description: '카지노 단일 결과 최대 순손실' },
  { code: 'point_turnover', label: '포인트 회전율', description: '시즌 소비 포인트 / 획득 포인트' },
  { code: 'russian_cashout_count', label: '러시안 2발 캐시아웃', description: '러시안 룰렛 2발 캐시아웃 반복 횟수' },
  { code: 'blackjack_profit', label: '블랙잭 순수익', description: '주사위 블랙잭 순이익' }
];

function getSeasonRankingCategory(code) {
  return SEASON_RANKING_CATEGORIES.find((category) => category.code === code);
}

module.exports = { SEASON_STATUSES, SEASON_RANKING_CATEGORIES, getSeasonRankingCategory };
