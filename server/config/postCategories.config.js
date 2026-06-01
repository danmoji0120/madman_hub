const POST_CATEGORIES = [
  { code: 'general', label: '잡담', public: true },
  { code: 'notice', label: '공지/안내', public: true, adminOnly: true },
  { code: 'meme', label: '짤/드립', public: true },
  { code: 'game', label: '게임', public: true },
  { code: 'casino', label: '카지노', public: true },
  { code: 'music', label: '음악', public: true },
  { code: 'anonymous', label: '익명', public: true },
  { code: 'record', label: '기록문', public: true },
  { code: 'suggestion', label: '건의사항', public: true }
];

const categoryMap = new Map(POST_CATEGORIES.map((category) => [category.code, category]));

function getPostCategory(code) {
  return categoryMap.get(code);
}

module.exports = { POST_CATEGORIES, getPostCategory };
