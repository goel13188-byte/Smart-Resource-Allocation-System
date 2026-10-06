const express = require('express');
const { listTrends, createTrend, updateTrend, deleteTrend } = require('../controllers/trendController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', listTrends);
router.post('/', createTrend);
router.put('/:id', updateTrend);
router.delete('/:id', deleteTrend);

module.exports = router;
