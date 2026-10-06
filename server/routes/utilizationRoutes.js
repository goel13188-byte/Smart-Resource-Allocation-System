const express = require('express');
const { listUtilization, createUtilization } = require('../controllers/utilizationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', listUtilization);
router.post('/', createUtilization);

module.exports = router;
