const express = require('express');
const {
  listResourceAdditionRequests,
  createResourceAdditionRequest,
  reviewResourceAdditionRequest,
} = require('../controllers/resourceAdditionRequestController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireProposalReview } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', loadAuthority, listResourceAdditionRequests);
router.post('/', createResourceAdditionRequest);
router.patch('/:id/review', loadAuthority, requireProposalReview, reviewResourceAdditionRequest);

module.exports = router;