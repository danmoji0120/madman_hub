const roleRank = {
  guest: 0,
  member: 1,
  admin: 2,
  owner: 3
};

function requireRole(minRole) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';

    if ((roleRank[userRole] ?? 0) < (roleRank[minRole] ?? 0)) {
      return res.status(403).json({ success: false, message: '권한이 부족합니다.' });
    }

    return next();
  };
}

module.exports = requireRole;
