// AI Controller - Smart Vietnamese Chatbot (No API Required)
const smartChatbotService = require('../services/smartChatbotService');

// Get dynamic database context for AI training
async function getDatabaseContext(userId, userRole) {
  try {
    const context = {
      totalTutors: 0,
      totalStudents: 0,
      totalCourses: 0,
      recentBlogs: [],
      userStats: {}
    };

    // Get statistics
    context.totalTutors = await TutorProfile.countDocuments({ isApproved: true });
    context.totalStudents = await StudentProfile.countDocuments();
    context.totalCourses = await Course.countDocuments();

    // Get user-specific data
    if (userRole === 'student') {
      const studentProfile = await StudentProfile.findOne({ user: userId });
      const bookings = await BookingRequest.find({ student: userId });
      
      context.userStats = {
        totalBookings: bookings.length,
        activeBookings: bookings.filter(b => b.status === 'accepted').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length
      };
    } else if (userRole === 'tutor') {
      const tutorProfile = await TutorProfile.findOne({ user: userId });
      const bookings = await BookingRequest.find({ tutor: userId });
      
      context.userStats = {
        subjects: tutorProfile?.subjects || [],
        hourlyRate: tutorProfile?.hourlyRate || 0,
        totalStudents: bookings.filter(b => b.status === 'accepted').length,
        pendingRequests: bookings.filter(b => b.status === 'pending').length,
        rating: tutorProfile?.rating || 0
      };
    }

    // Get recent blog posts for context
    const recentBlogs = await BlogPost.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category');
    
    context.recentBlogs = recentBlogs.map(blog => ({
      title: blog.title,
      category: blog.category
    }));

    return context;
  } catch (error) {
    console.error('Error getting database context:', error);
    return {
      totalTutors: 0,
      totalStudents: 0,
      totalCourses: 0,
      recentBlogs: [],
      userStats: {}
    };
  }
}

// System context about TutorMis
const TUTORMIS_CONTEXT = `
Bạn là trợ lý AI thông minh của TutorMis - nền tảng kết nối học sinh và gia sư hàng đầu Việt Nam.

**Về TutorMis:**
- TutorMis là nền tảng trực tuyến kết nối học sinh với gia sư chất lượng
- Hỗ trợ đa dạng môn học: Toán, Lý, Hóa, Anh, Văn, và nhiều môn khác
- Có 3 vai trò: Học sinh (Student), Gia sư (Tutor), và Quản trị viên (Admin)

**Tính năng chính:**
1. Tìm kiếm gia sư theo môn học, khu vực, học phí
2. Đặt lịch học trực tuyến hoặc tại nhà
3. Hệ thống tin nhắn và video call tích hợp
4. Quản lý khóa học, lịch dạy, thu nhập
5. Blog chia sẻ kiến thức
6. Đánh giá và phản hồi từ học sinh

**Quy trình cho Học sinh:**
1. Đăng ký tài khoản
2. Tìm kiếm gia sư phù hợp
3. Gửi yêu cầu đặt lịch học
4. Gia sư chấp nhận/từ chối
5. Thanh toán và bắt đầu học

**Quy trình cho Gia sư:**
1. Đăng ký và hoàn thiện hồ sơ
2. Chờ admin phê duyệt
3. Xem và ứng tuyển yêu cầu từ học sinh
4. Dạy học và nhận đánh giá
5. Theo dõi thu nhập

**Phương thức thanh toán:**
- Chuyển khoản ngân hàng
- Ví điện tử (MoMo, ZaloPay)
- Thanh toán trực tiếp

**Chính sách:**
- Hoàn tiền 100% nếu hủy trước 24h
- Học phí linh hoạt theo thỏa thuận
- Bảo mật thông tin người dùng

**Vai trò của bạn:**
- Hỗ trợ người dùng sử dụng website
- Giải đáp thắc mắc về tính năng
- Tư vấn tìm gia sư phù hợp
- Hướng dẫn quy trình đặt lịch
- Giải quyết vấn đề kỹ thuật cơ bản
- Luôn lịch sự, thân thiện và chuyên nghiệp

Hãy trả lời bằng tiếng Việt, ngắn gọn, rõ ràng và hữu ích.
`;

// Import models for database training
const { TutorProfile, StudentProfile, Course, BookingRequest, BlogPost, User } = require('../models');

