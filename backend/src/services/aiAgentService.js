/**
 * AI Agent System with Multiple Tools
 * Implements agent pattern with function calling for complex tasks
 */

const aiTrainingService = require('./aiTrainingService');
const { BookingRequest, TutorProfile, StudentProfile } = require('../models');

/**
 * Available tools/functions that AI agent can use
 */
const AVAILABLE_TOOLS = [
  {
    name: 'search_tutors',
    description: 'Tìm kiếm gia sư theo nhiều tiêu chí như môn học, địa điểm, giá cả, đánh giá',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Môn học (toán, văn, anh, lý, hóa...)' },
        city: { type: 'string', description: 'Thành phố (hà nội, đà nẵng, hcm...)' },
        district: { type: 'string', description: 'Quận/Huyện' },
        minPrice: { type: 'number', description: 'Giá tối thiểu (đồng)' },
        maxPrice: { type: 'number', description: 'Giá tối đa (đồng)' },
        minRating: { type: 'number', description: 'Đánh giá tối thiểu (1-5)' },
        gender: { type: 'string', enum: ['male', 'female'], description: 'Giới tính' },
        experience: { type: 'number', description: 'Số năm kinh nghiệm tối thiểu' },
        limit: { type: 'number', description: 'Số lượng kết quả (default: 10)' }
      }
    }
  },
  {
    name: 'get_tutor_details',
    description: 'Lấy thông tin chi tiết của một gia sư cụ thể',
    parameters: {
      type: 'object',
      properties: {
        tutorId: { type: 'string', description: 'ID của gia sư', required: true }
      },
      required: ['tutorId']
    }
  },
  {
    name: 'get_tutor_availability',
    description: 'Kiểm tra lịch rảnh của gia sư',
    parameters: {
      type: 'object',
      properties: {
        tutorId: { type: 'string', description: 'ID của gia sư', required: true },
        date: { type: 'string', description: 'Ngày cần kiểm tra (YYYY-MM-DD)' }
      },
      required: ['tutorId']
    }
  },
  {
    name: 'compare_tutors',
    description: 'So sánh hai hoặc nhiều gia sư',
    parameters: {
      type: 'object',
      properties: {
        tutorIds: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID gia sư cần so sánh' }
      },
      required: ['tutorIds']
    }
  },
  {
    name: 'get_booking_requirements',
    description: 'Lấy yêu cầu và quy trình đặt lịch học',
    parameters: {
      type: 'object',
      properties: {
        tutorId: { type: 'string', description: 'ID của gia sư (optional)' }
      }
    }
  },
  {
    name: 'calculate_total_cost',
    description: 'Tính tổng chi phí học dựa trên số buổi và giá',
    parameters: {
      type: 'object',
      properties: {
        hourlyRate: { type: 'number', description: 'Giá mỗi giờ', required: true },
        hours: { type: 'number', description: 'Số giờ học', required: true },
        sessions: { type: 'number', description: 'Số buổi học', required: true }
      },
      required: ['hourlyRate', 'hours', 'sessions']
    }
  },
  {
    name: 'get_user_booking_history',
    description: 'Lấy lịch sử đặt lịch của người dùng',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID người dùng', required: true },
        status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'], description: 'Lọc theo trạng thái' }
      },
      required: ['userId']
    }
  },
  {
    name: 'recommend_tutors',
    description: 'Gợi ý gia sư phù hợp dựa trên lịch sử và sở thích của người dùng',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID người dùng', required: true },
        limit: { type: 'number', description: 'Số lượng gợi ý (default: 5)' }
      },
      required: ['userId']
    }
  }
];

/**
 * Tool implementations
 */
class AIAgent {
  constructor() {
    this.tools = {
      search_tutors: this.searchTutors.bind(this),
      get_tutor_details: this.getTutorDetails.bind(this),
      get_tutor_availability: this.getTutorAvailability.bind(this),
      compare_tutors: this.compareTutors.bind(this),
      get_booking_requirements: this.getBookingRequirements.bind(this),
      calculate_total_cost: this.calculateTotalCost.bind(this),
      get_user_booking_history: this.getUserBookingHistory.bind(this),
      recommend_tutors: this.recommendTutors.bind(this)
    };
  }

