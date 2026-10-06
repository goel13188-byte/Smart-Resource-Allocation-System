const { test } = require('node:test');
const assert = require('node:assert/strict');
const dataset = require('./dataset.json');

const byGeneratedId = (rows, id) => rows[Number(id) - 1];
const organizationsById = new Map(dataset.organizations.map((row, index) => [row.organization_id || index + 1, row]));
const typesById = new Map(dataset.organization_types.map((row, index) => [row.organization_type_id || index + 1, row]));

function assertOrganizationReference(organizationId, recordName) {
  assert.ok(organizationsById.has(Number(organizationId)), `${recordName} references unknown organization ${organizationId}`);
}

test('sample dataset contains an organization for every configured type', () => {
  const organizationTypeIds = new Set(dataset.organizations.map((organization) => organization.organization_type_id));
  for (const [typeId, type] of typesById) {
    assert.ok(organizationTypeIds.has(typeId), `No sample organization for ${type.display_name}`);
  }
});

test('sample dataset relationships stay within their organization', () => {
  dataset.organizations.forEach((organization, index) => {
    const organizationId = organization.organization_id || index + 1;
    assert.ok(typesById.has(organization.organization_type_id), `${organization.organization_code} has an unknown organization type`);
  });

  dataset.departments.forEach((department) => assertOrganizationReference(department.organization_id, 'Department'));
  dataset.users.forEach((user) => {
    assertOrganizationReference(user.organization_id, `User ${user.member_code}`);
    const department = byGeneratedId(dataset.departments, user.department_id);
    assert.equal(department?.organization_id, user.organization_id, `User ${user.member_code} points outside its organization`);
  });
  dataset.resources.forEach((resource) => {
    assertOrganizationReference(resource.organization_id, `Resource ${resource.resource_code}`);
    const department = byGeneratedId(dataset.departments, resource.department_id);
    const owner = byGeneratedId(dataset.users, resource.responsible_user_id);
    assert.equal(department?.organization_id, resource.organization_id, `Resource ${resource.resource_code} points to another organization's department`);
    assert.equal(owner?.organization_id, resource.organization_id, `Resource ${resource.resource_code} has an owner from another organization`);
    assert.ok(byGeneratedId(dataset.resource_types, resource.resource_type_id), `Resource ${resource.resource_code} has an unknown type`);
  });
  dataset.resource_availability.forEach((availability) => {
    assert.ok(byGeneratedId(dataset.resources, availability.resource_id), `Availability references missing resource ${availability.resource_id}`);
  });
  dataset.resource_requests.forEach((request, index) => {
    const user = byGeneratedId(dataset.users, request.requester_id);
    const resource = byGeneratedId(dataset.resources, request.resource_id);
    const department = byGeneratedId(dataset.departments, request.department_id);
    assert.equal(user?.organization_id, request.organization_id, `Request ${index + 1} has a requester from another organization`);
    assert.equal(resource?.organization_id, request.organization_id, `Request ${index + 1} has a resource from another organization`);
    assert.equal(department?.organization_id, request.organization_id, `Request ${index + 1} has a department from another organization`);
  });
  dataset.request_priority_factors.forEach((factor) => {
    assert.ok(byGeneratedId(dataset.resource_requests, factor.request_id), `Priority factor references missing request ${factor.request_id}`);
  });
  dataset.organization_priorities.forEach((priority) => {
    const author = byGeneratedId(dataset.users, priority.created_by);
    assert.equal(author?.organization_id, priority.organization_id, `Priority ${priority.priority_name} has an author from another organization`);
  });
  dataset.strategic_trends.forEach((trend) => {
    const author = byGeneratedId(dataset.users, trend.created_by);
    assert.equal(author?.organization_id, trend.organization_id, `Trend ${trend.sector_or_area} has an author from another organization`);
  });
  dataset.conflicts.forEach((conflict) => {
    const request = byGeneratedId(dataset.resource_requests, conflict.request_id);
    const resource = byGeneratedId(dataset.resources, conflict.resource_id);
    const conflictingRequest = conflict.conflicting_request_id
      ? byGeneratedId(dataset.resource_requests, conflict.conflicting_request_id)
      : null;
    assert.equal(request?.organization_id, conflict.organization_id, `Conflict references a request from another organization`);
    assert.equal(resource?.organization_id, conflict.organization_id, `Conflict references a resource from another organization`);
    if (conflict.conflicting_request_id) assert.equal(conflictingRequest?.organization_id, conflict.organization_id, 'Conflict points to another organization request');
  });
  dataset.approvals.forEach((approval) => {
    const request = byGeneratedId(dataset.resource_requests, approval.request_id);
    const approver = approval.approver_id ? byGeneratedId(dataset.users, approval.approver_id) : null;
    assert.ok(request, `Approval references missing request ${approval.request_id}`);
    if (approval.approver_id) assert.equal(approver?.organization_id, request.organization_id, 'Approval has an approver from another organization');
  });
  dataset.allocations.forEach((allocation) => {
    const request = byGeneratedId(dataset.resource_requests, allocation.request_id);
    const resource = byGeneratedId(dataset.resources, allocation.resource_id);
    const allocatedTo = byGeneratedId(dataset.users, allocation.allocated_to_user_id);
    const allocatedBy = byGeneratedId(dataset.users, allocation.allocated_by_user_id);
    assert.equal(request?.organization_id, allocation.organization_id, 'Allocation references a request from another organization');
    assert.equal(resource?.organization_id, allocation.organization_id, 'Allocation references a resource from another organization');
    assert.equal(allocatedTo?.organization_id, allocation.organization_id, 'Allocation recipient belongs to another organization');
    assert.equal(allocatedBy?.organization_id, allocation.organization_id, 'Allocation creator belongs to another organization');
  });
  dataset.resource_utilization.forEach((entry) => {
    const resource = byGeneratedId(dataset.resources, entry.resource_id);
    const user = byGeneratedId(dataset.users, entry.used_by_user_id);
    const department = byGeneratedId(dataset.departments, entry.department_id);
    assert.equal(resource?.organization_id, entry.organization_id, 'Utilization references a resource from another organization');
    assert.equal(user?.organization_id, entry.organization_id, 'Utilization user belongs to another organization');
    assert.equal(department?.organization_id, entry.organization_id, 'Utilization department belongs to another organization');
  });
  dataset.audit_logs.forEach((entry) => {
    const user = byGeneratedId(dataset.users, entry.user_id);
    assert.equal(user?.organization_id, entry.organization_id, 'Audit log user belongs to another organization');
  });
});
