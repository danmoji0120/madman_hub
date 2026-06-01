const { run } = require('../db');

async function logActivity({ userId, action, platform = 'hub-admin', metadata = {}, isPublic = false }) {
  try {
    await run(
      'INSERT INTO activity_logs (user_id, action, platform, metadata, is_public) VALUES (?, ?, ?, ?, ?)',
      [userId, action, platform, JSON.stringify(metadata), isPublic ? 1 : 0]
    );
  } catch (error) {
    console.error('Failed to record activity log', error);
  }
}

function mapPublicActivity(item) {
  const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
  const isAnonymous = Boolean(metadata.isAnonymous);
  return {
    id: item.id,
    action: item.action,
    userId: isAnonymous ? null : item.user_id,
    displayName: isAnonymous ? '익명' : item.display_name,
    nickname: isAnonymous ? null : item.nickname,
    title: isAnonymous ? null : item.title,
    metadata,
    createdAt: item.created_at
  };
}

module.exports = {
  logActivity,
  mapPublicActivity
};
