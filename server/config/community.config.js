function nonNegativeInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

module.exports = {
  anonymousPostCost: nonNegativeInteger('ANONYMOUS_POST_COST', 5),
  anonymousCommentCost: nonNegativeInteger('ANONYMOUS_COMMENT_COST', 2),
  commentRewardPoints: nonNegativeInteger('COMMENT_REWARD_POINTS', 5),
  commentRewardDailyLimit: nonNegativeInteger('COMMENT_REWARD_DAILY_LIMIT', 5),
  songRewardPoints: nonNegativeInteger('SONG_REWARD_POINTS', 10),
  anonymousSongCost: nonNegativeInteger('ANONYMOUS_SONG_COST', 3),
  songRewardDailyLimit: nonNegativeInteger('SONG_REWARD_DAILY_LIMIT', 3),
  randomSongRewardPoints: nonNegativeInteger('RANDOM_SONG_REWARD_POINTS', 1),
  randomSongRewardDailyLimit: nonNegativeInteger('RANDOM_SONG_REWARD_DAILY_LIMIT', 1)
};
