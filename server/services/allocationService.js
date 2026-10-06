async function createAllocation(pool, { organization_id, request_id, resource_id, allocated_to_user_id, allocated_by_user_id, allocated_date, start_time, end_time, recommendation_score, override_flag = 0, override_reason = '' }) {
  const sql = `
    INSERT INTO allocations (
      organization_id, request_id, resource_id, allocated_to_user_id, allocated_by_user_id,
      allocated_date, start_time, end_time, status, recommendation_score, override_flag, override_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
    organization_id,
    request_id,
    resource_id,
    allocated_to_user_id,
    allocated_by_user_id,
    allocated_date,
    start_time,
    end_time,
    recommendation_score,
    override_flag,
    override_reason,
  ]);

  return result.insertId;
}

module.exports = { createAllocation };
