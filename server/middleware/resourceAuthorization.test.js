const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hasResourceManagementAuthority } = require('./resourceAuthorization');

test('employee access does not grant resource management', () => {
  assert.equal(hasResourceManagementAuthority({ role: 'Employee', access_level: 'Member', department_name: 'Engineering' }), false);
});

test('generic manager access does not grant resource management', () => {
  assert.equal(hasResourceManagementAuthority({ role: 'Manager', access_level: 'Manager', department_name: 'Engineering' }), false);
});

test('explicit Resource Manager role or access level grants resource management', () => {
  assert.equal(hasResourceManagementAuthority({ role: 'Resource Manager' }), true);
  assert.equal(hasResourceManagementAuthority({ access_level: 'Resource Manager' }), true);
});

test('Logistics department and senior leadership can manage resources', () => {
  assert.equal(hasResourceManagementAuthority({ role: 'Employee', department_name: 'Logistics' }), true);
  assert.equal(hasResourceManagementAuthority({ role: 'Organization Admin' }), true);
});
