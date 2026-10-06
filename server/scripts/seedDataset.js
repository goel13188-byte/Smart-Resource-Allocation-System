require('dotenv').config();
const bcrypt = require('bcryptjs');
const dataset = require('../data/dataset.json');
const { pool, initializeDatabase } = require('../config/db');

const reportingManagers = { 1: 2, 4: 3, 7: 5 };
const nextId = (rows, index, key) => rows[index][key] || index + 1;
const norm = (value) => String(value || '').trim().toLowerCase();

async function insertRows(connection, table, columns, rows) {
  if (!rows.length) return;
  const colSql = columns.map((column) => `\`${column}\``).join(', ');
  const rowSql = `(${columns.map(() => '?').join(', ')})`;
  const sql = `INSERT INTO \`${table}\` (${colSql}) VALUES ${rows.map(() => rowSql).join(', ')}`;
  const values = rows.flatMap((row) => columns.map((column) => row[column] ?? null));
  await connection.execute(sql, values);
}

async function ensureReferenceMaps(connection) {
  const organizationTypes = await connection.query('SELECT id, name FROM organization_types');
  const organizationTypeMap = new Map(organizationTypes[0].map((row) => [norm(row.name), row.id]));
  for (const row of dataset.organization_types) {
    if (!organizationTypeMap.has(norm(row.type_name))) {
      await connection.execute('INSERT INTO organization_types (name, description) VALUES (?, ?)', [row.display_name || row.type_name, row.description]);
      const [created] = await connection.execute('SELECT id FROM organization_types WHERE LOWER(name) = LOWER(?) LIMIT 1', [row.display_name || row.type_name]);
      organizationTypeMap.set(norm(row.type_name), created[0].id);
    }
  }

  const resourceTypes = await connection.query('SELECT id, name FROM resource_types');
  const resourceTypeMap = new Map(resourceTypes[0].map((row) => [norm(row.name), row.id]));
  for (const row of dataset.resource_types) {
    if (!resourceTypeMap.has(norm(row.type_name))) {
      await connection.execute('INSERT INTO resource_types (name, description) VALUES (?, ?)', [row.type_name, row.description]);
      const [created] = await connection.execute('SELECT id FROM resource_types WHERE LOWER(name) = LOWER(?) LIMIT 1', [row.type_name]);
      resourceTypeMap.set(norm(row.type_name), created[0].id);
    }
  }
  return { organizationTypeMap, resourceTypeMap };
}

