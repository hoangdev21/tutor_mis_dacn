const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Tất cả routes chỉ dành cho admin
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Statistics routes
router.get('/statistics', financialController.getStatistics);
router.get('/revenue-chart', financialController.getRevenueChart);

// Transaction routes
router.get('/transactions', financialController.getTransactions);
router.get('/transactions/:id', financialController.getTransactionById);
router.post('/transactions', financialController.createTransaction);
router.put('/transactions/:id', financialController.updateTransaction);
router.post('/transactions/:id/refund', financialController.refundTransaction);

// Export route
router.get('/export', financialController.exportTransactions);

module.exports = router;
