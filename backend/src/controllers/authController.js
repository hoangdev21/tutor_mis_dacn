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

    console.log('📝 Đăng ký mới:', { email, role, fullName, phone });

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã tồn tại'
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
    
    // Gửi email OTP bất đồng bộ
    const emailTemplate = otpVerificationTemplate(fullName, otp);
    
    // Gửi email trong background - không chờ kết quả
    sendEmail(email, emailTemplate).then(emailResult => {
      if (!emailResult.success) {
        console.warn('⚠️ Gửi email thất bại trong background:', emailResult.error);
        // Có thể lưu trạng thái email failed để user có thể resend sau
      } else {
        console.log('✅ Gửi email OTP thành công đến:', email);
      }
    }).catch(error => {
      console.error('❌ Lỗi gửi email trong background:', error);
    });
    
    // Trả về response ngay lập tức - không chờ email
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email của bạn để lấy mã xác thực OTP.',
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
        emailSent: true // Luôn trả về true vì email sẽ được gửi trong background
      }
    });
    
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    console.error('Lỗi:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Đăng ký không thành công',
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
        message: 'Email và OTP là bắt buộc'
      });
    }
    
    // Tìm user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tìm thấy'
      });
    }
    
    // Kiểm tra đã verify chưa
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được xác thực'
      });
    }
    
    // Kiểm tra OTP lock
    if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Quá nhiều lần thử không thành công. Vui lòng thử lại sau ${remainingMinutes} phút.`
      });
    }
    
    // Kiểm tra OTP expired
    if (!user.emailVerificationOTPExpires || user.emailVerificationOTPExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP đã hết hạn. Vui lòng yêu cầu mã mới.'
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
          message: 'Quá nhiều lần thử không thành công. Tài khoản đã bị khóa trong 15 phút.'
        });
      }
      
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: `OTP không hợp lệ. Còn ${5 - user.otpAttempts} lần thử.`
      });
    }
    
    // Xác thực thành công
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;
    await user.save();
    
    // Gửi email chào mừng bất đồng bộ
    const profile = await user.populate('profile');
    const welcomeTemplate = welcomeEmailTemplate(profile.profile.fullName, user.role);
    sendEmail(user.email, welcomeTemplate).then(emailResult => {
      if (!emailResult.success) {
        console.warn('⚠️ Gửi email chào mừng thất bại:', emailResult.error);
      } else {
        console.log('✅ Gửi email chào mừng thành công đến:', user.email);
      }
    }).catch(error => {
      console.error('❌ Lỗi gửi email chào mừng:', error);
    });
    
    res.status(200).json({
      success: true,
      message: 'Email đã được xác thực thành công'
    });
    
  } catch (error) {
    console.error('Lỗi xác thực OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Xác thực OTP không thành công'
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
        message: 'Email là bắt buộc'
      });
    }
    
    // Tìm user
    const user = await User.findOne({ email }).populate('profile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tìm thấy'
      });
    }
    
    // Kiểm tra đã verify chưa
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được xác thực'
      });
    }
    
    // Kiểm tra OTP lock
    if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Vui lòng chờ ${remainingMinutes} phút trước khi yêu cầu OTP mới.`
      });
    }
    
    // Tạo OTP mới
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    
    user.emailVerificationOTP = hashedOTP;
    user.emailVerificationOTPExpires = generateOTPExpiry();
    user.otpAttempts = 0;
    await user.save();
    
    // Gửi email OTP bất đồng bộ
    const emailTemplate = otpVerificationTemplate(user.profile.fullName, otp);
    sendEmail(email, emailTemplate).then(emailResult => {
      if (!emailResult.success) {
        console.warn('⚠️ Gửi email OTP thất bại:', emailResult.error);
      } else {
        console.log('✅ Gửi email OTP thành công đến:', email);
      }
    }).catch(error => {
      console.error('❌ Lỗi gửi email OTP:', error);
    });
    
    // Trả về response ngay lập tức
    res.status(200).json({
      success: true,
      message: 'OTP mới đã được gửi đến email của bạn'
    });
    
  } catch (error) {
    console.error('Lỗi gửi lại OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Gửi lại OTP không thành công'
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
        message: 'Token xác thực là bắt buộc'
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
        message: 'Token xác thực không hợp lệ hoặc đã hết hạn'
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
      message: 'Email đã được xác thực thành công'
    });
    
  } catch (error) {
    console.error('Lỗi xác thực email:', error);
    res.status(500).json({
      success: false,
      message: 'Email xác thực không thành công'
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
        message: 'Email hoặc mật khẩu không hợp lệ'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Tài khoản tạm thời bị khóa do nhiều lần đăng nhập không thành công'
      });
    }
    
    // Kiểm tra email đã xác thực chưa
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng xác thực email của bạn trước khi đăng nhập'
      });
    }
    
    // Kiểm tra tài khoản có active không
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }
    
    // Kiểm tra gia sư đã được duyệt chưa
    if (user.role === 'tutor' && user.approvalStatus !== 'approved') {
      const statusMessages = {
        'pending': 'Hồ sơ gia sư của bạn vẫn đang được xem xét',
        'rejected': 'Hồ sơ gia sư của bạn đã bị từ chối. Vui lòng cập nhật hồ sơ và gửi lại.'
      };
      
      return res.status(401).json({
        success: false,
        message: statusMessages[user.approvalStatus] || 'Hồ sơ gia sư không được phê duyệt'
      });
    }
    
    // Reset login attempts khi đăng nhập thành công
    await user.resetLoginAttempts();
    
    // Tạo tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
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
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({
      success: false,
      message: 'Đăng nhập không thành công'
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
        message: 'Refresh token không tìm thấy'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    
    // Lấy user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại hoặc không hoạt động'
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
    console.error('Lỗi refresh token:', error);
    res.status(401).json({
      success: false,
      message: 'Refresh token không hợp lệ'
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
      message: 'Đăng xuất thành công'
    });
    
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    res.status(500).json({
      success: false,
      message: 'Đăng xuất không thành công'
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
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào liên kết bên dưới để đặt lại mật khẩu của bạn:</p>
        <a href="${resetUrl}">Đặt lại mật khẩu</a>
        <p>Liên kết này sẽ hết hạn trong 10 phút.</p>
      `
    };
    
    await sendEmail(email, emailTemplate);
    
    res.status(200).json({
      success: true,
      message: 'Email đặt lại mật khẩu đã được gửi'
    });
    
  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: 'Gửi email đặt lại mật khẩu không thành công'
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
        message: 'Token đặt lại không hợp lệ hoặc đã hết hạn'
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
      message: 'Đặt lại mật khẩu thành công'
    });
    
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: 'Đặt lại mật khẩu không thành công'
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
    console.error('Lỗi lấy thông tin người dùng:', error);
    res.status(500).json({
      success: false,
      message: 'Lấy thông tin người dùng không thành công'
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
    
    // lấy hồ sơ thủ công
    const TutorProfile = require('../models/TutorProfile');
    for (let tutor of tutors) {
      tutor.profile = await TutorProfile.findOne({ userId: tutor._id })
        .select('fullName phone address bio subjects education yearsOfExperience hourlyRate teachingLocation availability averageRating totalReviews universityImage idCard avatar')
        .lean()
        .exec();
      
      console.log(`✅ Tutor ${tutor.email}: Profile ${tutor.profile ? 'found' : 'not found'}${tutor.profile?.avatar ? ', avatar: YES' : ', avatar: NO'}`);
    }
    
    // lọc theo từ khóa tìm kiếm
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
    
    // lọc theo môn học
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
    
    // Lọc theo mức giá theo giờ
    if (minRate || maxRate) {
      filteredTutors = filteredTutors.filter(tutor => {
        const rate = tutor.profile?.hourlyRate || 0;
        if (minRate && rate < Number(minRate)) return false;
        if (maxRate && rate > Number(maxRate)) return false;
        return true;
      });
    }
    
    // Định dạng kết quả
    const formattedTutors = filteredTutors.map(tutor => {
      const tutorObj = tutor.toObject ? tutor.toObject() : tutor;
      console.log('🔍 Gia sư :', tutorObj);
      console.log('Có hồ sơ không?', !!tutorObj.profile);
      
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
    console.error('Lỗi lấy danh sách gia sư:', error);
    res.status(500).json({
      success: false,
      message: 'Lấy danh sách gia sư không thành công'
    });
  }
};

// @desc    Lấy thông tin chi tiết một gia sư
// @route   GET /api/auth/tutor/:id
// @access  Public
const getTutorById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Lấy gia sư theo ID:', id);

    // Tìm gia sư
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
        message: 'Không tìm thấy gia sư'
      });
    }
    
    // lấy hồ sơ gia sư
    const TutorProfile = require('../models/TutorProfile');
    tutor.profile = await TutorProfile.findOne({ userId: tutor._id })
      .select('fullName phone address bio subjects education workExperience certificates yearsOfExperience hourlyRate teachingLocation availability averageRating totalReviews totalStudents totalLessons universityImage idCard avatar')
      .lean()
      .exec();

    console.log('✅ Gia sư :', tutor.profile?.fullName);
    console.log('📸 Avatar:', tutor.profile?.avatar);
    console.log('🏫 Ảnh trường đại học:', tutor.profile?.universityImage);
    
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
    console.error('❌ Lỗi lấy thông tin gia sư:', error);
    res.status(500).json({
      success: false,
      message: 'Lấy thông tin gia sư không thành công'
    });
  }
};

// @desc    Test gửi email
// @route   POST /api/auth/test-email
// @access  Public
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }
    
    const testTemplate = {
      subject: 'Test Email - TutorMis',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">TutorMis</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Test Email Service</p>
          </div>
          
          <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Test Email Thành Công!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Email này được gửi để test dịch vụ email của TutorMis.
              Nếu bạn nhận được email này, có nghĩa là email service đang hoạt động bình thường.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>Thời gian gửi:</strong> ${new Date().toLocaleString('vi-VN')}<br>
                <strong>Email nhận:</strong> ${email}
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; margin: 0;">
              Email này được gửi tự động để test hệ thống.<br>
              © 2024 TutorMis. All rights reserved.
            </p>
          </div>
        </div>
      `
    };
    
    console.log('🧪 Kiểm tra email đến:', email);
    const emailResult = await sendEmail(email, testTemplate);
    
    if (emailResult.success) {
      console.log('✅ test email thành công:', emailResult.messageId);
      res.status(200).json({
        success: true,
        message: 'Test email thành công',
        data: {
          messageId: emailResult.messageId,
          email: email
        }
      });
    } else {
      console.error('❌ Kiểm tra email thất bại:', emailResult.error);
      res.status(500).json({
        success: false,
        message: 'Kiểm tra email thất bại',
        error: emailResult.error
      });
    }
    
  } catch (error) {
    console.error('Kiểm tra email lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Kiểm tra email không thành công',
      error: error.message
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
  getTutorById,
  testEmail
};