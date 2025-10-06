const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getPreferences,
    updatePreferences,
    updateAccount,
    changePassword,
    getSecuritySettings,
    toggle2FA,
    logoutAllDevices,
    downloadData,
    clearHistory,
    deactivateAccount,
    deleteAccount
} = require('../controllers/settingsController');

// All routes are protected
router.use(authenticateToken);

// Preferences routes
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// Account routes
router.put('/account', updateAccount);

// Security routes
router.post('/change-password', changePassword);
router.get('/security', getSecuritySettings);
router.post('/2fa/toggle', toggle2FA);
router.post('/logout-all', logoutAllDevices);

// Privacy & Data routes
router.post('/download-data', downloadData);
router.delete('/clear-history', clearHistory);

// Account management routes
router.post('/deactivate', deactivateAccount);
router.delete('/delete-account', deleteAccount);

module.exports = router;
