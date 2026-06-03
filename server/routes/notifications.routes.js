const express = require('express');
const authRequired = require('../middleware/auth');
const {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} = require('../services/notifications.service');

const router = express.Router();

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    const error = new Error('올바른 알림 ID가 필요합니다.');
    error.status = 400;
    throw error;
  }
  return id;
}

function safe(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : '알림 요청 처리 중 오류가 발생했습니다.' });
    }
  };
}

router.use(authRequired);

router.get('/', safe(async (req, res) => {
  return res.json({ success: true, ...(await listNotifications(req.user.id, req.query)) });
}));

router.get('/unread-count', safe(async (req, res) => {
  return res.json({ success: true, ...(await getUnreadCount(req.user.id)) });
}));

router.patch('/read-all', safe(async (req, res) => {
  return res.json({ success: true, ...(await markAllNotificationsRead(req.user.id, req.body || {})) });
}));

router.patch('/:id/read', safe(async (req, res) => {
  return res.json({ success: true, notification: await markNotificationRead(req.user.id, parseId(req.params.id)) });
}));

router.delete('/:id', safe(async (req, res) => {
  return res.json({ success: true, ...(await deleteNotification(req.user.id, parseId(req.params.id))) });
}));

module.exports = router;
