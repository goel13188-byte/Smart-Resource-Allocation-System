const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../config/db');
const { createResource, updateResource } = require('./resourceController');

const originalQuery = pool.query;

afterEach(() => {
  pool.query = originalQuery;
});

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('resource update preserves omitted descriptive fields and image', async () => {
  const existing = {
    id: 9,
    organization_id: 3,
    resource_type_id: 2,
    code: 'EQ-001',
    name: 'GPU Workstation',
    description: 'Research workstation',
    location: 'Lab A',
    capacity: 1,
    quantity: 4,
    max_allotted_minutes: 120,
    department_id: null,
    responsible_person: 'A. Rao',
    status: 'Available',
    image_name: 'equipment.png',
  };
  let updateParameters;
  pool.query = async (sql, parameters) => {
    if (sql.includes('SELECT * FROM resources')) return [[existing]];
    if (sql.includes('SELECT id FROM resources')) return [[]];
    if (sql.includes('UPDATE resources')) {
      updateParameters = parameters;
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };

  const response = mockResponse();
  await updateResource({ params: { id: '9' }, user: { organization_id: 3 }, body: { quantity: 5 } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(updateParameters[3], 'Research workstation');
  assert.equal(updateParameters[6], 5);
  assert.equal(updateParameters[9], 'A. Rao');
  assert.equal(updateParameters[11], 'equipment.png');
});

test('resource creation rejects duplicate organization-scoped codes', async () => {
  pool.query = async (sql) => {
    if (sql.includes('resource_types')) return [[{ id: 1 }]];
    if (sql.includes('SELECT id FROM resources')) return [[{ id: 9 }]];
    throw new Error(`Unexpected query: ${sql}`);
  };

  const response = mockResponse();
  await createResource({
    user: { organization_id: 3 },
    body: { code: 'EQ-001', name: 'Duplicate', resource_type: 'Equipment', quantity: 1, capacity: 1 },
  }, response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /already in use/i);
});

test('resource creation rejects a non-positive quantity before database writes', async () => {
  pool.query = async () => {
    throw new Error('Unexpected database query for invalid input.');
  };

  const response = mockResponse();
  await createResource({
    user: { organization_id: 3 },
    body: { code: 'EQ-002', name: 'Invalid', quantity: 0, capacity: 1 },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /positive whole numbers/i);
});
