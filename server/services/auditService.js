const { pool } = require('../config/db');

async function writeAudit({ organizationId, userId = null, action, entityType, entityId = null, details = {} }) {
  if (!organizationId || !action || !entityType) return;
  await pool.query(
    `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [organizationId, userId, action, entityType, entityId, typeof details === 'string' ? details : JSON.stringify(details)]
  );
}

module.exports = { writeAudit };