const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function listUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, organization_id, department_id, member_code, full_name, email, phone, designation, role, access_level, status
       FROM users WHERE organization_id = ? ORDER BY full_name`,
      [req.user.organization_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load users.' });
  }
}

async function getUserById(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.organization_id, u.department_id, u.member_code, u.full_name, u.email, u.phone,
              u.designation, u.role, u.access_level, u.status, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id AND d.organization_id = u.organization_id
       WHERE u.id = ? AND u.organization_id = ?`,
      [req.params.id, req.user.organization_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load user.' });
  }
}

async function getUserHistory(req, res) {
  try {
    const userId = Number(req.params.id);
    const organizationId = req.user.organization_id;
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid member ID.' });
    }

    const [profileRows] = await pool.query(
      `SELECT u.id, u.member_code, u.full_name, u.email, u.phone, u.designation, u.role, u.access_level, u.status,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id AND d.organization_id = u.organization_id
       WHERE u.id = ? AND u.organization_id = ? LIMIT 1`,
      [userId, organizationId]
    );
    if (!profileRows.length) return res.status(404).json({ success: false, message: 'Member not found.' });

    const [requests] = await pool.query(
      `SELECT rr.id, rr.project_name, rr.purpose, rr.requested_date, rr.start_time, rr.end_time,
              rr.priority_level, rr.status, r.name AS resource_name, r.code AS resource_code
       FROM resource_requests rr
       JOIN resources r ON r.id = rr.resource_id AND r.organization_id = rr.organization_id
       WHERE rr.organization_id = ? AND rr.user_id = ?
       ORDER BY rr.requested_date DESC, rr.start_time DESC, rr.id DESC LIMIT 60`,
      [organizationId, userId]
    );

    const [allocations] = await pool.query(
      `SELECT a.id, a.allocated_date, a.start_time, a.end_time, a.status, a.recommendation_score,
              r.name AS resource_name, r.code AS resource_code, rr.project_name, rr.purpose
       FROM allocations a
       JOIN resources r ON r.id = a.resource_id AND r.organization_id = a.organization_id
       LEFT JOIN resource_requests rr ON rr.id = a.request_id AND rr.organization_id = a.organization_id
       WHERE a.organization_id = ? AND (a.allocated_to_user_id = ? OR a.allocated_by_user_id = ?)
       ORDER BY a.allocated_date DESC, a.start_time DESC, a.id DESC LIMIT 60`,
      [organizationId, userId, userId]
    );

    const [conflicts] = await pool.query(
      `SELECT c.id, c.conflict_type, c.severity, c.status, c.description, c.date_value, c.start_time, c.end_time,
              r.name AS resource_name, rr.project_name, rr.priority_level
       FROM conflicts c
       JOIN resources r ON r.id = c.resource_id AND r.organization_id = c.organization_id
       JOIN resource_requests rr ON rr.id = c.request_id AND rr.organization_id = c.organization_id
       LEFT JOIN resource_requests cr ON cr.id = c.conflicting_request_id AND cr.organization_id = c.organization_id
       WHERE c.organization_id = ? AND (rr.user_id = ? OR cr.user_id = ?)
       ORDER BY c.date_value DESC, c.id DESC LIMIT 60`,
      [organizationId, userId, userId]
    );

    const [maintenance] = await pool.query(
      `SELECT mt.id, mt.title, mt.ticket_type, mt.priority, mt.status, mt.scheduled_date,
              mt.completed_at, mt.estimated_cost, mt.actual_cost, r.name AS resource_name
       FROM maintenance_tickets mt
       JOIN resources r ON r.id = mt.resource_id AND r.organization_id = mt.organization_id
       WHERE mt.organization_id = ? AND (mt.requester_id = ? OR mt.assigned_to_id = ?)
       ORDER BY mt.created_at DESC LIMIT 50`,
      [organizationId, userId, userId]
    );

    const [audit] = await pool.query(
      `SELECT id, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       WHERE organization_id = ? AND user_id = ?
       ORDER BY created_at DESC, id DESC LIMIT 60`,
      [organizationId, userId]
    );

    res.json({
      success: true,
      data: {
        profile: profileRows[0],
        summary: {
          requests: requests.length,
          allocations: allocations.length,
          conflicts: conflicts.length,
          resolved_conflicts: conflicts.filter((item) => ['Resolved', 'Rejected', 'Rescheduled'].includes(item.status)).length,
          maintenance: maintenance.length,
          activity: audit.length,
        },
        requests,
        allocations,
        conflicts,
        maintenance,
        audit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load member history.' });
  }
}

async function createUser(req, res) {
  try {
    const b = req.body || {};
    if (!b.full_name || !b.email || !b.password) {
      return res.status(400).json({ success: false, message: 'Full name, email and password are required.' });
    }
    const [r] = await pool.query(
      'INSERT INTO users (organization_id,department_id,member_code,full_name,email,phone,designation,role,access_level,reporting_manager_id,password_hash,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [req.user.organization_id, b.department_id || null, b.member_code || `M-${Date.now()}`, b.full_name, b.email, b.phone || '', b.designation || '', b.role || 'Employee', b.access_level || 'Member', b.reporting_manager_id || null, await bcrypt.hash(b.password, 10), 'Active']
    );
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to create user.' });
  }
}

async function updateUser(req, res) {
  try {
    const b = req.body || {};
    await pool.query(
      'UPDATE users SET department_id=?,full_name=?,email=?,phone=?,designation=?,role=?,access_level=?,reporting_manager_id=?,status=? WHERE id=? AND organization_id=?',
      [b.department_id || null, b.full_name || '', b.email || '', b.phone || '', b.designation || '', b.role || 'Employee', b.access_level || 'Member', b.reporting_manager_id || null, b.status || 'Active', req.params.id, req.user.organization_id]
    );
    res.json({ success: true, message: 'User updated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to update user.' });
  }
}

async function deleteUser(req, res) {
  try {
    await pool.query('UPDATE users SET status=? WHERE id=? AND organization_id=?', ['Inactive', req.params.id, req.user.organization_id]);
    res.json({ success: true, message: 'User deactivated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to deactivate user.' });
  }
}

module.exports = { listUsers, getUserById, getUserHistory, createUser, updateUser, deleteUser };
