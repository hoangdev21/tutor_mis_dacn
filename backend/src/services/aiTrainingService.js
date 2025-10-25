/**
 * AI Training Service
 * Cung cấp dữ liệu training và context cho AI chatbot
 * Hỗ trợ tìm kiếm thông minh về gia sư, khóa học, giá cả, địa điểm
 */

const { TutorProfile, StudentProfile, Course, BookingRequest, BlogPost, User } = require('../models');

/**
 * Tìm kiếm gia sư theo tiêu chí
 */
async function searchTutors(criteria = {}) {
  try {
    const {
      subject,        // Môn học
      city,           // Thành phố
      district,       // Quận/Huyện
      minPrice,       // Giá tối thiểu
      maxPrice,       // Giá tối đa
      minRating,      // Đánh giá tối thiểu
      gender,         // Giới tính
      experience,     // Số năm kinh nghiệm
      education,      // Trình độ học vấn
      limit = 10      // Số lượng kết quả
    } = criteria;

    // Xây dựng query tìm kiếm
    const query = {
      isVerified: true,  // Chỉ lấy gia sư đã xác minh
    };

    // Lọc theo môn học
    if (subject) {
      query.subjects = { 
        $elemMatch: { 
          name: { $regex: new RegExp(subject, 'i') } 
        } 
      };
    }

    // Lọc theo thành phố
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }

    // Lọc theo quận/huyện
    if (district) {
      query.district = { $regex: new RegExp(district, 'i') };
    }

    // Lọc theo giá
    if (minPrice || maxPrice) {
      query.hourlyRate = {};
      if (minPrice) query.hourlyRate.$gte = parseInt(minPrice);
      if (maxPrice) query.hourlyRate.$lte = parseInt(maxPrice);
    }

    // Lọc theo đánh giá
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Lọc theo giới tính
    if (gender) {
      query.gender = gender;
    }

    // Lọc theo kinh nghiệm
    if (experience) {
      query.yearsOfExperience = { $gte: parseInt(experience) };
    }

    // Lọc theo trình độ
    if (education) {
      query.education = { $regex: new RegExp(education, 'i') };
    }

    // Thực hiện tìm kiếm
    const tutors = await TutorProfile.find(query)
      .populate('userId', 'email isActive')
      .limit(limit)
      .sort({ rating: -1, totalStudents: -1 })
      .lean();

    // Format kết quả
    return tutors.map(tutor => ({
      id: tutor._id,
      fullName: tutor.fullName,
      subjects: tutor.subjects,
      hourlyRate: tutor.hourlyRate,
      city: tutor.city,
      district: tutor.district,
      rating: tutor.rating,
      totalStudents: tutor.totalStudents,
      yearsOfExperience: tutor.yearsOfExperience,
      education: tutor.education,
      bio: tutor.bio,
      avatar: tutor.avatar,
      profileUrl: `/pages/student/tutor-detail.html?id=${tutor._id}`
    }));

  } catch (error) {
    console.error('Lỗi tìm kiếm gia sư:', error);
    return [];
  }
}

/**
 * Tìm kiếm khóa học theo tiêu chí
 */
