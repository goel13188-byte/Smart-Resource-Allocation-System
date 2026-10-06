require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Smart Resource Allocation server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
