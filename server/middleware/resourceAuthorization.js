const { pool } = require('../config/db');

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
}

function hasLeadershipAuthority(profile) {
  const values = [profile.role, profile.designation, profile.access_level].map(normalize);
  if (values.some((value) => ['admin', 'administrator', 'organization admin', 'super admin'].includes(value))) return true;
  return values.some((value) => /\b(ceo|chief executive|director|chairman|chairperson|department head|head of department|department chair|chair of department)\b/.test(value));
}

function hasDecisionAuthority(profile) {
  const role = normalize(profile.role);
  const accessLevel = normalize(profile.access_level);
  return hasLeadershipAuthority(profile)
    || /\b(manager|supervisor)\b/.test(role)
    || /\b(manager|supervisor)\b/.test(accessLevel);
}

function hasResourceManagementAuthority(profile) {
  const role = normalize(profile.role);
  const accessLevel = normalize(profile.access_level);
  const departmentName = normalize(profile.department_name);
  return hasLeadershipAuthority(profile)
    || departmentName.includes('logistics')
    || role.includes('logistics')
    || role === 'resource manager'
    || accessLevel === 'resource manager';
}

async function loadAuthority(req, res, next) {
  try {
    const userId = Number(req.user?.user_id || 0);
    const profile = {
      role: req.user?.role || '',
      designation: '',
      access_level: '',
      department_name: '',
    };

    if (userId > 0) {
      const [rows] = await pool.query(
        `SELECT u.role, u.designation, u.access_level, d.name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id AND d.organization_id = u.organization_id
         WHERE u.id = ? AND u.organization_id = ? AND u.status = 'Active'
         LIMIT 1`,
        [userId, req.user.organization_id]
      );
      if (!rows.length) return res.status(403).json({ success: false, message: 'Active organization membership is required.' });
      Object.assign(profile, rows[0]);
    }

    req.authority = {
      ...profile,
      canManageResources: hasResourceManagementAuthority(profile),
      canReviewResourceProposals: hasLeadershipAuthority(profile),
      canDecideRequests: hasDecisionAuthority(profile),
    };
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to verify your authority.' });
  }
}

function requireResourceManagement(req, res, next) {
  if (!req.authority?.canManageResources) {
    return res.status(403).json({ success: false, message: 'Only Logistics staff, Resource Managers, and senior organization leaders can manage resources. Submit a resource-addition request instead.' });
  }
  next();
}

function requireProposalReview(req, res, next) {
  if (!req.authority?.canReviewResourceProposals) {
    return res.status(403).json({ success: false, message: 'Only senior organization leaders can review resource-addition requests.' });
  }
  next();
}

function requireDecisionAuthority(req, res, next) {
  if (!req.authority?.canDecideRequests) {
    return res.status(403).json({ success: false, message: 'Only Managers and senior organization leaders can approve or reject requests and resolve conflicts.' });
  }
  next();
}

module.exports = { loadAuthority, requireResourceManagement, requireProposalReview, requireDecisionAuthority, hasLeadershipAuthority, hasDecisionAuthority, hasResourceManagementAuthority };