// @desc    Chat with AI (RAG-enhanced with smart search)
// @route   POST /api/ai/chat
// @access  Private
const chat = async (req, res) => {
  try {
    const { message, context } = req.body;
    const userRole = req.user.role || context?.role || 'user';
    const userId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập câu hỏi'
      });
    }

    console.log('[Smart Chatbot] New query:', { userId, userRole, message: message.substring(0, 100) });

    // Get dynamic data from database for AI training
    const dbContext = await getDatabaseContext(userId, userRole);
    
    // 🔥 RAG: Generate AI context with smart search results
    const aiContext = await aiTrainingService.generateAIContext(message, userId, userRole);

    // Check for Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY in environment variables');
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng liên hệ admin để cấu hình API key.',
        response: 'Xin lỗi, tôi không thể trả lời câu hỏi của bạn lúc này. Vui lòng liên hệ bộ phận hỗ trợ hoặc thử lại sau.'
      });
    }

    try {
      // Generate AI context with smart search
      const aiContext = await aiTrainingService.generateAIContext(message, userId, userRole);

      // Create model
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Build prompt with context and real data
      const roleContext = userRole === 'tutor' 
        ? `Người dùng này là GIA SƯ trên TutorMis.
Thông tin của họ:
- Môn dạy: ${dbContext.userStats.subjects?.join(', ') || 'Chưa cập nhật'}
- Học phí: ${dbContext.userStats.hourlyRate?.toLocaleString('vi-VN') || 0}đ/giờ
- Số học sinh: ${dbContext.userStats.totalStudents || 0}
- Yêu cầu đang chờ: ${dbContext.userStats.pendingRequests || 0}
- Đánh giá: ${dbContext.userStats.rating || 0}/5 sao` 
        : userRole === 'student'
        ? `Người dùng này là HỌC SINH trên TutorMis.
Thông tin của họ:
- Tổng số yêu cầu đã gửi: ${dbContext.userStats.totalBookings || 0}
- Yêu cầu đang hoạt động: ${dbContext.userStats.activeBookings || 0}
- Yêu cầu đang chờ: ${dbContext.userStats.pendingBookings || 0}`
        : '';

      const systemStats = `
**Thống kê hệ thống hiện tại:**
- Tổng số gia sư: ${aiContext.systemStats?.totalTutors || dbContext.totalTutors}
- Tổng số học sinh: ${aiContext.systemStats?.totalStudents || dbContext.totalStudents}
- Tổng số khóa học: ${aiContext.systemStats?.totalCourses || dbContext.totalCourses}
${dbContext.recentBlogs.length > 0 ? `\n**Blog mới nhất:**\n${dbContext.recentBlogs.map(b => `- ${b.title} (${b.category})`).join('\n')}` : ''}
`;

      // 🔥 RAG: Build rich context from search results
      let searchContext = '';
      let foundTutors = [];
      let foundCourses = [];
      
      if (aiContext && aiContext.searchResults) {
        foundTutors = aiContext.searchResults.tutors || [];
        foundCourses = aiContext.searchResults.courses || [];
        
        // Add tutor search results
        if (foundTutors.length > 0) {
          searchContext += '\n**🔍 KẾT QUẢ TÌM KIẾM GIA SƯ:**\n';
          searchContext += `Tìm thấy ${foundTutors.length} gia sư phù hợp với yêu cầu.\n\n`;
          
          foundTutors.slice(0, 10).forEach((tutor, index) => {
            searchContext += `**${index + 1}. ${tutor.fullName}**\n`;
            searchContext += `   📍 Địa điểm: ${tutor.city}${tutor.district ? ', ' + tutor.district : ''}\n`;
            
            if (tutor.subjects && tutor.subjects.length > 0) {
              const subjectNames = tutor.subjects.map(s => s.name || s).join(', ');
              searchContext += `   📖 Môn dạy: ${subjectNames}\n`;
            }
            
            searchContext += `   💰 Học phí: ${tutor.hourlyRate?.toLocaleString('vi-VN')}đ/giờ\n`;
            searchContext += `   ⭐ Đánh giá: ${tutor.rating || 'Chưa có'}/5.0`;
            if (tutor.totalStudents) {
              searchContext += ` (${tutor.totalStudents} học sinh)`;
            }
            searchContext += '\n';
            
            if (tutor.yearsOfExperience) {
              searchContext += `   🎓 Kinh nghiệm: ${tutor.yearsOfExperience} năm\n`;
            }
            
            if (tutor.education) {
              searchContext += `   📚 Trình độ: ${tutor.education}\n`;
            }
            
            if (tutor.bio && tutor.bio.length > 0) {
              const shortBio = tutor.bio.substring(0, 100) + (tutor.bio.length > 100 ? '...' : '');
              searchContext += `   📝 Giới thiệu: ${shortBio}\n`;
            }
            
            searchContext += `   🔗 Profile: ${tutor.profileUrl}\n\n`;
          });
          
          searchContext += '\n**QUAN TRỌNG:** Hãy trình bày thông tin các gia sư này một cách:\n';
          searchContext += '- Thân thiện, chuyên nghiệp\n';
          searchContext += '- Sử dụng emoji phù hợp\n';
          searchContext += '- Định dạng markdown đẹp\n';
          searchContext += '- Bao gồm link profile để người dùng có thể xem chi tiết và đặt lịch\n';
          searchContext += '- Highlight những điểm nổi bật của mỗi gia sư\n\n';
        }

        // Add course search results
        if (foundCourses.length > 0) {
          searchContext += '\n**📚 KHÓA HỌC PHÙ HỢP:**\n';
          foundCourses.slice(0, 5).forEach((course, index) => {
            searchContext += `${index + 1}. **${course.title}**\n`;
            searchContext += `   - Môn: ${course.subject} (${course.level})\n`;
            searchContext += `   - Giá: ${course.price?.toLocaleString('vi-VN')}đ\n`;
            searchContext += `   - Thời lượng: ${course.duration}\n`;
            if (course.tutorName) {
              searchContext += `   - Giảng viên: ${course.tutorName}\n`;
            }
            searchContext += `   - Link: ${course.courseUrl}\n\n`;
          });
        }
        
        // Add blog posts if relevant
        if (aiContext.searchResults.blogs && aiContext.searchResults.blogs.length > 0) {
          searchContext += '\n**� BÀI VIẾT LIÊN QUAN:**\n';
          aiContext.searchResults.blogs.forEach((blog, index) => {
            searchContext += `${index + 1}. ${blog.title} - ${blog.url}\n`;
          });
          searchContext += '\n';
        }
      }
      
      // Add parsed criteria for context
      if (aiContext && aiContext.parsedCriteria) {
        const criteria = aiContext.parsedCriteria;
        if (Object.keys(criteria).length > 0) {
          searchContext += '\n**Tiêu chí tìm kiếm được trích xuất:**\n';
          if (criteria.subject) searchContext += `- Môn học: ${criteria.subject}\n`;
          if (criteria.city) searchContext += `- Địa điểm: ${criteria.city}\n`;
          if (criteria.district) searchContext += `- Quận/Huyện: ${criteria.district}\n`;
          if (criteria.maxPrice) searchContext += `- Học phí tối đa: ${criteria.maxPrice.toLocaleString('vi-VN')}đ\n`;
          if (criteria.minPrice) searchContext += `- Học phí tối thiểu: ${criteria.minPrice.toLocaleString('vi-VN')}đ\n`;
          if (criteria.minRating) searchContext += `- Đánh giá tối thiểu: ${criteria.minRating} sao\n`;
          if (criteria.gender) searchContext += `- Giới tính: ${criteria.gender === 'male' ? 'Nam' : 'Nữ'}\n`;
          if (criteria.experience) searchContext += `- Kinh nghiệm: tối thiểu ${criteria.experience} năm\n`;
          searchContext += '\n';
        }
      }

      const fullPrompt = `${TUTORMIS_CONTEXT}

${systemStats}

${roleContext}

${searchContext}

**Câu hỏi của người dùng:** ${message}

**YÊU CẦU TRẢ LỜI:**
1. Nếu có kết quả tìm kiếm gia sư/khóa học ở trên:
   - Trình bày danh sách một cách hấp dẫn với emoji
   - Format markdown đẹp, dễ đọc
   - Highlight điểm nổi bật của từng gia sư
   - **QUAN TRỌNG:** Bao gồm link profile dạng: [Xem chi tiết](/pages/student/tutor-detail.html?id=xxx)
   - Gợi ý người dùng click vào link để xem đầy đủ và đặt lịch

2. Nếu không tìm thấy kết quả:
   - Giải thích lý do (có thể do tiêu chí quá strict)
   - Gợi ý mở rộng tìm kiếm
   - Đề xuất các lựa chọn thay thế

3. Luôn luôn:
   - Trả lời bằng tiếng Việt
   - Giọng điệu thân thiện, chuyên nghiệp
   - Sử dụng dữ liệu thống kê thực tế
   - Kết thúc bằng câu hỏi để tiếp tục hội thoại

Hãy trả lời ngay bây giờ:`;

      // Generate response
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      let aiResponse = response.text();

      // Log for analytics
      console.log('[AI Response]', {
        userId,
        queryLength: message.length,
        tutorsFound: foundTutors.length,
        coursesFound: foundCourses.length,
        responseLength: aiResponse.length,
        timestamp: new Date()
      });

      res.json({
        success: true,
        response: aiResponse,
        metadata: {
          tutorsFound: foundTutors.length,
          coursesFound: foundCourses.length,
          criteria: aiContext?.parsedCriteria || {},
          queryType: aiContext?.queryType || {}
        }
      });
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      
      // Return fallback response
      res.json({
        success: true,
        response: getFallbackResponse(message, userRole)
      });
    }
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý câu hỏi',
      response: 'Xin lỗi, tôi gặp lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.'
    });
  }
};

