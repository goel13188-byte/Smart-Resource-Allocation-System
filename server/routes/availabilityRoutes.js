const express = require('express');
const { listAvailability, createAvailability, updateAvailability, deleteAvailability } = require('../controllers/availabilityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/resources/:id/availability', listAvailability);
router.post('/resources/:id/availability', createAvailability);
router.put('/availability/:id', updateAvailability);
router.delete('/availability/:id', deleteAvailability);

module.exports = router;
