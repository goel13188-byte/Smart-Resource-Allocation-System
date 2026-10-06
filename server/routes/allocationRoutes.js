const express = require('express');
const { listAllocations, getAllocationById, createAllocationRequest, updateAllocation, deleteAllocation } = require('../controllers/allocationController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listAllocations);
router.get('/:id', getAllocationById);
router.post('/', loadAuthority, requireDecisionAuthority, createAllocationRequest);
router.put('/:id', loadAuthority, requireDecisionAuthority, updateAllocation);
router.delete('/:id', loadAuthority, requireDecisionAuthority, deleteAllocation);

module.exports = router;
