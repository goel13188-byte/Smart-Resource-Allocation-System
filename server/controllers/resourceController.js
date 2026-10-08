const { pool } = require('../config/db');
const { saveResourceImage } = require('../services/resourceImageService');
const { writeAudit } = require('../services/auditService');

function sendError(res, error, fallback) {
	if (error.code === 'ER_DUP_ENTRY') {
		return res.status(409).json({ success: false, message: 'That resource code is already in use.' });
	}
	console.error(error);
	return res.status(500).json({ success: false, message: fallback });
}

function validId(value) {
	return Number.isInteger(Number(value)) && Number(value) > 0;
}

function positiveInteger(value) {
	const number = Number(value);
	return Number.isInteger(number) && number >= 1 ? number : null;
}

async function listResources(req, res) {
	try {
		const [rows] = await pool.query(
			`SELECT r.id, r.code, r.name, r.description, r.status, r.quantity, r.capacity,
							r.location, r.department_id, r.responsible_person,
                            r.asset_tag, r.serial_number, r.vendor_name, r.purchase_date, r.warranty_until,
                            r.lifecycle_status, r.last_maintenance_at, r.next_maintenance_at,
							CASE WHEN r.image_name IS NULL OR r.image_name = '' THEN ''
									 WHEN LEFT(r.image_name, 1) = '/' THEN r.image_name
									 ELSE CONCAT('/images/', r.image_name) END AS image_name,
							rt.name AS resource_type_name, d.name AS department_name
			 FROM resources r
			 LEFT JOIN resource_types rt ON rt.id = r.resource_type_id
			 LEFT JOIN departments d ON d.id = r.department_id AND d.organization_id = r.organization_id
			 WHERE r.organization_id = ?
			 ORDER BY r.name`,
			[req.user.organization_id]
		);
		return res.json({ success: true, data: rows });
	} catch (error) {
		return sendError(res, error, 'Unable to load resources.');
	}
}

async function getResourceById(req, res) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Resource ID must be a positive integer.' });
	try {
		const [rows] = await pool.query(
			`SELECT r.*, rt.name AS resource_type_name, d.name AS department_name
			 FROM resources r
			 LEFT JOIN resource_types rt ON rt.id = r.resource_type_id
			 LEFT JOIN departments d ON d.id = r.department_id AND d.organization_id = r.organization_id
			 WHERE r.id = ? AND r.organization_id = ?`,
			[req.params.id, req.user.organization_id]
		);
		if (!rows.length) return res.status(404).json({ success: false, message: 'Resource not found.' });
		return res.json({ success: true, data: rows[0] });
	} catch (error) {
		return sendError(res, error, 'Unable to load resource.');
	}
}

async function buildResourceValues(body, existing, organizationId) {
	const value = (key, fallback = '') => body[key] === undefined ? (existing?.[key] ?? fallback) : body[key];
	const code = String(value('code')).trim();
	const name = String(value('name')).trim();
	if (!code || !name) return { error: 'Resource name and code are required.' };
	if (code.length > 80 || name.length > 150) return { error: 'Resource code or name exceeds the allowed length.' };

	const quantity = positiveInteger(value('quantity', 1));
	const capacity = positiveInteger(value('capacity', 1));
	const maxAllottedMinutes = positiveInteger(value('max_allotted_minutes', 120));
	if (!quantity || !capacity || !maxAllottedMinutes) {
		return { error: 'Quantity, capacity, and maximum allotted minutes must be positive whole numbers.' };
	}

	const typeName = body.resource_type ?? body.resource_type_name ?? (existing ? undefined : 'Equipment');
	let resourceTypeId = existing?.resource_type_id ?? null;
	if (typeName !== undefined) {
		const [types] = await pool.query('SELECT id FROM resource_types WHERE name = ? LIMIT 1', [String(typeName).trim()]);
		if (!types.length) return { error: 'Choose a configured resource type.' };
		resourceTypeId = types[0].id;
	}

	const departmentValue = value('department_id', null);
	const departmentId = departmentValue === '' || departmentValue === null ? null : Number(departmentValue);
	if (departmentId !== null) {
		if (!Number.isInteger(departmentId) || departmentId < 1) return { error: 'Choose a valid department.' };
		const [departments] = await pool.query(
			'SELECT id FROM departments WHERE id = ? AND organization_id = ? LIMIT 1',
			[departmentId, organizationId]
		);
		if (!departments.length) return { error: 'Choose a department in your organization.' };
	}

	const imageName = body.image_data
		? await saveResourceImage(body.image_data)
		: value('image_name', existing?.image_name || '');

	const lifecycleStatus = String(value('lifecycle_status', existing?.lifecycle_status || 'Active')).trim() || 'Active';
	const allowedLifecycle = ['Active', 'In Use', 'Under Maintenance', 'Retired', 'Disposed'];
	if (!allowedLifecycle.includes(lifecycleStatus)) return { error: 'Choose a valid lifecycle status.' };

	return {
		values: [
			resourceTypeId,
			code,
			name,
			value('description'),
			value('location'),
			capacity,
			quantity,
			maxAllottedMinutes,
			departmentId,
			value('responsible_person') || null,
			value('status', 'Available'),
			imageName,
			value('asset_tag') || null,
			value('serial_number') || null,
			value('vendor_name') || null,
			value('purchase_date') || null,
			value('warranty_until') || null,
			lifecycleStatus,
			value('last_maintenance_at') || null,
			value('next_maintenance_at') || null,
		],
	};
}

