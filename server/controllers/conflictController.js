const { pool } = require('../config/db');
const { writeAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

const activeAllocationStatuses = ['Scheduled', 'In Progress'];
const activeRequestStatuses = ['Pending', 'Under Review', 'Recommended', 'Conflict'];

function calculateRiskScore(severity, priority) {
  const severityScore = { Critical: 96, High: 82, Medium: 58, Low: 32 }[severity] || 50;
  const priorityBoost = { Critical: 4, High: 3, Medium: 1, Low: 0 }[priority] || 0;
  return Math.min(100, severityScore + priorityBoost);
}

function suggestedAction(severity, alternatives) {
  if (alternatives.length) {
    return severity === 'Critical' || severity === 'High'
      ? 'Reassign to a recommended alternative resource before the deadline.'
      : 'Consider an alternative resource or adjust the booking window.';
  }
  return severity === 'Critical'
    ? 'Escalate immediately: no safe alternative is currently available.'
    : 'Review timing and priority, then reschedule or reject the lower-priority demand.';
}

async function findAlternatives(organizationId, conflict) {
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.code, r.location, r.capacity, r.quantity, rt.name AS resource_type_name
     FROM resources r
     LEFT JOIN resource_types rt ON rt.id = r.resource_type_id
     WHERE r.organization_id = ?
       AND r.id <> ?
       AND r.status IN ('Available', 'Partially Available')
       AND r.capacity >= ?
       AND NOT EXISTS (
         SELECT 1 FROM allocations a
         WHERE a.organization_id = r.organization_id
           AND a.resource_id = r.id
           AND a.allocated_date = ?
           AND a.status IN ('Scheduled', 'In Progress')
           AND a.start_time < ?
           AND a.end_time > ?
       )
       AND NOT EXISTS (
         SELECT 1 FROM resource_requests rr
         WHERE rr.organization_id = r.organization_id
           AND rr.resource_id = r.id
           AND rr.requested_date = ?
           AND rr.status IN ('Pending', 'Under Review', 'Recommended', 'Conflict')
           AND rr.start_time < ?
           AND rr.end_time > ?
       )
     ORDER BY CASE WHEN r.resource_type_id = (SELECT resource_type_id FROM resources WHERE id = ?) THEN 0 ELSE 1 END,
              r.capacity ASC, r.name
     LIMIT 3`,
    [
      organizationId,
      conflict.resource_id,
      Number(conflict.resource_capacity || 1),
      conflict.date_value,
      conflict.end_time,
      conflict.start_time,
      conflict.date_value,
      conflict.end_time,
      conflict.start_time,
      conflict.resource_id,
    ]
  );
  return rows;
}

async function listConflicts(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.request_id, c.conflict_type, c.severity, c.status, c.description,
              c.date_value, c.start_time, c.end_time,
              r.id AS resource_id, r.name AS resource_name, r.capacity AS resource_capacity,
              rr.project_name, rr.priority_level, rr.user_id AS requester_id,
              u.full_name AS requester_name, cr.project_name AS conflicting_project,
              cu.full_name AS conflicting_requester
       FROM conflicts c
       LEFT JOIN resources r ON r.id = c.resource_id AND r.organization_id = c.organization_id
       LEFT JOIN resource_requests rr ON rr.id = c.request_id AND rr.organization_id = c.organization_id
       LEFT JOIN users u ON u.id = rr.user_id AND u.organization_id = c.organization_id
       LEFT JOIN resource_requests cr ON cr.id = c.conflicting_request_id AND cr.organization_id = c.organization_id
       LEFT JOIN users cu ON cu.id = cr.user_id AND cu.organization_id = c.organization_id
       WHERE c.organization_id = ?
       ORDER BY FIELD(c.status, 'Open', 'Under Review', 'Rescheduled', 'Resolved', 'Rejected'), c.created_at DESC, c.id DESC`,
      [req.user.organization_id]
    );

    const enriched = await Promise.all(rows.map(async (conflict) => {
      const alternatives = await findAlternatives(req.user.organization_id, conflict);
      const risk_score = calculateRiskScore(conflict.severity, conflict.priority_level);
      return {
        ...conflict,
        risk_score,
        suggested_action: suggestedAction(conflict.severity, alternatives),
        alternatives,
      };
    }));

    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to load conflicts.' });
  }
}

