const express = require('express');
const {
  getDashboard,
  getProfile,
  updateProfile,
  getCourses,
  getCourseDetail,
  rateCourse,
  uploadAvatar
} = require('../controllers/studentController');
const {
  authenticateToken,
  authorizeRoles,
  authorizeResource
} = require('../middleware/auth');
const {
  validateStudentProfile
} = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');
const { uploadAvatar: uploadAvatarMiddleware, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Tất cả routes cần authentication và role student
router.use(authenticateToken);
router.use(authorizeRoles('student'));
router.use(apiLimiter);

/**
 * @swagger
 * /student/dashboard:
 *   get:
 *     summary: Lấy thông tin dashboard học sinh
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin dashboard học sinh
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
 *                         totalCourses:
 *                           type: number
 *                           description: Tổng số khóa học
 *                         activeCourses:
 *                           type: number
 *                           description: Số khóa học đang hoạt động
 *                         completedCourses:
 *                           type: number
 *                           description: Số khóa học đã hoàn thành
 *                         totalSpent:
 *                           type: number
 *                           description: Tổng số tiền đã chi
 *                     recentCourses:
 *                       type: array
 *                       description: Danh sách khóa học gần đây
 *                     upcomingLessons:
 *                       type: array
 *                       description: Lịch học sắp tới
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /student/profile:
 *   get:
 *     summary: Lấy thông tin profile học sinh
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin profile học sinh
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
 *                     profile:
 *                       $ref: '#/components/schemas/StudentProfile'
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Cập nhật thông tin profile học sinh
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   ward:
 *                     type: string
 *                   district:
 *                     type: string
 *                   city:
 *                     type: string
 *               parentInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *     responses:
 *       200:
 *         description: Cập nhật profile thành công
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       $ref: '#/components/schemas/StudentProfile'
 *       400:
 *         description: Lỗi validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', getProfile);
router.put('/profile', validateStudentProfile, updateProfile);
router.post('/profile/avatar', uploadAvatarMiddleware, handleMulterError, uploadAvatar);

/**
 * @swagger
 * /student/courses:
 *   get:
 *     summary: Lấy danh sách khóa học của học sinh
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         description: Lọc theo trạng thái khóa học
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
 *           default: 10
 *         description: Số lượng khóa học mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách khóa học
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
 *                     courses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           subject:
 *                             type: string
 *                           level:
 *                             type: string
 *                           tutor:
 *                             type: object
 *                             properties:
 *                               fullName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           status:
 *                             type: string
 *                           totalHours:
 *                             type: number
 *                           hourlyRate:
 *                             type: number
 *                           startDate:
 *                             type: string
 *                             format: date-time
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
 */
router.get('/courses', getCourses);

/**
 * @swagger
 * /student/courses/{courseId}:
 *   get:
 *     summary: Lấy chi tiết khóa học
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         description: ID của khóa học
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết khóa học
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
 *                     course:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         subject:
 *                           type: string
 *                         level:
 *                           type: string
 *                         tutor:
 *                           type: object
 *                         status:
 *                           type: string
 *                         schedule:
 *                           type: array
 *                         messages:
 *                           type: array
 *                         progress:
 *                           type: object
 *       404:
 *         description: Không tìm thấy khóa học
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
 */
router.get('/courses/:courseId', getCourseDetail);

/**
 * @swagger
 * /student/courses/{courseId}/rate:
 *   post:
 *     summary: Đánh giá khóa học
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         description: ID của khóa học
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Điểm đánh giá từ 1-5
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *                 description: Nhận xét về khóa học
 *     responses:
 *       200:
 *         description: Đánh giá thành công
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
 *                   example: "Course rated successfully"
 *       400:
 *         description: Lỗi validation hoặc khóa học chưa hoàn thành
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Không tìm thấy khóa học
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
 */
router.post('/courses/:courseId/rate', rateCourse);

module.exports = router;