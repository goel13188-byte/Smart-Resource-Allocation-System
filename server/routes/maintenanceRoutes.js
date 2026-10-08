const express = require('express');
const { listMaintenanceTickets, createMaintenanceTicket, updateMaintenanceTicket } = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', listMaintenanceTickets);
router.post('/', createMaintenanceTicket);
router.put('/:id', updateMaintenanceTicket);

module.exports = router;