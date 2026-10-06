const { pool } = require('../config/db');
const { saveResourceImage } = require('../services/resourceImageService');

async function listResourceAdditionRequests(req, res) {
  try {
    const ownRequestsOnly = !req.authority?.canReviewResourceProposals;
    const filter = ownRequestsOnly ? 'AND rar.requester_id = ?' : '';
    const params = ownRequestsOnly
      ? [req.user.organization_id, req.user.user_id]
      : [req.user.organization_id];
    const [rows] = await pool.query(
      `SELECT rar.*, requester.full_name AS requester_name, reviewer.full_name AS reviewer_name
       FROM resource_addition_requests rar
       LEFT JOIN users requester ON requester.id = rar.requester_id
       LEFT JOIN users reviewer ON reviewer.id = rar.reviewed_by
       WHERE rar.organization_id = ? ${filter}
       ORDER BY rar.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to load resource-addition requests.' });
  }
}

async function createResourceAdditionRequest(req, res) {
  try {
    const body = req.body || {};
    const required = ['resource_code', 'resource_name', 'resource_type', 'justification'];
    const missing = required.filter((field) => !String(body[field] || '').trim());
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number.' });
    }

    if (body.department_id) {
      const [departments] = await pool.query(
        'SELECT id FROM departments WHERE id = ? AND organization_id = ? LIMIT 1',
        [body.department_id, req.user.organization_id]
      );
      if (!departments.length) return res.status(400).json({ success: false, message: 'Choose a department in your organization.' });
    }

    const priorityCategory = String(body.priority_category || 'General').trim();
    const [priorityRows] = await pool.query(
      'SELECT priority_name FROM organization_priorities WHERE organization_id = ?',
      [req.user.organization_id]
    );
    const allowedPriorities = priorityRows.length
      ? priorityRows.map((priority) => priority.priority_name)
      : ['Critical', 'High', 'Medium', 'Low'];
    if (!allowedPriorities.some((priority) => priority.toLowerCase() === priorityCategory.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Choose a priority category configured for your organization.' });
    }
    const imageName = await saveResourceImage(body.image_data);

    const [result] = await pool.query(
      `INSERT INTO resource_addition_requests
       (organization_id, requester_id, resource_code, resource_name, resource_type, image_name, location, quantity, department_id, priority_category, justification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.organization_id,
        req.user.user_id,
        body.resource_code.trim(),
        body.resource_name.trim(),
        body.resource_type.trim(),
        imageName,
        body.location || '',
        quantity,
        body.department_id || null,
        priorityCategory,
        body.justification.trim(),
      ]
    );
    return res.status(201).json({ success: true, data: { id: result.insertId, status: 'Pending' } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to submit resource-addition request.' });
  }
}

async function reviewResourceAdditionRequest(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const decision = String(req.body?.decision || '').trim();
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be Approved or Rejected.' });
    }
    const reviewNote = String(req.body?.review_note || '').trim();
    if (decision === 'Rejected' && !reviewNote) {
      return res.status(400).json({ success: false, message: 'A reason is required when rejecting a resource proposal.' });
    }

    await connection.beginTransaction();
    const [requests] = await connection.query(
      `SELECT * FROM resource_addition_requests
        WHERE request_id = ? AND organization_id = ? AND status = 'Pending'
       FOR UPDATE`,
      [id, req.user.organization_id]
    );
    if (!requests.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pending resource-addition request not found.' });
    }

    const request = requests[0];
    let resourceId = null;
    if (decision === 'Approved') {
      const [duplicates] = await connection.query(
        'SELECT id FROM resources WHERE organization_id = ? AND code = ? LIMIT 1',
        [req.user.organization_id, request.resource_code]
      );
      if (duplicates.length) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'That resource code is already in use. Reject this request and resubmit it with a different code.' });
      }

      const [types] = await connection.query(
        'SELECT id FROM resource_types WHERE name = ? LIMIT 1',
        [request.resource_type]
      );
      if (!types.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'The requested resource type is not configured.' });
      }

      const [created] = await connection.query(
        `INSERT INTO resources
         (organization_id, resource_type_id, code, name, image_name, location, quantity, department_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
        [req.user.organization_id, types[0].id, request.resource_code, request.resource_name, request.image_name || '', request.location, request.quantity, request.department_id]
      );
      resourceId = created.insertId;
    }

    await connection.query(
      `UPDATE resource_addition_requests
       SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?, created_resource_id = ?
      WHERE request_id = ? AND organization_id = ?`,
          [decision, req.user.user_id || null, reviewNote, resourceId, id, req.user.organization_id]
    );
    await connection.commit();
    return res.json({ success: true, data: { request_id: Number(id), status: decision, resource_id: resourceId } });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to review resource-addition request.' });
  } finally {
    connection.release();
  }
}

module.exports = { listResourceAdditionRequests, createResourceAdditionRequest, reviewResourceAdditionRequest };