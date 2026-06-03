const TROPHY_GROUPS = {
  point: {
    label: '포인트 기록',
    categories: ['point_earned', 'net_points', 'balance_peak'],
    priority: ['point_earned', 'balance_peak', 'net_points'],
    itemLabels: {
      point_earned: '획득',
      balance_peak: '최고 보유',
      net_points: '순증감'
    }
  },
  point_spent: {
    label: '포인트 소각 기록',
    categories: ['point_spent', 'cosmetic_spent', 'point_turnover'],
    priority: ['point_spent', 'point_turnover', 'cosmetic_spent'],
    itemLabels: {
      point_spent: '소비',
      point_turnover: '회전율',
      cosmetic_spent: '꾸미기 소비'
    }
  },
  casino_profit: {
    label: '카지노 수익 기록',
    categories: ['casino_profit', 'casino_net_profit', 'blackjack_profit', 'biggest_casino_win'],
    priority: ['casino_profit', 'blackjack_profit', 'casino_net_profit', 'biggest_casino_win'],
    itemLabels: {
      casino_profit: '카지노 수익',
      blackjack_profit: '블랙잭 순수익',
      casino_net_profit: '카지노 순수익',
      biggest_casino_win: '단일 최대 승리'
    }
  },
  casino_loss: {
    label: '카지노 손실 기록',
    categories: ['casino_loss', 'casino_net_loss', 'biggest_casino_loss'],
    priority: ['casino_loss', 'biggest_casino_loss', 'casino_net_loss'],
    itemLabels: {
      casino_loss: '카지노 대참사',
      biggest_casino_loss: '단일 최대 손실',
      casino_net_loss: '카지노 순손실'
    }
  },
  drawdown: {
    label: '최고점 추락 기록',
    categories: ['drawdown', 'drawdown_rate'],
    priority: ['drawdown', 'drawdown_rate'],
    itemLabels: {
      drawdown: '추락폭',
      drawdown_rate: '추락률'
    }
  },
  activity: {
    label: '활동 기록',
    categories: ['activity_score', 'post_count', 'comment_count', 'daily_mission_count', 'attendance_count'],
    priority: ['activity_score', 'comment_count', 'post_count', 'daily_mission_count', 'attendance_count'],
    itemLabels: {
      activity_score: '활동 종합',
      comment_count: '댓글',
      post_count: '게시글',
      daily_mission_count: '일일 미션',
      attendance_count: '출석'
    }
  },
  casino_behavior: {
    label: '카지노 행동 기록',
    categories: ['casino_plays', 'russian_cashout_count'],
    priority: ['casino_plays', 'russian_cashout_count'],
    itemLabels: {
      casino_plays: '카지노 플레이',
      russian_cashout_count: '러시안 2발 캐시아웃'
    }
  },
  content: {
    label: '콘텐츠 기록',
    categories: ['song_count'],
    priority: ['song_count'],
    itemLabels: {
      song_count: '노래추천'
    }
  },
  misc: {
    label: '기타 시즌 기록',
    categories: [],
    priority: [],
    itemLabels: {}
  }
};

const CATEGORY_TO_GROUP = Object.entries(TROPHY_GROUPS).reduce((map, [groupKey, config]) => {
  for (const category of config.categories) map.set(category, groupKey);
  return map;
}, new Map());

function getTrophyGroupKey(category) {
  return CATEGORY_TO_GROUP.get(category) || 'misc';
}

function getTrophyGroupConfig(groupKey) {
  return TROPHY_GROUPS[groupKey] || TROPHY_GROUPS.misc;
}

module.exports = {
  TROPHY_GROUPS,
  getTrophyGroupKey,
  getTrophyGroupConfig
};
