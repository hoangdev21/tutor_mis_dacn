const express = require('express');
const {
  submitContactForm,
  getContactSubmissions,
  getContactSubmissionById,
  updateContactSubmission,
  deleteContactSubmission,
  getContactStats
} = require('../controllers/contactController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// public route
router.post('/submit', submitContactForm);

// Admin routes
router.get('/submissions', authenticateToken, authorizeRoles('admin'), getContactSubmissions);
router.get('/submissions/:id', authenticateToken, authorizeRoles('admin'), getContactSubmissionById);
router.put('/submissions/:id', authenticateToken, authorizeRoles('admin'), updateContactSubmission);
router.delete('/submissions/:id', authenticateToken, authorizeRoles('admin'), deleteContactSubmission);
router.get('/stats', authenticateToken, authorizeRoles('admin'), getContactStats);

module.exports = router;
