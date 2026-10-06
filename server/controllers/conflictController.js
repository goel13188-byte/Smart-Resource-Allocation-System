const { pool } = require('../config/db');

async function listConflicts(req, res) {
  try {
    const [rows] = await pool.query(
            `SELECT c.id AS id, c.request_id, c.conflict_type, c.severity, c.status AS status, c.description AS description,
              r.name AS resource_name, rr.project_name AS conflicting_project
       FROM conflicts c
       LEFT JOIN resources r ON r.id = c.resource_id
       LEFT JOIN resource_requests rr ON rr.id = c.conflicting_request_id
       WHERE c.organization_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load conflicts.' });
  }
}

async function getConflictById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM conflicts WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Conflict not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load conflict.' });
  }
}

async function resolveConflict(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body || {};
    if (!['Resolved', 'Rejected', 'Under Review', 'Rescheduled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Choose Resolved, Rejected, Under Review, or Rescheduled.' });
    }

    await connection.beginTransaction();
    const [conflicts] = await connection.query(
      'SELECT id, request_id FROM conflicts WHERE id = ? AND organization_id = ? FOR UPDATE',
      [id, req.user.organization_id]
    );
    if (!conflicts.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Conflict not found.' });
    }

    await connection.query(
      `UPDATE conflicts
       SET status = ?, description = ?
       WHERE id = ? AND organization_id = ?`,
      [status, resolution_notes || '', id, req.user.organization_id]
    );
    if (status === 'Rejected') {
      await connection.query(
        'UPDATE resource_requests SET status = \'Rejected\' WHERE id = ? AND organization_id = ?',
        [conflicts[0].request_id, req.user.organization_id]
      );
    } else if (status === 'Resolved') {
      await connection.query(
        `UPDATE resource_requests SET status = 'Pending'
         WHERE id = ? AND organization_id = ? AND status = 'Conflict'`,
        [conflicts[0].request_id, req.user.organization_id]
      );
    }
    await connection.commit();
    return res.json({ success: true, message: status === 'Rejected' ? 'Conflict rejected and related request declined.' : `Conflict marked ${status.toLowerCase()}.` });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to resolve conflict.' });
  } finally {
    connection.release();
  }
}

module.exports = { listConflicts, getConflictById, resolveConflict };
