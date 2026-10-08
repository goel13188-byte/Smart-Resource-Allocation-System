const { pool } = require('../config/db');

async function listNotifications(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, message, type, entity_type, entity_id, is_read, created_at, read_at
       FROM notifications
       WHERE organization_id = ? AND user_id = ?
       ORDER BY is_read ASC, created_at DESC
       LIMIT 100`,
      [req.user.organization_id, req.user.user_id]
    );
    const unread = rows.filter((row) => !row.is_read).length;
    return res.json({ success: true, data: rows, unread });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to load notifications.' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND organization_id = ? AND user_id = ?',
      [id, req.user.organization_id, req.user.user_id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Notification not found.' });
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update notification.' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE organization_id = ? AND user_id = ? AND is_read = 0',
      [req.user.organization_id, req.user.user_id]
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update notifications.' });
  }
}

module.exports = { listNotifications, markNotificationRead, markAllNotificationsRead };