const express = require('express');
const {
  getDashboard,
  getUsers,
  getUserById,
  approveTutor,
  toggleUserStatus,
  getBlogPosts,
  moderateBlogPost,
  getFinanceStats
} = require('../controllers/adminController');
const {
  authenticateToken,
  authorizeRoles,
  authorizeAdminPermission
} = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Tất cả routes cần authentication và role admin
router.use(authenticateToken);
router.use(authorizeRoles('admin'));
router.use(adminLimiter);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Lấy thông tin dashboard admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin dashboard admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                           description: Tổng số người dùng
 *                         totalStudents:
 *                           type: number
 *                           description: Tổng số học sinh
 *                         totalTutors:
 *                           type: number
 *                           description: Tổng số gia sư
 *                         pendingTutors:
 *                           type: number
 *                           description: Số gia sư chờ duyệt
 *                         totalCourses:
 *                           type: number
 *                           description: Tổng số khóa học
 *                         activeCourses:
 *                           type: number
 *                           description: Số khóa học đang hoạt động
 *                         totalRevenue:
 *                           type: number
 *                           description: Tổng doanh thu
 *                         monthlyRevenue:
 *                           type: number
 *                           description: Doanh thu tháng này
 *                     recentUsers:
 *                       type: array
 *                       description: Người dùng đăng ký gần đây
 *                     pendingApprovals:
 *                       type: array
 *                       description: Gia sư chờ duyệt
 *                     systemAlerts:
 *                       type: array
 *                       description: Cảnh báo hệ thống
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Lấy danh sách người dùng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, tutor, admin]
 *         description: Lọc theo vai trò
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái duyệt
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Số lượng người dùng mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/User'
 *                           - type: object
 *                             properties:
 *                               profile:
 *                                 oneOf:
 *                                   - $ref: '#/components/schemas/StudentProfile'
 *                                   - $ref: '#/components/schemas/TutorProfile'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         pages:
 *                           type: number
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền quản lý người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users', authorizeAdminPermission('manageUsers'), getUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Lấy thông tin chi tiết một người dùng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID của người dùng
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin chi tiết người dùng
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.get('/users/:userId', authorizeAdminPermission('manageUsers'), getUserById);

/**
 * @swagger
 * /admin/users/{userId}/approve:
 *   put:
 *     summary: Duyệt hoặc từ chối gia sư
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID của người dùng
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *                 description: true để duyệt, false để từ chối
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do từ chối (bắt buộc nếu approved = false)
 *     responses:
 *       200:
 *         description: Xử lý duyệt gia sư thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tutor approved successfully"
 *       400:
 *         description: Lỗi validation hoặc người dùng không phải gia sư
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Không tìm thấy người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền quản lý người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/users/:userId/approve', authorizeAdminPermission('manageUsers'), approveTutor);

/**
 * @swagger
 * /admin/users/{userId}/toggle-status:
 *   put:
 *     summary: Kích hoạt hoặc vô hiệu hóa tài khoản người dùng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID của người dùng
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: true để kích hoạt, false để vô hiệu hóa
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do thay đổi trạng thái
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User status updated successfully"
 *       404:
 *         description: Không tìm thấy người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền quản lý người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/users/:userId/toggle-status', authorizeAdminPermission('manageUsers'), toggleUserStatus);

/**
 * @swagger
 * /admin/content/blogs:
 *   get:
 *     summary: Lấy danh sách bài viết blog cần kiểm duyệt
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, published, rejected]
 *         description: Lọc theo trạng thái bài viết
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [education, teaching_tips, student_guide, exam_prep, career_advice, technology, other]
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Lọc theo tác giả
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Số lượng bài viết mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách bài viết blog
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           excerpt:
 *                             type: string
 *                           category:
 *                             type: string
 *                           status:
 *                             type: string
 *                           author:
 *                             type: object
 *                             properties:
 *                               fullName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           views:
 *                             type: number
 *                           likes:
 *                             type: number
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         pages:
 *                           type: number
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền quản lý nội dung
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/content/blogs', authorizeAdminPermission('manageContent'), getBlogPosts);

/**
 * @swagger
 * /admin/content/blogs/{postId}/moderate:
 *   put:
 *     summary: Kiểm duyệt bài viết blog
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         description: ID của bài viết
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Hành động kiểm duyệt
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do từ chối (bắt buộc nếu action = reject)
 *     responses:
 *       200:
 *         description: Kiểm duyệt bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Blog post moderated successfully"
 *       400:
 *         description: Lỗi validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Không tìm thấy bài viết
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền quản lý nội dung
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/content/blogs/:postId/moderate', authorizeAdminPermission('manageContent'), moderateBlogPost);

/**
 * @swagger
 * /admin/finance:
 *   get:
 *     summary: Lấy thống kê tài chính hệ thống
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Khoảng thời gian thống kê
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Thống kê tài chính
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                       description: Tổng doanh thu
 *                     periodRevenue:
 *                       type: number
 *                       description: Doanh thu trong kỳ
 *                     platformFee:
 *                       type: number
 *                       description: Phí nền tảng thu được
 *                     totalTransactions:
 *                       type: number
 *                       description: Tổng số giao dịch
 *                     averageTransactionValue:
 *                       type: number
 *                       description: Giá trị giao dịch trung bình
 *                     revenueByMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                           transactions:
 *                             type: number
 *                     revenueByCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subject:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     topTutors:
 *                       type: array
 *                       description: Top gia sư theo doanh thu
 *                     pendingPayouts:
 *                       type: array
 *                       description: Các khoản thanh toán chờ xử lý
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Không đủ quyền quản lý tài chính
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/finance', authorizeAdminPermission('manageFinance'), getFinanceStats);

module.exports = router;