const { pool } = require('../config/db');

async function listTrends(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM strategic_trends WHERE organization_id = ? ORDER BY created_at DESC', [req.user.organization_id]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load trends.' });
  }
}

async function createTrend(req, res) {
  try {
    const body = req.body || {};
    const [result] = await pool.query(
      `INSERT INTO strategic_trends (organization_id, sector, period, trend_direction, trend_value, interest_level, investment_priority, important_client, future_priority, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        body.sector || '',
        body.period || '',
        body.trend_direction || 'Stable',
        body.trend_value || 0,
        body.interest_level || '',
        body.investment_priority || '',
        body.important_client || '',
        body.future_priority || '',
        body.notes || '',
      ]
    );
    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create trend.' });
  }
}

async function updateTrend(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    await pool.query(
      `UPDATE strategic_trends SET sector = ?, period = ?, trend_direction = ?, trend_value = ?, interest_level = ?, investment_priority = ?, important_client = ?, future_priority = ?, notes = ?
       WHERE id = ? AND organization_id = ?`,
      [body.sector || '', body.period || '', body.trend_direction || 'Stable', body.trend_value || 0, body.interest_level || '', body.investment_priority || '', body.important_client || '', body.future_priority || '', body.notes || '', id, req.user.organization_id]
    );
    return res.json({ success: true, message: 'Trend updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update trend.' });
  }
}

async function deleteTrend(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM strategic_trends WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    return res.json({ success: true, message: 'Trend removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete trend.' });
  }
}

module.exports = { listTrends, createTrend, updateTrend, deleteTrend };
