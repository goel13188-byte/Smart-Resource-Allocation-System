const { pool } = require('../config/db');
const { createNotification, notifyOrganizationManagers } = require('../services/notificationService');
const { writeAudit } = require('../services/auditService');

const MANAGER_ROLES = ['manager', 'resource manager', 'administrator', 'admin', 'organization admin', 'super admin'];

function canManageMaintenance(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return MANAGER_ROLES.includes(role) || ['director', 'department head', 'head of department'].some((value) => role.includes(value));
}

async function listMaintenanceTickets(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT mt.*, r.name AS resource_name, r.code AS resource_code,
              requester.full_name AS requester_name, assignee.full_name AS assigned_to_name
       FROM maintenance_tickets mt
       LEFT JOIN resources r ON r.id = mt.resource_id
       LEFT JOIN users requester ON requester.id = mt.requester_id
       LEFT JOIN users assignee ON assignee.id = mt.assigned_to_id
       WHERE mt.organization_id = ?
       ORDER BY FIELD(mt.status, 'Open', 'In Progress', 'Scheduled', 'On Hold', 'Completed', 'Cancelled'), mt.created_at DESC`,
      [req.user.organization_id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to load maintenance tickets.' });
  }
}

async function createMaintenanceTicket(req, res) {
  try {
    const body = req.body || {};
    if (!body.resource_id || !String(body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Resource and maintenance title are required.' });
    }
    const [resources] = await pool.query(
      'SELECT id FROM resources WHERE id = ? AND organization_id = ? LIMIT 1',
      [body.resource_id, req.user.organization_id]
    );
    if (!resources.length) return res.status(404).json({ success: false, message: 'Resource not found.' });

    const [result] = await pool.query(
      `INSERT INTO maintenance_tickets
       (organization_id, resource_id, requester_id, assigned_to_id, ticket_type, priority, title, description, status, scheduled_date, estimated_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)`,
      [
        req.user.organization_id, body.resource_id, req.user.user_id, body.assigned_to_id || null,
        body.ticket_type || 'Preventive', body.priority || 'Medium', String(body.title).trim(),
        body.description || '', body.scheduled_date || null, Number(body.estimated_cost) || 0,
      ]
    );

    if (body.mark_resource_maintenance !== false) {
      await pool.query(
        "UPDATE resources SET status = 'Maintenance', lifecycle_status = 'Under Maintenance' WHERE id = ? AND organization_id = ?",
        [body.resource_id, req.user.organization_id]
      );
    }

    await createNotification({
      organizationId: req.user.organization_id,
      userId: req.user.user_id,
      title: 'Maintenance ticket created',
      message: `${resources[0].name}: ${String(body.title).trim()}`,
      type: 'warning',
      entityType: 'maintenance_ticket',
      entityId: result.insertId,
    });
    await notifyOrganizationManagers({
      organizationId: req.user.organization_id,
      title: 'New maintenance ticket',
      message: `${resources[0].name} needs ${body.ticket_type || 'maintenance'} attention.`,
      type: 'warning',
      entityType: 'maintenance_ticket',
      entityId: result.insertId,
    });
    await writeAudit({
      organizationId: req.user.organization_id,
      userId: req.user.user_id,
      action: 'Created maintenance ticket',
      entityType: 'maintenance_ticket',
      entityId: result.insertId,
      details: { resource_id: body.resource_id, ticket_type: body.ticket_type || 'Preventive', priority: body.priority || 'Medium' },
    });
    return res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Maintenance ticket created.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to create maintenance ticket.' });
  }
}

async function updateMaintenanceTicket(req, res) {
  if (!canManageMaintenance(req)) return res.status(403).json({ success: false, message: 'Maintenance management authority is required.' });
  try {
    const { id } = req.params;
    const body = req.body || {};
    const [existing] = await pool.query(
      'SELECT * FROM maintenance_tickets WHERE id = ? AND organization_id = ? LIMIT 1',
      [id, req.user.organization_id]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Maintenance ticket not found.' });

    const status = body.status || existing[0].status;
    const completedAt = status === 'Completed' ? new Date() : null;
    await pool.query(
      `UPDATE maintenance_tickets
       SET assigned_to_id = ?, ticket_type = ?, priority = ?, title = ?, description = ?, status = ?,
           scheduled_date = ?, completed_at = ?, resolution_notes = ?, estimated_cost = ?, actual_cost = ?
       WHERE id = ? AND organization_id = ?`,
      [
        body.assigned_to_id || existing[0].assigned_to_id || null, body.ticket_type || existing[0].ticket_type,
        body.priority || existing[0].priority, String(body.title || existing[0].title).trim(),
        body.description ?? existing[0].description ?? '', status,
        body.scheduled_date || existing[0].scheduled_date || null, completedAt,
        body.resolution_notes ?? existing[0].resolution_notes ?? '',
        Number(body.estimated_cost ?? existing[0].estimated_cost) || 0,
        Number(body.actual_cost ?? existing[0].actual_cost) || 0, id, req.user.organization_id,
      ]
    );

    if (status === 'Completed') {
      await pool.query(
        `UPDATE resources r JOIN maintenance_tickets mt ON mt.resource_id = r.id
         SET r.status = 'Available', r.lifecycle_status = 'Active', r.last_maintenance_at = NOW(),
             r.next_maintenance_at = CASE WHEN mt.ticket_type = 'Preventive' THEN DATE_ADD(NOW(), INTERVAL 90 DAY) ELSE NULL END
         WHERE mt.id = ? AND r.organization_id = ?`,
        [id, req.user.organization_id]
      );
    } else if (status === 'Cancelled') {
      await pool.query(
        `UPDATE resources r JOIN maintenance_tickets mt ON mt.resource_id = r.id
         SET r.status = 'Available', r.lifecycle_status = 'Active'
         WHERE mt.id = ? AND r.organization_id = ?`,
        [id, req.user.organization_id]
      );
    } else {
      await pool.query(
        `UPDATE resources r JOIN maintenance_tickets mt ON mt.resource_id = r.id
         SET r.status = 'Maintenance', r.lifecycle_status = 'Under Maintenance'
         WHERE mt.id = ? AND r.organization_id = ?`,
        [id, req.user.organization_id]
      );
    }

    await createNotification({
      organizationId: req.user.organization_id,
      userId: existing[0].requester_id || req.user.user_id,
      title: `Maintenance ticket ${status.toLowerCase()}`,
      message: `${existing[0].title} is now ${status}.`,
      type: status === 'Completed' ? 'success' : 'info',
      entityType: 'maintenance_ticket',
      entityId: Number(id),
    });
    await writeAudit({
      organizationId: req.user.organization_id,
      userId: req.user.user_id,
      action: `Maintenance ticket marked ${status}`,
      entityType: 'maintenance_ticket',
      entityId: Number(id),
      details: { resource_id: existing[0].resource_id, status },
    });
    return res.json({ success: true, message: 'Maintenance ticket updated.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to update maintenance ticket.' });
  }
}

module.exports = { listMaintenanceTickets, createMaintenanceTicket, updateMaintenanceTicket };