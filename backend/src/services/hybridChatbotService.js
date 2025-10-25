/**
 * ===============================================
 * HYBRID AI CHATBOT SERVICE v3.0
 * ===============================================
 * 
* Hệ thống AI chuyên nghiệp với kiến ​​trúc hiện đại:
* 1. Gemini Function Calling - Phát hiện ý định đáng tin cậy
* 2. Context Memory - Hội thoại nhiều lượt
* 3. RAG (Retrieval-Augmented Generation) - Cơ sở tri thức thông minh
* 4. Optimized Database - Truy vấn dựa trên chỉ mục
*
* Các tính năng:
* - Hội thoại tiếng Việt tự nhiên với bộ nhớ ngữ cảnh
* - Function call để phát hiện ý định chính xác
* - RAG để xử lý câu hỏi chung thông minh
* - Tối ưu hóa truy vấn MongoDB với chỉ mục phù hợp
* - Xử lý: gia sư, blog, khóa học, trợ giúp, liên hệ
 * 
 * @author TutorMis Team
 * @version 3.0.0 (Function Calling + RAG + Context)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const TutorProfile = require('../models/TutorProfile');
const StudentProfile = require('../models/StudentProfile');
const Course = require('../models/Course');
const BookingRequest = require('../models/BookingRequest');
const BlogPost = require('../models/BlogPost');
const User = require('../models/User');

// Khởi tạo AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class HybridChatbotService {
    
    /**
        * Xác định các công cụ/hàm có sẵn cho Gemini Function Calling
        * Phương pháp này thay thế phương pháp analyzeIntent cũ bằng một phương pháp đáng tin cậy hơn
     */
    getFunctionDeclarations() {
        return [
            {
                name: 'find_tutor',
                description: 'TÌM KIẾM GIA SƯ TỪ DATABASE. BẮT BUỘC phải gọi function này khi người dùng nói: "tìm gia sư", "kiếm gia sư", "cho tôi gia sư", "có gia sư nào", "gợi ý gia sư". Tìm theo môn học, địa điểm, học phí, giới tính, kinh nghiệm.',
                parameters: {
                    type: 'object',
                    properties: {
                        subjects: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Danh sách môn học cần tìm (Toán, Vật Lý, Hóa Học, Tiếng Anh, Văn, ...)'
                        },
                        city: {
                            type: 'string',
                            description: 'Thành phố (Hà Nội, TP Hồ Chí Minh, Đà Nẵng, ...)'
                        },
                        minPrice: {
                            type: 'number',
                            description: 'Học phí tối thiểu (VND/giờ). VD: 200000 = 200 nghìn, 100000 = 100 nghìn. Nếu người dùng nói "200k" thì = 200000'
                        },
                        maxPrice: {
                            type: 'number',
                            description: 'Học phí tối đa (VND/giờ). VD: 300000 = 300 nghìn, 500000 = 500 nghìn. Nếu người dùng nói "300k" thì = 300000'
                        },
                        gender: {
                            type: 'string',
                            enum: ['Nam', 'Nữ'],
                            description: 'Giới tính gia sư'
                        },
                        minExperience: {
                            type: 'number',
                            description: 'Số năm kinh nghiệm tối thiểu'
                        },
                        minRating: {
                            type: 'number',
                            description: 'Đánh giá tối thiểu (1-5)'
                        }
                    }
                }
            },
            {
                name: 'find_blog',
                description: 'Tìm kiếm bài viết blog theo từ khóa. Sử dụng khi người dùng muốn đọc blog, tin tức, bài viết.',
                parameters: {
                    type: 'object',
                    properties: {
                        keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Từ khóa tìm kiếm (tuyển dụng, kinh nghiệm, học tập, ...)'
                        },
                        category: {
                            type: 'string',
                            description: 'Danh mục bài viết'
                        }
                    }
                }
            },
            {
                name: 'find_course',
                description: 'Tìm kiếm khóa học theo môn học. Sử dụng khi người dùng muốn tìm khóa học.',
                parameters: {
                    type: 'object',
                    properties: {
                        subjects: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Môn học của khóa học'
                        },
                        city: {
                            type: 'string',
                            description: 'Thành phố'
                        },
                        maxPrice: {
                            type: 'number',
                            description: 'Học phí tối đa (VND). VD: 300000 = 300 nghìn, 1000000 = 1 triệu. "300k" = 300000'
                        }
                    }
                }
            },
            {
                name: 'get_help',
                description: 'Cung cấp hướng dẫn về các tính năng của nền tảng. Sử dụng khi người dùng hỏi về cách đặt lịch, thanh toán, hủy lịch, liên hệ admin, hoặc thông tin nền tảng.',
                parameters: {
                    type: 'object',
                    properties: {
                        helpType: {
                            type: 'string',
                            enum: ['booking', 'payment', 'cancellation', 'contact', 'platform_info', 'become_tutor', 'online_teaching', 'registration'],
                            description: 'Loại hướng dẫn cần thiết'
                        }
                    },
                    required: ['helpType']
                }
            }
        ];
    }

    /**
     * Xử lý cuộc trò chuyện AI với kiến trúc Hybrid
     * @param {string} query - Câu hỏi của người dùng
     * @param {string} userId - ID người dùng để cá nhân hóa
     * @param {string} userRole - Vai trò người dùng (học sinh/gia sư/admin)
     * @param {Array} chatHistory - Lịch sử trò chuyện để ghi nhớ ngữ cảnh
     */
    async chat(query, userId, userRole, chatHistory = []) {
        try {
            console.log('[Hybrid AI v3.0] Processing query:', query.substring(0, 100));

            // Bước 1: Lấy ngữ cảnh hệ thống
            const systemContext = await this.getSystemContext(userId, userRole);

            // Bước 2: Sử dụng Function Calling để phát hiện ý định một cách đáng tin cậy
            const functionCallResult = await this.detectIntentWithFunctionCalling(query, chatHistory, systemContext);

            // Bước 3: Thực hiện xử lý phù hợp dựa trên cuộc gọi hàm
            let response = '';
            let metadata = {};

            if (functionCallResult.functionCall) {
                const funcName = functionCallResult.functionCall.name;
                const funcArgs = functionCallResult.functionCall.args;

                console.log('[Function Call]', funcName, funcArgs);

                switch (funcName) {
                    case 'find_tutor':
                        const tutorResult = await this.handleFindTutor(funcArgs, systemContext);
                        response = tutorResult.response;
                        metadata = tutorResult.metadata;
                        break;

                    case 'find_blog':
                        const blogResult = await this.handleFindBlog(funcArgs);
                        response = blogResult.response;
                        metadata = blogResult.metadata;
                        break;

                    case 'find_course':
                        const courseResult = await this.handleFindCourse(funcArgs);
                        response = courseResult.response;
                        metadata = courseResult.metadata;
                        break;

                    case 'get_help':
                        response = this.handleGetHelp(funcArgs.helpType, systemContext);
                        metadata = { queryType: funcArgs.helpType };
                        break;

                    default:
                        response = await this.handleGeneralQuestionWithRAG(query, chatHistory, systemContext);
                        metadata = { queryType: 'general_question' };
                }

                metadata.functionCall = funcName;
            } else {
                // Không có cuộc gọi hàm - xử lý câu hỏi chung với RAG
                console.log('Không có cuộc gọi hàm - xử lý câu hỏi chung với RAG');
                response = await this.handleGeneralQuestionWithRAG(query, chatHistory, systemContext);
                metadata = { queryType: 'general_question_rag' };
            }

            return {
                success: true,
                response,
                metadata: {
                    ...metadata,
                    model: 'gemini-2.5-flash'
                }
            };

        } catch (error) {
            console.error('Lỗi:', error);
            return {
                success: false,
                response: this.getErrorResponse(),
                metadata: { error: error.message }
            };
        }
    }

    /**
        * Sử dụng Gemini Function Calling để phát hiện ý định một cách đáng tin cậy
        * Phương thức này thay thế phương thức analyzeIntent cũ dùng để phân tích cú pháp văn bản JSON
     */
    async detectIntentWithFunctionCalling(query, chatHistory, systemContext) {
        try {
            if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 20) {
                console.log('[Function Calling] No API key, using fallback');
                return { functionCall: null };
            }

            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                tools: [{ functionDeclarations: this.getFunctionDeclarations() }],
                toolConfig: {
                    functionCallingConfig: {
                        mode: 'ANY',
                        allowedFunctionNames: ['find_tutor', 'find_blog', 'find_course', 'get_help']
                    }
                }
            });

            // Xây dựng lịch sử cuộc trò chuyện với ngữ cảnh
            const history = this.buildConversationHistory(chatHistory, systemContext);

            // Khởi tạo cuộc trò chuyện
            const chat = model.startChat({ history });

            // Gửi truy vấn của người dùng
            const result = await chat.sendMessage(query);
            const response = result.response;

            // Kiểm tra xem AI có muốn gọi hàm không
            const functionCalls = response.functionCalls();
            
            console.log('Kiểu phản hồi của AI:', functionCalls ? 'FUNCTION_CALL' : 'TEXT');

            if (functionCalls && functionCalls.length > 0) {
                // Trả về cuộc gọi hàm đầu tiên
                return {
                    functionCall: {
                        name: functionCalls[0].name,
                        args: functionCalls[0].args
                    }
                };
            }

            // Không có cuộc gọi hàm - AI sẽ xử lý với cuộc trò chuyện chung
            return { functionCall: null, textResponse: response.text() };

        } catch (error) {
            console.error('Lỗi:', error);
            return { functionCall: null };
        }
    }

    /**
        * Xây dựng lịch sử hội thoại để ghi nhớ ngữ cảnh
        * Điều này cho phép chatbot hiểu các câu hỏi tiếp theo
     */
    buildConversationHistory(chatHistory, systemContext) {
        const history = [
            {
                role: 'user',
                parts: [{
                    text: `Bạn là trợ lý AI của TutorMis - nền tảng kết nối học sinh và gia sư.

**Thông tin hệ thống:**
- Tổng số gia sư: ${systemContext.totalTutors}
- Tổng số học sinh: ${systemContext.totalStudents}
- Tổng số khóa học: ${systemContext.totalCourses}

**Vai trò của bạn:**
- Hỗ trợ người dùng tìm gia sư, blog, khóa học
- Trả lời câu hỏi về tính năng và quy trình
- Hiểu ngữ cảnh và xử lý câu hỏi nối tiếp

**QUAN TRỌNG - Sử dụng Functions:**
KHI NGƯỜI DÙNG YÊU CẦU:
- "Tìm gia sư" → GỌI find_tutor
- "Tìm blog" / "bài viết" → GỌI find_blog  
- "Tìm khóa học" → GỌI find_course
- "Liên hệ" / "đặt lịch" / "thanh toán" → GỌI get_help

Hãy thân thiện, chuyên nghiệp và ƯU TIÊN GỌI FUNCTION!`
                }]
            },
            {
                role: 'model',
                parts: [{
                    text: 'Xin chào! Tôi là trợ lý AI của TutorMis. Tôi sẵn sàng giúp bạn tìm gia sư, khóa học, blog hoặc trả lời các câu hỏi về nền tảng. Bạn cần hỗ trợ gì?'
                }]
            }
        ];

        // thêm lịch sử trò chuyện gần đây
        if (chatHistory && chatHistory.length > 0) {
            const recentHistory = chatHistory.slice(-6);
            recentHistory.forEach(msg => {
                history.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
        }

        return history;
    }

    /**
        * Xử lý lệnh gọi hàm get_help
        * Trình xử lý thống nhất cho tất cả các yêu cầu liên quan đến trợ giúp
     */
    handleGetHelp(helpType, systemContext) {
        switch (helpType) {
            case 'booking':
                return this.generateBookingHelp();
            case 'payment':
                return this.generatePaymentHelp();
            case 'cancellation':
                return this.generateCancellationHelp();
            case 'contact':
                return this.generateContactAdmin();
            case 'platform_info':
                return this.generatePlatformInfoSync(systemContext);
            case 'become_tutor':
                return this.generateBecomeTutorHelp();
            case 'online_teaching':
                return this.generateOnlineTeachingHelp();
            case 'registration':
                return this.generateRegistrationHelp();
            default:
                return this.getGeneralFallback();
        }
    }

    /**
     * Handle find tutor request - OPTIMIZED VERSION
     * Parameters are already extracted by Function Calling
     * Uses normalized lowercase for city matching (requires data normalization)
     * NOTE: For best performance, ensure the following indexes exist:
     * - db.tutorprofiles.createIndex({ "address.cityLower": 1 })
     * - db.tutorprofiles.createIndex({ "subjects.subjectLower": 1 })
     * - db.tutorprofiles.createIndex({ hourlyRate: 1 })
     * - db.tutorprofiles.createIndex({ averageRating: -1, totalReviews: -1 })
     */
    async handleFindTutor(criteria, systemContext) {
        try {
            console.log('[Find Tutor] Tìm gia sư với tiêu chí:', JSON.stringify(criteria));
            
            // Xây dựng truy vấn User cơ bản
            const userQuery = { 
                role: 'tutor',
                approvalStatus: 'approved',
                isActive: true
            };
            
            // Xây dựng truy vấn TutorProfile
            const profileQuery = {};
            
            // Tìm theo môn học - sử dụng trường đã chuẩn hóa
            if (criteria.subjects && criteria.subjects.length > 0) {
                // Sử dụng regex cho việc khớp linh hoạt trên trường 'subjects.subject' đã tồn tại
                const subjectRegexes = criteria.subjects.map(s => new RegExp(s, 'i'));
                profileQuery['subjects.subject'] = { $in: subjectRegexes };
                console.log('[Find Tutor] Tìm kiếm theo môn học:', criteria.subjects);
            }
            
            // Tìm theo thành phố - sử dụng cấu trúc trường ACTUAL
            if (criteria.city) {
                // Sử dụng regex trên trường 'address.city' đã tồn tại
                profileQuery['address.city'] = new RegExp(criteria.city, 'i');
                console.log('[Find Tutor] Tìm kiếm theo thành phố:', criteria.city);
            }
            
            // Price range query
            if (criteria.minPrice || criteria.maxPrice) {
                profileQuery.hourlyRate = {};
                if (criteria.minPrice) profileQuery.hourlyRate.$gte = criteria.minPrice;
                if (criteria.maxPrice) profileQuery.hourlyRate.$lte = criteria.maxPrice;
                console.log('[Find Tutor] Khoảng giá:', profileQuery.hourlyRate);
            }
            
            if (criteria.gender) {
                profileQuery.gender = criteria.gender;
            }
            
            if (criteria.minExperience) {
                profileQuery.yearsOfExperience = { $gte: criteria.minExperience };
            }
            
            if (criteria.minRating) {
                profileQuery.averageRating = { $gte: criteria.minRating };
            }

            // Thực thi truy vấn với aggregate để kết hợp User và TutorProfile
            console.log('[Find Tutor] Thực thi truy vấn:', JSON.stringify({ userQuery, profileQuery }));
            
            const tutors = await User.aggregate([
                { $match: userQuery },
                {
                    $lookup: {
                        from: 'tutorprofiles',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'profile',
                        pipeline: [
                            { $match: profileQuery }
                        ]
                    }
                },
                { $match: { 'profile.0': { $exists: true } } }, 
                {
                    $lookup: {
                        from: 'tutorprofiles',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'profile'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        email: 1,
                        'profile._id': 1,
                        'profile.fullName': 1,
                        'profile.phone': 1,
                        'profile.avatar': 1,
                        'profile.address': 1,
                        'profile.subjects': 1,
                        'profile.hourlyRate': 1,
                        'profile.averageRating': 1,
                        'profile.totalReviews': 1,
                        'profile.yearsOfExperience': 1,
                        'profile.isVerified': 1
                    }
                },
                { $sort: { 'profile.averageRating': -1, 'profile.totalReviews': -1 } },
                { $limit: 10 }
            ]);

            console.log(`[Find Tutor] Tìm thấy ${tutors.length} gia sư từ CSDL`);
            if (tutors.length > 0) {
                console.log('[Find Tutor] Gia sư mẫu:', {
                    name: tutors[0].name,
                    city: tutors[0].profile?.[0]?.address?.city,
                    subjects: tutors[0].profile?.[0]?.subjects?.map(s => s.subject)
                });
            }

            // Generate response
            const response = this.generateTutorSearchResponse(tutors, criteria, systemContext);
            
            return {
                response,
                metadata: {
                    tutorsFound: tutors.length,
                    queryType: 'find_tutor',
                    criteria
                }
            };

        } catch (error) {
            console.error('[Find Tutor Lỗi]', error);
            return {
                response: this.getTutorSearchError(),
                metadata: { error: error.message }
            };
        }
    }

    /**
        * Chuẩn hóa chuỗi cho các truy vấn cơ sở dữ liệu
        * Chuyển đổi thành chữ thường và loại bỏ dấu tiếng Việt để khớp nhất quán
     */
    normalizeForDb(text) {
        if (!text) return '';

        // Chuyển đổi thành chữ thường và loại bỏ dấu
        let normalized = text.toLowerCase().trim();
        
        // Map common variations
        const cityMap = {
            'hà nội': 'ha noi',
            'tp hồ chí minh': 'tp ho chi minh',
            'hồ chí minh': 'ho chi minh',
            'sài gòn': 'sai gon',
            'đà nẵng': 'da nang'
        };
        
        if (cityMap[normalized]) {
            normalized = cityMap[normalized];
        }
        
        return normalized;
    }

    /**
     * Handle find blog request - OPTIMIZED WITH TEXT SEARCH
     * Parameters are already extracted by Function Calling
     * 
     * IMPORTANT: For MongoDB Text Search to work, you MUST create a text index first:
     * 
     * Run this in MongoDB shell or through your application:
     * db.blogposts.createIndex(
     *   { 
     *     title: "text", 
     *     content: "text", 
     *     category: "text" 
     *   },
     *   {
     *     weights: {
     *       title: 10,      // Title matches are more important
     *       category: 5,     // Category is moderately important
     *       content: 1       // Content is least important
     *     },
     *     name: "blog_text_search"
     *   }
     * );
     */
    async handleFindBlog(criteria) {
        try {
            console.log('[Find Blog] Tìm kiếm với tiêu chí:', JSON.stringify(criteria));
            const dbQuery = { status: 'approved' };
            
            if (criteria.keywords && criteria.keywords.length > 0) {
                const searchText = criteria.keywords.join(' ');
                console.log('[Find Blog] Tìm kiếm từ khóa:', searchText);
                
                // Cố gắng sử dụng text search trước
                let blogs = [];
                try {
                    dbQuery.$text = { $search: searchText };
                    const projection = { score: { $meta: 'textScore' } };
                    
                    blogs = await BlogPost.find(dbQuery, projection)
                        .populate({
                            path: 'author',
                            select: 'name email role',
                            populate: {
                                path: 'profile',
                                select: 'fullName'
                            }
                        })
                        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                        .limit(10)
                        .lean();

                    console.log(`[Find Blog]  Tìm thấy ${blogs.length} blog bằng TEXT SEARCH`);
                } catch (textSearchError) {
                    console.log('[Find Blog] Không tìm thấy chỉ mục văn bản, sử dụng REGEX fallback');

                    delete dbQuery.$text;
                    
                    dbQuery.$or = criteria.keywords.map(kw => ({
                        $or: [
                            { title: new RegExp(kw, 'i') },
                            { content: new RegExp(kw, 'i') },
                            { category: new RegExp(kw, 'i') }
                        ]
                    }));
                    
                    blogs = await BlogPost.find(dbQuery)
                        .populate({
                            path: 'author',
                            select: 'name email role',
                            populate: {
                                path: 'profile',
                                select: 'fullName'
                            }
                        })
                        .sort({ createdAt: -1 })
                        .limit(10)
                        .lean();

                    console.log(`[Find Blog] Tìm thấy ${blogs.length} blog bằng REGEX`);
                }
                
                const response = this.generateBlogSearchResponse(blogs, criteria);
                
                return {
                    response,
                    metadata: {
                        blogsFound: blogs.length,
                        queryType: 'find_blog',
                        searchMethod: blogs.length > 0 ? 'keyword_search' : 'none'
                    }
                };
            } else {
                // No keywords - return recent blogs
                console.log('[Find Blog] No keywords, returning recent blogs');
                const blogs = await BlogPost.find(dbQuery)
                    .populate({
                        path: 'author',
                        select: 'name email role',
                        populate: {
                            path: 'profile',
                            select: 'fullName'
                        }
                    })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .lean();

                console.log(`[Find Blog]  Tìm thấy ${blogs.length} blog gần đây từ DATABASE`);

                const response = this.generateBlogSearchResponse(blogs, criteria);
                
                return {
                    response,
                    metadata: {
                        blogsFound: blogs.length,
                        queryType: 'find_blog',
                        searchMethod: 'recent'
                    }
                };
            }

        } catch (error) {
            console.error('[Find Blog Error]', error);
            
            // Nếu lỗi liên quan đến chỉ mục văn bản, cảnh báo người phát triển
            if (error.message.includes('text index')) {
                console.error('[TEXT INDEX MISSING] Bạn cần tạo chỉ mục văn bản cho bộ sưu tập blogposts để sử dụng tìm kiếm văn bản.');
                console.error('Run: db.blogposts.createIndex({ title: "text", content: "text", category: "text" })');
            }
            
            return {
                response: this.getBlogSearchError(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Handle find course request - OPTIMIZED VERSION
     * Parameters are already extracted by Function Calling
     * 
     * NOTE: For best performance, ensure index:
     * - db.courses.createIndex({ subjectLower: 1 })
     * - db.courses.createIndex({ price: 1 })
     */
    async handleFindCourse(criteria) {
        try {
            console.log('[Find Course] Tìm kiếm với tiêu chí:', JSON.stringify(criteria));
            const dbQuery = {};
            
            if (criteria.subjects && criteria.subjects.length > 0) {
                const subjectRegexes = criteria.subjects.map(s => new RegExp(s, 'i'));
                dbQuery.subject = { $in: subjectRegexes };
                console.log('[Find Course] Tìm kiếm theo chủ đề:', criteria.subjects);
            }
            
            // Price filter
            if (criteria.maxPrice) {
                dbQuery.price = { $lte: criteria.maxPrice };
                console.log('[Find Course] Giá tối đa:', criteria.maxPrice);
            }

            const courses = await Course.find(dbQuery)
                .populate('tutor', 'name')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            console.log(`[Find Course] Tìm thấy ${courses.length} khóa học từ DATABASE`);
            if (courses.length > 0) {
                console.log('[Find Course] Khóa học mẫu:', {
                    title: courses[0].title,
                    subject: courses[0].subject
                });
            }

            const response = this.generateCourseSearchResponse(courses, criteria);
            
            return {
                response,
                metadata: {
                    coursesFound: courses.length,
                    queryType: 'find_course'
                }
            };

        } catch (error) {
            console.error('[Find Course Lỗi]', error);
            return {
                response: this.getCourseSearchError(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Handle general question with RAG (Retrieval-Augmented Generation)
     * 
     * RAG Process:
     * 1. RETRIEVE: Search knowledge base for relevant information
     * 2. AUGMENT: Create enriched prompt with retrieved context
     * 3. GENERATE: Let AI generate natural response based on context
     * 
     * This provides more accurate and grounded responses than pure generation
     */
    async handleGeneralQuestionWithRAG(query, chatHistory, systemContext) {
        try {
            // Bước 1: RETRIEVE - Tìm kiếm kiến thức liên quan
            console.log('[RAG] Bước 1: Tìm kiếm kiến thức liên quan...');
            const retrievedKnowledge = await this.retrieveRelevantKnowledge(query);
            
            if (!retrievedKnowledge || retrievedKnowledge.length === 0) {
                console.log('[RAG] Không tìm thấy kiến thức liên quan, sử dụng fallback chung');
                return this.getGeneralFallback();
            }

            // Bước 2: AUGMENT - Tạo prompt phong phú với ngữ cảnh
            console.log('[RAG] Bước 2: Tạo prompt phong phú với ngữ cảnh...');
            const augmentedPrompt = this.buildRAGPrompt(query, retrievedKnowledge, systemContext);

            // Bước 3: GENERATE - Sử dụng AI để tạo phản hồi theo ngữ cảnh
            console.log('[RAG] Bước 3: Tạo phản hồi AI...');
            
            if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 20) {
                // Không có API key - trả về kiến thức đầu tiên làm phản hồi
                console.log('[RAG] Không có API key, sử dụng kiến thức đầu tiên làm phản hồi');
                return retrievedKnowledge[0].content;
            }

                        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            
            // Xây dựng lịch sử cuộc trò chuyện với ngữ cảnh
            const history = this.buildConversationHistory(chatHistory, systemContext);
            const chat = model.startChat({ history });

            // Generate response with retrieved context
            const result = await chat.sendMessage(augmentedPrompt);
            const response = result.response.text();

            console.log('[RAG] Phản hồi được tạo thành công');
            return response;

        } catch (error) {
            console.error('[RAG Lỗi]', error);
            return this.getGeneralFallback();
        }
    }

    /**
     * RETRIEVE: Search knowledge base for relevant information
     * Returns array of knowledge items sorted by relevance
     */
    async retrieveRelevantKnowledge(query) {
        const knowledge = [];
        const queryLower = query.toLowerCase();

        // Knowledge base with semantic categories
        const knowledgeBase = [
            {
                id: 'become_tutor',
                keywords: ['làm sao', 'cách', 'thế nào', 'trở thành', 'đăng ký', 'register', 'gia sư', 'tutor'],
                category: 'registration',
                relevance: 0,
                content: this.generateBecomeTutorHelp()
            },
            {
                id: 'online_teaching',
                keywords: ['online', 'trực tuyến', 'video', 'dạy', 'teach', 'call'],
                category: 'features',
                relevance: 0,
                content: this.generateOnlineTeachingHelp()
            },
            {
                id: 'student_registration',
                keywords: ['đăng ký', 'register', 'sign up', 'học sinh', 'student', 'tài khoản'],
                category: 'registration',
                relevance: 0,
                content: this.generateRegistrationHelp()
            },
            {
                id: 'booking_help',
                keywords: ['đặt lịch', 'booking', 'schedule', 'lịch học', 'làm sao', 'cách'],
                category: 'help',
                relevance: 0,
                content: this.generateBookingHelp()
            },
            {
                id: 'payment_help',
                keywords: ['thanh toán', 'payment', 'pay', 'chuyển khoản', 'tiền'],
                category: 'help',
                relevance: 0,
                content: this.generatePaymentHelp()
            },
            {
                id: 'cancellation_help',
                keywords: ['hủy', 'cancel', 'hoàn tiền', 'refund'],
                category: 'help',
                relevance: 0,
                content: this.generateCancellationHelp()
            },
            {
                id: 'contact_admin',
                keywords: ['liên hệ', 'admin', 'hỗ trợ', 'support', 'contact', 'help'],
                category: 'contact',
                relevance: 0,
                content: this.generateContactAdmin()
            },
            {
                id: 'platform_info',
                keywords: ['tutormis', 'là gì', 'nền tảng', 'hoạt động', 'giới thiệu', 'about'],
                category: 'about',
                relevance: 0,
                content: this.generatePlatformInfoSync({ 
                    totalTutors: await TutorProfile.countDocuments({ isApproved: true }),
                    totalStudents: await StudentProfile.countDocuments(),
                    totalCourses: await Course.countDocuments()
                })
            }
        ];

        // Tính điểm liên quan dựa trên từ khóa
        knowledgeBase.forEach(item => {
            let score = 0;
            item.keywords.forEach(keyword => {
                if (queryLower.includes(keyword)) {
                    score += 1;
                }
            });
            item.relevance = score;
        });

        // Lọc và sắp xếp theo điểm liên quan
        const sortedKnowledge = knowledgeBase
            .filter(item => item.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3); // Top 3 most relevant

        console.log(`[RAG Retrieve] Tìm thấy ${sortedKnowledge.length} mục kiến thức liên quan`);
        return sortedKnowledge;
    }

    /**
     * AUGMENT: Xây dựng lời nhắc được làm giàu với ngữ cảnh đã lấy được
     */
    buildRAGPrompt(query, retrievedKnowledge, systemContext) {
        let prompt = `Bạn là trợ lý AI của TutorMis. Dựa vào thông tin sau để trả lời câu hỏi của người dùng.\n\n`;
        
        prompt += `**Thông tin hệ thống:**\n`;
        prompt += `- Tổng số gia sư: ${systemContext.totalTutors}\n`;
        prompt += `- Tổng số học sinh: ${systemContext.totalStudents}\n`;
        prompt += `- Tổng số khóa học: ${systemContext.totalCourses}\n\n`;
        
        prompt += `**Thông tin tham khảo từ knowledge base:**\n\n`;
        
        retrievedKnowledge.forEach((item, idx) => {
            prompt += `### Nguồn ${idx + 1}: ${item.category}\n`;
            prompt += `${item.content}\n\n`;
            prompt += `---\n\n`;
        });
        
        prompt += `**Câu hỏi của người dùng:** ${query}\n\n`;
        prompt += `**Hướng dẫn:**\n`;
        prompt += `- Dựa vào thông tin tham khảo ở trên để trả lời\n`;
        prompt += `- Trả lời ngắn gọn, tự nhiên, thân thiện\n`;
        prompt += `- Sử dụng markdown format\n`;
        prompt += `- Nếu thông tin không đầy đủ, hãy đề xuất người dùng liên hệ admin\n`;
        
        return prompt;
    }

    /**
     * Tạo nội dung trợ giúp về cách trở thành gia sư
     */
    generateBecomeTutorHelp() {
        return `## 🎓 Cách trở thành gia sư trên TutorMis

**Quy trình đăng ký:**

### 1️⃣ Đăng ký tài khoản
- Truy cập TutorMis
- Click "Đăng ký" → Chọn "Gia sư"
- Điền email, mật khẩu

### 2️⃣ Hoàn thiện hồ sơ
📚 **Học vấn**:
- Trường đại học/cao đẳng
- Bằng cấp, chứng chỉ
- GPA/Thành tích

👨‍🏫 **Kinh nghiệm**:
- Số năm dạy học
- Nơi đã làm việc
- Thành tích nổi bật

📖 **Môn dạy**:
- Chọn môn (Toán, Lý, Hóa, Anh, Văn...)
- Cấp độ (Tiểu học, THCS, THPT)
- Đặt học phí (đồng/giờ)

⏰ **Lịch rảnh**:
- Chọn thời gian có thể dạy
- Linh hoạt theo lịch

### 3️⃣ Upload giấy tờ
- CMND/CCCD
- Bằng cấp/Chứng chỉ
- Ảnh đại diện

### 4️⃣ Chờ phê duyệt
- Admin duyệt trong 24-48h
- Nhận email xác nhận

### 5️⃣ Bắt đầu nhận học sinh
- Profile hiển thị trên trang tìm kiếm
- Nhận yêu cầu từ học sinh
- Bắt đầu kiếm tiền!

**Yêu cầu:**
✓ Tốt nghiệp đại học/cao đẳng
✓ Kiến thức vững về môn dạy
✓ Có thiết bị dạy online (laptop, webcam, mic)

💡 *Sau khi được duyệt, bạn có thể nhận học sinh ngay!*`;
    }

    /**
     * Generate help content for online teaching
     */
    generateOnlineTeachingHelp() {
        return `## 💻 Dạy học Online trên TutorMis

**Có! Gia sư có thể dạy học online thông qua:**

### 🎥 Video Call WebRTC
- Chất lượng HD
- Không cần cài đặt phần mềm
- Tích hợp ngay trên website

### 📱 Tính năng:
✓ Video call 1-1 với học sinh
✓ Chia sẻ màn hình
✓ Chat trong cuộc gọi
✓ Ghi âm buổi học (nếu cần)

### 📚 Cách dạy online:
1. Học sinh đặt lịch học online
2. Gia sư chấp nhận yêu cầu
3. Đến giờ học, click "Bắt đầu Video Call"
4. Dạy học qua video call
5. Kết thúc và nhận đánh giá

💡 *Dạy online tiện lợi, không giới hạn khoảng cách!*`;
    }

    /**
     * Generate registration help content
     */
    generateRegistrationHelp() {
        return `## � Đăng ký tài khoản TutorMis

**Chọn loại tài khoản:**
- **Học sinh**: Tìm gia sư, đặt lịch học
- **Gia sư**: Dạy học, nhận thu nhập

**Quy trình đăng ký Học sinh:**
1. Click "Đăng ký" trên trang chủ
2. Chọn "Học sinh"
3. Điền thông tin: Họ tên, Email, SĐT, Mật khẩu
4. Xác nhận email
5. Hoàn thiện hồ sơ
6. Bắt đầu tìm gia sư!

**Quy trình đăng ký Gia sư:**
1. Click "Đăng ký" → Chọn "Gia sư"
2. Điền thông tin cơ bản
3. Upload hồ sơ và giấy tờ
4. Chờ admin phê duyệt (24-48h)
5. Bắt đầu nhận học sinh!

💡 *Hoàn toàn miễn phí cho học sinh!*

[Đăng ký ngay →](/pages/auth/register.html)`;
    }

    /**
     * Tạo nội dung giới thiệu về nền tảng TutorMis
     */
    generatePlatformInfoSync(systemContext) {
        return `## 🎓 Giới thiệu TutorMis

**TutorMis** là nền tảng kết nối học sinh và gia sư hàng đầu Việt Nam.

**Số liệu:**
- 👨‍🏫 ${systemContext.totalTutors} gia sư chất lượng
- 👨‍🎓 ${systemContext.totalStudents} học sinh
- 📚 ${systemContext.totalCourses} khóa học

**Tính năng:**
✓ Tìm gia sư theo môn học, khu vực, học phí
✓ Đặt lịch học online/offline
✓ Video call tích hợp WebRTC
✓ Tin nhắn thời gian thực
✓ Thanh toán linh hoạt
✓ Đánh giá và phản hồi

[Tìm hiểu thêm →](/pages/about.html)`;
    }

    /**
     * Tạo phản hồi tìm kiếm gia sư
     */
    generateTutorSearchResponse(tutors, criteria, systemContext) {
        if (tutors.length === 0) {
            return this.generateNoTutorsResponse(criteria, systemContext);
        }

        let response = `## 📚 Kết quả tìm kiếm gia sư\n\n`;
        response += `Tôi tìm thấy **${tutors.length} gia sư** phù hợp với yêu cầu của bạn:\n\n`;

        tutors.forEach((tutor, idx) => {
            const tutorName = tutor.name || tutor.profile?.[0]?.fullName || 'Gia sư';
            const profile = tutor.profile?.[0] || {};
            const avatarUrl = profile.avatar ? `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/avatars/${profile.avatar}` : null;
            
            response += `### ${idx + 1}. ${tutorName}\n\n`;
            
            
            response += `📍 **Địa điểm**: ${profile.address?.city || 'Không rõ'}${profile.address?.district ? ', ' + profile.address.district : ''}\n`;
            response += `📖 **Môn dạy**: ${profile.subjects?.map(s => s.subject).join(', ') || 'Không rõ'}\n`;
            response += `💰 **Học phí**: ${profile.hourlyRate?.toLocaleString() || '0'}đ/giờ\n`;
            response += `⭐ **Đánh giá**: ${profile.averageRating || 0}/5.0 (${profile.totalReviews || 0} đánh giá)\n`;
            response += `✓ **Kinh nghiệm**: ${profile.yearsOfExperience || 0} năm\n`;
            if (profile.isVerified) response += `✅ **Đã xác thực**\n`;
            response += `\n[**Xem hồ sơ chi tiết →**](/pages/student/tutor_profile.html?id=${tutor._id})\n\n`;
            response += `---\n\n`;
        });

        response += `💡 *Có ${systemContext.totalTutors} gia sư đang hoạt động trên TutorMis*\n`;
        return response;
    }

    /**
     * Tạo phản hồi khi không tìm thấy gia sư
     */
    generateNoTutorsResponse(criteria, systemContext) {
        let response = `## 🔍 Không tìm thấy gia sư phù hợp\n\n`;
        response += `Rất tiếc, tôi không tìm thấy gia sư với các tiêu chí:\n\n`;
        
        if (criteria.subjects && criteria.subjects.length > 0) {
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
     * Tạo phản hồi tìm kiếm blog
     */
    generateBlogSearchResponse(blogs, criteria) {
        if (blogs.length === 0) {
            return `## 📝 Không tìm thấy bài viết\n\nKhông có bài viết phù hợp với từ khóa của bạn. Hãy thử tìm kiếm với từ khóa khác.\n\n[Xem tất cả bài viết →](/pages/blog.html)`;
        }

        let response = `## 📝 Bài viết phù hợp\n\n`;
        response += `Tìm thấy **${blogs.length} bài viết** liên quan:\n\n`;

        blogs.forEach((blog, idx) => {
            const title = blog.title || 'Bài viết không có tiêu đề';
            response += `### ${idx + 1}. ${title}\n\n`;
            response += `📂 **Danh mục**: ${this.getCategoryNameInVietnamese(blog.category)}\n`;
            response += `👤 **Tác giả**: ${blog.author?.profile?.fullName || blog.author?.name || blog.author?.email || 'TutorMis'}\n`;
            response += `📅 **Ngày đăng**: ${new Date(blog.createdAt).toLocaleDateString('vi-VN')}\n`;
            if (blog.excerpt) {
                response += `📄 **Tóm tắt**: ${blog.excerpt.substring(0, 100)}...\n`;
            }
            response += `\n[**Đọc bài viết →**](/pages/student/blog-detail.html?id=${blog._id})\n\n`; 
            response += `---\n\n`;
        });

        return response;
    }

    /**
     * Tạo phản hồi tìm kiếm khóa học
     */
    generateCourseSearchResponse(courses, criteria) {
        if (courses.length === 0) {
            return `## 📚 Không tìm thấy khóa học\n\nKhông có khóa học phù hợp. Hãy thử tìm kiếm với tiêu chí khác.\n\n[Xem tất cả khóa học →](/pages/course.html)`;
        }

        let response = `## 📚 Khóa học phù hợp\n\n`;
        response += `Tìm thấy **${courses.length} khóa học** liên quan:\n\n`;

        courses.forEach((course, idx) => {
            response += `### ${idx + 1}. ${course.title}\n\n`;
            response += `📖 **Môn**: ${course.subject}\n`;
            response += `👨‍🏫 **Giảng viên**: ${course.tutor?.name || 'TutorMis'}\n`;
            if (course.price) {
                response += `💰 **Học phí**: ${course.price.toLocaleString()}đ\n`;
            }
            if (course.description) {
                response += `📝 **Mô tả**: ${course.description.substring(0, 100)}...\n`;
            }
            response += `\n[**Xem chi tiết →**](/pages/course-detail.html?id=${course._id})\n\n`;
            response += `---\n\n`;
        });

        return response;
    }

    /**
     * Tạo nội dung trợ giúp đặt lịch học
     */
    generateBookingHelp() {
        return `## 📅 Hướng dẫn đặt lịch học\n\n**Quy trình đặt lịch:**\n\n1. Tìm và chọn gia sư phù hợp\n2. Click nút "Gửi Yêu Cầu"\n3. Điền thông tin: môn học, thời gian, địa điểm\n4. Gửi yêu cầu và chờ gia sư xác nhận\n5. Nhận thông báo khi được chấp nhận\n6. Thanh toán và bắt đầu học\n\n💡 *Theo dõi trạng thái trong mục "Yêu Cầu Gia Sư"*`;
    }

    /**
     * Tạo nội dung trợ giúp thanh toán
     */
    generatePaymentHelp() {
        return `## 💳 Phương thức thanh toán\n\n**TutorMis hỗ trợ:**\n\n💳 **Chuyển khoản ngân hàng**\n📱 **Ví điện tử**: MoMo, ZaloPay, VNPay\n💵 **Thanh toán trực tiếp** cho gia sư\n\n**Chính sách:**\n- Thanh toán an toàn, bảo mật\n- Linh hoạt theo thỏa thuận\n- Hoàn tiền nếu hủy đúng quy định`;
    }

    /**
     * Tạo nội dung trợ giúp hủy lịch học
     */
    generateCancellationHelp() {
        return `## ❌ Hướng dẫn hủy lịch học\n\n**Cách hủy:**\n1. Vào mục "Khóa Học"\n2. Chọn lịch cần hủy\n3. Click "Hủy Lịch"\n4. Chọn lý do và xác nhận\n\n**Chính sách hoàn tiền:**\n✓ Hủy trước 24 giờ: Hoàn 100%\n✓ Hủy trong 24 giờ: Hoàn 50%\n✓ Hủy trong 6 giờ: Không hoàn tiền`;
    }

    /**
     * Tạo nội dung liên hệ admin
     */
    generateContactAdmin() {
        return `## 📞 Liên hệ Admin\n\n**Cách liên hệ:**\n\n📧 **Email**: support@tutormis.com\n📱 **Hotline**: 033 7982 569 (8:00 - 22:00)\n💬 **Chat**: Click icon Liên hệ ở menu bên trái màn hình 📞\n📍 **Văn phòng**: 60 Nguyễn Đỗ Cung, Hòa Minh, Liên Chiểu, Đà Nẵng\n\n**Thời gian hỗ trợ:**\n- Thứ 2 - Thứ 6: 8:00 - 22:00\n- Thứ 7 - CN: 9:00 - 18:00\n\n💡 *Admin sẽ phản hồi trong vòng 24 giờ*`;
    }

    /**
     * Tạo nội dung giới thiệu về nền tảng TutorMis
     */
    async generatePlatformInfo(systemContext) {
        return `## 🎓 Giới thiệu TutorMis\n\n**TutorMis** là nền tảng kết nối học sinh và gia sư hàng đầu Việt Nam.\n\n**Số liệu:**\n- 👨‍🏫 ${systemContext.totalTutors} gia sư chất lượng\n- 👨‍🎓 ${systemContext.totalStudents} học sinh\n- 📚 ${systemContext.totalCourses} khóa học\n\n**Tính năng:**\n✓ Tìm gia sư theo môn học, khu vực, học phí\n✓ Đặt lịch học online/offline\n✓ Video call tích hợp WebRTC\n✓ Tin nhắn thời gian thực\n✓ Thanh toán linh hoạt\n✓ Đánh giá và phản hồi\n\n[Tìm hiểu thêm →](/pages/about.html)`;
    }

    /**
     * Tạo phản hồi chung khi không có ngữ cảnh cụ thể
     */
    getGeneralFallback() {
        return `## 👋 Xin chào!\n\nTôi là trợ lý AI của TutorMis. Tôi có thể giúp bạn:\n\n✓ Tìm gia sư phù hợp\n✓ Tìm bài viết blog\n✓ Tìm khóa học\n✓ Hướng dẫn đặt lịch, thanh toán, hủy lịch\n✓ Liên hệ admin\n✓ Giải đáp thắc mắc\n\nBạn cần giúp gì? 😊`;
    }

    /**
     * Lỗi phản hồi
     */
    getTutorSearchError() {
        return `## ❌ Lỗi tìm kiếm\n\nXin lỗi, có lỗi khi tìm kiếm gia sư. Vui lòng thử lại sau.`;
    }

    getBlogSearchError() {
        return `## ❌ Lỗi tìm kiếm\n\nXin lỗi, có lỗi khi tìm kiếm bài viết. Vui lòng thử lại sau.`;
    }

    getCourseSearchError() {
        return `## ❌ Lỗi tìm kiếm\n\nXin lỗi, có lỗi khi tìm kiếm khóa học. Vui lòng thử lại sau.`;
    }

    getErrorResponse() {
        return `## ❌ Có lỗi xảy ra\n\nXin lỗi, tôi gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.`;
    }

    /**
     * Lấy ngữ cảnh hệ thống: tổng số gia sư, học sinh, khóa học
     */
    async getSystemContext(userId, userRole) {
        try {
            // Đếm tổng số gia sư đã được phê duyệt và có hồ sơ
            const approvedTutorsResult = await User.aggregate([
                {
                    $match: {
                        role: 'tutor',
                        approvalStatus: 'approved',
                        isActive: true
                    }
                },
                {
                    $lookup: {
                        from: 'tutorprofiles',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'profile'
                    }
                },
                {
                    $match: {
                        'profile.0': { $exists: true } // Chỉ lấy những gia sư có hồ sơ
                    }
                },
                {
                    $count: 'total'
                }
            ]);

            const totalTutors = approvedTutorsResult.length > 0 ? approvedTutorsResult[0].total : 0;
            const totalStudents = await StudentProfile.countDocuments();
            const totalCourses = await Course.countDocuments();

            return {
                totalTutors,
                totalStudents,
                totalCourses,
                userRole
            };
        } catch (error) {
            console.error('[System Context Lỗi]', error);
            return { totalTutors: 0, totalStudents: 0, totalCourses: 0, userRole };
        }
    }

    // ========== UTILITY METHODS ==========
    // These methods are kept for potential future use or compatibility
    // but are no longer needed with Function Calling

    /**
     * Lấy tên danh mục bằng tiếng Việt
     */
    getCategoryNameInVietnamese(category) {
        const categoryMap = {
            'education': 'Giáo dục',
            'experience': 'Kinh nghiệm',
            'tips': 'Mẹo hay',
            'announcement': 'Thông báo',
            'general': 'Chung'
        };
        return categoryMap[category] || category;
    }

    /**
     * Normalize Vietnamese text (for compatibility)
     * @deprecated - Hàm này không còn cần thiết với Function Calling
     */
    normalizeVietnamese(text) {
        text = text.replace(/\s+/g, ' ').trim();
        const typos = {
            'giá sư': 'gia sư', 'hoá': 'hóa', 'vat ly': 'vật lý',
            'ha noi': 'hà nội', 'da nang': 'đà nẵng', 
            'tp hcm': 'tp hồ chí minh', 'tphcm': 'tp hồ chí minh'
        };
        for (const [wrong, correct] of Object.entries(typos)) {
            text = text.replace(new RegExp(wrong, 'gi'), correct);
        }
        return text;
    }
}

// Export singleton
module.exports = new HybridChatbotService();