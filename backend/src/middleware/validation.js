const { body, validationResult } = require('express-validator');

// Xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Validation cho đăng ký
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  body('role')
    .isIn(['student', 'tutor'])
    .withMessage('Role must be either student or tutor'),
    
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[\p{L}\s]+$/u)
    .withMessage('Full name can only contain letters and spaces'),
    
  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Phone number must be 10-11 digits'),
    
  handleValidationErrors
];

// Validation cho đăng nhập
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors
];

// Validation cho update profile student
const validateStudentProfile = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
    
  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Phone number must be 10-11 digits'),
    
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
    
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
    
  body('currentEducationLevel')
    .optional()
    .isIn(['elementary', 'middle_school', 'high_school', 'university', 'other'])
    .withMessage('Invalid education level'),
    
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array'),
    
  body('learningGoals')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Learning goals must not exceed 500 characters'),
    
  handleValidationErrors
];

// Validation cho tutor profile
const validateTutorProfile = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
    
  body('phone')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Phone number must be 10-11 digits'),
    
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
    
  body('gender')
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
    
  body('education')
    .isArray({ min: 1 })
    .withMessage('At least one education entry is required'),
    
  body('education.*.degree')
    .notEmpty()
    .withMessage('Degree is required'),
    
  body('education.*.major')
    .notEmpty()
    .withMessage('Major is required'),
    
  body('education.*.university')
    .notEmpty()
    .withMessage('University is required'),
    
  body('education.*.graduationYear')
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage('Invalid graduation year'),
    
  body('subjects')
    .isArray({ min: 1 })
    .withMessage('At least one subject is required'),
    
  body('subjects.*.subject')
    .notEmpty()
    .withMessage('Subject name is required'),
    
  body('subjects.*.level')
    .isIn(['elementary', 'middle_school', 'high_school', 'university'])
    .withMessage('Invalid subject level'),
    
  body('subjects.*.hourlyRate')
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
    
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
    
  handleValidationErrors
];

// Validation cho tạo course
const validateCourse = [
  body('studentId')
    .isMongoId()
    .withMessage('Valid student ID is required'),
    
  body('subject')
    .notEmpty()
    .withMessage('Subject is required'),
    
  body('level')
    .isIn(['elementary', 'middle_school', 'high_school', 'university'])
    .withMessage('Invalid level'),
    
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
    
  body('hourlyRate')
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
    
  body('location.type')
    .isIn(['online', 'student_home', 'tutor_home', 'library', 'cafe', 'other'])
    .withMessage('Invalid location type'),
    
  handleValidationErrors
];

// Validation cho tutor request
const validateTutorRequest = [
  body('subject')
    .notEmpty()
    .withMessage('Subject is required'),
    
  body('level')
    .isIn(['elementary', 'middle_school', 'high_school', 'university'])
    .withMessage('Invalid level'),
    
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
    
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),
    
  body('budgetRange.min')
    .isFloat({ min: 0 })
    .withMessage('Minimum budget must be a positive number'),
    
  body('budgetRange.max')
    .isFloat({ min: 0 })
    .withMessage('Maximum budget must be a positive number'),
    
  body('location.type')
    .isIn(['online', 'student_home', 'tutor_home', 'library', 'cafe', 'flexible'])
    .withMessage('Invalid location type'),
    
  // Kiểm tra max >= min
  body('budgetRange.max').custom((value, { req }) => {
    if (value < req.body.budgetRange.min) {
      throw new Error('Maximum budget must be greater than or equal to minimum budget');
    }
    return true;
  }),
    
  handleValidationErrors
];

// Validation cho message
const validateMessage = [
  body('receiverId')
    .isMongoId()
    .withMessage('Valid receiver ID is required'),
    
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
    
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('Course ID must be valid if provided'),
    
  handleValidationErrors
];

// Validation cho blog post
const validateBlogPost = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
    
  body('content')
    .trim()
    .isLength({ min: 100 })
    .withMessage('Content must be at least 100 characters'),
    
  body('category')
    .isIn(['education', 'teaching_tips', 'student_guide', 'exam_prep', 'career_advice', 'technology', 'other'])
    .withMessage('Invalid category'),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
    
  body('excerpt')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Excerpt must not exceed 300 characters'),
    
  handleValidationErrors
];

// Validation cho reset password
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  handleValidationErrors
];

// Validation cho new password
const validateNewPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
    
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateStudentProfile,
  validateTutorProfile,
  validateCourse,
  validateTutorRequest,
  validateMessage,
  validateBlogPost,
  validatePasswordReset,
  validateNewPassword,
  handleValidationErrors
};