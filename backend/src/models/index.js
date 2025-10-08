// Export tất cả models
const User = require('./User');
const StudentProfile = require('./StudentProfile');
const TutorProfile = require('./TutorProfile');
const AdminProfile = require('./AdminProfile');
const Course = require('./Course');
const Message = require('./Message');
const TutorRequest = require('./TutorRequest');
const BlogPost = require('./BlogPost');
const SupportTicket = require('./SupportTicket');
const BookingRequest = require('./BookingRequest');
const Notification = require('./Notification');
const ContactSubmission = require('./ContactSubmission');
const Transaction = require('./Transaction');
const ActivityLog = require('./ActivityLog');

module.exports = {
  User,
  StudentProfile,
  TutorProfile,
  AdminProfile,
  Course,
  Message,
  TutorRequest,
  BlogPost,
  BookingRequest,
  Notification,
  SupportTicket,
  ContactSubmission,
  Transaction,
  ActivityLog
};