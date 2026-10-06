const { pool } = require('../config/db');

async function listPriorities(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM organization_priorities WHERE organization_id = ? ORDER BY priority_level DESC',
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load priorities.' });
  }
}

async function createPriority(req, res) {
  try {
    const { priority_name, priority_level, description } = req.body || {};
    if (!priority_name) {
      return res.status(400).json({ success: false, message: 'Priority name is required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO organization_priorities (organization_id, priority_name, priority_level, description, is_active) VALUES (?, ?, ?, ?, 1)',
      [req.user.organization_id, priority_name, priority_level || 'Medium', description || '']
    );
    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create priority.' });
  }
}

async function updatePriority(req, res) {
  try {
    const { id } = req.params;
    const { priority_name, priority_level, description } = req.body || {};
    await pool.query(
      'UPDATE organization_priorities SET priority_name = ?, priority_level = ?, description = ? WHERE id = ? AND organization_id = ?',
      [priority_name || '', priority_level || 'Medium', description || '', id, req.user.organization_id]
    );
    return res.json({ success: true, message: 'Priority updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update priority.' });
  }
}

async function deletePriority(req, res) {
  try {
    const { id } = req.params;
    await pool.query('UPDATE organization_priorities SET is_active = 0 WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    return res.json({ success: true, message: 'Priority removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete priority.' });
  }
}

module.exports = { listPriorities, createPriority, updatePriority, deletePriority };
