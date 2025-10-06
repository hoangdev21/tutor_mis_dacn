/**
 * ===============================================
 * AI CONTROLLER - HYBRID AI SYSTEM v2.0
 * ===============================================
 * 
 * Professional hybrid system:
 * - Gemini AI for intent understanding
 * - Pattern matching for fast data retrieval
 * - Handles ALL question types accurately
 * - Real MongoDB database integration
 * 
 * @version 2.0.0 (Hybrid AI)
 * @author TutorMis Team
 */

const hybridChatbotService = require('../services/hybridChatbotService');
const { TutorProfile, StudentProfile, Course, BookingRequest, BlogPost, User } = require('../models');

// Get dynamic database context for training
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

/**
 * @desc    Chat with Smart Vietnamese Chatbot
 * @route   POST /api/ai/chat
 * @access  Private
 */
const chat = async (req, res) => {
  try {
    const { message, context } = req.body;
    const userRole = req.user.role || context?.role || 'user';
    const userId = req.user.id;

    // Validate input
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập câu hỏi'
      });
    }

    console.log('[Hybrid AI] New query:', { 
      userId, 
      userRole, 
      message: message.substring(0, 100) 
    });

    // 🚀 Use Hybrid AI System (Gemini + Pattern Matching)
    const chatResult = await hybridChatbotService.chat(message, userId, userRole);

    if (!chatResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xử lý câu hỏi',
        response: chatResult.response
      });
    }

    // Log for analytics
    console.log('[Hybrid AI Response]', {
      userId,
      userRole,
      queryLength: message.length,
      intent: chatResult.metadata.intent,
      confidence: chatResult.metadata.confidence,
      responseLength: chatResult.response.length,
      timestamp: new Date()
    });

    // Return hybrid AI response
    res.json({
      success: true,
      response: chatResult.response,
      metadata: chatResult.metadata
    });

  } catch (error) {
    console.error('Error in Hybrid AI:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý câu hỏi',
      response: 'Xin lỗi, tôi gặp lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.'
    });
  }
};

/**
 * Fallback responses for common questions (không còn cần thiết nhưng giữ lại cho bảo hiểm)
 */
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
  chat,
  getDatabaseContext
};
