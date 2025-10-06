const express = require('express');
const {
  createTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  updateTicket,
  deleteTicket,
  getTicketStats
} = require('../controllers/supportController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

// User routes (authenticated)
router.use(authenticateToken);

// Create new ticket with file uploads
router.post('/tickets', uploadMultiple, createTicket);

// Get all tickets (Admin only) - must be before /tickets/:id
router.get('/tickets/all', authorizeRoles('admin'), getAllTickets);

// Get user's tickets
router.get('/tickets', getMyTickets);

// Get ticket by ID
router.get('/tickets/:id', getTicketById);

// Update ticket (Admin only)
router.put('/tickets/:id', authorizeRoles('admin'), updateTicket);

// Admin routes (alternative paths)
router.get('/admin/tickets', authorizeRoles('admin'), getAllTickets);
router.put('/admin/tickets/:id', authorizeRoles('admin'), updateTicket);
router.delete('/admin/tickets/:id', authorizeRoles('admin'), deleteTicket);
router.get('/admin/stats', authorizeRoles('admin'), getTicketStats);

module.exports = router;
