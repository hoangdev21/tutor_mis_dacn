const { User, StudentProfile, TutorProfile, AdminProfile } = require('../models');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashToken
} = require('../utils/jwt');
const { 
  sendEmail, 
  emailVerificationTemplate, 
  welcomeEmailTemplate,
  tutorApprovalTemplate,
  otpVerificationTemplate
} = require('../utils/email');
const { 
  generateOTP, 
  hashOTP, 
  verifyOTP, 
  generateOTPExpiry 
} = require('../utils/otp');

// @desc    Đăng ký tài khoản
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password, role, fullName, phone, ...otherData } = req.body;
    
    console.log('📝 Registration attempt:', { email, role, fullName, phone });
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Tạo OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    
    // Tạo user
    const userData = {
      email,
      password,
      role,
      emailVerificationOTP: hashedOTP,
      emailVerificationOTPExpires: generateOTPExpiry()
    };
    
    const user = await User.create(userData);
    
    // Tạo profile tương ứng với role
    let profile;
    const profileData = {
      userId: user._id,
      fullName,
      phone: phone || null,
      ...otherData
    };
    
    switch (role) {
      case 'student':
        profile = await StudentProfile.create(profileData);
        break;
      case 'tutor':
        profile = await TutorProfile.create(profileData);
        break;
      case 'admin':
        profile = await AdminProfile.create({
          ...profileData,
          department: otherData.department || 'user_management',
          position: otherData.position || 'Admin'
        });
        break;
      default:
        throw new Error('Invalid role');
    }
    
    // Gửi email OTP
    const emailTemplate = otpVerificationTemplate(fullName, otp);
    const emailResult = await sendEmail(email, emailTemplate);
    
    // Kiểm tra kết quả gửi email
    if (!emailResult.success) {
      console.warn('⚠️ Email sending failed but user was created:', emailResult.error);
      // Vẫn trả về success nhưng thông báo có thể resend OTP
    }
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP verification code.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          approvalStatus: user.approvalStatus
        },
        profile: {
          id: profile._id,
          fullName: profile.fullName,
          phone: profile.phone
        },
        requiresOTP: true,
        emailSent: emailResult.success
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Xác thực OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }
    
    // Tìm user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Kiểm tra đã verify chưa
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }
    
    // Kiểm tra OTP lock
    if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Please try again after ${remainingMinutes} minutes.`
      });
    }
    
    // Kiểm tra OTP expired
    if (!user.emailVerificationOTPExpires || user.emailVerificationOTPExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }
    
    // Verify OTP
    const isValid = verifyOTP(otp, user.emailVerificationOTP);
    
    if (!isValid) {
      // Tăng số lần nhập sai
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      
      // Lock nếu nhập sai quá 5 lần
      if (user.otpAttempts >= 5) {
        user.otpLockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock 15 phút
        user.otpAttempts = 0;
        await user.save();
        
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Account locked for 15 minutes.'
        });
      }
      
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`
      });
    }
    
    // Xác thực thành công
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;
    await user.save();
    
    // Gửi email chào mừng
    const profile = await user.populate('profile');
    const welcomeTemplate = welcomeEmailTemplate(profile.profile.fullName, user.role);
    await sendEmail(user.email, welcomeTemplate);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
};

