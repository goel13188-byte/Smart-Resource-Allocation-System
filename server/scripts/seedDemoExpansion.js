require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('../config/db');

const orgCode = 'ABC-TECH-001';
const password = 'password';

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function weekStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function addDays(base, amount) {
  const date = new Date(base);
  date.setDate(date.getDate() + amount);
  return date;
}

async function getId(connection, sql, params) {
  const [rows] = await connection.execute(sql, params);
  return rows[0]?.id || null;
}

async function ensureDepartment(connection, orgId, spec) {
  const existing = await getId(connection, 'SELECT id FROM departments WHERE organization_id = ? AND code = ? LIMIT 1', [orgId, spec.code]);
  if (existing) return existing;
  const [result] = await connection.execute(
    'INSERT INTO departments (organization_id, name, code, head_name, status) VALUES (?, ?, ?, ?, ?)',
    [orgId, spec.name, spec.code, spec.head_name, 'Active']
  );
  return result.insertId;
}

async function ensureUser(connection, orgId, departmentId, spec, passwordHash) {
  const existing = await getId(connection, 'SELECT id FROM users WHERE organization_id = ? AND member_code = ? LIMIT 1', [orgId, spec.member_code]);
  if (existing) return existing;
  const [result] = await connection.execute(
    `INSERT INTO users
      (organization_id, department_id, member_code, full_name, email, phone, designation, role, access_level, password_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
    [orgId, departmentId, spec.member_code, spec.full_name, spec.email, spec.phone, spec.designation, spec.role, spec.role === 'Manager' ? 'Manager' : 'Member', passwordHash]
  );
  return result.insertId;
}

async function ensureResource(connection, orgId, departmentId, typeId, spec) {
  const existing = await getId(connection, 'SELECT id FROM resources WHERE organization_id = ? AND code = ? LIMIT 1', [orgId, spec.code]);
  if (existing) return existing;
  const [result] = await connection.execute(
    `INSERT INTO resources
      (organization_id, resource_type_id, code, name, description, location, capacity, quantity, max_allotted_minutes,
       department_id, responsible_person, status, image_name, asset_tag, serial_number, vendor_name, purchase_date,
       warranty_until, lifecycle_status, next_maintenance_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orgId, typeId, spec.code, spec.name, spec.description, spec.location, spec.capacity, spec.quantity, spec.max_minutes,
      departmentId, spec.responsible_person, spec.status, spec.image_name, spec.asset_tag, spec.serial_number,
      spec.vendor_name, spec.purchase_date, spec.warranty_until, spec.lifecycle_status, spec.next_maintenance_at,
    ]
  );
  return result.insertId;
}

