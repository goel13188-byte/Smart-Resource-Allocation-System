const express = require('express');
const { listResources, getResourceById, createResource, updateResource, deleteResource } = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');
const { loadAuthority, requireResourceManagement } = require('../middleware/resourceAuthorization');

const router = express.Router();

router.use(protect);
router.get('/', listResources);
router.get('/:id', getResourceById);
router.post('/', loadAuthority, requireResourceManagement, createResource);
router.put('/:id', loadAuthority, requireResourceManagement, updateResource);
router.delete('/:id', loadAuthority, requireResourceManagement, deleteResource);

module.exports = router;
