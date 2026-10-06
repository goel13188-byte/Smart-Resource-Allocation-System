require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

async function main() {
  const databaseName = process.env.DB_NAME;
  const databaseUser = process.env.DB_USER || 'root';
  if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error('DB_NAME must contain only letters, numbers, or underscores.');
  }
  if (databaseUser !== 'root') {
    throw new Error('This one-time local setup expects DB_USER=root. No database changes were made.');
  }

  const connectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    user: databaseUser,
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    charset: 'utf8mb4',
  };
  const connection = await mysql.createConnection(connectionOptions);
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`Created or verified isolated database ${databaseName}.`);
  } finally {
    await connection.end();
  }

  const seed = spawnSync(process.execPath, [path.join(__dirname, 'seedDataset.js')], {
    cwd: path.join(__dirname, '../..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (seed.error) throw seed.error;
  if (seed.status !== 0) throw new Error(`Dataset import failed with exit code ${seed.status}. SQL password was not changed.`);

  const rootConnection = await mysql.createConnection(connectionOptions);
  try {
    await rootConnection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY 'access'");
    await rootConnection.query('FLUSH PRIVILEGES');
  } finally {
    await rootConnection.end();
  }

  const envPath = path.join(__dirname, '../../.env');
  const envContents = fs.readFileSync(envPath, 'utf8');
  if (!/^DB_PASSWORD=.*$/m.test(envContents)) throw new Error('Seed succeeded, but .env has no DB_PASSWORD setting to update.');
  fs.writeFileSync(envPath, envContents.replace(/^DB_PASSWORD=.*$/m, 'DB_PASSWORD=access'));
  console.log('The dedicated demo database is seeded and the local root SQL password is now access.');
}

main().catch((error) => {
  console.error(`Demo database setup failed: ${error.sqlMessage || error.message}`);
  process.exitCode = 1;
});