async function searchCourses(criteria = {}) {
  try {
    const {
      subject,
      level,
      minPrice,
      maxPrice,
      limit = 10
    } = criteria;

    const query = {};

    if (subject) {
      query.subject = { $regex: new RegExp(subject, 'i') };
    }

    if (level) {
      query.level = { $regex: new RegExp(level, 'i') };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    const courses = await Course.find(query)
      .populate('tutorId', 'fullName rating')
      .limit(limit)
      .sort({ enrollmentCount: -1 })
      .lean();

    return courses.map(course => ({
      id: course._id,
      title: course.title,
      subject: course.subject,
      level: course.level,
      price: course.price,
      duration: course.duration,
      tutorName: course.tutorId?.fullName,
      enrollmentCount: course.enrollmentCount,
      courseUrl: `/pages/student/course-detail.html?id=${course._id}`
    }));

  } catch (error) {
    console.error('Lỗi tìm kiếm khóa học:', error);
    return [];
  }
}

/**
 * Lấy thống kê tổng quan hệ thống
 */
async function getSystemStatistics() {
  try {
    const [
      totalTutors,
      totalStudents,
      totalCourses,
      totalBookings,
      verifiedTutors,
      activeTutors
    ] = await Promise.all([
      TutorProfile.countDocuments(),
      StudentProfile.countDocuments(),
      Course.countDocuments(),
      BookingRequest.countDocuments(),
      TutorProfile.countDocuments({ isVerified: true }),
      User.countDocuments({ role: 'tutor', isActive: true })
    ]);

    // Thống kê môn học phổ biến
    const popularSubjects = await TutorProfile.aggregate([
      { $unwind: '$subjects' },
      { $group: { _id: '$subjects.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Thống kê thành phố có nhiều gia sư
    const popularCities = await TutorProfile.aggregate([
      { $match: { city: { $exists: true, $ne: null } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Thống kê giá trung bình
    const priceStats = await TutorProfile.aggregate([
      { $group: {
        _id: null,
        avgPrice: { $avg: '$hourlyRate' },
        minPrice: { $min: '$hourlyRate' },
        maxPrice: { $max: '$hourlyRate' }
      }}
    ]);

    return {
      totalTutors,
      totalStudents,
      totalCourses,
      totalBookings,
      verifiedTutors,
      activeTutors,
      popularSubjects: popularSubjects.map(s => ({ subject: s._id, count: s.count })),
      popularCities: popularCities.map(c => ({ city: c._id, count: c.count })),
      priceStats: priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 }
    };

  } catch (error) {
    console.error('Lỗi lấy thống kê hệ thống:', error);
    return null;
  }
}

/**
 * Lấy blog posts gần đây
 */
async function getRecentBlogs(limit = 5) {
  try {
    const blogs = await BlogPost.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title summary category createdAt')
      .lean();

    return blogs.map(blog => ({
      title: blog.title,
      summary: blog.summary,
      category: blog.category,
      date: blog.createdAt,
      url: `/pages/student/blog-detail.html?id=${blog._id}`
    }));

  } catch (error) {
    console.error('Lỗi lấy blog gần đây:', error);
    return [];
  }
}

/**
 * Lấy thông tin chi tiết một gia sư
 */
async function getTutorDetails(tutorId) {
  try {
    const tutor = await TutorProfile.findById(tutorId)
      .populate('userId', 'email isActive')
      .lean();

    if (!tutor) return null;

    // Lấy số lượng booking
    const totalBookings = await BookingRequest.countDocuments({ 
      tutorId: tutorId,
      status: 'completed'
    });

    return {
      id: tutor._id,
      fullName: tutor.fullName,
      email: tutor.userId?.email,
      phone: tutor.phone,
      subjects: tutor.subjects,
      hourlyRate: tutor.hourlyRate,
      city: tutor.city,
      district: tutor.district,
      address: tutor.address,
      rating: tutor.rating,
      totalStudents: tutor.totalStudents,
      totalBookings: totalBookings,
      yearsOfExperience: tutor.yearsOfExperience,
      education: tutor.education,
      certifications: tutor.certifications,
      bio: tutor.bio,
      teachingStyle: tutor.teachingStyle,
      achievements: tutor.achievements,
      availability: tutor.availability,
      avatar: tutor.avatar,
      profileUrl: `/pages/student/tutor-detail.html?id=${tutor._id}`
    };

  } catch (error) {
    console.error('Lỗi lấy thông tin chi tiết gia sư:', error);
    return null;
  }
}

/**
 * Phân tích câu hỏi của người dùng và trích xuất thông tin
 */
function parseUserQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  const criteria = {};

  // Trích xuất môn học
  const subjects = [
    'toán', 'văn', 'anh văn', 'tiếng anh', 'english', 'vật lý', 'hóa học', 
    'sinh học', 'địa lý', 'lịch sử', 'gdcd', 'tin học', 'piano', 'guitar',
    'âm nhạc', 'mỹ thuật', 'thể dục', 'công nghệ', 'khoa học'
  ];
  
  for (const subject of subjects) {
    if (lowerQuery.includes(subject)) {
      criteria.subject = subject;
      break;
    }
  }

  // Trích xuất địa điểm
  const cities = [
    'hà nội', 'hồ chí minh', 'đà nẵng', 'hải phòng', 'cần thơ',
    'biên hòa', 'nha trang', 'huế', 'đà lạt', 'vũng tàu'
  ];
  
  for (const city of cities) {
    if (lowerQuery.includes(city)) {
      criteria.city = city;
      break;
    }
  }

  // Trích xuất giá (học phí)
  const priceMatches = lowerQuery.match(/(\d+)k|(\d+)\s*(?:nghìn|ngàn)/gi);
  if (priceMatches) {
    const prices = priceMatches.map(p => {
      const num = parseInt(p.replace(/[^\d]/g, ''));
      return p.includes('k') ? num * 1000 : num;
    });
    
    if (lowerQuery.includes('dưới') || lowerQuery.includes('thấp hơn') || lowerQuery.includes('ít hơn')) {
      criteria.maxPrice = Math.max(...prices);
    } else if (lowerQuery.includes('trên') || lowerQuery.includes('cao hơn') || lowerQuery.includes('nhiều hơn')) {
      criteria.minPrice = Math.min(...prices);
    } else if (prices.length === 2) {
      criteria.minPrice = Math.min(...prices);
      criteria.maxPrice = Math.max(...prices);
    } else {
      criteria.maxPrice = prices[0];
    }
  }

  // Trích xuất đánh giá
  const ratingMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:sao|stars?)/i);
  if (ratingMatch) {
    criteria.minRating = parseFloat(ratingMatch[1]);
  }

  // Trích xuất kinh nghiệm
  const expMatch = lowerQuery.match(/(\d+)\s*(?:năm|years?)\s*(?:kinh nghiệm|experience)/i);
  if (expMatch) {
    criteria.experience = parseInt(expMatch[1]);
  }

  // Trích xuất giới tính
  if (lowerQuery.includes('nam') || lowerQuery.includes('thầy')) {
    criteria.gender = 'male';
  } else if (lowerQuery.includes('nữ') || lowerQuery.includes('cô')) {
    criteria.gender = 'female';
  }

  // Xác định loại câu hỏi
  const queryType = {
    searchTutor: /(?:có|tìm|giới thiệu|recommend).*(?:gia sư|tutor|teacher)/i.test(query),
    searchCourse: /(?:có|tìm|giới thiệu).*(?:khóa học|course|lớp học)/i.test(query),
    pricing: /(?:giá|học phí|chi phí|phí|price|cost)/i.test(query),
    location: cities.some(city => lowerQuery.includes(city)),
    statistics: /(?:bao nhiêu|có mấy|tổng|how many|statistics)/i.test(query),
    tutorInfo: /(?:thông tin|chi tiết|profile|about).*(?:gia sư|tutor)/i.test(query)
  };

  return { criteria, queryType };
}

/**
 * Tạo context training cho AI
 */
async function generateAIContext(userQuery, userId = null, userRole = null) {
  try {
    // Parse câu hỏi
    const { criteria, queryType } = parseUserQuery(userQuery);

    // Lấy thống kê hệ thống
    const stats = await getSystemStatistics();

    let searchResults = {
      tutors: [],
      courses: [],
      blogs: []
    };

    // Tìm kiếm dựa trên loại câu hỏi
    if (queryType.searchTutor) {
      searchResults.tutors = await searchTutors(criteria);
    }

    if (queryType.searchCourse) {
      searchResults.courses = await searchCourses(criteria);
    }

    // Lấy blog posts
    searchResults.blogs = await getRecentBlogs(3);

    // Lấy thông tin người dùng nếu có
    let userContext = null;
    if (userId) {
      if (userRole === 'tutor') {
        const tutor = await TutorProfile.findOne({ userId });
        if (tutor) {
          userContext = {
            role: 'tutor',
            fullName: tutor.fullName,
            subjects: tutor.subjects,
            hourlyRate: tutor.hourlyRate,
            rating: tutor.rating,
            totalStudents: tutor.totalStudents
          };
        }
      } else if (userRole === 'student') {
        const student = await StudentProfile.findOne({ userId });
        const bookings = await BookingRequest.countDocuments({ studentId: userId });
        if (student) {
          userContext = {
            role: 'student',
            fullName: student.fullName,
            totalBookings: bookings,
            interestedSubjects: student.interestedSubjects
          };
        }
      }
    }

    return {
      systemStats: stats,
      searchResults: searchResults,
      userContext: userContext,
      parsedCriteria: criteria,
      queryType: queryType
    };

  } catch (error) {
    console.error('Lỗi tạo ngữ cảnh AI:', error);
    return null;
  }
}

/**
 * Format câu trả lời AI với dữ liệu thực tế
 */
function formatAIResponse(context, tutors = []) {
  if (!tutors || tutors.length === 0) {
    return null;
  }

  let response = '\n\n📚 **Danh sách gia sư phù hợp:**\n\n';

  tutors.forEach((tutor, index) => {
    response += `**${index + 1}. ${tutor.fullName}**\n`;
    response += `   - 📍 Địa điểm: ${tutor.city}${tutor.district ? ', ' + tutor.district : ''}\n`;
    
    if (tutor.subjects && tutor.subjects.length > 0) {
      const subjectNames = tutor.subjects.map(s => s.name || s).join(', ');
      response += `   - 📖 Môn dạy: ${subjectNames}\n`;
    }
    
    response += `   - 💰 Học phí: ${tutor.hourlyRate?.toLocaleString('vi-VN')}đ/giờ\n`;
    response += `   - ⭐ Đánh giá: ${tutor.rating || 'N/A'}/5.0\n`;
    
    if (tutor.yearsOfExperience) {
      response += `   - 🎓 Kinh nghiệm: ${tutor.yearsOfExperience} năm\n`;
    }
    
    if (tutor.education) {
      response += `   - 📚 Trình độ: ${tutor.education}\n`;
    }
    
    if (tutor.bio) {
      const shortBio = tutor.bio.substring(0, 100) + (tutor.bio.length > 100 ? '...' : '');
      response += `   - 📝 Giới thiệu: ${shortBio}\n`;
    }
    
    response += `   - 🔗 [Xem chi tiết](${tutor.profileUrl})\n\n`;
  });

  return response;
}

module.exports = {
  searchTutors,
  searchCourses,
  getSystemStatistics,
  getRecentBlogs,
  getTutorDetails,
  parseUserQuery,
  generateAIContext,
  formatAIResponse
};
