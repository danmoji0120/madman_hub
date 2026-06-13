const jwt = require('jsonwebtoken');
require('dotenv').config();

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const cookieToken = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('madmen_token=') || item.startsWith('token='))
    ?.split('=')
    .slice(1)
    .join('=');
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookieToken ? decodeURIComponent(cookieToken) : null;

  if (!token) {
    if (req.path.startsWith('/api/mercenary') || req.originalUrl?.startsWith('/api/mercenary')) {
      console.log('[mercenary/auth] token: missing');
      console.log('[mercenary/auth] cookie:', req.headers.cookie ? 'exists' : 'missing');
    }
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (req.path.startsWith('/api/mercenary') || req.originalUrl?.startsWith('/api/mercenary')) {
      console.log('[mercenary/auth] userId:', req.user?.id || null);
    }
    return next();
  } catch (error) {
    if (req.path.startsWith('/api/mercenary') || req.originalUrl?.startsWith('/api/mercenary')) {
      console.log('[mercenary/auth] token: invalid');
      console.log('[mercenary/auth] cookie:', req.headers.cookie ? 'exists' : 'missing');
    }
    return res.status(401).json({ success: false, message: '세션이 만료되었거나 유효하지 않습니다.' });
  }
}

module.exports = authRequired;
