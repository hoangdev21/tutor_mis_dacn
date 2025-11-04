const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         reviewer:
 *           type: string
 *           description: ID của học sinh đánh giá
 *         tutor:
 *           type: string
 *           description: ID của gia sư được đánh giá
 *         booking:
 *           type: string
 *           description: ID của yêu cầu đặt lịch liên quan
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *         criteria:
 *           type: object
 *           properties:
 *             professionalism:
 *               type: number
 *             communication:
 *               type: number
 *             knowledgeLevel:
 *               type: number
 *             patience:
 *               type: number
 *             effectiveness:
 *               type: number
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, hidden]
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Tạo đánh giá cho gia sư
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - rating
 *             properties:
 *               bookingId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               criteria:
 *                 type: object
 *               attachments:
 *                 type: array
 *     responses:
 *       201:
 *         description: Đánh giá được tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền
 */
router.post('/', authenticateToken, reviewController.createReview);

/**
 * @swagger
 * /api/reviews/my:
 *   get:
 *     summary: Lấy các đánh giá của tôi
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Danh sách đánh giá của tôi
 */
router.get('/my', authenticateToken, reviewController.getMyReviews);

/**
 * @swagger
 * /api/reviews/tutor/{tutorId}:
 *   get:
 *     summary: Lấy tất cả đánh giá của gia sư
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Danh sách đánh giá của gia sư
 */
router.get('/tutor/:tutorId', reviewController.getReviewsByTutor);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Lấy chi tiết đánh giá
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết đánh giá
 */
router.get('/:reviewId', reviewController.getReviewById);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   put:
 *     summary: Cập nhật đánh giá
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *               comment:
 *                 type: string
 *               criteria:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cập nhật đánh giá thành công
 */
router.put('/:reviewId', authenticateToken, reviewController.updateReview);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Xóa đánh giá
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa đánh giá thành công
 */
router.delete('/:reviewId', authenticateToken, reviewController.deleteReview);

/**
 * @swagger
 * /api/reviews/{reviewId}/respond:
 *   put:
 *     summary: Gia sư phản hồi đánh giá
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phản hồi thành công
 */
router.put('/:reviewId/respond', authenticateToken, reviewController.respondToReview);

/**
 * @swagger
 * /api/reviews/{reviewId}/helpful:
 *   put:
 *     summary: Đánh dấu đánh giá là hữu ích
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái hữu ích
 */
router.put('/:reviewId/helpful', authenticateToken, reviewController.markHelpful);

/**
 * @swagger
 * /api/reviews/status/{status}:
 *   get:
 *     summary: Lấy đánh giá theo trạng thái (Admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, hidden]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 */
router.get('/status/:status', authenticateToken, reviewController.getReviewsByStatus);

/**
 * @swagger
 * /api/reviews/{reviewId}/approve:
 *   put:
 *     summary: Phê duyệt đánh giá (Admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Phê duyệt thành công
 */
router.put('/:reviewId/approve', authenticateToken, reviewController.approveReview);

/**
 * @swagger
 * /api/reviews/{reviewId}/reject:
 *   put:
 *     summary: Từ chối đánh giá (Admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Từ chối thành công
 */
router.put('/:reviewId/reject', authenticateToken, reviewController.rejectReview);

module.exports = router;
