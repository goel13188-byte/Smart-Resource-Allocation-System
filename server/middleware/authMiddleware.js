const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Authentication is not configured.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      user_id: decoded.user_id,
      organization_id: decoded.organization_id,
      role: decoded.role || 'member',
      email: decoded.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role || 'member';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
  };
}

module.exports = { protect, requireRole };
