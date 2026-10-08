const { pool } = require('../config/db');
const { calculatePriorityScore, buildPriorityExplanation } = require('../services/priorityService');
const { findConflictsForRequest } = require('../services/conflictService');
const { isValidDate, isValidTime, toMinutes } = require('../utils/validation');
const { createNotification, notifyOrganizationManagers } = require('../services/notificationService');
const { writeAudit } = require('../services/auditService');

async function listRequests(req, res) {
  try {
    const [rows] = await pool.query(
      `
        SELECT rr.id AS id, rr.resource_id, rr.project_name, rr.requested_date, rr.start_time, rr.end_time, rr.status,
               rr.priority_level AS priority_level, rr.system_priority_score AS total_priority_score,
               r.name AS resource_name, u.full_name AS requester_name
        FROM resource_requests rr
        LEFT JOIN resources r ON r.id = rr.resource_id
        LEFT JOIN users u ON u.id = rr.user_id
        WHERE rr.organization_id = ?
        ORDER BY rr.created_at DESC
      `,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load requests.' });
  }
}

async function getRequestById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT rr.id AS id, rr.*, r.name AS resource_name, u.full_name AS requester_name
       FROM resource_requests rr
       LEFT JOIN resources r ON r.id = rr.resource_id
       LEFT JOIN users u ON u.id = rr.user_id
       WHERE rr.id = ? AND rr.organization_id = ?`,
      [id, req.user.organization_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load request.' });
  }
}

async function createRequest(req, res) {
  try {
    const body = req.body || {};
    const required = ['resource_id', 'purpose', 'project_name', 'requested_date', 'start_time', 'end_time'];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!isValidDate(body.requested_date) || !isValidTime(body.start_time) || !isValidTime(body.end_time)) {
      return res.status(400).json({ success: false, message: 'Enter a valid requested date and start/end times.' });
    }
    const durationMinutes = Math.round(toMinutes(body.start_time, body.end_time));
    if (durationMinutes <= 0) {
      return res.status(400).json({ success: false, message: 'End time must be later than start time.' });
    }
    const [resourceRows] = await pool.query('SELECT * FROM resources WHERE id = ? AND organization_id = ?', [body.resource_id, req.user.organization_id]);
    if (!resourceRows.length) return res.status(404).json({ success: false, message: 'Resource not found.' });

    const resource = resourceRows[0];
    const [priorityRows] = await pool.query('SELECT priority_name FROM organization_priorities WHERE organization_id = ? AND is_active = 1 LIMIT 5', [req.user.organization_id]);
    const strategicFlags = priorityRows.map((row) => row.priority_name);
    const departmentMatch = Boolean(resource.department_id && resource.department_id === req.user.department_id);
    const score = calculatePriorityScore({
      urgencyLevel: body.urgency_level || 'Medium',
      requestedPriority: body.priority_level || 'Medium',
      resourceStatus: resource.status,
      strategicFlags,
      deadlineDate: body.deadline,
      departmentMatch,
    });

    const conflictRows = await findConflictsForRequest(pool, {
      organization_id: req.user.organization_id,
      resource_id: body.resource_id,
      request_id: null,
      requested_date: body.requested_date,
      start_time: body.start_time,
      end_time: body.end_time,
    });

    const recommendation = conflictRows.length
      ? 'Conflict detected because another request overlaps the same resource during the same time window.'
      : `Recommended because this request has a priority score of ${score}/100 and the requested resource is available during the requested period.`;

    const [requestResult] = await pool.query(
      `INSERT INTO resource_requests (
        organization_id, user_id, resource_id, purpose, project_name, requested_date, start_time, end_time,
        duration_minutes, priority_level, deadline, notes, urgency_score, strategic_score, deadline_score,
        department_score, availability_score, total_priority_score, system_priority_score, status, recommendation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?, ? )`,
      [
        req.user.organization_id,
        req.user.user_id,
        body.resource_id,
        body.purpose,
        body.project_name,
        body.requested_date,
        body.start_time,
        body.end_time,
        durationMinutes,
        body.priority_level || 'Medium',
        body.deadline || null,
        body.notes || '',
        score,
        score,
        conflictRows.length ? 'Conflict' : 'Pending',
        recommendation,
      ]
    );

    const requestId = requestResult.insertId;
    const explanation = buildPriorityExplanation({
      score,
      urgencyLevel: body.urgency_level || 'Medium',
      requestedPriority: body.priority_level || 'Medium',
      deadlineDate: body.deadline,
      resourceStatus: resource.status,
      departmentMatch,
      strategicFlags,
    });

    await pool.query(
      `INSERT INTO request_priority_factors (request_id, urgency_score, strategic_score, deadline_score, department_score, availability_score, total_priority_score, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, 20, 12, 18, departmentMatch ? 12 : 6, resource.status === 'Available' ? 18 : 5, score, explanation]
    );

    if (conflictRows.length) {
      await pool.query(
        `INSERT INTO conflicts (organization_id, request_id, resource_id, conflicting_request_id, conflict_type, date_value, start_time, end_time, severity, status, description)
         VALUES (?, ?, ?, ?, 'Time overlap', ?, ?, ?, 'High', 'Open', 'Resource is already reserved during the requested period.')`,
        [req.user.organization_id, requestId, body.resource_id, conflictRows[0].id, body.requested_date, body.start_time, body.end_time]
      );
    }

    await createNotification({
      organizationId: req.user.organization_id,
      userId: req.user.user_id,
      title: conflictRows.length ? 'Resource request needs attention' : 'Resource request submitted',
      message: conflictRows.length
        ? `${body.project_name} was submitted, but a scheduling conflict was detected.`
        : `${body.project_name} was submitted for ${body.requested_date} from ${String(body.start_time).slice(0,5)} to ${String(body.end_time).slice(0,5)}.`,
      type: conflictRows.length ? 'warning' : 'success',
      entityType: 'resource_request',
      entityId: requestId,
    });
    await notifyOrganizationManagers({
      organizationId: req.user.organization_id,
      title: conflictRows.length ? 'New conflict requires review' : 'New resource request',
      message: `${body.project_name} requested ${resource.name} for ${body.requested_date}.`,
      type: conflictRows.length ? 'warning' : 'info',
      entityType: 'resource_request',
      entityId: requestId,
    });
    await writeAudit({
      organizationId: req.user.organization_id,
      userId: req.user.user_id,
      action: conflictRows.length ? 'Created resource request with conflict' : 'Created resource request',
      entityType: 'resource_request',
      entityId: requestId,
      details: { resource_id: body.resource_id, date: body.requested_date, start_time: body.start_time, end_time: body.end_time, priority: body.priority_level || 'Medium' },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: requestId,
        system_priority_score: score,
        recommendation,
        status: conflictRows.length ? 'Conflict' : 'Pending',
        explanation,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to create request.' });
  }
}

async function updateRequest(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    await pool.query(
      `UPDATE resource_requests SET purpose = ?, project_name = ?, requested_date = ?, start_time = ?, end_time = ?, duration_minutes = ?, priority_level = ?, deadline = ?, notes = ?
       WHERE id = ? AND organization_id = ?`,
      [body.purpose || '', body.project_name || '', body.requested_date, body.start_time, body.end_time, Math.max(0, Math.round(toMinutes(body.start_time, body.end_time))), body.priority_level || 'Medium', body.deadline || null, body.notes || '', id, req.user.organization_id]
    );
    return res.json({ success: true, message: 'Request updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update request.' });
  }
}

async function deleteRequest(req, res) {
  try {
    const { id } = req.params;
    await pool.query('UPDATE resource_requests SET status = ? WHERE id = ? AND organization_id = ?', ['Cancelled', id, req.user.organization_id]);
    return res.json({ success: true, message: 'Request cancelled.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to cancel request.' });
  }
}

module.exports = { listRequests, getRequestById, createRequest, updateRequest, deleteRequest };
