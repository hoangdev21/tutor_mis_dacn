/**
 * ===============================================
 * HYBRID AI CHATBOT SERVICE v3.0
 * ===============================================
 * 
 * Professional AI system with modern architecture:
 * 1. Gemini Function Calling - Reliable intent detection
 * 2. Context Memory - Multi-turn conversations
 * 3. RAG (Retrieval-Augmented Generation) - Smart knowledge base
 * 4. Optimized Database - Index-based queries
 * 
 * Features:
 * - Natural Vietnamese conversation with context memory
 * - Function calling for accurate intent detection
 * - RAG for intelligent general question handling
 * - Optimized MongoDB queries with proper indexing
 * - Handles: tutors, blogs, courses, help, contact
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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class HybridChatbotService {
    
    /**
     * Define available tools/functions for Gemini Function Calling
     * This replaces the old analyzeIntent approach with a more reliable method
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
     * Main chat function - Enhanced with Function Calling and Context Memory
     * @param {string} query - User's question
     * @param {string} userId - User ID for personalization
     * @param {string} userRole - User role (student/tutor/admin)
     * @param {Array} chatHistory - Conversation history for context memory
     */
    async chat(query, userId, userRole, chatHistory = []) {
        try {
            console.log('[Hybrid AI v3.0] Processing query:', query.substring(0, 100));

            // Step 1: Get system context
            const systemContext = await this.getSystemContext(userId, userRole);

            // Step 2: Use Function Calling to detect intent reliably
            const functionCallResult = await this.detectIntentWithFunctionCalling(query, chatHistory, systemContext);

            // Step 3: Execute appropriate handler based on function call
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
                        // If no function matched, use RAG for general questions
                        response = await this.handleGeneralQuestionWithRAG(query, chatHistory, systemContext);
                        metadata = { queryType: 'general_question' };
                }

                metadata.functionCall = funcName;
            } else {
                // No function call detected - handle as general question with RAG
                console.log('[No Function Call] Using RAG for general question');
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
            console.error('[Hybrid AI Error]', error);
            return {
                success: false,
                response: this.getErrorResponse(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Use Gemini Function Calling to detect intent reliably
     * This replaces the old analyzeIntent method that parsed JSON text
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
                // Force AI to MUST use function calling - ANY mode forces function usage
                toolConfig: {
                    functionCallingConfig: {
                        mode: 'ANY', // FORCE AI to call a function, cannot return plain text
                        allowedFunctionNames: ['find_tutor', 'find_blog', 'find_course', 'get_help']
                    }
                }
            });

            // Build conversation history for context
            const history = this.buildConversationHistory(chatHistory, systemContext);

            // Start chat session with history
            const chat = model.startChat({ history });

            // Send user query
            const result = await chat.sendMessage(query);
            const response = result.response;

            // Check if AI wants to call a function
            const functionCalls = response.functionCalls();
            
            console.log('[Function Calling] AI response type:', functionCalls ? 'FUNCTION_CALL' : 'TEXT');
            
            if (functionCalls && functionCalls.length > 0) {
                // Return the first function call
                return {
                    functionCall: {
                        name: functionCalls[0].name,
                        args: functionCalls[0].args
                    }
                };
            }

            // No function call - AI will handle with general conversation
            return { functionCall: null, textResponse: response.text() };

        } catch (error) {
            console.error('[Function Calling Error]', error);
            return { functionCall: null };
        }
    }

    /**
     * Build conversation history for context memory
     * This allows the chatbot to understand follow-up questions
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

        // Add recent conversation history (last 6 messages = 3 turns)
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
     * Handle get_help function call
     * Unified handler for all help-related requests
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
     * 
     * NOTE: For best performance, ensure the following indexes exist:
     * - db.tutorprofiles.createIndex({ "address.cityLower": 1 })
     * - db.tutorprofiles.createIndex({ "subjects.subjectLower": 1 })
     * - db.tutorprofiles.createIndex({ hourlyRate: 1 })
     * - db.tutorprofiles.createIndex({ averageRating: -1, totalReviews: -1 })
     */
    async handleFindTutor(criteria, systemContext) {
        try {
            console.log('[Find Tutor] Searching with criteria:', JSON.stringify(criteria));
            
            // Build MongoDB query with ACTUAL existing fields
            const dbQuery = { 
                $or: [
                    { isApproved: true },
                    { isApproved: { $exists: false } }
                ]
            };
            
            // Search by subjects - use ACTUAL field structure
            if (criteria.subjects && criteria.subjects.length > 0) {
                // Use regex for flexible matching on existing 'subjects.subject' field
                const subjectRegexes = criteria.subjects.map(s => new RegExp(s, 'i'));
                dbQuery['subjects.subject'] = { $in: subjectRegexes };
                console.log('[Find Tutor] Searching subjects:', criteria.subjects);
            }
            
            // Search by city - use ACTUAL field structure  
            if (criteria.city) {
                // Use regex on existing 'address.city' field
                dbQuery['address.city'] = new RegExp(criteria.city, 'i');
                console.log('[Find Tutor] Searching city:', criteria.city);
            }
            
            // Price range query
            if (criteria.minPrice || criteria.maxPrice) {
                dbQuery.hourlyRate = {};
                if (criteria.minPrice) dbQuery.hourlyRate.$gte = criteria.minPrice;
                if (criteria.maxPrice) dbQuery.hourlyRate.$lte = criteria.maxPrice;
                console.log('[Find Tutor] Price range:', dbQuery.hourlyRate);
            }
            
            if (criteria.gender) {
                dbQuery.gender = criteria.gender;
            }
            
            if (criteria.minExperience) {
                dbQuery.yearsOfExperience = { $gte: criteria.minExperience };
            }
            
            if (criteria.minRating) {
                dbQuery.averageRating = { $gte: criteria.minRating };
            }

            // Execute query with actual database
            console.log('[Find Tutor] Executing query:', JSON.stringify(dbQuery));
            
            const tutors = await TutorProfile.find(dbQuery)
                .populate('userId', 'name email')
                .sort({ averageRating: -1, totalReviews: -1 })
                .limit(10)
                .lean();

            console.log(`[Find Tutor] ✅ Found ${tutors.length} tutors from DATABASE`);
            if (tutors.length > 0) {
                console.log('[Find Tutor] Sample tutor:', {
                    name: tutors[0].userId?.name,
                    city: tutors[0].address?.city,
                    subjects: tutors[0].subjects?.map(s => s.subject)
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
            console.error('[Find Tutor Error]', error);
            return {
                response: this.getTutorSearchError(),
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Normalize string for database queries
     * Converts to lowercase and removes Vietnamese accents for consistent matching
     */
    normalizeForDb(text) {
        if (!text) return '';
        
        // Convert to lowercase
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
            console.log('[Find Blog] Searching with criteria:', JSON.stringify(criteria));
            const dbQuery = { status: 'approved' };
            
            // Try MongoDB Text Search first, fallback to RegExp if index doesn't exist
            if (criteria.keywords && criteria.keywords.length > 0) {
                const searchText = criteria.keywords.join(' ');
                console.log('[Find Blog] Searching keywords:', searchText);
                
                // Try text search first
                let blogs = [];
                try {
                    dbQuery.$text = { $search: searchText };
                    const projection = { score: { $meta: 'textScore' } };
                    
                    blogs = await BlogPost.find(dbQuery, projection)
                        .populate('author', 'name')
                        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                        .limit(10)
                        .lean();
                    
                    console.log(`[Find Blog] ✅ Found ${blogs.length} blogs using TEXT SEARCH`);
                } catch (textSearchError) {
                    // Text index doesn't exist - fallback to regex
                    console.log('[Find Blog] Text index not found, using REGEX fallback');
                    
                    // Remove $text query
                    delete dbQuery.$text;
                    
                    // Use regex on title, content, category
                    dbQuery.$or = criteria.keywords.map(kw => ({
                        $or: [
                            { title: new RegExp(kw, 'i') },
                            { content: new RegExp(kw, 'i') },
                            { category: new RegExp(kw, 'i') }
                        ]
                    }));
                    
                    blogs = await BlogPost.find(dbQuery)
                        .populate('author', 'name')
                        .sort({ createdAt: -1 })
                        .limit(10)
                        .lean();
                    
                    console.log(`[Find Blog] ✅ Found ${blogs.length} blogs using REGEX`);
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
                    .populate('author', 'name')
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .lean();

                console.log(`[Find Blog] ✅ Found ${blogs.length} recent blog posts from DATABASE`);

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
            
            // If text index doesn't exist, provide helpful error message
            if (error.message.includes('text index')) {
                console.error('[TEXT INDEX MISSING] Please create text index on BlogPost collection!');
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
            console.log('[Find Course] Searching with criteria:', JSON.stringify(criteria));
            const dbQuery = {};
            
            // Search by subjects - use ACTUAL field with regex
            if (criteria.subjects && criteria.subjects.length > 0) {
                const subjectRegexes = criteria.subjects.map(s => new RegExp(s, 'i'));
                dbQuery.subject = { $in: subjectRegexes };
                console.log('[Find Course] Searching subjects:', criteria.subjects);
            }
            
            // Price filter
            if (criteria.maxPrice) {
                dbQuery.price = { $lte: criteria.maxPrice };
                console.log('[Find Course] Max price:', criteria.maxPrice);
            }

            const courses = await Course.find(dbQuery)
                .populate('tutor', 'name')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            console.log(`[Find Course] ✅ Found ${courses.length} courses from DATABASE`);
            if (courses.length > 0) {
                console.log('[Find Course] Sample course:', {
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
            console.error('[Find Course Error]', error);
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
            // STEP 1: RETRIEVE - Search knowledge base
            console.log('[RAG] Step 1: Retrieving relevant knowledge...');
            const retrievedKnowledge = await this.retrieveRelevantKnowledge(query);
            
            if (!retrievedKnowledge || retrievedKnowledge.length === 0) {
                console.log('[RAG] No relevant knowledge found, using general fallback');
                return this.getGeneralFallback();
            }

            // STEP 2: AUGMENT - Build enriched prompt with context
            console.log('[RAG] Step 2: Augmenting prompt with context...');
            const augmentedPrompt = this.buildRAGPrompt(query, retrievedKnowledge, systemContext);

            // STEP 3: GENERATE - Use AI to generate contextual response
            console.log('[RAG] Step 3: Generating AI response...');
            
            if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 20) {
                // No API key - return best matching knowledge
                return retrievedKnowledge[0].content;
            }

                        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            
            // Build conversation history for context
            const history = this.buildConversationHistory(chatHistory, systemContext);
            const chat = model.startChat({ history });

            // Generate response with retrieved context
            const result = await chat.sendMessage(augmentedPrompt);
            const response = result.response.text();

            console.log('[RAG] Response generated successfully');
            return response;

        } catch (error) {
            console.error('[RAG Error]', error);
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

        // Calculate relevance score for each knowledge item
        knowledgeBase.forEach(item => {
            let score = 0;
            item.keywords.forEach(keyword => {
                if (queryLower.includes(keyword)) {
                    score += 1;
                }
            });
            item.relevance = score;
        });

        // Sort by relevance and return top matches
        const sortedKnowledge = knowledgeBase
            .filter(item => item.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 3); // Top 3 most relevant

        console.log(`[RAG Retrieve] Found ${sortedKnowledge.length} relevant knowledge items`);
        return sortedKnowledge;
    }

    /**
     * AUGMENT: Build enriched prompt with retrieved context
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
     * Generate help content for becoming a tutor
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
     * Generate platform info (synchronous version for RAG)
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
     * Generate tutor search response
     */
    generateTutorSearchResponse(tutors, criteria, systemContext) {
        if (tutors.length === 0) {
            return this.generateNoTutorsResponse(criteria, systemContext);
        }

        let response = `## 📚 Kết quả tìm kiếm gia sư\n\n`;
        response += `Tôi tìm thấy **${tutors.length} gia sư** phù hợp với yêu cầu của bạn:\n\n`;

        tutors.forEach((tutor, idx) => {
            const tutorName = tutor.userId?.name || tutor.fullName || 'Gia sư';
            response += `### ${idx + 1}. ${tutorName}\n\n`;
            response += `📍 **Địa điểm**: ${tutor.address?.city || 'Không rõ'}${tutor.address?.district ? ', ' + tutor.address.district : ''}\n`;
            response += `📖 **Môn dạy**: ${tutor.subjects?.map(s => s.subject).join(', ') || 'Không rõ'}\n`;
            response += `💰 **Học phí**: ${tutor.hourlyRate?.toLocaleString() || '0'}đ/giờ\n`;
            response += `⭐ **Đánh giá**: ${tutor.averageRating || 0}/5.0 (${tutor.totalReviews || 0} đánh giá)\n`;
            response += `✓ **Kinh nghiệm**: ${tutor.yearsOfExperience || 0} năm\n`;
            if (tutor.isVerified) response += `✅ **Đã xác thực**\n`;
            response += `\n[**Xem hồ sơ chi tiết →**](/pages/student/tutor_profile.html?id=${tutor._id})\n\n`;
            response += `---\n\n`;
        });

        response += `💡 *Có ${systemContext.totalTutors} gia sư đang hoạt động trên TutorMis*\n`;
        return response;
    }

    /**
     * Generate no tutors found response
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
     * Generate blog search response
     */
    generateBlogSearchResponse(blogs, criteria) {
        if (blogs.length === 0) {
            return `## 📝 Không tìm thấy bài viết\n\nKhông có bài viết phù hợp với từ khóa của bạn. Hãy thử tìm kiếm với từ khóa khác.\n\n[Xem tất cả bài viết →](/pages/blog.html)`;
        }

        let response = `## 📝 Bài viết phù hợp\n\n`;
        response += `Tìm thấy **${blogs.length} bài viết** liên quan:\n\n`;

        blogs.forEach((blog, idx) => {
            response += `### ${idx + 1}. ${blog.title}\n\n`;
            response += `📂 **Danh mục**: ${blog.category}\n`;
            response += `👤 **Tác giả**: ${blog.author?.name || 'TutorMis'}\n`;
            response += `📅 **Ngày đăng**: ${new Date(blog.createdAt).toLocaleDateString('vi-VN')}\n`;
            if (blog.excerpt) {
                response += `📄 **Tóm tắt**: ${blog.excerpt.substring(0, 100)}...\n`;
            }
            response += `\n[**Đọc bài viết →**](/pages/student/blog.html?id=${blog._id})\n\n`; 
            response += `---\n\n`;
        });

        return response;
    }

    /**
     * Generate course search response
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
     * Generate booking help
     */
    generateBookingHelp() {
        return `## 📅 Hướng dẫn đặt lịch học\n\n**Quy trình đặt lịch:**\n\n1. Tìm và chọn gia sư phù hợp\n2. Click nút "Gửi Yêu Cầu"\n3. Điền thông tin: môn học, thời gian, địa điểm\n4. Gửi yêu cầu và chờ gia sư xác nhận\n5. Nhận thông báo khi được chấp nhận\n6. Thanh toán và bắt đầu học\n\n💡 *Theo dõi trạng thái trong mục "Yêu Cầu Gia Sư"*`;
    }

    /**
     * Generate payment help
     */
    generatePaymentHelp() {
        return `## 💳 Phương thức thanh toán\n\n**TutorMis hỗ trợ:**\n\n💳 **Chuyển khoản ngân hàng**\n📱 **Ví điện tử**: MoMo, ZaloPay, VNPay\n💵 **Thanh toán trực tiếp** cho gia sư\n\n**Chính sách:**\n- Thanh toán an toàn, bảo mật\n- Linh hoạt theo thỏa thuận\n- Hoàn tiền nếu hủy đúng quy định`;
    }

    /**
     * Generate cancellation help
     */
    generateCancellationHelp() {
        return `## ❌ Hướng dẫn hủy lịch học\n\n**Cách hủy:**\n1. Vào mục "Khóa Học"\n2. Chọn lịch cần hủy\n3. Click "Hủy Lịch"\n4. Chọn lý do và xác nhận\n\n**Chính sách hoàn tiền:**\n✓ Hủy trước 24 giờ: Hoàn 100%\n✓ Hủy trong 24 giờ: Hoàn 50%\n✓ Hủy trong 6 giờ: Không hoàn tiền`;
    }

    /**
     * Generate contact admin info
     */
    generateContactAdmin() {
        return `## 📞 Liên hệ Admin\n\n**Cách liên hệ:**\n\n📧 **Email**: support@tutormis.com\n📱 **Hotline**: 033 7982 569 (8:00 - 22:00)\n💬 **Chat**: Click icon Liên hệ ở menu bên trái màn hình 📞\n📍 **Văn phòng**: 60 Nguyễn Đỗ Cung, Hòa Minh, Liên Chiểu, Đà Nẵng\n\n**Thời gian hỗ trợ:**\n- Thứ 2 - Thứ 6: 8:00 - 22:00\n- Thứ 7 - CN: 9:00 - 18:00\n\n💡 *Admin sẽ phản hồi trong vòng 24 giờ*`;
    }

    /**
     * Generate platform info
     */
    async generatePlatformInfo(systemContext) {
        return `## 🎓 Giới thiệu TutorMis\n\n**TutorMis** là nền tảng kết nối học sinh và gia sư hàng đầu Việt Nam.\n\n**Số liệu:**\n- 👨‍🏫 ${systemContext.totalTutors} gia sư chất lượng\n- 👨‍🎓 ${systemContext.totalStudents} học sinh\n- 📚 ${systemContext.totalCourses} khóa học\n\n**Tính năng:**\n✓ Tìm gia sư theo môn học, khu vực, học phí\n✓ Đặt lịch học online/offline\n✓ Video call tích hợp WebRTC\n✓ Tin nhắn thời gian thực\n✓ Thanh toán linh hoạt\n✓ Đánh giá và phản hồi\n\n[Tìm hiểu thêm →](/pages/about.html)`;
    }

    /**
     * Get general fallback response
     */
    getGeneralFallback() {
        return `## 👋 Xin chào!\n\nTôi là trợ lý AI của TutorMis. Tôi có thể giúp bạn:\n\n✓ Tìm gia sư phù hợp\n✓ Tìm bài viết blog\n✓ Tìm khóa học\n✓ Hướng dẫn đặt lịch, thanh toán, hủy lịch\n✓ Liên hệ admin\n✓ Giải đáp thắc mắc\n\nBạn cần giúp gì? 😊`;
    }

    /**
     * Error responses
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
     * Get system context for personalization and stats
     */
    async getSystemContext(userId, userRole) {
        try {
            return {
                totalTutors: await TutorProfile.countDocuments({ isApproved: true }),
                totalStudents: await StudentProfile.countDocuments(),
                totalCourses: await Course.countDocuments(),
                userRole
            };
        } catch (error) {
            console.error('[System Context Error]', error);
            return { totalTutors: 0, totalStudents: 0, totalCourses: 0, userRole };
        }
    }

    // ========== UTILITY METHODS ==========
    // These methods are kept for potential future use or compatibility
    // but are no longer needed with Function Calling

    /**
     * Normalize Vietnamese text (for compatibility)
     * @deprecated - Function Calling handles this better
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