async function createResource(req, res) {
	try {
		const result = await buildResourceValues(req.body || {}, null, req.user.organization_id);
		if (result.error) return res.status(400).json({ success: false, message: result.error });
		const [duplicates] = await pool.query(
			'SELECT id FROM resources WHERE organization_id = ? AND code = ? LIMIT 1',
			[req.user.organization_id, result.values[1]]
		);
		if (duplicates.length) return res.status(409).json({ success: false, message: 'That resource code is already in use.' });
		const [insert] = await pool.query(
			`INSERT INTO resources
			 (organization_id, resource_type_id, code, name, description, location, capacity, quantity,
				max_allotted_minutes, department_id, responsible_person, status, image_name,
				asset_tag, serial_number, vendor_name, purchase_date, warranty_until, lifecycle_status,
				last_maintenance_at, next_maintenance_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[req.user.organization_id, ...result.values]
		);
		return res.status(201).json({ success: true, data: { id: insert.insertId } });
	} catch (error) {
		return sendError(res, error, 'Unable to create resource.');
	}
}

async function updateResource(req, res) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Resource ID must be a positive integer.' });
	try {
		const [rows] = await pool.query(
			'SELECT * FROM resources WHERE id = ? AND organization_id = ? LIMIT 1',
			[req.params.id, req.user.organization_id]
		);
		if (!rows.length) return res.status(404).json({ success: false, message: 'Resource not found.' });

		const result = await buildResourceValues(req.body || {}, rows[0], req.user.organization_id);
		if (result.error) return res.status(400).json({ success: false, message: result.error });
		const [duplicates] = await pool.query(
			'SELECT id FROM resources WHERE organization_id = ? AND code = ? AND id <> ? LIMIT 1',
			[req.user.organization_id, result.values[1], req.params.id]
		);
		if (duplicates.length) return res.status(409).json({ success: false, message: 'That resource code is already in use.' });

		await pool.query(
			`UPDATE resources
			 SET resource_type_id = ?, code = ?, name = ?, description = ?, location = ?, capacity = ?,
					 quantity = ?, max_allotted_minutes = ?, department_id = ?, responsible_person = ?,
					 status = ?, image_name = ?, asset_tag = ?, serial_number = ?, vendor_name = ?,
					 purchase_date = ?, warranty_until = ?, lifecycle_status = ?, last_maintenance_at = ?,
					 next_maintenance_at = ?
			 WHERE id = ? AND organization_id = ?`,
			[...result.values, req.params.id, req.user.organization_id]
		);
		await writeAudit({
			organizationId: req.user.organization_id,
			userId: req.user.user_id,
			action: 'Updated resource',
			entityType: 'resource',
			entityId: Number(req.params.id),
			details: { code: result.values[1], name: result.values[2], lifecycle_status: result.values[17] },
		});
		return res.json({ success: true, message: 'Resource updated.' });
	} catch (error) {
		return sendError(res, error, 'Unable to update resource.');
	}
}

async function deleteResource(req, res) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Resource ID must be a positive integer.' });
	try {
		const [result] = await pool.query(
			'UPDATE resources SET status = ? WHERE id = ? AND organization_id = ?',
			['Inactive', req.params.id, req.user.organization_id]
		);
		if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Resource not found.' });
		await writeAudit({
			organizationId: req.user.organization_id,
			userId: req.user.user_id,
			action: 'Deactivated resource',
			entityType: 'resource',
			entityId: Number(req.params.id),
			details: { status: 'Inactive' },
		});
		return res.json({ success: true, message: 'Resource deactivated.' });
	} catch (error) {
		return sendError(res, error, 'Unable to deactivate resource.');
	}
}

module.exports = { listResources, getResourceById, createResource, updateResource, deleteResource };