async function getConflictById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM conflicts WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Conflict not found.' });
    const [requestRows] = await pool.query(
      'SELECT id, resource_id, project_name, priority_level, requested_date, start_time, end_time, status FROM resource_requests WHERE id = ? AND organization_id = ?',
      [rows[0].request_id, req.user.organization_id]
    );
    const conflict = { ...rows[0], request: requestRows[0] || null };
    conflict.resource_id = conflict.resource_id || conflict.request?.resource_id;
    conflict.resource_capacity = (await pool.query('SELECT capacity FROM resources WHERE id = ? AND organization_id = ? LIMIT 1', [conflict.resource_id, req.user.organization_id]))[0][0]?.capacity || 1;
    conflict.alternatives = await findAlternatives(req.user.organization_id, conflict);
    conflict.risk_score = calculateRiskScore(conflict.severity, conflict.request?.priority_level);
    conflict.suggested_action = suggestedAction(conflict.severity, conflict.alternatives);
    return res.json({ success: true, data: conflict });
  } catch (error) {
    console.error(error);
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
      `SELECT c.id, c.request_id, c.resource_id, rr.user_id, rr.project_name
       FROM conflicts c
       JOIN resource_requests rr ON rr.id = c.request_id AND rr.organization_id = c.organization_id
       WHERE c.id = ? AND c.organization_id = ? FOR UPDATE`,
      [id, req.user.organization_id]
    );
    if (!conflicts.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Conflict not found.' });
    }

    await connection.query(
      'UPDATE conflicts SET status = ?, description = ? WHERE id = ? AND organization_id = ?',
      [status, resolution_notes || '', id, req.user.organization_id]
    );

    if (status === 'Rejected') {
      await connection.query('UPDATE resource_requests SET status = \'Rejected\' WHERE id = ? AND organization_id = ?', [conflicts[0].request_id, req.user.organization_id]);
    } else if (status === 'Resolved') {
      await connection.query(
        `UPDATE resource_requests SET status = 'Pending'
         WHERE id = ? AND organization_id = ? AND status = 'Conflict'`,
        [conflicts[0].request_id, req.user.organization_id]
      );
    }

    await connection.commit();
    await writeAudit({
      organizationId: req.user.organization_id,
      userId: req.user.user_id || null,
      action: status === 'Resolved' ? 'Resolved conflict' : `Updated conflict to ${status}`,
      entityType: 'conflict',
      entityId: Number(id),
      details: { request_id: conflicts[0].request_id, resolution_notes: resolution_notes || '' },
    });
    if (conflicts[0].user_id) {
      await createNotification({
        organizationId: req.user.organization_id,
        userId: conflicts[0].user_id,
        title: `Conflict ${status.toLowerCase()}`,
        message: `${conflicts[0].project_name || 'Your request'} was reviewed by the resource decision team.`,
        type: status === 'Resolved' ? 'success' : 'warning',
        entityType: 'conflict',
        entityId: Number(id),
      });
    }

    return res.json({ success: true, message: status === 'Rejected' ? 'Conflict rejected and related request declined.' : `Conflict marked ${status.toLowerCase()}.` });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to resolve conflict.' });
  } finally {
    connection.release();
  }
}

async function reassignConflict(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const alternativeResourceId = Number(req.body?.resource_id);
    if (!Number.isInteger(alternativeResourceId) || alternativeResourceId < 1) {
      return res.status(400).json({ success: false, message: 'Choose a valid alternative resource.' });
    }

    await connection.beginTransaction();
    const [conflicts] = await connection.query(
      `SELECT c.id, c.request_id, c.resource_id, rr.user_id, rr.project_name, rr.requested_date, rr.start_time, rr.end_time, rr.status,
              old_resource.name AS old_resource_name
       FROM conflicts c
       JOIN resource_requests rr ON rr.id = c.request_id AND rr.organization_id = c.organization_id
       JOIN resources old_resource ON old_resource.id = c.resource_id AND old_resource.organization_id = c.organization_id
       WHERE c.id = ? AND c.organization_id = ? FOR UPDATE`,
      [id, req.user.organization_id]
    );
    if (!conflicts.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Conflict not found.' });
    }

    const conflict = conflicts[0];
    const [alternatives] = await connection.query(
      `SELECT r.id, r.name, r.capacity
       FROM resources r
       WHERE r.id = ? AND r.organization_id = ? AND r.status IN ('Available', 'Partially Available')
         AND NOT EXISTS (
           SELECT 1 FROM allocations a
           WHERE a.organization_id = r.organization_id AND a.resource_id = r.id AND a.allocated_date = ?
             AND a.status IN ('Scheduled', 'In Progress') AND a.start_time < ? AND a.end_time > ?
         )
         AND NOT EXISTS (
           SELECT 1 FROM resource_requests rr2
           WHERE rr2.organization_id = r.organization_id AND rr2.resource_id = r.id AND rr2.requested_date = ?
             AND rr2.status IN ('Pending', 'Under Review', 'Recommended', 'Conflict')
             AND rr2.start_time < ? AND rr2.end_time > ?
         )`,
      [alternativeResourceId, req.user.organization_id, conflict.requested_date, conflict.end_time, conflict.start_time, conflict.requested_date, conflict.end_time, conflict.start_time]
    );
    if (!alternatives.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'That resource is no longer available for this time window.' });
    }

    await connection.query(
      'UPDATE resource_requests SET resource_id = ?, status = \'Pending\' WHERE id = ? AND organization_id = ?',
      [alternativeResourceId, conflict.request_id, req.user.organization_id]
    );
    await connection.query(
      'UPDATE conflicts SET status = \'Resolved\', resource_id = ?, description = ? WHERE id = ? AND organization_id = ?',
      [alternativeResourceId, `Reassigned from ${conflict.old_resource_name} to ${alternatives[0].name} by the decision team.`, id, req.user.organization_id]
    );
    await connection.commit();

    await writeAudit({
      organizationId: req.user.organization_id,
      userId: req.user.user_id || null,
      action: 'Reassigned conflict',
      entityType: 'conflict',
      entityId: Number(id),
      details: { request_id: conflict.request_id, old_resource: conflict.old_resource_name, new_resource: alternatives[0].name },
    });
    if (conflict.user_id) {
      await createNotification({
        organizationId: req.user.organization_id,
        userId: conflict.user_id,
        title: 'Conflict resolved with alternative resource',
        message: `${conflict.project_name || 'Your request'} was moved to ${alternatives[0].name} and returned to the decision queue.`,
        type: 'success',
        entityType: 'conflict',
        entityId: Number(id),
      });
    }

    return res.json({ success: true, message: `Conflict resolved by reassigning the request to ${alternatives[0].name}.` });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to reassign conflict.' });
  } finally {
    connection.release();
  }
}

module.exports = { listConflicts, getConflictById, resolveConflict, reassignConflict };