async function ensureRequest(connection, orgId, userId, resourceId, spec) {
  const existing = await getId(connection, 'SELECT id FROM resource_requests WHERE organization_id = ? AND project_name = ? LIMIT 1', [orgId, spec.project_name]);
  if (existing) return existing;
  const duration = spec.duration_minutes;
  const [result] = await connection.execute(
    `INSERT INTO resource_requests
      (organization_id, user_id, resource_id, purpose, project_name, requested_date, start_time, end_time, duration_minutes,
       priority_level, deadline, notes, urgency_score, strategic_score, deadline_score, department_score, availability_score,
       total_priority_score, system_priority_score, status, recommendation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orgId, userId, resourceId, spec.purpose, spec.project_name, spec.requested_date, spec.start_time, spec.end_time,
      duration, spec.priority, spec.deadline, spec.notes, spec.urgency, spec.strategic, spec.deadline_score,
      spec.department_score, spec.availability_score, spec.total_score, spec.total_score, spec.status, spec.recommendation,
    ]
  );
  return result.insertId;
}

async function ensureApproval(connection, orgId, requestId, approverId, decision, reason) {
  const [rows] = await connection.execute('SELECT id FROM approvals WHERE organization_id = ? AND request_id = ? LIMIT 1', [orgId, requestId]);
  if (rows.length) return rows[0].id;
  const [result] = await connection.execute(
    'INSERT INTO approvals (organization_id, request_id, approver_id, approval_level, decision, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [orgId, requestId, approverId, 'Manager', decision, reason]
  );
  return result.insertId;
}

async function ensureAllocation(connection, orgId, requestId, resourceId, userId, managerId, date, start, end, score) {
  const [rows] = await connection.execute('SELECT id FROM allocations WHERE organization_id = ? AND request_id = ? LIMIT 1', [orgId, requestId]);
  if (rows.length) return rows[0].id;
  const [result] = await connection.execute(
    `INSERT INTO allocations
      (organization_id, request_id, resource_id, allocated_to_user_id, allocated_by_user_id, allocated_date, start_time, end_time,
       status, recommendation_score, override_flag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, 0)`,
    [orgId, requestId, resourceId, userId, managerId, date, start, end, score]
  );
  return result.insertId;
}

async function ensureUtilization(connection, orgId, resourceId, allocationId, userId, departmentId, date, start, end, duration, purpose) {
  const [rows] = await connection.execute('SELECT id FROM resource_utilization WHERE organization_id = ? AND allocation_id = ? LIMIT 1', [orgId, allocationId]);
  if (rows.length) return;
  await connection.execute(
    `INSERT INTO resource_utilization
      (organization_id, resource_id, allocation_id, date_value, start_time, end_time, duration_minutes, user_id, department_id, purpose, utilization_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
    [orgId, resourceId, allocationId, date, start, end, duration, userId, departmentId, purpose]
  );
}

async function ensureConflict(connection, orgId, requestId, resourceId, conflictingRequestId, date, start, end, severity, status, description) {
  const [rows] = await connection.execute(
    'SELECT id FROM conflicts WHERE organization_id = ? AND request_id = ? AND conflicting_request_id = ? LIMIT 1',
    [orgId, requestId, conflictingRequestId]
  );
  if (rows.length) return rows[0].id;
  const [result] = await connection.execute(
    `INSERT INTO conflicts
      (organization_id, request_id, resource_id, conflicting_request_id, conflict_type, date_value, start_time, end_time, severity, status, description)
     VALUES (?, ?, ?, ?, 'Time Overlap', ?, ?, ?, ?, ?, ?)`,
    [orgId, requestId, resourceId, conflictingRequestId, date, start, end, severity, status, description]
  );
  return result.insertId;
}

async function ensureAudit(connection, orgId, userId, action, entityType, entityId, details) {
  const [rows] = await connection.execute(
    'SELECT id FROM audit_logs WHERE organization_id = ? AND action = ? AND entity_type = ? AND entity_id = ? AND details = ? LIMIT 1',
    [orgId, action, entityType, entityId, details]
  );
  if (rows.length) return;
  await connection.execute(
    'INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)',
    [orgId, userId, action, entityType, entityId, details]
  );
}

async function ensureNotification(connection, orgId, userId, title, message, type, entityType, entityId) {
  const [rows] = await connection.execute(
    'SELECT id FROM notifications WHERE organization_id = ? AND user_id = ? AND title = ? AND message = ? LIMIT 1',
    [orgId, userId, title, message]
  );
  if (rows.length) return;
  await connection.execute(
    'INSERT INTO notifications (organization_id, user_id, title, message, type, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [orgId, userId, title, message, type, entityType, entityId]
  );
}

async function ensureMaintenance(connection, orgId, resourceId, requesterId, managerId, spec) {
  const [rows] = await connection.execute(
    'SELECT id FROM maintenance_tickets WHERE organization_id = ? AND title = ? LIMIT 1',
    [orgId, spec.title]
  );
  if (rows.length) return rows[0].id;
  const [result] = await connection.execute(
    `INSERT INTO maintenance_tickets
      (organization_id, resource_id, requester_id, assigned_to_id, ticket_type, priority, title, description, status, scheduled_date, estimated_cost, actual_cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orgId, resourceId, requesterId, managerId, spec.ticket_type, spec.priority, spec.title, spec.description, spec.status, spec.scheduled_date, spec.estimated_cost, spec.actual_cost]
  );
  return result.insertId;
}

async function main() {
  if (!await initializeDatabase()) throw new Error('Database is unavailable.');
  const connection = await pool.getConnection();
  try {
    const [organizations] = await connection.execute('SELECT id FROM organizations WHERE code = ? LIMIT 1', [orgCode]);
    if (!organizations.length) throw new Error(`Organization ${orgCode} was not found.`);
    const orgId = organizations[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    await connection.beginTransaction();

    const departmentSpecs = [
      ['Product Management', 'PROD', 'Karan Malhotra'],
      ['Information Technology', 'IT', 'Siddharth Jain'],
      ['Operations', 'OPS', 'Meera Nair'],
      ['Legal & Compliance', 'LEGAL', 'Rohan Kapoor'],
      ['Customer Success', 'CS', 'Ananya Singh'],
      ['Data & Analytics', 'DATA', 'Vivek Iyer'],
      ['Corporate Strategy', 'STRAT', 'Ishita Rao'],
    ];
    const departments = {};
    const existingDepartments = await connection.execute('SELECT id, code FROM departments WHERE organization_id = ?', [orgId]);
    existingDepartments[0].forEach((row) => { departments[row.code] = row.id; });
    for (const [name, code, head] of departmentSpecs) departments[code] = await ensureDepartment(connection, orgId, { name, code, head_name: head });

    const userSpecs = [
      ['EMP1005', 'Karan Malhotra', 'karan@abctech.example', 'Product Manager', 'Manager', 'PROD'],
      ['EMP1006', 'Siddharth Jain', 'siddharth@abctech.example', 'IT Lead', 'Manager', 'IT'],
      ['EMP1007', 'Meera Nair', 'meera@abctech.example', 'Operations Lead', 'Manager', 'OPS'],
      ['EMP1008', 'Rohan Kapoor', 'rohan@abctech.example', 'Compliance Analyst', 'Employee', 'LEGAL'],
      ['EMP1009', 'Ananya Singh', 'ananya@abctech.example', 'Customer Success Lead', 'Manager', 'CS'],
      ['EMP1010', 'Vivek Iyer', 'vivek@abctech.example', 'Data Scientist', 'Employee', 'DATA'],
      ['EMP1011', 'Ishita Rao', 'ishita@abctech.example', 'Strategy Analyst', 'Employee', 'STRAT'],
      ['EMP1012', 'Aditya Kumar', 'aditya@abctech.example', 'Backend Engineer', 'Employee', 'ENG'],
      ['EMP1013', 'Sneha Patel', 'sneha@abctech.example', 'Brand Specialist', 'Employee', 'MKT'],
      ['EMP1014', 'Manish Gupta', 'manish@abctech.example', 'Finance Manager', 'Manager', 'FIN'],
      ['EMP1015', 'Pooja Menon', 'pooja@abctech.example', 'HR Executive', 'Employee', 'HR'],
      ['EMP1016', 'Dev Shah', 'dev@abctech.example', 'Research Engineer', 'Employee', 'RND'],
    ];
    const users = {};
    const [existingUsers] = await connection.execute('SELECT id, member_code FROM users WHERE organization_id = ?', [orgId]);
    existingUsers.forEach((row) => { users[row.member_code] = row.id; });
    for (const [member_code, full_name, email, designation, role, departmentCode] of userSpecs) {
      users[member_code] = await ensureUser(connection, orgId, departments[departmentCode], { member_code, full_name, email, phone: '+91-98' + member_code.slice(-4) + '0000', designation, role }, passwordHash);
    }

    const [typeRows] = await connection.execute('SELECT id, name FROM resource_types');
    const types = {};
    typeRows.forEach((row) => { types[row.name] = row.id; });
    const resourceSpecs = [
      ['MR-003','Executive Board Room','Conference Room','Floor 5',18,1,'boardroom.png','PROD'],
      ['MR-004','Innovation Studio','Meeting Room','Floor 4',14,1,'meeting_room.png','RND'],
      ['MR-005','Training Room','Classroom','Floor 2',30,1,'classroom.png','HR'],
      ['MR-006','Client Experience Lounge','Meeting Room','Floor 1',12,1,'meeting_room.png','CS'],
      ['WS-002','Product War Room','Workspace','Floor 4',10,1,'workspace.png','PROD'],
      ['WS-003','Analytics Pod','Workspace','Floor 3',8,2,'workspace.png','DATA'],
      ['LAB-001','Computer Vision Lab','Laboratory','R&D Lab',8,1,'laboratory.png','RND'],
      ['LAB-002','Data Science Lab','Laboratory','R&D Lab',10,1,'laboratory.png','DATA'],
      ['EQ-002','Edge AI Kit','Equipment','R&D Lab',1,8,'equipment.png','RND'],
      ['EQ-003','Video Conferencing Kit','Equipment','IT Store',1,4,'equipment.png','IT'],
      ['PJ-002','Projector B','Projector','IT Store',1,3,'projector.png','IT'],
      ['VH-002','Company Vehicle B','Vehicle','Parking Block B',5,1,'vehicle.png','OPS'],
      ['LIB-001','Executive Research Library','Library','Floor 5',20,1,'library.png','STRAT'],
      ['GYM-001','Wellness Studio','Sports Facility','Wellness Center',25,1,'sports.png','HR'],
    ];
    const resources = {};
    const [existingResources] = await connection.execute('SELECT id, code FROM resources WHERE organization_id = ?', [orgId]);
    existingResources.forEach((row) => { resources[row.code] = row.id; });
    for (const [code,name,type,location,capacity,quantity,image,departmentCode] of resourceSpecs) {
      resources[code] = await ensureResource(connection, orgId, departments[departmentCode], types[type] || types['Equipment'], {
        code, name, description: `${name} for realistic operational demonstration.`, location, capacity, quantity, max_minutes: 240,
        responsible_person: 'Operations Team', status: 'Available', image_name: image, asset_tag: `ABC-${code}`,
        serial_number: `SN-${code}-2026`, vendor_name: 'Enterprise Demo Vendor', purchase_date: '2025-01-15',
        warranty_until: '2028-01-15', lifecycle_status: 'Active', next_maintenance_at: null,
      });
    }

    const userList = Object.values(users);
    const resourceList = Object.values(resources);
    const managerId = users.EMP1002 || userList[0];
    const base = weekStart();

    const allocationRequests = [];
    for (let day = 0; day < 7; day += 1) {
      for (let slot = 0; slot < 2; slot += 1) {
        const startHour = 9 + slot * 4;
        const start = `${String(startHour).padStart(2,'0')}:00:00`;
        const end = `${String(startHour + 2).padStart(2,'0')}:00:00`;
        const resourceId = resourceList[(day * 2 + slot) % resourceList.length];
        const userId = userList[(day * 2 + slot + 1) % userList.length];
        const requestId = await ensureRequest(connection, orgId, userId, resourceId, {
          project_name: `Demo Allocation ${day + 1}-${slot + 1}`,
          purpose: 'Scheduled operational work for the demo command center',
          requested_date: dateKey(addDays(base, day)), start_time: start, end_time: end, duration_minutes: 120,
          priority: slot === 0 ? 'High' : 'Medium', deadline: dateKey(addDays(base, day)),
          notes: 'Seeded operational history', urgency: 80, strategic: 75, deadline_score: 80,
          department_score: 70, availability_score: 90, total_score: 82, status: 'Allocated',
          recommendation: 'High-confidence allocation based on priority and availability.',
        });
        allocationRequests.push({ requestId, resourceId, userId, date: dateKey(addDays(base, day)), start, end });
      }
    }

    for (let day = 0; day < 7; day += 1) {
      for (let slot = 0; slot < 2; slot += 1) {
        const startHour = 11 + slot * 3;
        const start = `${String(startHour).padStart(2,'0')}:00:00`;
        const end = `${String(startHour + 1).padStart(2,'0')}:00:00`;
        const resourceId = resourceList[(day * 3 + slot + 4) % resourceList.length];
        const userId = userList[(day * 3 + slot + 3) % userList.length];
        await ensureRequest(connection, orgId, userId, resourceId, {
          project_name: `Demo Pending Demand ${day + 1}-${slot + 1}`,
          purpose: 'Planned departmental demand awaiting manager review',
          requested_date: dateKey(addDays(base, day)), start_time: start, end_time: end, duration_minutes: 60,
          priority: slot === 0 ? 'Medium' : 'Low', deadline: dateKey(addDays(base, day + 1)),
          notes: 'Seeded pending demand', urgency: 55, strategic: 60, deadline_score: 50,
          department_score: 65, availability_score: 80, total_score: 62, status: 'Pending',
          recommendation: 'Pending manager review.',
        });
      }
    }

    for (let index = 0; index < 12; index += 1) {
      const day = index % 6;
      const resourceId = resourceList[index % Math.min(6, resourceList.length)];
      const firstUser = userList[(index + 2) % userList.length];
      const secondUser = userList[(index + 7) % userList.length];
      const startHour = 10 + (index % 3) * 2;
      const start = `${String(startHour).padStart(2,'0')}:00:00`;
      const end = `${String(startHour + 2).padStart(2,'0')}:00:00`;
      const date = dateKey(addDays(base, day));
      const firstRequestId = await ensureRequest(connection, orgId, firstUser, resourceId, {
        project_name: `Conflict Scenario ${index + 1}A`,
        purpose: 'High-value booking used to demonstrate collision detection',
        requested_date: date, start_time: start, end_time: end, duration_minutes: 120,
        priority: index % 3 === 0 ? 'Critical' : 'High', deadline: date, notes: 'Intentional seeded conflict',
        urgency: 95, strategic: 90, deadline_score: 90, department_score: 85, availability_score: 20,
        total_score: index % 3 === 0 ? 96 : 88, status: 'Conflict',
        recommendation: 'Conflict detected; evaluate alternative resource.',
      });
      const secondRequestId = await ensureRequest(connection, orgId, secondUser, resourceId, {
        project_name: `Conflict Scenario ${index + 1}B`,
        purpose: 'Competing departmental booking for the same capacity window',
        requested_date: date, start_time: start, end_time: end, duration_minutes: 120,
        priority: 'Medium', deadline: date, notes: 'Intentional seeded conflict',
        urgency: 65, strategic: 60, deadline_score: 60, department_score: 55, availability_score: 20,
        total_score: 61, status: 'Conflict',
        recommendation: 'Lower priority request should be rescheduled or moved.',
      });
      const severity = index % 3 === 0 ? 'Critical' : index % 2 === 0 ? 'High' : 'Medium';
      const status = index % 4 === 0 ? 'Resolved' : index % 4 === 1 ? 'Under Review' : 'Open';
      await ensureConflict(connection, orgId, firstRequestId, resourceId, secondRequestId, date, start, end, severity, status,
        `Intentional demo collision between ${firstRequestId} and ${secondRequestId}. Suggested resolution: alternative resource or time-window adjustment.`);
    }

    for (const allocation of allocationRequests) {
      const allocationId = await ensureAllocation(connection, orgId, allocation.requestId, allocation.resourceId, allocation.userId, managerId, allocation.date, allocation.start, allocation.end, 82);
      const userDepartment = await getId(connection, 'SELECT department_id AS id FROM users WHERE id = ? AND organization_id = ?', [allocation.userId, orgId]);
      await ensureUtilization(connection, orgId, allocation.resourceId, allocationId, allocation.userId, userDepartment, allocation.date, allocation.start, allocation.end, 120, 'Seeded scheduled operational use');
      await ensureApproval(connection, orgId, allocation.requestId, managerId, 'Approved', 'Approved in seeded operational history.');
    }

    const maintenanceResources = resourceList.slice(0, 12);
    for (let index = 0; index < maintenanceResources.length; index += 1) {
      const resourceId = maintenanceResources[index];
      await ensureMaintenance(connection, orgId, resourceId, userList[index % userList.length], managerId, {
        title: `Demo Maintenance Cycle ${index + 1}`,
        ticket_type: index % 3 === 0 ? 'Preventive' : index % 3 === 1 ? 'Inspection' : 'Calibration',
        priority: index % 4 === 0 ? 'High' : 'Medium',
        description: 'Seeded maintenance history for asset lifecycle demonstration.',
        status: index % 4 === 0 ? 'Open' : 'Completed',
        scheduled_date: dateKey(addDays(base, index % 14)),
        estimated_cost: 500 + index * 125,
        actual_cost: index % 4 === 0 ? 0 : 450 + index * 110,
      });
    }

    for (let index = 0; index < 40; index += 1) {
      const userId = userList[index % userList.length];
      const entityType = index % 4 === 0 ? 'resource' : index % 4 === 1 ? 'resource_request' : index % 4 === 2 ? 'allocation' : 'conflict';
      const action = entityType === 'resource' ? 'Viewed resource' : entityType === 'resource_request' ? 'Reviewed request' : entityType === 'allocation' ? 'Confirmed allocation' : 'Reviewed conflict';
      await ensureAudit(connection, orgId, userId, action, entityType, (index % 12) + 1, `Seeded activity event ${index + 1} for operational history and governance reporting.`);
    }

    for (let index = 0; index < 18; index += 1) {
      const userId = userList[index % userList.length];
      await ensureNotification(
        connection, orgId, userId,
        index % 3 === 0 ? 'Upcoming resource allocation' : index % 3 === 1 ? 'Conflict requires review' : 'Maintenance update',
        index % 3 === 0 ? 'A scheduled resource allocation is approaching in the current operating week.' : index % 3 === 1 ? 'A seeded scheduling conflict has been flagged for manager review.' : 'A resource lifecycle event has been recorded in the maintenance center.',
        index % 3 === 1 ? 'warning' : 'info',
        index % 3 === 1 ? 'conflict' : 'resource',
        (index % 12) + 1
      );
    }

    await connection.commit();
    console.log('Demo expansion completed for ABC-TECH-001.');
    console.log('Target density: 12+ departments, 16+ members, 18+ resources, 50+ requests, 12 conflicts, 14+ allocations, 12 maintenance tickets, 40 audit events and 18 notifications.');
  } catch (error) {
    await connection.rollback();
    console.error(error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unable to expand demo data:', error.message);
  process.exitCode = 1;
});
