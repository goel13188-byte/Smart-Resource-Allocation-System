const express = require('express');
const { listUsers, getUserById, getUserHistory, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listUsers);
router.get('/:id', getUserById);
router.get('/:id/history', loadAuthority, requireDecisionAuthority, getUserHistory);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
