const nodemailer = require('nodemailer');

// Tạo transporter cho email (không cache)
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  return transporter;
};

// Template email xác thực
const emailVerificationTemplate = (name, verificationUrl) => {
  return {
    subject: 'Xác thực tài khoản TutorMis',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">TutorMis</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Nền tảng gia sư hàng đầu</p>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Cảm ơn bạn đã đăng ký tài khoản tại TutorMis. Để hoàn tất quá trình đăng ký, 
            vui lòng xác thực địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      display: inline-block;
                      font-weight: bold;
                      text-transform: uppercase;
                      letter-spacing: 1px;">
              Xác Thực Email
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            Nếu bạn không thể nhấn vào nút trên, vui lòng copy và paste link sau vào trình duyệt:
          </p>
          <p style="color: #667eea; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #888; font-size: 12px; margin: 0;">
            Email này được gửi tự động, vui lòng không trả lời.<br>
            Nếu bạn cần hỗ trợ, hãy liên hệ: support@tutornis.com
          </p>
        </div>
      </div>
    `
  };
};

// Template email chào mừng
const welcomeEmailTemplate = (name, role) => {
  const roleText = {
    'student': 'Học sinh/Phụ huynh',
    'tutor': 'Gia sư',
    'admin': 'Quản trị viên'
  };

  return {
    subject: 'Chào mừng bạn đến với TutorMis!',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Chào mừng đến với TutorMis!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Chúc mừng bạn đã trở thành ${roleText[role]} của TutorMis! 
            ${role === 'tutor' ? 'Hồ sơ của bạn đang được xét duyệt và sẽ có thông báo sớm nhất.' : 'Bạn có thể bắt đầu sử dụng các tính năng ngay bây giờ.'}
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #333; margin-top: 0;">Bước tiếp theo:</h3>
            <ul style="color: #666; line-height: 1.8;">
              ${role === 'student' ? `
                <li>Hoàn thiện thông tin hồ sơ cá nhân</li>
                <li>Tìm kiếm gia sư phù hợp</li>
                <li>Đăng yêu cầu tìm gia sư</li>
                <li>Khám phá các bài viết hữu ích</li>
              ` : role === 'tutor' ? `
                <li>Chờ hồ sơ được duyệt (1-3 ngày làm việc)</li>
                <li>Hoàn thiện thông tin gia sư</li>
                <li>Tải lên chứng chỉ và bằng cấp</li>
                <li>Thiết lập lịch dạy và mức giá</li>
              ` : `
                <li>Quản lý người dùng hệ thống</li>
                <li>Kiểm duyệt nội dung</li>
                <li>Theo dõi hoạt động</li>
                <li>Hỗ trợ khách hàng</li>
              `}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      display: inline-block;
                      font-weight: bold;">
              Bắt Đầu Ngay
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #888; font-size: 12px; margin: 0;">
            Cần hỗ trợ? Liên hệ: support@tutornis.com<br>
            © 2024 TutorMis. All rights reserved.
          </p>
        </div>
      </div>
    `
  };
};

