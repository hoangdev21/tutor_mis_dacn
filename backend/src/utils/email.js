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

module.exports = {
  sendEmail,
  emailVerificationTemplate,
  welcomeEmailTemplate,
  tutorApprovalTemplate,
  otpVerificationTemplate
};