async function main() {
  const ready = await initializeDatabase();
  if (!ready) throw new Error('Database is unavailable. Check MySQL and your .env configuration.');

  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.query('SELECT COUNT(*) AS total FROM organizations');
    if (Number(existing[0].total) > 0) {
      throw new Error('Dataset import stopped: organizations already exist. Use an empty database to avoid overwriting existing project data.');
    }

    await connection.beginTransaction();
    const { organizationTypeMap, resourceTypeMap } = await ensureReferenceMaps(connection);
    const demoPasswordHash = await bcrypt.hash('password', 10);
    const organizationTypeId = new Map(dataset.organization_types.map((row, i) => [row.organization_type_id || i + 1, organizationTypeMap.get(norm(row.type_name))]));
    const resourceTypeId = new Map(dataset.resource_types.map((row, i) => [i + 1, resourceTypeMap.get(norm(row.type_name))]));

    await insertRows(connection, 'organizations', ['id','organization_type_id','name','code','email','phone','address','city','country','admin_name','password_hash','status'],
      dataset.organizations.map((r, i) => ({ id: nextId(dataset.organizations, i, 'organization_id'), organization_type_id: organizationTypeId.get(r.organization_type_id), name: r.organization_name, code: r.organization_code, email: r.official_email, phone: r.phone, address: r.address, city: r.city, country: r.country, admin_name: r.admin_name, password_hash: demoPasswordHash, status: r.status })));

    await insertRows(connection, 'departments', ['id','organization_id','name','code','head_name','status'],
      dataset.departments.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, name: r.department_name, code: r.department_code, head_name: null, status: 'Active' })));

    await insertRows(connection, 'users', ['id','organization_id','department_id','member_code','full_name','email','phone','password_hash','designation','role','access_level','reporting_manager_id','status'],
      dataset.users.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, department_id: r.department_id, member_code: r.member_code, full_name: r.full_name, email: r.email, phone: r.phone, password_hash: demoPasswordHash, designation: r.designation, role: r.role, access_level: r.access_level, reporting_manager_id: null, status: r.status || 'Active' })));
    for (const [userId, managerId] of Object.entries(reportingManagers)) {
      await connection.execute('UPDATE users SET reporting_manager_id = ? WHERE id = ?', [managerId, userId]);
    }

    await insertRows(connection, 'resources', ['id','organization_id','resource_type_id','code','name','description','location','capacity','quantity','max_allotted_minutes','department_id','responsible_person','status','image_name'],
      dataset.resources.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, resource_type_id: resourceTypeId.get(r.resource_type_id), code: r.resource_code, name: r.resource_name, description: r.description, location: r.location, capacity: r.capacity, quantity: r.quantity, max_allotted_minutes: r.maximum_allotted_minutes, department_id: r.department_id, responsible_person: dataset.users[r.responsible_user_id - 1]?.full_name || null, status: r.status, image_name: r.image_name })));

    await insertRows(connection, 'resource_availability', ['id','resource_id','day_of_week','start_time','end_time','availability_status','notes'],
      dataset.resource_availability.map((r, i) => ({ id: i + 1, resource_id: r.resource_id, day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time, availability_status: r.availability_status || 'Available', notes: r.notes || null })));

    await insertRows(connection, 'organization_priorities', ['id','organization_id','priority_name','priority_level','description','is_active'],
      dataset.organization_priorities.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, priority_name: r.priority_name, priority_level: r.priority_level, description: r.description, is_active: r.status === 'Inactive' ? 0 : 1 })));

    await insertRows(connection, 'strategic_trends', ['id','organization_id','sector','period','trend_direction','trend_value','interest_level','investment_priority','important_client','future_priority','notes'],
      dataset.strategic_trends.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, sector: r.sector_or_area, period: r.period_label, trend_direction: r.trend_direction, trend_value: r.trend_value, interest_level: r.interest_level, investment_priority: r.investment_priority, important_client: r.important_client, future_priority: r.future_priority, notes: r.notes })));

    const factorRows = dataset.request_priority_factors;
    const factorsByRequest = new Map(factorRows.map((r) => [r.request_id, r]));
    const requests = dataset.resource_requests.map((r, i) => {
      const f = factorsByRequest.get(i + 1) || {};
      return { id: i + 1, organization_id: r.organization_id, user_id: r.requester_id, resource_id: r.resource_id, purpose: r.purpose, project_name: r.project_name, requested_date: r.requested_date, start_time: r.start_time, end_time: r.end_time, duration_minutes: r.duration_minutes, priority_level: r.requested_priority, deadline: r.deadline_date, notes: r.user_notes, urgency_score: f.urgency_score || 0, strategic_score: f.strategic_score || 0, deadline_score: f.deadline_score || 0, department_score: f.department_score || 0, availability_score: f.availability_score || 0, total_priority_score: f.total_score || r.system_priority_score || 0, system_priority_score: r.system_priority_score || 0, status: r.status, recommendation: f.recommendation_reason || null };
    });
    await insertRows(connection, 'resource_requests', ['id','organization_id','user_id','resource_id','purpose','project_name','requested_date','start_time','end_time','duration_minutes','priority_level','deadline','notes','urgency_score','strategic_score','deadline_score','department_score','availability_score','total_priority_score','system_priority_score','status','recommendation'], requests);

    await insertRows(connection, 'request_priority_factors', ['id','request_id','urgency_score','strategic_score','deadline_score','department_score','availability_score','total_priority_score','explanation'],
      factorRows.map((r, i) => ({ id: i + 1, request_id: r.request_id, urgency_score: r.urgency_score, strategic_score: r.strategic_score, deadline_score: r.deadline_score, department_score: r.department_score, availability_score: r.availability_score, total_priority_score: r.total_score, explanation: r.recommendation_reason })));

    await insertRows(connection, 'conflicts', ['id','organization_id','request_id','resource_id','conflicting_request_id','conflict_type','date_value','start_time','end_time','severity','status','description'],
      dataset.conflicts.map((r, i) => { const request = requests[r.request_id - 1] || {}; return { id: i + 1, organization_id: r.organization_id, request_id: r.request_id, resource_id: r.resource_id, conflicting_request_id: r.conflicting_request_id, conflict_type: r.conflict_type, date_value: request.requested_date, start_time: request.start_time, end_time: request.end_time, severity: r.severity, status: r.resolution_status, description: r.conflict_description }; }));

    await insertRows(connection, 'approvals', ['id','organization_id','request_id','approver_id','approval_level','decision','reason'],
      dataset.approvals.map((r, i) => ({ id: i + 1, organization_id: requests[r.request_id - 1]?.organization_id, request_id: r.request_id, approver_id: r.approver_id, approval_level: String(r.approval_level), decision: r.decision, reason: r.decision_reason })));

    await insertRows(connection, 'allocations', ['id','organization_id','request_id','resource_id','allocated_to_user_id','allocated_by_user_id','allocated_date','start_time','end_time','status','recommendation_score','override_flag','override_reason'],
      dataset.allocations.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, request_id: r.request_id, resource_id: r.resource_id, allocated_to_user_id: r.allocated_to_user_id, allocated_by_user_id: r.allocated_by_user_id, allocated_date: r.allocation_date, start_time: r.start_time, end_time: r.end_time, status: r.allocation_status, recommendation_score: r.recommendation_score, override_flag: 0, override_reason: r.override_reason || null })));

    await insertRows(connection, 'resource_utilization', ['id','organization_id','resource_id','allocation_id','date_value','start_time','end_time','duration_minutes','user_id','department_id','purpose','utilization_status'],
      dataset.resource_utilization.map((r, i) => ({ id: i + 1, organization_id: r.organization_id, resource_id: r.resource_id, allocation_id: r.allocation_id, date_value: r.utilization_date, start_time: r.start_time, end_time: r.end_time, duration_minutes: r.duration_minutes, user_id: r.used_by_user_id, department_id: r.department_id, purpose: r.purpose, utilization_status: r.utilization_status })));

    await insertRows(connection, 'audit_logs', ['organization_id','user_id','action','entity_type','entity_id','details'],
      dataset.audit_logs.map((r) => ({ organization_id: r.organization_id, user_id: r.user_id, action: r.action_type, entity_type: r.entity_type, entity_id: r.entity_id, details: r.description })));

    await connection.commit();
    console.log('Dataset imported successfully. Organizations: ABC-TECH-001, SRM-DEMO-001, CITY-HOSP-001, GREEN-NGO-001, NORTH-SCHOOL-001, CIVIC-GOV-001, COMMUNITY-OTHER-001.');
    console.log('Demo password from the supplied dataset: password.');
    console.log(`Imported ${dataset.organizations.length} organizations across ${dataset.organization_types.length} organization types, ${dataset.departments.length} departments, ${dataset.users.length} users, ${dataset.resources.length} resources, ${dataset.resource_requests.length} requests, and related sample records.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unable to import supplied dataset:', error.message);
  process.exitCode = 1;
});
