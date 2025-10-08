const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Tất cả routes chỉ dành cho admin
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Statistics and overview
router.get('/statistics', logsController.getLogStatistics);
router.get('/unresolved', logsController.getUnresolvedErrors);

// Log list and details
router.get('/', logsController.getLogs);
router.get('/:id', logsController.getLogById);

// User activity timeline
router.get('/user/:userId', logsController.getUserActivityTimeline);

// Actions
router.put('/:id/resolve', logsController.resolveLog);
router.delete('/cleanup', logsController.cleanupLogs);

// Export
router.get('/export', logsController.exportLogs);

module.exports = router;
