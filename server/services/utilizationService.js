async function getUtilizationSummary(pool, organization_id) {
  const [rows] = await pool.query(
    `
      SELECT
        r.id AS resource_id,
        r.name AS resource_name,
        rt.name AS resource_type,
        COUNT(ru.id) AS utilization_entries,
        COALESCE(SUM(ru.duration_minutes), 0) AS total_minutes
      FROM resources r
      LEFT JOIN resource_types rt ON rt.id = r.resource_type_id
      LEFT JOIN resource_utilization ru ON ru.resource_id = r.id AND ru.organization_id = ?
      WHERE r.organization_id = ?
      GROUP BY r.id, r.name, rt.name
      ORDER BY total_minutes DESC
    `,
    [organization_id, organization_id]
  );

  return rows;
}

module.exports = { getUtilizationSummary };
