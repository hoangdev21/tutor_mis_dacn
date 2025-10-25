const express = require('express');
const { chat } = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// tất cả các route bên dưới đều cần xác thực token
router.use(authenticateToken);

// Chat with AI
router.post('/chat', chat);

module.exports = router;