// @desc    Gửi lại OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Tìm user
    const user = await User.findOne({ email }).populate('profile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Kiểm tra đã verify chưa
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }
    
    // Kiểm tra OTP lock
    if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingMinutes} minutes before requesting a new OTP.`
      });
    }
    
    // Tạo OTP mới
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    
    user.emailVerificationOTP = hashedOTP;
    user.emailVerificationOTPExpires = generateOTPExpiry();
    user.otpAttempts = 0;
    await user.save();
    
    // Gửi email OTP
    const emailTemplate = otpVerificationTemplate(user.profile.fullName, otp);
    await sendEmail(email, emailTemplate);
    
    res.status(200).json({
      success: true,
      message: 'New OTP has been sent to your email'
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};

// @desc    Xác thực email (legacy - using token)
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }
    
    // Hash token để so sánh
    const hashedToken = hashToken(token);
    
    // Tìm user với token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }
    
    // Xác thực email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    // Gửi email chào mừng
    const profile = await user.populate('profile');
    const welcomeTemplate = welcomeEmailTemplate(profile.profile.fullName, user.role);
    await sendEmail(user.email, welcomeTemplate);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Tìm user và check password
    const user = await User.findOne({ email }).populate('profile');
    
    if (!user || !(await user.comparePassword(password))) {
      // Tăng số lần đăng nhập sai nếu user tồn tại
      if (user) {
        await user.incLoginAttempts();
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }
    
    // Kiểm tra email đã xác thực chưa
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }
    
    // Kiểm tra tài khoản có active không
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Kiểm tra gia sư đã được duyệt chưa
    if (user.role === 'tutor' && user.approvalStatus !== 'approved') {
      const statusMessages = {
        'pending': 'Your tutor profile is still under review',
        'rejected': 'Your tutor profile has been rejected. Please update your profile and resubmit.'
      };
      
      return res.status(401).json({
        success: false,
        message: statusMessages[user.approvalStatus] || 'Tutor profile not approved'
      });
    }
    
    // Reset login attempts khi đăng nhập thành công
    await user.resetLoginAttempts();
    
    // Tạo tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    
    // Set secure cookie cho refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          approvalStatus: user.approvalStatus,
          lastLogin: user.lastLogin
        },
        profile: user.profile,
        accessToken
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// @desc    Làm mới access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.cookies;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    
    // Lấy user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    // Tạo access token mới
    const newAccessToken = generateAccessToken(user._id, user.role);
    
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// @desc    Đăng xuất
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Xóa refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// @desc    Quên mật khẩu
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Tạo password reset token
    const { token, hashedToken, expires } = generatePasswordResetToken();
    
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expires;
    await user.save();
    
    // Gửi email reset password
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    // TODO: Tạo template email reset password
    const emailTemplate = {
      subject: 'Reset Your Password',
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 10 minutes.</p>
      `
    };
    
    await sendEmail(email, emailTemplate);
    
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email'
    });
  }
};

// @desc    Reset mật khẩu
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Hash token để so sánh
    const hashedToken = hashToken(token);
    
    // Tìm user với token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Cập nhật password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0; // Reset login attempts
    user.lockUntil = undefined;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// @desc    Lấy thông tin user hiện tại
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('profile');
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          approvalStatus: user.approvalStatus,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        },
        profile: user.profile
      }
    });
    
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
};

