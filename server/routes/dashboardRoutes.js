const express = require('express');
const { summary, resources, requests, conflicts, utilization, trends } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/summary', summary);
router.get('/resources', resources);
router.get('/requests', requests);
router.get('/conflicts', conflicts);
router.get('/utilization', utilization);
router.get('/trends', trends);

module.exports = router;
