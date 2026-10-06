const express = require('express');
const { listConflicts, getConflictById, resolveConflict } = require('../controllers/conflictController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listConflicts);
router.get('/:id', getConflictById);
router.put('/:id/resolve', loadAuthority, requireDecisionAuthority, resolveConflict);

module.exports = router;
