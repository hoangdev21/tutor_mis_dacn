const express = require('express');
const {
  createPost,
  updatePost,
  deletePost,
  getPost,
  getAllPosts,
  toggleLike,
  addComment,
  deleteComment,
  likeComment,
  replyToComment,
  sharePost,
  getMyPosts
} = require('../controllers/blogController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');

// Configure multer for multiple image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
  }
});

const router = express.Router();

// Public routes
router.get('/posts', getAllPosts); // Public feed
router.get('/posts/:id', getPost); // Single post

// Protected routes (require authentication)
router.use(authenticateToken);
router.use(apiLimiter);

// Post management
router.post('/posts', upload.array('images', 10), createPost);
router.put('/posts/:id', upload.array('images', 10), updatePost);
router.delete('/posts/:id', deletePost);
router.get('/my-posts', getMyPosts);

// Interactions
router.post('/posts/:id/like', toggleLike);
router.post('/posts/:id/comments', addComment);
router.delete('/posts/:id/comments/:commentId', deleteComment);
router.post('/posts/:id/comments/:commentId/like', likeComment);
router.post('/posts/:id/comments/:commentId/reply', replyToComment);
router.post('/posts/:id/share', sharePost);

module.exports = router;
