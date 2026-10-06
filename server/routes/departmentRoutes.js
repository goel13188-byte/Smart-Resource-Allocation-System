const express = require('express');
const { listDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', listDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
