const express = require('express');
const {
  getDashboard,
  getProfile,
  updateProfile,
  getRequests,
  applyRequest,
  getStudents,
  getIncome,
  uploadAvatar,
  uploadCertificate,
  uploadUniversityImage
} = require('../controllers/tutorController');
const {
  authenticateToken,
  authorizeRoles,
  authorizeResource
} = require('../middleware/auth');
const {
  validateTutorProfile
} = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');
const { 
  uploadAvatar: uploadAvatarMiddleware, 
  uploadCertificate: uploadCertificateMiddleware,
  handleMulterError 
} = require('../middleware/upload');

const router = express.Router();

// Tất cả routes cần authentication và role tutor
router.use(authenticateToken);
router.use(authorizeRoles('tutor'));
router.use(apiLimiter);

/**
 * @swagger
 * /tutor/dashboard:
 *   get:
 *     summary: Lấy thông tin dashboard gia sư
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin dashboard gia sư
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
 *                         totalStudents:
 *                           type: number
 *                           description: Tổng số học sinh
 *                         activeStudents:
 *                           type: number
 *                           description: Số học sinh đang hoạt động
 *                         totalEarnings:
 *                           type: number
 *                           description: Tổng thu nhập
 *                         monthlyEarnings:
 *                           type: number
 *                           description: Thu nhập tháng này
 *                         rating:
 *                           type: object
 *                           properties:
 *                             average:
 *                               type: number
 *                             count:
 *                               type: number
 *                     recentStudents:
 *                       type: array
 *                       description: Danh sách học sinh gần đây
 *                     upcomingLessons:
 *                       type: array
 *                       description: Lịch dạy sắp tới
 *                     pendingRequests:
 *                       type: array
 *                       description: Yêu cầu chờ duyệt
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
 * /tutor/profile:
 *   get:
 *     summary: Lấy thông tin profile gia sư
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin profile gia sư
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
 *                       $ref: '#/components/schemas/TutorProfile'
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Cập nhật thông tin profile gia sư
 *     tags: [Tutor]
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
 *               education:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     degree:
 *                       type: string
 *                     major:
 *                       type: string
 *                     university:
 *                       type: string
 *                     graduationYear:
 *                       type: number
 *                     gpa:
 *                       type: number
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     level:
 *                       type: string
 *                       enum: [elementary, middle_school, high_school, university]
 *                     hourlyRate:
 *                       type: number
 *                     experience:
 *                       type: number
 *               experience:
 *                 type: object
 *                 properties:
 *                   totalYears:
 *                     type: number
 *                   description:
 *                     type: string
 *                   achievements:
 *                     type: array
 *                     items:
 *                       type: string
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
 *                       $ref: '#/components/schemas/TutorProfile'
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
router.put('/profile', updateProfile);
router.post('/profile/avatar', uploadAvatarMiddleware, handleMulterError, uploadAvatar);
router.post('/profile/university-image', uploadAvatarMiddleware, handleMulterError, uploadUniversityImage);
router.post('/profile/certificate', uploadCertificateMiddleware, handleMulterError, uploadCertificate);

/**
 * @swagger
 * /tutor/requests:
 *   get:
 *     summary: Lấy danh sách yêu cầu tìm gia sư
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Lọc theo môn học
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [elementary, middle_school, high_school, university]
 *         description: Lọc theo cấp độ
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Lọc theo địa điểm
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
 *         description: Số lượng yêu cầu mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu tìm gia sư
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
 *                     requests:
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
 *                           description:
 *                             type: string
 *                           budget:
 *                             type: object
 *                             properties:
 *                               min:
 *                                 type: number
 *                               max:
 *                                 type: number
 *                           location:
 *                             type: object
 *                           schedule:
 *                             type: array
 *                           student:
 *                             type: object
 *                             properties:
 *                               fullName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           postedAt:
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
router.get('/requests', getRequests);

/**
 * @swagger
 * /tutor/requests/{requestId}/apply:
 *   post:
 *     summary: Ứng tuyển yêu cầu tìm gia sư
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         description: ID của yêu cầu
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposedRate
 *               - message
 *             properties:
 *               proposedRate:
 *                 type: number
 *                 minimum: 0
 *                 description: Mức phí đề xuất (VNĐ/giờ)
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 description: Tin nhắn giới thiệu
 *               availableSchedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     timeSlots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                             format: time
 *                           endTime:
 *                             type: string
 *                             format: time
 *     responses:
 *       200:
 *         description: Ứng tuyển thành công
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
 *                   example: "Application submitted successfully"
 *       400:
 *         description: Lỗi validation hoặc đã ứng tuyển trước đó
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Không tìm thấy yêu cầu
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
router.post('/requests/:requestId/apply', applyRequest);

/**
 * @swagger
 * /tutor/students:
 *   get:
 *     summary: Lấy danh sách học sinh của gia sư
 *     tags: [Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled]
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
 *         description: Số lượng học sinh mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách học sinh
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
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           student:
 *                             type: object
 *                             properties:
 *                               fullName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                           subject:
 *                             type: string
 *                           level:
 *                             type: string
 *                           status:
 *                             type: string
 *                           totalHours:
 *                             type: number
 *                           hourlyRate:
 *                             type: number
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           lastLessonDate:
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
router.get('/students', getStudents);

/**
 * @swagger
 * /tutor/income:
 *   get:
 *     summary: Lấy thống kê thu nhập gia sư
 *     tags: [Tutor]
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
 *         description: Thống kê thu nhập
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
 *                     totalIncome:
 *                       type: number
 *                       description: Tổng thu nhập
 *                     periodIncome:
 *                       type: number
 *                       description: Thu nhập trong kỳ
 *                     totalHours:
 *                       type: number
 *                       description: Tổng số giờ dạy
 *                     averageHourlyRate:
 *                       type: number
 *                       description: Mức phí trung bình/giờ
 *                     incomeByMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           income:
 *                             type: number
 *                           hours:
 *                             type: number
 *                     incomeBySubject:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subject:
 *                             type: string
 *                           income:
 *                             type: number
 *                           hours:
 *                             type: number
 *                     pendingPayments:
 *                       type: array
 *                       description: Các khoản thanh toán chờ xử lý
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/income', getIncome);

module.exports = router;