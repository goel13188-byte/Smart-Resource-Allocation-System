const { pool } = require('../config/db');

async function listApprovals(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.full_name AS approver_name, rr.project_name AS request_name
       FROM approvals a
       LEFT JOIN users u ON u.id = a.approver_id
       LEFT JOIN resource_requests rr ON rr.id = a.request_id
       WHERE a.organization_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load approvals.' });
  }
}

async function createApproval(req, res) {
  const connection = await pool.getConnection();
  try {
    const body = req.body || {};
    if (!body.request_id) return res.status(400).json({ success: false, message: 'Request ID is required.' });
    const decision = String(body.decision || '').trim();
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be Approved or Rejected.' });
    }
    if (decision === 'Rejected' && !String(body.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'A reason is required when rejecting a request.' });
    }

    await connection.beginTransaction();
    const [requests] = await connection.query(
      `SELECT id, resource_id, user_id, requested_date, start_time, end_time, system_priority_score, status FROM resource_requests
       WHERE id = ? AND organization_id = ? AND status NOT IN ('Approved', 'Rejected', 'Allocated', 'Completed', 'Cancelled')
       FOR UPDATE`,
      [body.request_id, req.user.organization_id]
    );
    if (!requests.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Open request not found.' });
    }

    const request = requests[0];
    let finalStatus = decision;
    let allocationId = null;
    if (decision === 'Approved') {
      if (request.status === 'Conflict') {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Resolve the open conflict before approving this request.' });
      }
      const [overlaps] = await connection.query(
        `SELECT id FROM allocations
         WHERE organization_id = ? AND resource_id = ? AND allocated_date = ?
           AND status NOT IN ('Cancelled', 'Rejected', 'Completed')
           AND TIME_TO_SEC(start_time) < TIME_TO_SEC(?)
           AND TIME_TO_SEC(end_time) > TIME_TO_SEC(?)
         FOR UPDATE`,
        [req.user.organization_id, request.resource_id, request.requested_date, request.end_time, request.start_time]
      );
      if (overlaps.length) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'This resource has an overlapping allocation for the requested time.' });
      }
      const [allocation] = await connection.query(
        `INSERT INTO allocations
         (organization_id, request_id, resource_id, allocated_to_user_id, allocated_by_user_id,
          allocated_date, start_time, end_time, status, recommendation_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?)`,
        [req.user.organization_id, request.id, request.resource_id, request.user_id, req.user.user_id || null,
          request.requested_date, request.start_time, request.end_time, request.system_priority_score || 0]
      );
      allocationId = allocation.insertId;
      finalStatus = 'Allocated';
    }

    const [result] = await connection.query(
      `INSERT INTO approvals (organization_id, request_id, approver_id, approval_level, decision, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.organization_id, body.request_id, req.user.user_id || null, String(body.approval_level || 'Manager'), decision, body.reason || '']
    );
    await connection.query(
      'UPDATE resource_requests SET status = ? WHERE id = ? AND organization_id = ?',
      [finalStatus, body.request_id, req.user.organization_id]
    );
    await connection.commit();
    return res.status(201).json({ success: true, data: { id: result.insertId, decision, status: finalStatus, allocation_id: allocationId } });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to create approval.' });
  } finally {
    connection.release();
  }
}

async function updateApproval(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const decision = String(body.decision || '').trim();
    if (!['Approved', 'Rejected', 'Modified', 'Rescheduled'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Choose a valid decision.' });
    }
    const [result] = await pool.query(
      'UPDATE approvals a JOIN resource_requests rr ON rr.id = a.request_id SET a.approval_level = ?, a.decision = ?, a.reason = ?, rr.status = ? WHERE a.id = ? AND rr.organization_id = ?',
      [String(body.approval_level || 'Manager'), decision, body.reason || '', decision, id, req.user.organization_id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Approval not found.' });
    return res.json({ success: true, message: 'Approval updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update approval.' });
  }
}

module.exports = { listApprovals, createApproval, updateApproval };
