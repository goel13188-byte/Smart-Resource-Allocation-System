const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const userRoutes = require('./routes/userRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const resourceAdditionRequestRoutes = require('./routes/resourceAdditionRequestRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const requestRoutes = require('./routes/requestRoutes');
const priorityRoutes = require('./routes/priorityRoutes');
const trendRoutes = require('./routes/trendRoutes');
const conflictRoutes = require('./routes/conflictRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const utilizationRoutes = require('./routes/utilizationRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Smart Resource Allocation API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/resource-addition-requests', resourceAdditionRequestRoutes);
app.use('/api', availabilityRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/priorities', priorityRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/utilization', utilizationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

const staticDir = path.join(__dirname, '../client/public');
app.use('/images', express.static(path.join(__dirname, '../client/src/assets/images')));
app.use('/icons', express.static(path.join(__dirname, '../client/src/assets/icons')));
app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }

  return res.status(404).send('Page not found');
});

app.use(errorMiddleware);

module.exports = app;
