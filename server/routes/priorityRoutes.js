const express = require('express');
const { listPriorities, createPriority, updatePriority, deletePriority } = require('../controllers/priorityController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireProposalReview } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listPriorities);
router.post('/', loadAuthority, requireProposalReview, createPriority);
router.put('/:id', loadAuthority, requireProposalReview, updatePriority);
router.delete('/:id', loadAuthority, requireProposalReview, deletePriority);

module.exports = router;
