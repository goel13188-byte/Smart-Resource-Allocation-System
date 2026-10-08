const { pool } = require('../config/db');

async function listDepartments(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, code, head_name, status
       FROM departments WHERE organization_id = ? ORDER BY name`,
      [req.user.organization_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load departments.' });
  }
}

async function getDepartmentHistory(req, res) {
  try {
    const departmentId = Number(req.params.id);
    const organizationId = req.user.organization_id;
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid department ID.' });
    }

    const [departmentRows] = await pool.query(
      'SELECT id, name, code, head_name, status FROM departments WHERE id = ? AND organization_id = ? LIMIT 1',
      [departmentId, organizationId]
    );
    if (!departmentRows.length) return res.status(404).json({ success: false, message: 'Department not found.' });

    const [members] = await pool.query(
      `SELECT id, member_code, full_name, designation, role, status
       FROM users WHERE organization_id = ? AND department_id = ?
       ORDER BY full_name LIMIT 80`,
      [organizationId, departmentId]
    );

    const [resources] = await pool.query(
      `SELECT r.id, r.code, r.name, r.location, r.status, r.capacity, r.quantity, rt.name AS resource_type_name
       FROM resources r
       LEFT JOIN resource_types rt ON rt.id = r.resource_type_id
       WHERE r.organization_id = ? AND r.department_id = ?
       ORDER BY r.name LIMIT 80`,
      [organizationId, departmentId]
    );

    const [requests] = await pool.query(
      `SELECT rr.id, rr.project_name, rr.requested_date, rr.start_time, rr.end_time, rr.priority_level, rr.status,
              u.full_name AS requester_name, r.name AS resource_name
       FROM resource_requests rr
       JOIN users u ON u.id = rr.user_id AND u.organization_id = rr.organization_id
       JOIN resources r ON r.id = rr.resource_id AND r.organization_id = rr.organization_id
       WHERE rr.organization_id = ? AND (rr.user_id IN (SELECT id FROM users WHERE organization_id = ? AND department_id = ?)
          OR r.department_id = ?)
       ORDER BY rr.requested_date DESC, rr.id DESC LIMIT 80`,
      [organizationId, organizationId, departmentId, departmentId]
    );

    const [allocations] = await pool.query(
      `SELECT a.id, a.allocated_date, a.start_time, a.end_time, a.status,
              u.full_name AS allocated_to_name, r.name AS resource_name, rr.project_name
       FROM allocations a
       JOIN resources r ON r.id = a.resource_id AND r.organization_id = a.organization_id
       LEFT JOIN users u ON u.id = a.allocated_to_user_id AND u.organization_id = a.organization_id
       LEFT JOIN resource_requests rr ON rr.id = a.request_id AND rr.organization_id = a.organization_id
       WHERE a.organization_id = ? AND (r.department_id = ? OR u.department_id = ?)
       ORDER BY a.allocated_date DESC, a.start_time DESC, a.id DESC LIMIT 80`,
      [organizationId, departmentId, departmentId]
    );

    const [conflicts] = await pool.query(
      `SELECT c.id, c.conflict_type, c.severity, c.status, c.description, c.date_value,
              r.name AS resource_name, rr.project_name, u.full_name AS requester_name
       FROM conflicts c
       JOIN resources r ON r.id = c.resource_id AND r.organization_id = c.organization_id
       JOIN resource_requests rr ON rr.id = c.request_id AND rr.organization_id = c.organization_id
       LEFT JOIN users u ON u.id = rr.user_id AND u.organization_id = rr.organization_id
       WHERE c.organization_id = ? AND (
         r.department_id = ? OR
         rr.user_id IN (SELECT id FROM users WHERE organization_id = ? AND department_id = ?)
       )
       ORDER BY c.date_value DESC, c.id DESC LIMIT 80`,
      [organizationId, departmentId, organizationId, departmentId]
    );

    const [maintenance] = await pool.query(
      `SELECT mt.id, mt.title, mt.ticket_type, mt.priority, mt.status, mt.scheduled_date, r.name AS resource_name
       FROM maintenance_tickets mt
       JOIN resources r ON r.id = mt.resource_id AND r.organization_id = mt.organization_id
       WHERE mt.organization_id = ? AND r.department_id = ?
       ORDER BY mt.created_at DESC LIMIT 50`,
      [organizationId, departmentId]
    );

    res.json({
      success: true,
      data: {
        department: departmentRows[0],
        summary: {
          members: members.length,
          resources: resources.length,
          requests: requests.length,
          allocations: allocations.length,
          conflicts: conflicts.length,
          resolved_conflicts: conflicts.filter((item) => ['Resolved', 'Rejected', 'Rescheduled'].includes(item.status)).length,
          maintenance: maintenance.length,
        },
        members,
        resources,
        requests,
        allocations,
        conflicts,
        maintenance,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load department history.' });
  }
}

async function createDepartment(req, res) {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, message: 'Department name is required.' });
    const [r] = await pool.query(
      'INSERT INTO departments (organization_id,name,code,head_name,status) VALUES (?,?,?,?,?)',
      [req.user.organization_id, b.name, b.code || '', b.head_name || '', 'Active']
    );
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to create department.' });
  }
}

async function updateDepartment(req, res) {
  try {
    const b = req.body || {};
    await pool.query(
      'UPDATE departments SET name=?,code=?,head_name=?,status=? WHERE id=? AND organization_id=?',
      [b.name || '', b.code || '', b.head_name || '', b.status || 'Active', req.params.id, req.user.organization_id]
    );
    res.json({ success: true, message: 'Department updated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to update department.' });
  }
}

async function deleteDepartment(req, res) {
  try {
    await pool.query('DELETE FROM departments WHERE id=? AND organization_id=?', [req.params.id, req.user.organization_id]);
    res.json({ success: true, message: 'Department deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to delete department.' });
  }
}

module.exports = { listDepartments, getDepartmentHistory, createDepartment, updateDepartment, deleteDepartment };
