const { pool } = require('../config/db');
const { getUtilizationSummary } = require('../services/utilizationService');

async function listUtilization(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM resource_utilization WHERE organization_id = ? ORDER BY date_value DESC`,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load utilization.' });
  }
}

async function getDashboardUtilization(req, res) {
  try {
    const summary = await getUtilizationSummary(pool, req.user.organization_id);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to build utilization summary.' });
  }
}

async function createUtilization(req, res) {
  try {
    const body = req.body || {};
    const [result] = await pool.query(
      `INSERT INTO resource_utilization (organization_id, resource_id, allocation_id, date_value, start_time, end_time, duration_minutes, user_id, department_id, purpose, utilization_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        body.resource_id,
        body.allocation_id || null,
        body.date_value || new Date().toISOString().split('T')[0],
        body.start_time || '09:00:00',
        body.end_time || '10:00:00',
        Number(body.duration_minutes) || 60,
        body.user_id || req.user.user_id,
        body.department_id || null,
        body.purpose || '',
        body.utilization_status || 'Scheduled',
      ]
    );
    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create utilization record.' });
  }
}

module.exports = { listUtilization, getDashboardUtilization, createUtilization };
