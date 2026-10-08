const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();
router.use(protect);
router.get('/', loadAuthority, requireDecisionAuthority, listAuditLogs);

module.exports = router;