function requireOrganizationAccess(req, res, next) {
  if (!req.user || !req.user.organization_id) {
    return res.status(401).json({ success: false, message: 'Organization context missing.' });
  }
  next();
}

module.exports = { requireOrganizationAccess };
