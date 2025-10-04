// Export tất cả models
const User = require('./User');
const StudentProfile = require('./StudentProfile');
const TutorProfile = require('./TutorProfile');
const AdminProfile = require('./AdminProfile');
const Course = require('./Course');
const Message = require('./Message');
const TutorRequest = require('./TutorRequest');
const BlogPost = require('./BlogPost');

module.exports = {
  User,
  StudentProfile,
  TutorProfile,
  AdminProfile,
  Course,
  Message,
  TutorRequest,
  BlogPost
};