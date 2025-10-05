const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

/**
 * @swagger
 * components:
 *   schemas:
 *     BookingRequest:
 *       type: object
 *       properties:
 *         student:
 *           type: string
 *           description: Student ID
 *         tutor:
 *           type: string
 *           description: Tutor ID
 *         subject:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             level:
 *               type: string
 *         schedule:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date
 *             preferredTime:
 *               type: string
 *             daysPerWeek:
 *               type: number
 *             hoursPerSession:
 *               type: number
 *             duration:
 *               type: number
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [online, student_home, tutor_home, other]
 *             address:
 *               type: string
 *         pricing:
 *           type: object
 *           properties:
 *             hourlyRate:
 *               type: number
 *             totalAmount:
 *               type: number
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, cancelled, completed]
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tutorId
 *               - subject
 *               - schedule
 *               - location
 *             properties:
 *               tutorId:
 *                 type: string
 *               subject:
 *                 type: object
 *               schedule:
 *                 type: object
 *               location:
 *                 type: object
 *               pricing:
 *                 type: object
 *               description:
 *                 type: string
 *               studentNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking request created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Access denied
 */
router.post('/', authenticateToken, bookingController.createBookingRequest);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all booking requests for current user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of booking requests
 */
router.get('/', authenticateToken, bookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/stats:
 *   get:
 *     summary: Get booking statistics
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking statistics
 */
router.get('/stats', authenticateToken, bookingController.getBookingStats);

/**
 * @swagger
 * /api/bookings/upcoming:
 *   get:
 *     summary: Get upcoming bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming bookings
 */
router.get('/upcoming', authenticateToken, bookingController.getUpcomingBookings);

/**
 * @swagger
 * /api/bookings/pending:
 *   get:
 *     summary: Get pending bookings (for tutor)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending bookings
 */
router.get('/pending', authenticateToken, bookingController.getPendingBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking request by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get('/:id', authenticateToken, bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings/{id}/accept:
 *   put:
 *     summary: Accept booking request (Tutor only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking accepted
 */
router.put('/:id/accept', authenticateToken, bookingController.acceptBooking);

/**
 * @swagger
 * /api/bookings/{id}/reject:
 *   put:
 *     summary: Reject booking request (Tutor only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking rejected
 */
router.put('/:id/reject', authenticateToken, bookingController.rejectBooking);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   put:
 *     summary: Cancel booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Booking cancelled
 */
router.put('/:id/cancel', authenticateToken, bookingController.cancelBooking);

/**
 * @swagger
 * /api/bookings/{id}/complete:
 *   put:
 *     summary: Complete booking (Tutor only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking completed
 */
router.put('/:id/complete', authenticateToken, bookingController.completeBooking);

/**
 * @swagger
 * /api/bookings/{id}/rating:
 *   post:
 *     summary: Add rating to completed booking (Student only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - score
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rating added successfully
 */
router.post('/:id/rating', authenticateToken, bookingController.rateBooking);

module.exports = router;