// @desc    Lấy danh sách gia sư đã được duyệt
// @route   GET /api/auth/tutors
// @access  Public
const getTutors = async (req, res) => {
  try {
    const { status = 'approved', search, subject, minRate, maxRate, sort = '-createdAt' } = req.query;
    
    // Build query
    const query = {
      role: 'tutor',
      isEmailVerified: true,
      isActive: true
    };
    
    // Filter by approval status
    if (status) {
      query.approvalStatus = status;
    }
    
    // Get tutors - select only needed fields
    const tutors = await User.find(query)
      .select('_id email approvalStatus createdAt')
      .sort(sort)
      .lean()
      .exec();
    
    console.log('📊 Found', tutors.length, 'tutors');
    
    // Manually fetch profiles for each tutor
    const TutorProfile = require('../models/TutorProfile');
    for (let tutor of tutors) {
      tutor.profile = await TutorProfile.findOne({ userId: tutor._id })
        .select('fullName phone address bio subjects education yearsOfExperience hourlyRate teachingLocation availability averageRating totalReviews universityImage idCard avatar')
        .lean()
        .exec();
      
      console.log(`✅ Tutor ${tutor.email}: Profile ${tutor.profile ? 'found' : 'not found'}${tutor.profile?.avatar ? ', avatar: YES' : ', avatar: NO'}`);
    }
    
    // Filter by search term
    let filteredTutors = tutors;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTutors = tutors.filter(tutor => {
        const profile = tutor.profile;
        if (!profile) return false;
        
        const fullName = profile.fullName?.toLowerCase() || '';
        const bio = profile.bio?.toLowerCase() || '';
        const subjects = profile.subjects?.map(s => {
          if (typeof s === 'string') return s.toLowerCase();
          return s.subject?.toLowerCase() || '';
        }).join(' ') || '';
        
        return fullName.includes(searchLower) || 
               bio.includes(searchLower) || 
               subjects.includes(searchLower);
      });
    }
    
    // Filter by subject
    if (subject) {
      const subjectLower = subject.toLowerCase();
      filteredTutors = filteredTutors.filter(tutor => {
        const profile = tutor.profile;
        if (!profile || !profile.subjects) return false;
        
        return profile.subjects.some(s => {
          if (typeof s === 'string') {
            return s.toLowerCase().includes(subjectLower);
          }
          return s.subject?.toLowerCase().includes(subjectLower);
        });
      });
    }
    
    // Filter by hourly rate
    if (minRate || maxRate) {
      filteredTutors = filteredTutors.filter(tutor => {
        const rate = tutor.profile?.hourlyRate || 0;
        if (minRate && rate < Number(minRate)) return false;
        if (maxRate && rate > Number(maxRate)) return false;
        return true;
      });
    }
    
    // Format response
    const formattedTutors = filteredTutors.map(tutor => {
      const tutorObj = tutor.toObject ? tutor.toObject() : tutor;
      console.log('🔍 Tutor object:', tutorObj);
      console.log('Has profile?', !!tutorObj.profile);
      
      return {
        _id: tutor._id,
        email: tutor.email,
        avatar: tutor.profile?.avatar || tutorObj.profile?.avatar || null,
        approvalStatus: tutor.approvalStatus,
        createdAt: tutor.createdAt,
        profile: tutor.profile || tutorObj.profile
      };
    });
    
    res.status(200).json({
      success: true,
      count: formattedTutors.length,
      data: formattedTutors
    });
    
  } catch (error) {
    console.error('Get tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tutors list'
    });
  }
};

// @desc    Lấy thông tin chi tiết một gia sư
// @route   GET /api/auth/tutor/:id
// @access  Public
const getTutorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Getting tutor by ID:', id);
    
    // Fetch tutor
    const tutor = await User.findOne({
      _id: id,
      role: 'tutor',
      isEmailVerified: true,
      isActive: true
    })
      .select('_id email approvalStatus createdAt')
      .lean()
      .exec();
    
    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }
    
    // Manually fetch profile
    const TutorProfile = require('../models/TutorProfile');
    tutor.profile = await TutorProfile.findOne({ userId: tutor._id })
      .select('fullName phone address bio subjects education workExperience certificates yearsOfExperience hourlyRate teachingLocation availability averageRating totalReviews totalStudents totalLessons universityImage idCard avatar')
      .lean()
      .exec();
    
    console.log('✅ Found tutor:', tutor.profile?.fullName);
    console.log('📸 Avatar:', tutor.profile?.avatar);
    console.log('🏫 University Image:', tutor.profile?.universityImage);
    
    res.status(200).json({
      success: true,
      data: {
        _id: tutor._id,
        email: tutor.email,
        avatar: tutor.profile?.avatar || null,
        approvalStatus: tutor.approvalStatus,
        createdAt: tutor.createdAt,
        profile: tutor.profile
      }
    });
    
  } catch (error) {
    console.error('❌ Get tutor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tutor information'
    });
  }
};

module.exports = {
  register,
  verifyEmailOTP,
  resendOTP,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  getTutors,
  getTutorById
};