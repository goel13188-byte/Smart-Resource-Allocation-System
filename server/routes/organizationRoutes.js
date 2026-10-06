const express = require('express');
const { listOrganizations, getOrganizationById, listOrganizationTypes } = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/types', listOrganizationTypes);
router.use(protect);
router.get('/', listOrganizations);
router.get('/:id', getOrganizationById);

module.exports = router;