  /**
   * Search tutors with criteria
   */
  async searchTutors(params) {
    try {
      const tutors = await aiTrainingService.searchTutors(params);
      return {
        success: true,
        data: tutors,
        count: tutors.length,
        message: `Tìm thấy ${tutors.length} gia sư phù hợp`
      };
    } catch (error) {
      console.error('Agent tool error - search_tutors:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể tìm kiếm gia sư lúc này'
      };
    }
  }

  /**
   * Get detailed tutor information
   */
  async getTutorDetails(params) {
    try {
      const tutor = await aiTrainingService.getTutorDetails(params.tutorId);
      if (!tutor) {
        return {
          success: false,
          message: 'Không tìm thấy gia sư này'
        };
      }
      return {
        success: true,
        data: tutor,
        message: `Thông tin chi tiết về ${tutor.fullName}`
      };
    } catch (error) {
      console.error('Agent tool error - get_tutor_details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check tutor availability
   */
  async getTutorAvailability(params) {
    try {
      const tutor = await TutorProfile.findById(params.tutorId).lean();
      if (!tutor) {
        return {
          success: false,
          message: 'Không tìm thấy gia sư'
        };
      }

      const availability = tutor.availability || [];
      
      // Get existing bookings
      const existingBookings = await BookingRequest.find({
        tutorId: params.tutorId,
        status: { $in: ['pending', 'confirmed'] }
      }).select('startTime endTime').lean();

      return {
        success: true,
        data: {
          availability: availability,
          bookedSlots: existingBookings,
          tutorName: tutor.fullName
        },
        message: `Lịch rảnh của ${tutor.fullName}`
      };
    } catch (error) {
      console.error('Agent tool error - get_tutor_availability:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compare multiple tutors
   */
  async compareTutors(params) {
    try {
      const tutorIds = params.tutorIds || [];
      if (tutorIds.length < 2) {
        return {
          success: false,
          message: 'Cần ít nhất 2 gia sư để so sánh'
        };
      }

      const tutors = await Promise.all(
        tutorIds.map(id => aiTrainingService.getTutorDetails(id))
      );

      const validTutors = tutors.filter(t => t !== null);

      // Create comparison matrix
      const comparison = {
        tutors: validTutors,
        metrics: {
          price: {
            cheapest: validTutors.reduce((min, t) => t.hourlyRate < min.hourlyRate ? t : min),
            mostExpensive: validTutors.reduce((max, t) => t.hourlyRate > max.hourlyRate ? t : max),
            average: validTutors.reduce((sum, t) => sum + t.hourlyRate, 0) / validTutors.length
          },
          rating: {
            highest: validTutors.reduce((max, t) => (t.rating || 0) > (max.rating || 0) ? t : max),
            lowest: validTutors.reduce((min, t) => (t.rating || 0) < (min.rating || 0) ? t : min),
            average: validTutors.reduce((sum, t) => sum + (t.rating || 0), 0) / validTutors.length
          },
          experience: {
            mostExperienced: validTutors.reduce((max, t) => (t.yearsOfExperience || 0) > (max.yearsOfExperience || 0) ? t : max),
            leastExperienced: validTutors.reduce((min, t) => (t.yearsOfExperience || 0) < (min.yearsOfExperience || 0) ? t : min)
          }
        }
      };

      return {
        success: true,
        data: comparison,
        message: `So sánh ${validTutors.length} gia sư`
      };
    } catch (error) {
      console.error('Agent tool error - compare_tutors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get booking requirements
   */
  async getBookingRequirements(params) {
    try {
      const requirements = {
        generalProcess: [
          '1. Chọn gia sư phù hợp',
          '2. Gửi yêu cầu đặt lịch với thông tin: môn học, thời gian, địa điểm',
          '3. Chờ gia sư xác nhận (24-48h)',
          '4. Nhận thông báo khi được chấp nhận',
          '5. Thanh toán và bắt đầu học'
        ],
        requirements: [
          'Thông tin cá nhân đầy đủ',
          'Mô tả chi tiết nhu cầu học',
          'Thời gian học mong muốn',
          'Phương thức học (online/offline)',
          'Ngân sách dự kiến'
        ],
        paymentMethods: [
          'Chuyển khoản ngân hàng',
          'Ví điện tử (MoMo, ZaloPay)',
          'Thanh toán trực tiếp cho gia sư'
        ],
        cancellationPolicy: {
          before24h: 'Hoàn tiền 100%',
          within24h: 'Hoàn tiền 50%',
          within6h: 'Không hoàn tiền'
        }
      };

      // Get tutor-specific requirements if provided
      if (params.tutorId) {
        const tutor = await TutorProfile.findById(params.tutorId).lean();
        if (tutor) {
          requirements.tutorSpecific = {
            name: tutor.fullName,
            minBookingHours: tutor.minBookingHours || 1,
            acceptsOnline: tutor.teachingMode?.includes('online') || true,
            acceptsOffline: tutor.teachingMode?.includes('offline') || true,
            preferredSchedule: tutor.availability || []
          };
        }
      }

      return {
        success: true,
        data: requirements,
        message: 'Yêu cầu và quy trình đặt lịch học'
      };
    } catch (error) {
      console.error('Agent tool error - get_booking_requirements:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate total learning cost
   */
  async calculateTotalCost(params) {
    try {
      const { hourlyRate, hours, sessions } = params;
      
      const totalHours = hours * sessions;
      const subtotal = hourlyRate * totalHours;
      
      // Calculate discounts for long-term bookings
      let discount = 0;
      if (sessions >= 20) {
        discount = 0.15; // 15% for 20+ sessions
      } else if (sessions >= 10) {
        discount = 0.10; // 10% for 10+ sessions
      } else if (sessions >= 5) {
        discount = 0.05; // 5% for 5+ sessions
      }

      const discountAmount = subtotal * discount;
      const total = subtotal - discountAmount;

      return {
        success: true,
        data: {
          hourlyRate: hourlyRate,
          hoursPerSession: hours,
          numberOfSessions: sessions,
          totalHours: totalHours,
          subtotal: subtotal,
          discount: {
            percentage: discount * 100,
            amount: discountAmount
          },
          total: total,
          breakdown: {
            perSession: hourlyRate * hours,
            perMonth: (hourlyRate * hours * 4) // Assuming 4 sessions per month
          }
        },
        message: `Tổng chi phí: ${total.toLocaleString('vi-VN')}đ cho ${sessions} buổi học`
      };
    } catch (error) {
      console.error('Agent tool error - calculate_total_cost:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user booking history
   */
  async getUserBookingHistory(params) {
    try {
      const query = { studentId: params.userId };
      if (params.status) {
        query.status = params.status;
      }

      const bookings = await BookingRequest.find(query)
        .populate('tutorId', 'fullName subjects hourlyRate')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const stats = {
        total: bookings.length,
        byStatus: {
          pending: bookings.filter(b => b.status === 'pending').length,
          confirmed: bookings.filter(b => b.status === 'confirmed').length,
          completed: bookings.filter(b => b.status === 'completed').length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length
        },
        totalSpent: bookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      };

      return {
        success: true,
        data: {
          bookings: bookings,
          statistics: stats
        },
        message: `Lịch sử ${bookings.length} yêu cầu đặt lịch`
      };
    } catch (error) {
      console.error('Agent tool error - get_user_booking_history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recommend tutors based on user history and preferences
   */
  async recommendTutors(params) {
    try {
      const { userId, limit = 5 } = params;

      // Get user profile and history
      const student = await StudentProfile.findOne({ userId }).lean();
      const bookingHistory = await BookingRequest.find({ studentId: userId })
        .populate('tutorId')
        .lean();

      // Extract user preferences
      const interestedSubjects = student?.interestedSubjects || [];
      const previousTutorIds = bookingHistory.map(b => b.tutorId?._id?.toString()).filter(Boolean);
      
      // Get average price from history
      const completedBookings = bookingHistory.filter(b => b.status === 'completed');
      const avgPrice = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => sum + (b.hourlyRate || 0), 0) / completedBookings.length
        : 300000; // Default

      // Build recommendation query
      const query = {
        isVerified: true,
        _id: { $nin: previousTutorIds } // Exclude already booked tutors
      };

      // Prefer tutors teaching interested subjects
      if (interestedSubjects.length > 0) {
        query.subjects = {
          $elemMatch: {
            name: { $in: interestedSubjects.map(s => new RegExp(s, 'i')) }
          }
        };
      }

      // Prefer tutors in similar price range (±30%)
      query.hourlyRate = {
        $gte: avgPrice * 0.7,
        $lte: avgPrice * 1.3
      };

      // Get recommendations
      const recommendations = await TutorProfile.find(query)
        .populate('userId', 'email isActive')
        .sort({ rating: -1, totalStudents: -1 })
        .limit(limit)
        .lean();

      // Format results
      const formattedResults = recommendations.map(tutor => ({
        id: tutor._id,
        fullName: tutor.fullName,
        subjects: tutor.subjects,
        hourlyRate: tutor.hourlyRate,
        city: tutor.city,
        rating: tutor.rating,
        totalStudents: tutor.totalStudents,
        matchReason: this._getMatchReason(tutor, interestedSubjects, avgPrice),
        profileUrl: `/pages/student/tutor-detail.html?id=${tutor._id}`
      }));

      return {
        success: true,
        data: {
          recommendations: formattedResults,
          basedOn: {
            interestedSubjects: interestedSubjects,
            avgPriceRange: `${(avgPrice * 0.7).toLocaleString('vi-VN')}đ - ${(avgPrice * 1.3).toLocaleString('vi-VN')}đ`,
            totalBookings: bookingHistory.length
          }
        },
        message: `${formattedResults.length} gia sư được gợi ý dựa trên sở thích của bạn`
      };
    } catch (error) {
      console.error('Agent tool error - recommend_tutors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper: Get match reason for recommendation
   */
  _getMatchReason(tutor, interestedSubjects, avgPrice) {
    const reasons = [];
    
    // Check subject match
    const tutorSubjects = tutor.subjects?.map(s => s.name?.toLowerCase()) || [];
    const matchingSubjects = interestedSubjects.filter(s => 
      tutorSubjects.some(ts => ts?.includes(s.toLowerCase()))
    );
    if (matchingSubjects.length > 0) {
      reasons.push(`Dạy ${matchingSubjects.join(', ')}`);
    }

    // Check price match
    if (tutor.hourlyRate >= avgPrice * 0.7 && tutor.hourlyRate <= avgPrice * 1.3) {
      reasons.push('Phù hợp ngân sách');
    }

    // Check rating
    if (tutor.rating >= 4.5) {
      reasons.push('Đánh giá cao');
    }

    // Check experience
    if (tutor.totalStudents >= 20) {
      reasons.push('Kinh nghiệm nhiều học sinh');
    }

    return reasons.join(', ') || 'Phù hợp với hồ sơ của bạn';
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName, params) {
    const tool = this.tools[toolName];
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`
      };
    }

    console.log(`[AI Agent] Executing tool: ${toolName}`, params);
    const result = await tool(params);
    console.log(`[AI Agent] Tool result:`, { success: result.success, dataKeys: Object.keys(result.data || {}) });
    
    return result;
  }

  /**
   * Get all available tools
   */
  getAvailableTools() {
    return AVAILABLE_TOOLS;
  }
}

// Export singleton instance
module.exports = new AIAgent();
