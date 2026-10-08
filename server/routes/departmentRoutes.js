const express = require('express');
const { listDepartments, getDepartmentHistory, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireDecisionAuthority } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listDepartments);
router.get('/:id/history', loadAuthority, requireDecisionAuthority, getDepartmentHistory);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
