const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_resource_allocation',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
  multipleStatements: false,
});

async function initializeDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection is ready.');
    await ensureSchema();
    await seedReferenceData();
    return true;
  } catch (error) {
    console.warn('MySQL not available or not initialized yet:', error.message);
    return false;
  }
}

async function ensureSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS organization_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_type_id INT,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      address VARCHAR(255),
      city VARCHAR(100),
      country VARCHAR(100),
      admin_name VARCHAR(150),
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(30) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_type_id) REFERENCES organization_types(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50),
      head_name VARCHAR(150),
      status VARCHAR(30) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      department_id INT,
      member_code VARCHAR(50) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      designation VARCHAR(120),
      role VARCHAR(50) DEFAULT 'member',
      access_level VARCHAR(50) DEFAULT 'standard',
      reporting_manager_id INT,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(30) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (reporting_manager_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS resource_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      resource_type_id INT,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      location VARCHAR(150),
      capacity INT DEFAULT 1,
      quantity INT DEFAULT 1,
      max_allotted_minutes INT DEFAULT 120,
      department_id INT,
      responsible_person VARCHAR(150),
      status VARCHAR(40) DEFAULT 'Available',
      image_name VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (resource_type_id) REFERENCES resource_types(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS resource_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      resource_id INT NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      availability_status VARCHAR(40) DEFAULT 'Available',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS organization_priorities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      priority_name VARCHAR(120) NOT NULL,
      priority_level VARCHAR(30) DEFAULT 'Medium',
      description TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS resource_addition_requests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      requester_id INT NOT NULL,
      resource_code VARCHAR(80) NOT NULL,
      resource_name VARCHAR(150) NOT NULL,
      resource_type VARCHAR(100) NOT NULL DEFAULT 'Equipment',
      image_name VARCHAR(150),
      location VARCHAR(150),
      quantity INT NOT NULL DEFAULT 1,
      department_id INT,
      priority_category VARCHAR(120),
      justification TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      reviewed_by INT,
      reviewed_at TIMESTAMP NULL,
      review_note TEXT,
      created_resource_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS strategic_trends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      sector VARCHAR(120),
      period VARCHAR(50),
      trend_direction VARCHAR(50),
      trend_value DECIMAL(10,2),
      interest_level VARCHAR(40),
      investment_priority VARCHAR(50),
      important_client VARCHAR(150),
      future_priority VARCHAR(150),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS resource_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      user_id INT NOT NULL,
      resource_id INT NOT NULL,
      purpose VARCHAR(255),
      project_name VARCHAR(150),
      requested_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      duration_minutes INT DEFAULT 0,
      priority_level VARCHAR(50) DEFAULT 'Medium',
      deadline DATE,
      notes TEXT,
      urgency_score INT DEFAULT 0,
      strategic_score INT DEFAULT 0,
      deadline_score INT DEFAULT 0,
      department_score INT DEFAULT 0,
      availability_score INT DEFAULT 0,
      total_priority_score INT DEFAULT 0,
      system_priority_score INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Pending',
      recommendation TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS request_priority_factors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      urgency_score INT DEFAULT 0,
      strategic_score INT DEFAULT 0,
      deadline_score INT DEFAULT 0,
      department_score INT DEFAULT 0,
      availability_score INT DEFAULT 0,
      total_priority_score INT DEFAULT 0,
      explanation TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES resource_requests(id)
    );

    CREATE TABLE IF NOT EXISTS conflicts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      request_id INT NOT NULL,
      resource_id INT NOT NULL,
      conflicting_request_id INT,
      conflict_type VARCHAR(120),
      date_value DATE,
      start_time TIME,
      end_time TIME,
      severity VARCHAR(30) DEFAULT 'High',
      status VARCHAR(30) DEFAULT 'Open',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (request_id) REFERENCES resource_requests(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      FOREIGN KEY (conflicting_request_id) REFERENCES resource_requests(id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      request_id INT NOT NULL,
      approver_id INT,
      approval_level VARCHAR(50),
      decision VARCHAR(30),
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (request_id) REFERENCES resource_requests(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS allocations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      request_id INT NOT NULL,
      resource_id INT NOT NULL,
      allocated_to_user_id INT,
      allocated_by_user_id INT,
      allocated_date DATE,
      start_time TIME,
      end_time TIME,
      status VARCHAR(40) DEFAULT 'Scheduled',
      recommendation_score INT DEFAULT 0,
      override_flag TINYINT(1) DEFAULT 0,
      override_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (request_id) REFERENCES resource_requests(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      FOREIGN KEY (allocated_to_user_id) REFERENCES users(id),
      FOREIGN KEY (allocated_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS resource_utilization (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT NOT NULL,
      resource_id INT NOT NULL,
      allocation_id INT,
      date_value DATE,
      start_time TIME,
      end_time TIME,
      duration_minutes INT DEFAULT 0,
      user_id INT,
      department_id INT,
      purpose VARCHAR(255),
      utilization_status VARCHAR(30) DEFAULT 'Scheduled',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      FOREIGN KEY (allocation_id) REFERENCES allocations(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      organization_id INT,
      user_id INT,
      action VARCHAR(250),
      entity_type VARCHAR(100),
      entity_id INT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const statements = schema.split(';').filter((statement) => statement.trim());
  for (const statement of statements) {
    await pool.query(statement.trim());
  }

  const [proposalImageColumn] = await pool.query("SHOW COLUMNS FROM resource_addition_requests LIKE 'image_name'");
  if (!proposalImageColumn.length) {
    await pool.query('ALTER TABLE resource_addition_requests ADD COLUMN image_name VARCHAR(150) NULL AFTER resource_type');
  }
}

async function seedReferenceData() {
  const typeRows = await pool.query('SELECT COUNT(*) as total FROM organization_types');
  if (typeRows[0][0].total === 0) {
    await pool.query('INSERT INTO organization_types (name, description) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)', [
      'Company', 'Business enterprise',
      'School', 'Educational institution',
      'College', 'Higher education institution',
      'Hospital', 'Healthcare organization',
      'Government', 'Public sector organization',
      'NGO', 'Non-profit organization',
      'Other', 'Other organization type',
    ]);
  }

  const resourceTypeRows = await pool.query('SELECT COUNT(*) as total FROM resource_types');
  if (resourceTypeRows[0][0].total === 0) {
    await pool.query('INSERT INTO resource_types (name, description) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)', [
      'Meeting Room', 'Conference and team meeting spaces',
      'Conference Room', 'Executive or board meeting room',
      'Projector', 'Display and presentation equipment',
      'Laboratory', 'Research and testing equipment area',
      'Vehicle', 'Fleet and transportation asset',
      'Equipment', 'General operational resource',
      'Sports Facility', 'Sports or recreation facility',
      'Library', 'Library or study facility',
      'Workspace', 'Office or shared workspace',
      'Medical Equipment', 'Medical equipment',
      'Operation Theatre', 'Hospital operation theatre',
      'Classroom', 'Classroom or teaching space',
      'Other', 'Other organizational resource',
    ]);
  }
}

module.exports = { pool, initializeDatabase };