// Fallback responses for common questions
function getFallbackResponse(message, userRole) {
  const lowerMessage = message.toLowerCase();

  // Find tutor
  if (lowerMessage.includes('tìm gia sư') || lowerMessage.includes('tìm kiếm')) {
    return `Để tìm gia sư phù hợp, bạn có thể:

1. Vào mục "Tìm Gia Sư" trên dashboard
2. Sử dụng bộ lọc theo:
   - Môn học cần học
   - Khu vực (online hoặc địa điểm)
   - Mức học phí
   - Kinh nghiệm và đánh giá
3. Xem hồ sơ chi tiết của gia sư
4. Gửi yêu cầu đặt lịch học

Gia sư sẽ nhận được yêu cầu và phản hồi trong vòng 24-48 giờ.`;
  }

  // Booking process
  if (lowerMessage.includes('đặt lịch') || lowerMessage.includes('booking')) {
    return `Quy trình đặt lịch học:

1. Tìm và chọn gia sư phù hợp
2. Click "Gửi Yêu Cầu"
3. Điền thông tin:
   - Môn học
   - Thời gian
   - Địa điểm (online/offline)
   - Học phí mong muốn
4. Gửi yêu cầu
5. Chờ gia sư xác nhận
6. Nhận thông báo khi được chấp nhận
7. Thanh toán và bắt đầu học

Bạn có thể theo dõi trạng thái yêu cầu trong mục "Yêu Cầu Gia Sư".`;
  }

  // Payment
  if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment')) {
    return `TutorMis hỗ trợ các phương thức thanh toán:

💳 **Chuyển khoản ngân hàng:**
- Chuyển trực tiếp cho gia sư
- Hoặc qua tài khoản TutorMis

📱 **Ví điện tử:**
- MoMo
- ZaloPay
- VNPay

💵 **Thanh toán trực tiếp:**
- Cho gia sư sau mỗi buổi học

**Chính sách:**
- Hoàn tiền 100% nếu hủy trước 24h
- Thanh toán linh hoạt theo thỏa thuận với gia sư`;
  }

  // Cancel booking
  if (lowerMessage.includes('hủy') || lowerMessage.includes('cancel')) {
    return `Để hủy lịch học:

1. Vào "Khóa Học" hoặc "Yêu Cầu Gia Sư"
2. Tìm lịch học cần hủy
3. Click nút "Hủy Lịch"
4. Chọn lý do hủy
5. Xác nhận

**Chính sách hủy:**
- Hủy trước 24h: Hoàn tiền 100%
- Hủy trong 24h: Hoàn 50%
- Hủy trong 6h: Không hoàn tiền

Lưu ý: Hãy thông báo cho gia sư để đảm bảo quyền lợi cho cả hai bên.`;
  }

  // For tutors
  if (userRole === 'tutor') {
    if (lowerMessage.includes('thu nhập') || lowerMessage.includes('income')) {
      return `Theo dõi thu nhập của bạn:

1. Vào mục "Thu Nhập" trên dashboard
2. Xem biểu đồ thu nhập theo:
   - Ngày/Tuần/Tháng
   - Thực tế và dự kiến
3. Xem chi tiết từng buổi học
4. Thống kê tổng thu nhập

**Tips tăng thu nhập:**
- Hoàn thiện hồ sơ chi tiết
- Duy trì đánh giá cao
- Phản hồi yêu cầu nhanh chóng
- Đa dạng môn học và thời gian`;
    }

    if (lowerMessage.includes('học sinh') || lowerMessage.includes('student')) {
      return `Quản lý học sinh:

1. Vào "Học Sinh" trên dashboard
2. Xem danh sách học sinh đang dạy
3. Theo dõi tiến độ và lịch học
4. Trao đổi qua tin nhắn hoặc video call
5. Ghi chú về từng học sinh

**Mẹo:**
- Liên hệ thường xuyên với học sinh
- Đánh giá tiến độ học tập
- Điều chỉnh phương pháp dạy phù hợp`;
    }
  }

  // Default response
  return `Xin chào! Tôi là trợ lý AI của TutorMis. 

Tôi có thể giúp bạn:
✓ Tìm gia sư phù hợp
✓ Hướng dẫn đặt lịch học
✓ Giải đáp về thanh toán
✓ Hướng dẫn sử dụng tính năng
✓ Giải quyết các vấn đề thường gặp

Bạn có thể hỏi tôi bất kỳ câu hỏi nào về TutorMis nhé! 😊`;
}

module.exports = {
  chat
};
