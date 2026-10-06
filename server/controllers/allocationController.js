const { pool } = require('../config/db');
const { createAllocation } = require('../services/allocationService');

async function listAllocations(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id AS id, a.allocated_date AS allocated_date, a.start_time, a.end_time, a.status AS status,
              r.name AS resource_name, u.full_name AS allocated_to_name
       FROM allocations a
       LEFT JOIN resources r ON r.id = a.resource_id
       LEFT JOIN users u ON u.id = a.allocated_to_user_id
       WHERE a.organization_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load allocations.' });
  }
}

async function getAllocationById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM allocations WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Allocation not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load allocation.' });
  }
}

async function createAllocationRequest(req, res) {
  try {
    const body = req.body || {};
    if (!body.request_id || !body.resource_id) {
      return res.status(400).json({ success: false, message: 'Request and resource IDs are required.' });
    }

    const allocationId = await createAllocation(pool, {
      organization_id: req.user.organization_id,
      request_id: body.request_id,
      resource_id: body.resource_id,
      allocated_to_user_id: body.allocated_to_user_id || req.user.user_id,
      allocated_by_user_id: req.user.user_id,
      allocated_date: body.allocated_date || new Date().toISOString().split('T')[0],
      start_time: body.start_time,
      end_time: body.end_time,
      recommendation_score: Number(body.recommendation_score) || 0,
      override_flag: body.override_flag ? 1 : 0,
      override_reason: body.override_reason || '',
    });

    await pool.query('UPDATE resource_requests SET status = ? WHERE id = ? AND organization_id = ?', ['Allocated', body.request_id, req.user.organization_id]);
    return res.status(201).json({ success: true, data: { id: allocationId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to create allocation.' });
  }
}

async function updateAllocation(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    await pool.query(
      `UPDATE allocations SET allocated_date = ?, start_time = ?, end_time = ?, status = ?, recommendation_score = ?, override_flag = ?, override_reason = ?
       WHERE id = ? AND organization_id = ?`,
      [body.allocated_date || null, body.start_time || null, body.end_time || null, body.status || 'Scheduled', Number(body.recommendation_score) || 0, body.override_flag ? 1 : 0, body.override_reason || '', id, req.user.organization_id]
    );
    return res.json({ success: true, message: 'Allocation updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update allocation.' });
  }
}

async function deleteAllocation(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM allocations WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    return res.json({ success: true, message: 'Allocation deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete allocation.' });
  }
}

module.exports = { listAllocations, getAllocationById, createAllocationRequest, updateAllocation, deleteAllocation };