// Template email thông báo duyệt gia sư
const tutorApprovalTemplate = (name, isApproved, reason = '') => {
  return {
    subject: isApproved ? 'Hồ sơ gia sư đã được duyệt!' : 'Hồ sơ gia sư chưa được duyệt',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: ${isApproved ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'}; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${isApproved ? '✅' : '❌'} TutorMis</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${isApproved ? 'Hồ sơ đã được duyệt!' : 'Hồ sơ cần chỉnh sửa'}</p>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${name}!</h2>
          
          ${isApproved ? `
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              🎉 Chúc mừng! Hồ sơ gia sư của bạn đã được duyệt thành công. 
              Bạn có thể bắt đầu nhận học sinh và kiếm thu nhập ngay bây giờ!
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.FRONTEND_URL}/pages/tutor/dashboard.html" 
                 style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block;
                        font-weight: bold;">
                Vào Dashboard
              </a>
            </div>
          ` : `
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Rất tiếc, hồ sơ gia sư của bạn chưa được duyệt. Vui lòng xem lý do bên dưới và chỉnh sửa:
            </p>
            
            <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f44336;">
              <strong style="color: #d32f2f;">Lý do:</strong>
              <p style="color: #666; margin: 10px 0 0 0;">${reason}</p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.FRONTEND_URL}/tutor/profile" 
                 style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block;
                        font-weight: bold;">
                Chỉnh Sửa Hồ Sơ
              </a>
            </div>
          `}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #888; font-size: 12px; margin: 0;">
            Cần hỗ trợ? Liên hệ: support@tutornis.com<br>
            © 2024 TutorMis. All rights reserved.
          </p>
        </div>
      </div>
    `
  };
};

// Gửi email
const sendEmail = async (to, template) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"TutorMis" <${process.env.EMAIL_FROM}>`,
      to: to,
      subject: template.subject,
      html: template.html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Template email OTP
const otpVerificationTemplate = (name, otp) => {
  return {
    subject: 'Mã OTP xác thực tài khoản TutorMis',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🔐 TutorMis</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Mã xác thực tài khoản</p>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Cảm ơn bạn đã đăng ký tài khoản tại TutorMis. Vui lòng sử dụng mã OTP bên dưới để xác thực email của bạn:
          </p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      padding: 30px; 
                      border-radius: 15px; 
                      text-align: center; 
                      margin: 40px 0;
                      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
              Mã OTP của bạn
            </p>
            <div style="font-size: 42px; 
                        font-weight: bold; 
                        color: white; 
                        letter-spacing: 10px; 
                        font-family: 'Roboto Mono', monospace;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${otp}
            </div>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 13px;">
              ⏱️ Có hiệu lực trong 10 phút
            </p>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 30px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ Lưu ý:</strong> Không chia sẻ mã OTP này với bất kỳ ai, kể cả nhân viên TutorMis.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn được bảo mật.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #888; font-size: 12px; margin: 0;">
            Email này được gửi tự động, vui lòng không trả lời.<br>
            Nếu bạn cần hỗ trợ, hãy liên hệ: support@tutornis.com<br>
            © 2024 TutorMis. All rights reserved.
          </p>
        </div>
      </div>
    `
  };
};

// Template email thông báo yêu cầu đặt lịch mới cho gia sư
const newBookingNotificationTemplate = (tutorName, studentName, bookingDetails) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const locationTypeText = {
    'online': '💻 Dạy online',
    'home': '🏠 Dạy tại nhà học sinh',
    'tutor_home': '🏫 Dạy tại nhà gia sư'
  };

  return {
    subject: '🔔 Bạn có yêu cầu đặt lịch mới từ học sinh!',
    html: `
      <div style="max-width: 650px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px; text-align: center; color: white; border-radius: 15px 15px 0 0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
          <div style="font-size: 48px; margin-bottom: 10px;">📚</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">TutorMis</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Yêu cầu đặt lịch mới</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 15px 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
          <!-- Greeting -->
          <h2 style="color: #333; margin: 0 0 10px 0; font-size: 24px;">Xin chào ${tutorName}!</h2>
          <p style="color: #666; line-height: 1.7; margin-bottom: 30px; font-size: 15px;">
            Chúc mừng! Bạn vừa nhận được một yêu cầu đặt lịch dạy học mới từ học sinh 
            <strong style="color: #667eea;">${studentName}</strong>. 
            Vui lòng kiểm tra thông tin chi tiết bên dưới và phản hồi sớm nhất.
          </p>
          
          <!-- Booking Details Card -->
          <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%); 
                      border: 2px solid #667eea; 
                      border-radius: 12px; 
                      padding: 30px; 
                      margin: 30px 0;">
            <h3 style="color: #667eea; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
              📋 Thông tin chi tiết
            </h3>
            
            <!-- Subject Info -->
            <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
              <div style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Môn học</div>
              <div style="color: #333; font-size: 18px; font-weight: bold;">${bookingDetails.subject.name}</div>
              <div style="color: #666; font-size: 14px; margin-top: 3px;">Cấp độ: ${bookingDetails.subject.level}</div>
            </div>
            
            <!-- Schedule Info -->
            <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #764ba2;">
              <div style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Lịch học</div>
              <div style="color: #333; font-size: 15px; line-height: 1.8;">
                <div style="margin-bottom: 8px;">
                  <strong>📅 Ngày bắt đầu:</strong> ${formatDate(bookingDetails.schedule.startDate)}
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>⏰ Thời gian ưu tiên:</strong> ${bookingDetails.schedule.preferredTime}
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>📆 Số buổi/tuần:</strong> ${bookingDetails.schedule.daysPerWeek} buổi
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>⏱️ Thời lượng/buổi:</strong> ${bookingDetails.schedule.hoursPerSession} giờ
                </div>
                <div>
                  <strong>📊 Thời gian khóa học:</strong> ${bookingDetails.schedule.duration} tuần
                </div>
              </div>
            </div>
            
            <!-- Location Info -->
            <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #2ecc71;">
              <div style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Địa điểm</div>
              <div style="color: #333; font-size: 15px; line-height: 1.8;">
                <div style="margin-bottom: 8px; font-weight: bold; color: #2ecc71;">
                  ${locationTypeText[bookingDetails.location.type] || bookingDetails.location.type}
                </div>
                ${bookingDetails.location.address ? `
                  <div style="margin-bottom: 5px;">📍 ${bookingDetails.location.address}</div>
                  <div>${bookingDetails.location.district}, ${bookingDetails.location.city}</div>
                ` : '<div style="color: #999;">Không yêu cầu địa điểm cụ thể</div>'}
              </div>
            </div>
            
            <!-- Pricing Info -->
            <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #f39c12;">
              <div style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Học phí</div>
              <div style="color: #f39c12; font-size: 24px; font-weight: bold;">
                💰 ${formatCurrency(bookingDetails.pricing.hourlyRate)}/giờ
              </div>
              <div style="color: #666; font-size: 13px; margin-top: 5px;">
                Tổng ước tính: ${formatCurrency(bookingDetails.pricing.hourlyRate * bookingDetails.schedule.hoursPerSession * bookingDetails.schedule.daysPerWeek * bookingDetails.schedule.duration)}
              </div>
            </div>
            
            <!-- Description -->
            ${bookingDetails.description ? `
              <div style="padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #9b59b6;">
                <div style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Mô tả</div>
                <div style="color: #555; font-size: 14px; line-height: 1.7;">${bookingDetails.description}</div>
              </div>
            ` : ''}
            
            <!-- Student Note -->
            ${bookingDetails.studentNote ? `
              <div style="margin-top: 20px; padding: 15px; background: #fffbf0; border-radius: 8px; border: 1px dashed #ffc107;">
                <div style="color: #f39c12; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  💬 Lời nhắn từ học sinh
                </div>
                <div style="color: #666; font-size: 14px; line-height: 1.7; font-style: italic;">
                  "${bookingDetails.studentNote}"
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 40px 0 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/tutor/new_request.html" 
               style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
                      transition: all 0.3s ease;">
              ✅ Chấp nhận yêu cầu
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/tutor/new_request.html" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                      transition: all 0.3s ease;">
              👁️ Xem chi tiết
            </a>
          </div>
          
          <!-- Tips Section -->
          <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #4caf50;">
            <h4 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 16px;">💡 Gợi ý để tăng cơ hội thành công:</h4>
            <ul style="color: #555; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>Phản hồi nhanh chóng trong vòng 24 giờ</li>
              <li>Liên hệ trực tiếp với học sinh để thảo luận chi tiết</li>
              <li>Chuẩn bị tài liệu và kế hoạch giảng dạy phù hợp</li>
              <li>Xác nhận lại thời gian và địa điểm cụ thể</li>
            </ul>
          </div>
          
          <!-- Warning -->
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 13px; line-height: 1.6;">
              <strong>⏰ Lưu ý:</strong> Vui lòng phản hồi yêu cầu này trong vòng 48 giờ. 
              Nếu không có phản hồi, yêu cầu có thể được gửi đến gia sư khác.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <!-- Footer -->
          <div style="text-align: center;">
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Cần hỗ trợ? Chúng tôi luôn sẵn sàng giúp đỡ!
            </p>
            <p style="color: #888; font-size: 12px; margin: 0;">
              📧 Email: support@tutornis.com | ☎️ Hotline: 1900-xxxx<br>
              © 2024 TutorMis. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  };
};

// Template email thông báo gia sư chấp nhận yêu cầu (gửi cho học sinh)
const bookingAcceptedNotificationTemplate = (studentName, tutorName, bookingDetails, tutorMessage) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const locationTypeText = {
    'online': '💻 Dạy online',
    'home': '🏠 Dạy tại nhà học sinh',
    'tutor_home': '🏫 Dạy tại nhà gia sư'
  };

  return {
    subject: '🎉 Gia sư đã chấp nhận yêu cầu của bạn!',
    html: `
      <div style="max-width: 650px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 35px; text-align: center; color: white; border-radius: 15px 15px 0 0; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">
          <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Chúc Mừng!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Yêu cầu của bạn đã được chấp nhận</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 15px 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin: 0 0 10px 0; font-size: 24px;">Xin chào ${studentName}!</h2>
          <p style="color: #666; line-height: 1.7; margin-bottom: 30px; font-size: 15px;">
            Tin tuyệt vời! Gia sư <strong style="color: #4caf50;">${tutorName}</strong> đã chấp nhận yêu cầu đặt lịch của bạn. 
            Bạn có thể liên hệ trực tiếp với gia sư để sắp xếp buổi học đầu tiên.
          </p>
          
          <!-- Tutor Message -->
          ${tutorMessage ? `
            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); 
                        padding: 20px; 
                        border-radius: 10px; 
                        margin: 30px 0;
                        border-left: 4px solid #4caf50;">
              <div style="color: #2e7d32; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold;">
                💬 Lời nhắn từ gia sư
              </div>
              <div style="color: #555; font-size: 15px; line-height: 1.7; font-style: italic;">
                "${tutorMessage}"
              </div>
            </div>
          ` : ''}
          
          <!-- Booking Summary -->
          <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%); 
                      border: 2px solid #4caf50; 
                      border-radius: 12px; 
                      padding: 30px; 
                      margin: 30px 0;">
            <h3 style="color: #4caf50; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #4caf50; padding-bottom: 10px;">
              📋 Thông tin lịch học
            </h3>
            
            <!-- Subject -->
            <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px;">
              <div style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Môn học</div>
              <div style="color: #333; font-size: 16px; font-weight: bold;">${bookingDetails.subject.name} - ${bookingDetails.subject.level}</div>
            </div>
            
            <!-- Schedule -->
            <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px;">
              <div style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Lịch học</div>
              <div style="color: #333; font-size: 14px; line-height: 1.7;">
                📅 Bắt đầu: ${formatDate(bookingDetails.schedule.startDate)}<br>
                ⏰ Thời gian: ${bookingDetails.schedule.preferredTime}<br>
                📆 ${bookingDetails.schedule.daysPerWeek} buổi/tuần × ${bookingDetails.schedule.hoursPerSession} giờ/buổi
              </div>
            </div>
            
            <!-- Location -->
            <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px;">
              <div style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Địa điểm</div>
              <div style="color: #333; font-size: 14px;">
                ${locationTypeText[bookingDetails.location.type] || bookingDetails.location.type}
                ${bookingDetails.location.address ? `<br>📍 ${bookingDetails.location.address}, ${bookingDetails.location.district}, ${bookingDetails.location.city}` : ''}
              </div>
            </div>
            
            <!-- Pricing -->
            <div style="padding: 12px; background: white; border-radius: 8px;">
              <div style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Học phí</div>
              <div style="color: #4caf50; font-size: 20px; font-weight: bold;">
                ${formatCurrency(bookingDetails.pricing.hourlyRate)}/giờ
              </div>
            </div>
          </div>
          
          <!-- Next Steps -->
          <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #2196f3;">
            <h4 style="color: #1565c0; margin: 0 0 15px 0; font-size: 16px;">📝 Các bước tiếp theo:</h4>
            <ol style="color: #555; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>Liên hệ với gia sư để xác nhận thời gian cụ thể</li>
              <li>Chuẩn bị tài liệu và câu hỏi cần hỗ trợ</li>
              <li>Tham gia buổi học đúng giờ</li>
              <li>Đánh giá sau khi hoàn thành khóa học</li>
            </ol>
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 40px 0 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/student/messages.html" 
               style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">
              💬 Nhắn tin với gia sư
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/student/booking.html" 
               style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);">
              📅 Xem lịch học
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <!-- Footer -->
          <div style="text-align: center;">
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Chúc bạn có buổi học thật hiệu quả! 📚
            </p>
            <p style="color: #888; font-size: 12px; margin: 0;">
              📧 Email: support@tutornis.com | ☎️ Hotline: 1900-xxxx<br>
              © 2024 TutorMis. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  };
};

// Template email thông báo gia sư từ chối yêu cầu (gửi cho học sinh)
const bookingRejectedNotificationTemplate = (studentName, tutorName, bookingDetails, rejectionReason) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return {
    subject: '❌ Yêu cầu đặt lịch chưa được chấp nhận',
    html: `
      <div style="max-width: 650px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 35px; text-align: center; color: white; border-radius: 15px 15px 0 0; box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);">
          <div style="font-size: 48px; margin-bottom: 10px;">📝</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Thông Báo Về Yêu Cầu</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Yêu cầu đặt lịch chưa được chấp nhận</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px; border-radius: 0 0 15px 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin: 0 0 10px 0; font-size: 24px;">Xin chào ${studentName}!</h2>
          <p style="color: #666; line-height: 1.7; margin-bottom: 30px; font-size: 15px;">
            Rất tiếc, gia sư <strong style="color: #ff9800;">${tutorName}</strong> hiện chưa thể chấp nhận yêu cầu đặt lịch của bạn. 
            Đừng lo lắng, bạn có thể tìm kiếm gia sư khác phù hợp hoặc thử lại sau.
          </p>
          
          <!-- Rejection Reason -->
          ${rejectionReason ? `
            <div style="background: #fff3e0; 
                        padding: 20px; 
                        border-radius: 10px; 
                        margin: 30px 0;
                        border-left: 4px solid #ff9800;">
              <div style="color: #e65100; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold;">
                📌 Lý do từ gia sư
              </div>
              <div style="color: #555; font-size: 15px; line-height: 1.7;">
                ${rejectionReason}
              </div>
            </div>
          ` : ''}
          
          <!-- Original Booking Info -->
          <div style="background: #f5f5f5; 
                      border-radius: 12px; 
                      padding: 25px; 
                      margin: 30px 0;">
            <h3 style="color: #666; margin: 0 0 15px 0; font-size: 18px;">
              📋 Yêu cầu ban đầu của bạn
            </h3>
            <div style="color: #555; font-size: 14px; line-height: 1.8;">
              📚 <strong>Môn học:</strong> ${bookingDetails.subject.name} - ${bookingDetails.subject.level}<br>
              📅 <strong>Bắt đầu:</strong> ${formatDate(bookingDetails.schedule.startDate)}<br>
              ⏰ <strong>Thời gian:</strong> ${bookingDetails.schedule.preferredTime}<br>
              📆 <strong>Số buổi:</strong> ${bookingDetails.schedule.daysPerWeek} buổi/tuần × ${bookingDetails.schedule.hoursPerSession} giờ
            </div>
          </div>
          
          <!-- Suggestions -->
          <div style="background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%); 
                      padding: 25px; 
                      border-radius: 10px; 
                      margin: 30px 0;
                      border-left: 4px solid #2196f3;">
            <h4 style="color: #1565c0; margin: 0 0 15px 0; font-size: 16px;">💡 Gợi ý cho bạn:</h4>
            <ul style="color: #555; line-height: 2; margin: 0; padding-left: 20px; font-size: 14px;">
              <li><strong>Tìm gia sư khác:</strong> Có nhiều gia sư giỏi đang chờ bạn</li>
              <li><strong>Điều chỉnh yêu cầu:</strong> Thử thay đổi thời gian hoặc địa điểm</li>
              <li><strong>Liên hệ hỗ trợ:</strong> Chúng tôi sẵn sàng giúp bạn tìm gia sư phù hợp</li>
              <li><strong>Đăng yêu cầu mới:</strong> Để nhiều gia sư có thể xem và ứng tuyển</li>
            </ul>
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 40px 0 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/student/find-tutor.html" 
               style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">
              🔍 Tìm gia sư khác
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/student/create-request.html" 
               style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);">
              ✏️ Đăng yêu cầu mới
            </a>
          </div>
          
          <!-- Support Box -->
          <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.7;">
              <strong>💬 Cần hỗ trợ?</strong> Đội ngũ TutorMis luôn sẵn sàng giúp bạn tìm gia sư phù hợp nhất. 
              Liên hệ: <strong>support@tutornis.com</strong> hoặc hotline <strong>1900-xxxx</strong>
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <!-- Footer -->
          <div style="text-align: center;">
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Đừng nản lòng! Gia sư phù hợp đang chờ bạn đấy! 💪
            </p>
            <p style="color: #888; font-size: 12px; margin: 0;">
              📧 Email: support@tutornis.com | ☎️ Hotline: 1900-xxxx<br>
              © 2024 TutorMis. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  };
};

module.exports = {
  sendEmail,
  emailVerificationTemplate,
  welcomeEmailTemplate,
  tutorApprovalTemplate,
  otpVerificationTemplate,
  newBookingNotificationTemplate,
  bookingAcceptedNotificationTemplate,
  bookingRejectedNotificationTemplate
};