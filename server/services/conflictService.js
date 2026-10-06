async function findConflictsForRequest(pool, { organization_id, resource_id, request_id, requested_date, start_time, end_time }) {
  const sql = `
    SELECT r.*
    FROM resource_requests r
    WHERE r.organization_id = ?
      AND r.resource_id = ?
      AND r.requested_date = ?
      AND r.status NOT IN ('Rejected', 'Cancelled')
      AND (? IS NULL OR r.id <> ?)
      AND TIME_TO_SEC(r.start_time) < TIME_TO_SEC(?)
      AND TIME_TO_SEC(r.end_time) > TIME_TO_SEC(?)
  `;

  const [rows] = await pool.query(sql, [
    organization_id,
    resource_id,
    requested_date,
    request_id,
    request_id,
    end_time,
    start_time,
  ]);

  return rows;
}

module.exports = { findConflictsForRequest };
