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

module.exports = {
  logActivity
};
