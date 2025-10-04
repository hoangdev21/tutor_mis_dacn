const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TutorMis API Documentation',
      version: '1.0.0',
      description: 'API documentation cho hệ thống gia sư TutorMis - Nền tảng kết nối gia sư và học sinh',
      contact: {
        name: 'TutorMis Team',
        email: 'support@tutornis.com',
        url: 'https://tutornis.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://tutornis.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        // ===== AUTHENTICATION SCHEMAS =====
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            role: {
              type: 'string',
              enum: ['student', 'tutor', 'admin'],
              description: 'User role'
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            isActive: {
              type: 'boolean',
              description: 'Account active status'
            },
            approvalStatus: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              description: 'Approval status for tutors'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'role', 'fullName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Password (min 6 characters, must contain uppercase, lowercase, and number)'
            },
            role: {
              type: 'string',
              enum: ['student', 'tutor'],
              description: 'User role'
            },
            fullName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Full name'
            },
            phone: {
              type: 'string',
              pattern: '^[0-9]{10,11}$',
              description: 'Phone number (10-11 digits)'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            password: {
              type: 'string',
              description: 'Password'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                accessToken: {
                  type: 'string',
                  description: 'JWT access token'
                },
                refreshToken: {
                  type: 'string',
                  description: 'JWT refresh token'
                }
              }
            }
          }
        },
        
        // ===== PROFILE SCHEMAS =====
        StudentProfile: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            userId: {
              type: 'string',
              description: 'User ID reference'
            },
            fullName: {
              type: 'string'
            },
            phone: {
              type: 'string'
            },
            avatar: {
              type: 'string',
              nullable: true
            },
            dateOfBirth: {
              type: 'string',
              format: 'date'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other']
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                ward: { type: 'string' },
                district: { type: 'string' },
                city: { type: 'string' }
              }
            },
            parentInfo: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        },
        TutorProfile: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            userId: {
              type: 'string',
              description: 'User ID reference'
            },
            fullName: {
              type: 'string'
            },
            phone: {
              type: 'string'
            },
            avatar: {
              type: 'string',
              nullable: true
            },
            dateOfBirth: {
              type: 'string',
              format: 'date'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other']
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                ward: { type: 'string' },
                district: { type: 'string' },
                city: { type: 'string' }
              }
            },
            education: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  degree: { type: 'string' },
                  major: { type: 'string' },
                  university: { type: 'string' },
                  graduationYear: { type: 'number' },
                  gpa: { type: 'number' }
                }
              }
            },
            subjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subject: { type: 'string' },
                  level: { 
                    type: 'string',
                    enum: ['elementary', 'middle_school', 'high_school', 'university']
                  },
                  hourlyRate: { type: 'number' },
                  experience: { type: 'number' }
                }
              }
            },
            experience: {
              type: 'object',
              properties: {
                totalYears: { type: 'number' },
                description: { type: 'string' },
                achievements: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            rating: {
              type: 'object',
              properties: {
                average: { type: 'number' },
                count: { type: 'number' }
              }
            }
          }
        },
        
        // ===== ERROR SCHEMAS =====
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Error details'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name with error'
                  },
                  message: {
                    type: 'string',
                    description: 'Error message for the field'
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'API endpoints for user authentication and authorization'
      },
      {
        name: 'Student',
        description: 'API endpoints for student operations'
      },
      {
        name: 'Tutor',
        description: 'API endpoints for tutor operations'
      },
      {
        name: 'Admin',
        description: 'API endpoints for admin operations'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

// Generate swagger specification
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #667eea }
    .swagger-ui .scheme-container { background: #f8faff; padding: 15px; margin: 20px 0; border-radius: 8px }
  `,
  customSiteTitle: 'TutorMis API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2
  }
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};