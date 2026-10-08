const { pool } = require('../config/db');

async function listAuditLogs(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.created_at,
              u.full_name AS user_name, u.member_code
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.organization_id = ?
       ORDER BY al.created_at DESC
       LIMIT 250`,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to load audit logs.' });
  }
}

module.exports = { listAuditLogs };