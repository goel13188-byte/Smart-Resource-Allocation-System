require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function ensureOrganization(connection, spec, passwordHash) {
  const [types] = await connection.execute('SELECT id FROM organization_types WHERE name = ? LIMIT 1', [spec.type]);
  const typeId = types[0]?.id;
  let [orgs] = await connection.execute('SELECT id FROM organizations WHERE code = ? LIMIT 1', [spec.code]);
  let organizationId;
  if (orgs.length) {
    organizationId = orgs[0].id;
  } else {
    const [result] = await connection.execute(
      'INSERT INTO organizations (organization_type_id, name, code, email, admin_name, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [typeId, spec.name, spec.code, spec.email, spec.admin, passwordHash, 'Active']
    );
    organizationId = result.insertId;
  }
  await connection.execute('UPDATE organizations SET password_hash = ? WHERE id = ?', [passwordHash, organizationId]);
  const [users] = await connection.execute('SELECT id FROM users WHERE organization_id = ? AND member_code = ? LIMIT 1', [organizationId, spec.member]);
  if (!users.length) {
    await connection.execute(
      'INSERT INTO users (organization_id, member_code, full_name, email, designation, role, access_level, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [organizationId, spec.member, spec.admin, spec.email, 'Administrator', 'Organization Admin', 'Admin', passwordHash, 'Active']
    );
  }
  const [resourceTypes] = await connection.execute('SELECT id FROM resource_types WHERE name = ? LIMIT 1', [spec.resourceType]);
  const [resources] = await connection.execute('SELECT id FROM resources WHERE organization_id = ? AND code = ? LIMIT 1', [organizationId, spec.resourceCode]);
  let resourceId = resources[0]?.id;
  if (!resourceId) {
    const [result] = await connection.execute(
      'INSERT INTO resources (organization_id, resource_type_id, code, name, location, capacity, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [organizationId, resourceTypes[0]?.id || null, spec.resourceCode, spec.resourceName, spec.location, spec.capacity, spec.quantity, 'Available']
    );
    resourceId = result.insertId;
  }
  return { organizationId, resourceId };
}

async function ensureResourceManager(connection, organizationId, passwordHash) {
  const memberCode = 'RES-MANAGER';
  const [users] = await connection.execute(
    'SELECT id FROM users WHERE organization_id = ? AND member_code = ? LIMIT 1',
    [organizationId, memberCode]
  );
  if (users.length) {
    await connection.execute(
      `UPDATE users
       SET full_name = ?, email = ?, designation = ?, role = ?, access_level = ?, password_hash = ?, status = 'Active'
       WHERE id = ? AND organization_id = ?`,
      ['Demo Resource Manager', 'resource.manager@demo-company.example', 'Resource Manager', 'Resource Manager', 'Resource Manager', passwordHash, users[0].id, organizationId]
    );
    return;
  }

  await connection.execute(
    `INSERT INTO users
     (organization_id, member_code, full_name, email, designation, role, access_level, password_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
    [organizationId, memberCode, 'Demo Resource Manager', 'resource.manager@demo-company.example', 'Resource Manager', 'Resource Manager', 'Resource Manager', passwordHash]
  );
}

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const specs = [
      { name: 'Demo Company', code: 'DEMO-COMPANY', type: 'Company', email: 'admin@demo-company.example', admin: 'Demo Administrator', member: 'ADM-DEMO-COMPANY', resourceType: 'Meeting Room', resourceCode: 'DEMO-ROOM-01', resourceName: 'Demo Meeting Room', location: 'Main Office', capacity: 20, quantity: 1 },
      { name: 'Demo School', code: 'DEMO-SCHOOL', type: 'School', email: 'admin@demo-school.example', admin: 'School Administrator', member: 'ADM-DEMO-SCHOOL', resourceType: 'Projector', resourceCode: 'DEMO-PROJECTOR-01', resourceName: 'Demo Projector', location: 'Learning Center', capacity: 1, quantity: 2 },
    ];
    const demoCompany = await ensureOrganization(connection, specs[0], passwordHash);
    for (const spec of specs.slice(1)) await ensureOrganization(connection, spec, passwordHash);
    await ensureResourceManager(connection, demoCompany.organizationId, passwordHash);
    await connection.commit();
    console.log('Demo data is ready. Organization and member passwords are: password');
    console.log('Organizations: DEMO-COMPANY and DEMO-SCHOOL');
    console.log('Resource Manager login: DEMO-COMPANY / RES-MANAGER / password');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}
main().catch((error) => { console.error('Unable to seed demo data:', error); process.exitCode = 1; });
