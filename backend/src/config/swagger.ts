/**
 * OpenAPI/Swagger Configuration
 *
 * Comprehensive API documentation for NoteHub Backend
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NoteHub API',
      version: '2.0.0',
      description: `
# NoteHub API Documentation

A comprehensive RESTful API for managing notes, tasks, and user profiles.

## Features
- 🔐 JWT-based authentication with refresh token rotation
- 📝 Full CRUD operations for notes and tasks
- 🏷️ Tag-based organization
- 🔍 Advanced search with Elasticsearch (optional)
- ⚡ Redis caching for improved performance (optional)
- 🔑 Google OAuth 2.0 and GitHub OAuth integration (optional)
- 🔐 WebAuthn passkey support
- 📊 Real-time metrics via Prometheus
- 🌐 i18n support for multiple languages

## Authentication

Most endpoints require authentication via JWT tokens in the Authorization header:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### Token Lifecycle
1. Login via \`/api/v1/auth/login\` to receive access and refresh tokens
2. Use access token for API requests (expires in 24 hours)
3. Refresh access token using \`/api/v1/auth/refresh\` when expired
4. Refresh tokens are valid for 7 days

## Rate Limiting
- Authentication endpoints: 10 requests per 15 minutes per IP
- All other endpoints: No limit (can be configured)

## Error Responses

All error responses follow this format:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-10T06:00:00.000Z",
    "version": "v1",
    "requestId": "req-uuid"
  }
}
\`\`\`

## Success Responses

All success responses follow this format:

\`\`\`json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "meta": {
    "timestamp": "2025-12-10T06:00:00.000Z",
    "version": "v1",
    "requestId": "req-uuid"
  }
}
\`\`\`
      `,
      contact: {
        name: 'NoteHub Support',
        email: 'support@notehub.example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.notehub.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Users', description: 'User management operations' },
      { name: 'Profile', description: 'User profile management' },
      { name: 'Notes', description: 'Note management operations' },
      { name: 'Tasks', description: 'Task management operations' },
      { name: 'Admin', description: 'Administrative operations (admin only)' },
      { name: 'Passkey', description: 'WebAuthn passkey authentication' },
      { name: 'AI', description: 'AI-powered features' },
      { name: 'Upload', description: 'File upload operations' },
      { name: 'Health', description: 'Health check and monitoring' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string', example: 'v1' },
                requestId: { type: 'string' },
              },
            },
          },
        },
        
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            bio: { type: 'string', nullable: true, example: 'Software developer' },
            theme: { type: 'string', enum: ['light', 'dark'], example: 'dark' },
            hidden_notes: { type: 'boolean', example: false },
            preferred_language: { type: 'string', example: 'en' },
            is_admin: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            last_login: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'johndoe' },
            password: { type: 'string', format: 'password', example: 'SecurePass123!' },
            totp_code: { type: 'string', example: '123456', description: 'Required if 2FA is enabled' },
          },
        },
        
        TokenResponse: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            token_type: { type: 'string', example: 'Bearer' },
            expires_in: { type: 'integer', example: 86400 },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        
        // Note schemas
        Note: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'My First Note' },
            content: { type: 'string', example: 'This is the content of my note.' },
            is_favorite: { type: 'boolean', example: false },
            is_pinned: { type: 'boolean', example: false },
            is_hidden: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            tags: {
              type: 'array',
              items: { $ref: '#/components/schemas/Tag' },
            },
          },
        },
        
        NoteCreate: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string', example: 'My First Note', minLength: 1, maxLength: 255 },
            content: { type: 'string', example: 'This is the content of my note.' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['work', 'important'],
            },
            is_favorite: { type: 'boolean', example: false },
            is_pinned: { type: 'boolean', example: false },
            is_hidden: { type: 'boolean', example: false },
          },
        },
        
        Tag: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'work' },
          },
        },
        
        // Task schemas
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Complete API documentation' },
            description: { type: 'string', nullable: true, example: 'Write comprehensive OpenAPI docs' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], example: 'in_progress' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
            due_date: { type: 'string', format: 'date', nullable: true, example: '2025-12-31' },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        
        TaskCreate: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: 'Complete API documentation', minLength: 1 },
            description: { type: 'string', example: 'Write comprehensive OpenAPI docs' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
            due_date: { type: 'string', format: 'date', example: '2025-12-31' },
          },
        },
        
        // Pagination
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing authentication token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  message: 'Invalid or expired token',
                  code: 'UNAUTHORIZED',
                },
                meta: {
                  timestamp: '2025-12-10T06:00:00.000Z',
                  version: 'v1',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/routes/*.ts'], // Path to API routes for JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
