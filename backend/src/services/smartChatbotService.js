/**
 * ===============================================
 * SMART OFFLINE CHATBOT SERVICE
 * ===============================================
 * 
 * Professional Vietnamese NLP chatbot that:
 * - Understands colloquial Vietnamese
 * - Handles typos and misspellings
 * - Multi-criteria search
 * - Context-aware responses
 * - Works WITHOUT AI API (fast & reliable)
 * 
 * @author TutorMis Team
 * @version 1.0.0
 */

const TutorProfile = require('../models/TutorProfile');
const StudentProfile = require('../models/StudentProfile');
const Course = require('../models/Course');
const BookingRequest = require('../models/BookingRequest');
const BlogPost = require('../models/BlogPost');

class SmartChatbotService {
    
    /**
     * Main chat function - process user query and return response
     * @param {string} query - User's question
     * @param {string} userId - User ID
     * @param {string} userRole - User role (student/tutor)
     * @returns {Promise<object>} - Chat response with metadata
     */
    async chat(query, userId, userRole) {
        try {
            // Parse query to extract criteria
            const criteria = this.parseQuery(query);
            
            // Search database based on criteria
            const searchResults = await this.searchTutors(criteria);
            
            // Get additional context
            const systemContext = await this.getSystemContext(userId, userRole);
            
            // Generate response
            const response = this.generateResponse(query, criteria, searchResults, systemContext);
            
            return {
                success: true,
                response,
                metadata: {
                    tutorsFound: searchResults.length,
                    queryType: criteria.queryType,
                    criteria: this.sanitizeCriteria(criteria),
                    hasResults: searchResults.length > 0
                }
            };
        } catch (error) {
            console.error('[SmartChatbot Error]', error);
            return {
                success: false,
                response: this.getErrorResponse(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Parse Vietnamese query to extract search criteria
     */
    parseQuery(query) {
        const normalized = this.normalizeVietnamese(query.toLowerCase());
        
        return {
            subjects: this.extractSubjects(normalized),
            city: this.extractCity(normalized),
            ...this.extractPrices(normalized),
            gender: this.extractGender(normalized),
            minExperience: this.extractExperience(normalized),
            minRating: this.extractRating(normalized),
            educationLevel: this.extractEducation(normalized),
            queryType: this.detectQueryType(normalized)
        };
    }

    /**
     * Normalize Vietnamese text (handle typos, missing diacritics)
     */
    normalizeVietnamese(text) {
        text = text.replace(/\s+/g, ' ').trim();
        
        const typos = {
            'giá sư': 'gia sư',
            'hoá': 'hóa',
            'vat ly': 'vật lý',
            'ha noi': 'hà nội',
            'da nang': 'đà nẵng',
            'tp hcm': 'tp hồ chí minh',
            'tphcm': 'tp hồ chí minh',
            'sai gon': 'tp hồ chí minh'
        };
        
        for (const [wrong, correct] of Object.entries(typos)) {
            text = text.replace(new RegExp(wrong, 'gi'), correct);
        }
        
        return text;
    }

    /**
     * Extract subjects from query
     */
    extractSubjects(query) {
        const subjects = [];
        const subjectPatterns = {
            'Toán': ['toán', 'toan', 'math'],
            'Vật Lý': ['vật lý', 'vat ly', ' lý ', ' ly ', 'physics', 'vật lí'],
            'Hóa Học': ['hóa học', 'hoa hoc', 'hoá', 'hoa', 'chemistry', 'hóa'],
            'Tiếng Anh': ['tiếng anh', 'tieng anh', 'anh văn', 'anh van', 'english', ' anh '],
            'Văn': ['văn', 'van', 'ngữ văn', 'ngu van', 'literature'],
            'Sinh Học': ['sinh học', 'sinh hoc', 'biology'],
            'Địa Lý': ['địa lý', 'dia ly', 'geography'],
            'Lịch Sử': ['lịch sử', 'lich su', 'history']
        };

        for (const [subject, patterns] of Object.entries(subjectPatterns)) {
            if (patterns.some(p => query.includes(p))) {
                subjects.push(subject);
            }
        }

        return subjects;
    }

    /**
     * Extract city from query
     */
    extractCity(query) {
        const cityPatterns = {
            'Hà Nội': ['hà nội', 'ha noi', 'hanoi', ' hn ', 'ở hn', 'tại hn'],
            'Đà Nẵng': ['đà nẵng', 'da nang', 'danang', 'đã nẵng'],
            'TP Hồ Chí Minh': ['tp hồ chí minh', 'tp hcm', ' hcm ', 'sài gòn', 'saigon', 'tphcm', 'hồ chí minh']
        };

        for (const [city, patterns] of Object.entries(cityPatterns)) {
            if (patterns.some(p => query.includes(p))) {
                return city;
            }
        }

        return null;
    }

    /**
     * Extract price range from query
     */
    extractPrices(query) {
        const prices = { minPrice: null, maxPrice: null };
        
        const priceMatches = query.match(/(\d+)k/gi);
        if (!priceMatches) return prices;

        const priceValues = priceMatches.map(p => parseInt(p.replace(/k/i, '')) * 1000);

        if (query.match(/dưới|duoi|nhỏ hơn|<|thấp hơn|ít hơn|rẻ|re/)) {
            prices.maxPrice = Math.max(...priceValues);
        } else if (query.match(/trên|tren|lớn hơn|>|cao hơn|nhiều hơn/)) {
            prices.minPrice = Math.min(...priceValues);
        } else if (query.match(/từ|tu|khoảng|giữa|đến|den/)) {
            prices.minPrice = Math.min(...priceValues);
            if (priceValues.length > 1) {
                prices.maxPrice = Math.max(...priceValues);
            }
        }

        return prices;
    }

    /**
     * Extract gender preference
     */
    extractGender(query) {
        if (/\b(nữ|nu|female|cô)\b/.test(query)) return 'Nữ';
        if (/\b(nam|male|thầy|thay|anh)\b/.test(query)) return 'Nam';
        return null;
    }

    /**
     * Extract experience requirement
     */
    extractExperience(query) {
        const expMatch = query.match(/(\d+)\s*(năm|nam|year)/);
        if (!expMatch) return null;
        
        const years = parseInt(expMatch[1]);
        if (query.match(/trên|tren|lớn hơn|>|nhiều hơn/)) {
            return years;
        }
        return years;
    }

    /**
     * Extract rating requirement
     */
    extractRating(query) {
        const ratingMatch = query.match(/(\d+\.?\d*)\s*(sao|star)/);
        if (ratingMatch) {
            return parseFloat(ratingMatch[1]);
        }
        return null;
    }

    /**
     * Extract education level
     */
    extractEducation(query) {
        if (/thạc sĩ|thac si|master/.test(query)) return 'Thạc sĩ';
        if (/tiến sĩ|tien si|phd|doctor/.test(query)) return 'Tiến sĩ';
        if (/cử nhân|cu nhan|bachelor/.test(query)) return 'Cử nhân';
        return null;
    }

    /**
     * Detect query type
     */
    detectQueryType(query) {
        if (/so sánh|sosánh|compare/.test(query)) return 'comparison';
        if (/gợi ý|goiy|recommend|tốt nhất|tot nhat|best/.test(query)) return 'recommendation';
        if (/đặt lịch|datlich|booking|schedule|book/.test(query)) return 'booking_help';
        if (/hủy|huy|cancel/.test(query)) return 'cancellation';
        if (/thanh toán|thanhtoan|payment|pay/.test(query)) return 'payment';
        if (/online|trực tuyến|tructuyen/.test(query)) return 'online_teaching';
        return 'tutor_search';
    }

    /**
     * Search tutors in database
     */
    async searchTutors(criteria) {
        try {
            const query = { isApproved: true };

            // Add subject filter
            if (criteria.subjects.length > 0) {
                query['subjects.name'] = { $in: criteria.subjects };
            }

            // Add city filter
            if (criteria.city) {
                query.city = criteria.city;
            }

            // Add price filter
            if (criteria.minPrice || criteria.maxPrice) {
                query.hourlyRate = {};
                if (criteria.minPrice) query.hourlyRate.$gte = criteria.minPrice;
                if (criteria.maxPrice) query.hourlyRate.$lte = criteria.maxPrice;
            }

            // Add gender filter
            if (criteria.gender) {
                query.gender = criteria.gender;
            }

            // Add experience filter
            if (criteria.minExperience) {
                query.yearsOfExperience = { $gte: criteria.minExperience };
            }

            // Add rating filter
            if (criteria.minRating) {
                query.rating = { $gte: criteria.minRating };
            }

            // Add education filter
            if (criteria.educationLevel) {
                query['education.level'] = criteria.educationLevel;
            }

            const tutors = await TutorProfile.find(query)
                .populate('user', 'name email')
                .sort({ rating: -1, totalReviews: -1 })
                .limit(10)
                .lean();

            return tutors;
        } catch (error) {
            console.error('[searchTutors Error]', error);
            return [];
        }
    }

    /**
     * Get system context
     */
    async getSystemContext(userId, userRole) {
        try {
            const context = {
                totalTutors: await TutorProfile.countDocuments({ isApproved: true }),
                totalStudents: await StudentProfile.countDocuments(),
                totalCourses: await Course.countDocuments(),
                userBookings: 0
            };

            if (userId && userRole === 'student') {
                context.userBookings = await BookingRequest.countDocuments({ student: userId });
            }

            return context;
        } catch (error) {
            return { totalTutors: 0, totalStudents: 0, totalCourses: 0, userBookings: 0 };
        }
    }

    /**
     * Generate response based on query type
     */
    generateResponse(query, criteria, searchResults, systemContext) {
        const queryType = criteria.queryType;

        switch (queryType) {
            case 'booking_help':
                return this.generateBookingHelp();
            case 'cancellation':
                return this.generateCancellationHelp();
            case 'payment':
                return this.generatePaymentHelp();
            case 'online_teaching':
                return this.generateOnlineTeachingInfo();
            case 'comparison':
                return this.generateComparison(query, searchResults);
            case 'recommendation':
                return this.generateRecommendation(searchResults, criteria);
            default:
                return this.generateTutorSearchResponse(searchResults, criteria, systemContext);
        }
    }

    /**
     * Generate tutor search response with markdown formatting
     */
    generateTutorSearchResponse(results, criteria, systemContext) {
        if (results.length === 0) {
            return this.generateNoResultsResponse(criteria, systemContext);
        }

        let response = `## 📚 Kết quả tìm kiếm gia sư\n\n`;
        response += `Tôi tìm thấy **${results.length} gia sư** phù hợp với yêu cầu của bạn:\n\n`;

        results.forEach((tutor, idx) => {
            const tutorName = tutor.user?.name || tutor.name || 'Gia sư';
            response += `### ${idx + 1}. ${tutorName}\n\n`;
            response += `📍 **Địa điểm**: ${tutor.city || 'Không rõ'}${tutor.district ? ', ' + tutor.district : ''}\n`;
            response += `📖 **Môn dạy**: ${tutor.subjects?.map(s => s.name).join(', ') || 'Không rõ'}\n`;
            response += `💰 **Học phí**: ${tutor.hourlyRate?.toLocaleString() || '0'}đ/giờ\n`;
            response += `⭐ **Đánh giá**: ${tutor.rating || 0}/5.0 (${tutor.totalReviews || 0} đánh giá)\n`;
            response += `🎓 **Học vấn**: ${tutor.education?.level || 'Không rõ'} ${tutor.education?.major || ''}\n`;
            response += `✓ **Kinh nghiệm**: ${tutor.yearsOfExperience || 0} năm\n`;
            if (tutor.isVerified) response += `✅ **Đã xác thực**\n`;
            response += `\n[**Xem hồ sơ chi tiết →**](/pages/student/tutor_profile.html?id=${tutor._id})\n\n`;
            response += `---\n\n`;
        });

        response += `💡 *Có ${systemContext.totalTutors} gia sư đang hoạt động trên TutorMis*\n`;

        return response;
    }

    /**
     * Generate no results response
     */
    generateNoResultsResponse(criteria, systemContext) {
        let response = `## 🔍 Không tìm thấy gia sư phù hợp\n\n`;
        response += `Rất tiếc, tôi không tìm thấy gia sư phù hợp với các tiêu chí:\n\n`;
        
        if (criteria.subjects.length > 0) {
            response += `📖 Môn học: ${criteria.subjects.join(', ')}\n`;
        }
        if (criteria.city) {
            response += `📍 Địa điểm: ${criteria.city}\n`;
        }
        if (criteria.maxPrice) {
            response += `💰 Học phí: dưới ${criteria.maxPrice.toLocaleString()}đ\n`;
        }
        
        response += `\n### 💡 Gợi ý:\n\n`;
        response += `✓ Thử tìm kiếm ở khu vực khác\n`;
        response += `✓ Điều chỉnh mức học phí\n`;
        response += `✓ [Xem tất cả ${systemContext.totalTutors} gia sư →](/pages/student/find_tutor.html)\n`;
        
        return response;
    }

    /**
     * Generate booking help
     */
    generateBookingHelp() {
        let response = `## 📅 Hướng dẫn đặt lịch học\n\n`;
        response += `**Quy trình đặt lịch học với gia sư:**\n\n`;
        response += `1. Tìm và chọn gia sư phù hợp\n`;
        response += `2. Click nút "Gửi Yêu Cầu" trên hồ sơ gia sư\n`;
        response += `3. Điền thông tin: môn học, thời gian, địa điểm (online/offline)\n`;
        response += `4. Gửi yêu cầu và chờ gia sư xác nhận\n`;
        response += `5. Nhận thông báo khi được chấp nhận\n`;
        response += `6. Thanh toán và bắt đầu học\n\n`;
        response += `💡 *Bạn có thể theo dõi trạng thái yêu cầu trong mục "Yêu Cầu Gia Sư"*\n`;
        return response;
    }

    /**
     * Generate cancellation help
     */
    generateCancellationHelp() {
        let response = `## ❌ Hướng dẫn hủy lịch học\n\n`;
        response += `**Cách hủy lịch:**\n\n`;
        response += `1. Vào mục "Khóa Học" hoặc "Yêu Cầu Gia Sư"\n`;
        response += `2. Tìm lịch học cần hủy\n`;
        response += `3. Click nút "Hủy Lịch"\n`;
        response += `4. Chọn lý do hủy và xác nhận\n\n`;
        response += `**Chính sách hoàn tiền:**\n\n`;
        response += `✓ Hủy trước 24 giờ: Hoàn tiền 100%\n`;
        response += `✓ Hủy trong 24 giờ: Hoàn 50%\n`;
        response += `✓ Hủy trong 6 giờ: Không hoàn tiền\n\n`;
        response += `⚠️ *Lưu ý: Hãy thông báo cho gia sư để đảm bảo quyền lợi cho cả hai bên*\n`;
        return response;
    }

    /**
     * Generate payment help
     */
    generatePaymentHelp() {
        let response = `## 💳 Phương thức thanh toán\n\n`;
        response += `**TutorMis hỗ trợ các hình thức thanh toán:**\n\n`;
        response += `1. Chuyển khoản ngân hàng\n`;
        response += `2. Ví điện tử (MoMo, ZaloPay)\n`;
        response += `3. Thanh toán trực tiếp cho gia sư\n\n`;
        response += `💡 *Thanh toán an toàn, bảo mật với TutorMis*\n`;
        return response;
    }

    /**
     * Generate online teaching info
     */
    generateOnlineTeachingInfo() {
        let response = `## 💻 Dạy học Online\n\n`;
        response += `Có! Gia sư trên TutorMis có thể dạy học online thông qua:\n\n`;
        response += `✓ Video call trực tiếp với WebRTC\n`;
        response += `✓ Chia sẻ màn hình và tài liệu\n`;
        response += `✓ Chat tin nhắn thời gian thực\n`;
        response += `✓ Ghi âm buổi học (nếu cần)\n\n`;
        response += `💡 *Học online tiện lợi, không giới hạn khoảng cách!*\n`;
        return response;
    }

    /**
     * Generate comparison
     */
    generateComparison(query, results) {
        if (results.length < 2) {
            return `## 🔍 Không đủ gia sư để so sánh\n\nVui lòng cung cấp thêm thông tin hoặc chọn gia sư cụ thể.\n`;
        }

        const [tutor1, tutor2] = results.slice(0, 2);
        const name1 = tutor1.user?.name || tutor1.name || 'Gia sư 1';
        const name2 = tutor2.user?.name || tutor2.name || 'Gia sư 2';

        let response = `## 🔍 So sánh gia sư\n\n`;
        response += `| Tiêu chí | ${name1} | ${name2} |\n`;
        response += `|----------|----------|----------|\n`;
        response += `| 💰 Học phí | ${(tutor1.hourlyRate || 0).toLocaleString()}đ/h | ${(tutor2.hourlyRate || 0).toLocaleString()}đ/h |\n`;
        response += `| ⭐ Đánh giá | ${tutor1.rating || 0}/5.0 | ${tutor2.rating || 0}/5.0 |\n`;
        response += `| 🎓 Học vấn | ${tutor1.education?.level || 'N/A'} | ${tutor2.education?.level || 'N/A'} |\n`;
        response += `| ✓ Kinh nghiệm | ${tutor1.yearsOfExperience || 0} năm | ${tutor2.yearsOfExperience || 0} năm |\n\n`;

        const better = (tutor1.rating || 0) > (tutor2.rating || 0) ? tutor1 : tutor2;
        const betterName = better.user?.name || better.name || 'Gia sư';
        response += `### 💡 Khuyến nghị\n\n`;
        response += `**${betterName}** có đánh giá cao hơn và phù hợp hơn.\n\n`;
        response += `[Xem hồ sơ ${name1} →](/pages/student/tutor_profile.html?id=${tutor1._id}) | `;
        response += `[Xem hồ sơ ${name2} →](/pages/student/tutor_profile.html?id=${tutor2._id})\n`;

        return response;
    }

    /**
     * Generate recommendation
     */
    generateRecommendation(results, criteria) {
        if (results.length === 0) {
            return `## ⭐ Gợi ý gia sư\n\nKhông tìm thấy gia sư phù hợp. Vui lòng thử tìm kiếm với tiêu chí khác.\n`;
        }

        const sorted = results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const best = sorted[0];
        const bestName = best.user?.name || best.name || 'Gia sư';

        let response = `## ⭐ Gợi ý gia sư tốt nhất\n\n`;
        response += `Dựa trên đánh giá và kinh nghiệm, tôi gợi ý:\n\n`;
        response += `### 🏆 ${bestName}\n\n`;
        response += `⭐ **Đánh giá xuất sắc**: ${best.rating || 0}/5.0 (${best.totalReviews || 0} đánh giá)\n`;
        response += `🎓 **Trình độ cao**: ${best.education?.level || 'N/A'} ${best.education?.major || ''}\n`;
        response += `✓ **Kinh nghiệm dày dặn**: ${best.yearsOfExperience || 0} năm\n`;
        response += `💰 **Học phí**: ${(best.hourlyRate || 0).toLocaleString()}đ/giờ\n\n`;
        response += `[**Xem hồ sơ và đặt lịch ngay →**](/pages/student/tutor_profile.html?id=${best._id})\n`;

        return response;
    }

    /**
     * Get error response
     */
    getErrorResponse() {
        return `## ❌ Có lỗi xảy ra\n\nXin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.\n\n💡 *Hoặc liên hệ hỗ trợ để được giúp đỡ*`;
    }

    /**
     * Sanitize criteria for metadata
     */
    sanitizeCriteria(criteria) {
        return {
            subjects: criteria.subjects,
            city: criteria.city,
            priceRange: criteria.maxPrice ? `< ${criteria.maxPrice}` : criteria.minPrice ? `> ${criteria.minPrice}` : null,
            gender: criteria.gender,
            queryType: criteria.queryType
        };
    }
}

// Export singleton instance
module.exports = new SmartChatbotService();
