const express = require('express');
const { listRequests, getRequestById, createRequest, updateRequest, deleteRequest } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', listRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

module.exports = router;
