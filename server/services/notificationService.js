const { pool } = require('../config/db');

async function createNotification({ organizationId, userId, title, message, type = 'info', entityType = null, entityId = null }) {
  if (!organizationId || !userId || !title || !message) return null;
  const [result] = await pool.query(
    `INSERT INTO notifications (organization_id, user_id, title, message, type, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [organizationId, userId, title, message, type, entityType, entityId]
  );
  return result.insertId;
}

async function notifyOrganizationManagers({ organizationId, title, message, type = 'info', entityType = null, entityId = null }) {
  const [users] = await pool.query(
    `SELECT id FROM users
     WHERE organization_id = ? AND status = 'Active'
       AND (LOWER(role) IN ('manager','resource manager','administrator','admin','organization admin','super admin')
            OR LOWER(access_level) IN ('manager','resource manager','administrator'))`,
    [organizationId]
  );
  for (const user of users) {
    await createNotification({ organizationId, userId: user.id, title, message, type, entityType, entityId });
  }
}

module.exports = { createNotification, notifyOrganizationManagers };