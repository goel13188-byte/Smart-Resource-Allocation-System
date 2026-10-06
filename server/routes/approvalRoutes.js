const express = require('express');
const { listApprovals, createApproval, updateApproval } = require('../controllers/approvalController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listApprovals);
router.post('/', loadAuthority, requireDecisionAuthority, createApproval);
router.put('/:id', loadAuthority, requireDecisionAuthority, updateApproval);

module.exports = router;
