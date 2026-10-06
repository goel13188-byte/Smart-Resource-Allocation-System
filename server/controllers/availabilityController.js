const { pool } = require('../config/db');

async function listAvailability(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM resource_availability WHERE resource_id = ? ORDER BY FIELD(day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")',
      [id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load availability.' });
  }
}

async function createAvailability(req, res) {
  try {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, availability_status, notes } = req.body || {};
    const [result] = await pool.query(
      'INSERT INTO resource_availability (resource_id, day_of_week, start_time, end_time, availability_status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, day_of_week || 'Monday', start_time, end_time, availability_status || 'Available', notes || '']
    );
    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create availability.' });
  }
}

async function updateAvailability(req, res) {
  try {
    const { id } = req.params;
    const { day_of_week, start_time, end_time, availability_status, notes } = req.body || {};
    await pool.query(
      'UPDATE resource_availability SET day_of_week = ?, start_time = ?, end_time = ?, availability_status = ?, notes = ? WHERE id = ?',
      [day_of_week || 'Monday', start_time, end_time, availability_status || 'Available', notes || '', id]
    );
    return res.json({ success: true, message: 'Availability updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update availability.' });
  }
}

async function deleteAvailability(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM resource_availability WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Availability deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete availability.' });
  }
}

module.exports = { listAvailability, createAvailability, updateAvailability, deleteAvailability };
