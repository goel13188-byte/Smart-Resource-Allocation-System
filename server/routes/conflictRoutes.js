const express = require('express');
const { listConflicts, getConflictById, resolveConflict, reassignConflict } = require('../controllers/conflictController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listConflicts);
router.get('/:id', getConflictById);
router.put('/:id/resolve', loadAuthority, requireDecisionAuthority, resolveConflict);
router.put('/:id/reassign', loadAuthority, requireDecisionAuthority, reassignConflict);

module.exports = router;
