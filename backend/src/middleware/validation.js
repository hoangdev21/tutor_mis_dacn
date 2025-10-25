const { body, validationResult } = require('express-validator');

// Xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Xác thực dữ liệu không thành công',
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
    .withMessage('Vui lòng cung cấp địa chỉ email hợp lệ'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường và một số'),
    
  body('role')
    .isIn(['student', 'tutor'])
    .withMessage('Vai trò phải là sinh viên hoặc gia sư'),
    
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Họ và tên phải từ 2 đến 50 ký tự')
    .matches(/^[\p{L}\s]+$/u)
    .withMessage('Họ và tên chỉ được chứa chữ cái và khoảng trắng'),

  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải từ 10 đến 11 chữ số'),

  handleValidationErrors
];

// Validation cho đăng nhập
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Vui lòng cung cấp địa chỉ email hợp lệ'),
    
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),

  handleValidationErrors
];

// Validation cho update profile student
const validateStudentProfile = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Họ và tên phải từ 2 đến 50 ký tự'),
    
  body('phone')
    .optional()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải từ 10 đến 11 chữ số'),
    
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Ngày sinh phải là một ngày hợp lệ'),
    
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Giới tính phải là nam, nữ hoặc khác'),
    
  body('currentEducationLevel')
    .optional()
    .isIn(['elementary', 'middle_school', 'high_school', 'university', 'other'])
    .withMessage('Cấp độ giáo dục không hợp lệ'),
    
  body('subjects')
    .optional()
    .isArray()
    .withMessage('Môn học phải là một mảng'),
    
  body('learningGoals')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mục tiêu học tập không được vượt quá 500 ký tự'),
    
  handleValidationErrors
];

// Validation cho tutor profile
const validateTutorProfile = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Họ và tên phải từ 2 đến 50 ký tự'),
    
  body('phone')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải từ 10 đến 11 chữ số'),

  body('dateOfBirth')
    .isISO8601()
    .withMessage('Ngày sinh phải là một ngày hợp lệ'),

  body('gender')
    .isIn(['male', 'female'])
    .withMessage('Giới tính phải là nam hoặc nữ'),

  body('education')
    .isArray({ min: 1 })
    .withMessage('Ít nhất một mục giáo dục là bắt buộc'),

  body('education.*.degree')
    .notEmpty()
    .withMessage('Bằng cấp là bắt buộc'),

  body('education.*.major')
    .notEmpty()
    .withMessage('Chuyên ngành là bắt buộc'),

  body('education.*.university')
    .notEmpty()
    .withMessage('Trường đại học là bắt buộc'),

  body('education.*.graduationYear')
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage('Năm tốt nghiệp không hợp lệ'),

  body('subjects')
    .isArray({ min: 1 })
    .withMessage('Ít nhất một môn học là bắt buộc'),

  body('subjects.*.subject')
    .notEmpty()
    .withMessage('Tên môn học là bắt buộc'),

  body('subjects.*.level')
    .isIn(['elementary', 'middle_school', 'high_school', 'university'])
    .withMessage('Cấp độ môn học không hợp lệ'),

  body('subjects.*.hourlyRate')
    .isFloat({ min: 0 })
    .withMessage('Mức lương theo giờ phải là một số dương'),

  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Thông tin tiểu sử không được vượt quá 1000 ký tự'),

  handleValidationErrors
];

// Validation cho tạo course
const validateCourse = [
  body('studentId')
    .isMongoId()
    .withMessage('ID học sinh không hợp lệ'),

  body('subject')
    .notEmpty()
    .withMessage('Môn học là bắt buộc'),

  body('level')
    .isIn(['elementary', 'middle_school', 'high_school', 'university'])
    .withMessage('Cấp độ không hợp lệ'),

  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Tiêu đề phải từ 5 đến 100 ký tự'),

  body('hourlyRate')
    .isFloat({ min: 0 })
    .withMessage('Mức lương theo giờ phải là một số dương'),

  body('location.type')
    .isIn(['online', 'student_home', 'tutor_home', 'library', 'cafe', 'other'])
    .withMessage('Loại địa điểm không hợp lệ'),
    
  handleValidationErrors
];

// Validation cho tutor request
const validateTutorRequest = [
  body('subject')
    .notEmpty()
    .withMessage('Môn học là bắt buộc'),

  body('level')
    .isIn(['elementary', 'middle_school', 'high_school', 'university'])
    .withMessage('Cấp độ không hợp lệ'),
    
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Tiêu đề phải từ 10 đến 200 ký tự'),
    
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Mô tả phải từ 20 đến 1000 ký tự'),
    
  body('budgetRange.min')
    .isFloat({ min: 0 })
    .withMessage('Mức ngân sách tối thiểu phải là một số dương'),

  body('budgetRange.max')
    .isFloat({ min: 0 })
    .withMessage('Mức ngân sách tối đa phải là một số dương'),

  body('location.type')
    .isIn(['online', 'student_home', 'tutor_home', 'library', 'cafe', 'flexible'])
    .withMessage('Loại địa điểm không hợp lệ'),

  // Kiểm tra max >= min
  body('budgetRange.max').custom((value, { req }) => {
    if (value < req.body.budgetRange.min) {
      throw new Error('Mức ngân sách tối đa phải lớn hơn hoặc bằng mức ngân sách tối thiểu');
    }
    return true;
  }),
    
  handleValidationErrors
];

// Validation cho message
const validateMessage = [
  body('receiverId')
    .isMongoId()
    .withMessage('ID người nhận không hợp lệ'),
    
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Nội dung tin nhắn phải từ 1 đến 2000 ký tự'),
    
  body('courseId')
    .optional()
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ nếu được cung cấp'),
    
  handleValidationErrors
];

// Validation cho blog post
const validateBlogPost = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Tiêu đề phải từ 10 đến 200 ký tự'),
    
  body('content')
    .trim()
    .isLength({ min: 100 })
    .withMessage('Nội dung phải từ 100 ký tự trở lên'),
    
  body('category')
    .isIn(['education', 'teaching_tips', 'student_guide', 'exam_prep', 'career_advice', 'technology', 'other'])
    .withMessage('Danh mục không hợp lệ'),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là một mảng'),
    
  body('excerpt')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Excerpt không được vượt quá 300 ký tự'),
    
  handleValidationErrors
];

// Validation cho reset password
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Vui lòng cung cấp một địa chỉ email hợp lệ'),
    
  handleValidationErrors
];

// Validation cho new password
const validateNewPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường và một số'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Xác nhận mật khẩu không khớp với mật khẩu');
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