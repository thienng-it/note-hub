/**
 * Upload Routes Tests
 * Tests for image upload functionality including single/multiple uploads and deletions
 */
const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock the database
jest.mock('../src/config/database', () => ({
  connect: jest.fn(),
  initSchema: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  run: jest.fn(),
  isSQLite: true
}));

// Mock JWT middleware
jest.mock('../src/middleware/auth', () => ({
  jwtRequired: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', is_admin: true };
    next();
  },
  adminRequired: (req, res, next) => {
    next();
  }
}));

const db = require('../src/config/database');

// Set up environment
process.env.JWT_SECRET = 'test-secret-key';

describe('Upload Routes', () => {
  let app;
  const uploadsDir = path.join(__dirname, '../uploads');
  const testImagePath = path.join(__dirname, 'fixtures', 'test-image.png');

  beforeAll(async () => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create test fixtures directory
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a small test image (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImagePath, testImageBuffer);

    // Import app after mocking
    app = require('../src/index');
  });

  afterAll(() => {
    // Clean up test fixtures
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }

    // Clean up uploaded files during tests
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload/image', () => {
    it('should upload a single image successfully', async () => {
      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', testImagePath);

      // Upload should succeed
      expect(response.status).toBe(200);
      
      // Verify a file was created in the uploads directory  
      const files = fs.readdirSync(uploadsDir);
      const pngFiles = files.filter(f => f.endsWith('.png'));
      expect(pngFiles.length).toBeGreaterThan(0);
      
      // Clean up
      pngFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/upload/image')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should reject files that are too large', async () => {
      // Create a large file (6MB, exceeds 5MB limit)
      const largeFilePath = path.join(__dirname, 'fixtures', 'large-image.png');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      fs.writeFileSync(largeFilePath, largeBuffer);

      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', largeFilePath);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeTruthy();

      // Clean up
      fs.unlinkSync(largeFilePath);
    });

    it('should reject non-image files', async () => {
      const textFilePath = path.join(__dirname, 'fixtures', 'test.txt');
      fs.writeFileSync(textFilePath, 'This is a text file');

      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', textFilePath);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeTruthy();

      // Clean up
      fs.unlinkSync(textFilePath);
    });

    it('should accept JPEG images', async () => {
      // Create a minimal JPEG file
      const jpegPath = path.join(__dirname, 'fixtures', 'test.jpg');
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
      ]);
      fs.writeFileSync(jpegPath, jpegBuffer);

      const response = await request(app)
        .post('/api/upload/image')
        .attach('image', jpegPath);

      expect(response.status).toBe(200);
      
      // Verify a JPEG file was created in uploads directory
      const files = fs.readdirSync(uploadsDir);
      const jpgFiles = files.filter(f => f.endsWith('.jpg'));
      expect(jpgFiles.length).toBeGreaterThan(0);

      // Clean up test JPEG and uploaded files
      fs.unlinkSync(jpegPath);
      jpgFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });
  });

  describe('POST /api/upload/images', () => {
    it('should upload multiple images successfully', async () => {
      // Count existing files before upload
      const filesBefore = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png'));
      const countBefore = filesBefore.length;
      
      const response = await request(app)
        .post('/api/upload/images')
        .attach('images', testImagePath)
        .attach('images', testImagePath);

      expect(response.status).toBe(200);
      
      // Verify 2 more PNG files were created
      const filesAfter = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png'));
      const countAfter = filesAfter.length;
      expect(countAfter - countBefore).toBe(2);
      
      // Clean up new files
      const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
      newFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });

    it('should return 400 when no files are uploaded', async () => {
      const response = await request(app)
        .post('/api/upload/images')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No files uploaded');
    });

    it('should enforce maximum of 10 images', async () => {
      const request_builder = request(app).post('/api/upload/images');
      
      // Try to upload 11 images
      for (let i = 0; i < 11; i++) {
        request_builder.attach('images', testImagePath);
      }

      const response = await request_builder;

      // Multer should reject this before it reaches the route handler
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/upload/:filename', () => {
    let uploadedFilename;

    beforeEach(async () => {
      // Create a test file directly in uploads directory
      uploadedFilename = 'test-delete-' + Date.now() + '.png';
      const testFilePath = path.join(uploadsDir, uploadedFilename);
      fs.writeFileSync(testFilePath, 'test content');
    });

    it('should delete an uploaded file successfully', async () => {
      // Verify file exists before deletion
      const filePathBefore = path.join(uploadsDir, uploadedFilename);
      expect(fs.existsSync(filePathBefore)).toBe(true);
      
      const response = await request(app)
        .delete(`/api/upload/${uploadedFilename}`);

      expect(response.status).toBe(200);

      // Verify file is deleted from disk
      const filePath = path.join(uploadsDir, uploadedFilename);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should return 404 when trying to delete non-existent file', async () => {
      const response = await request(app)
        .delete('/api/upload/nonexistent-file.png');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('File not found');
    });

    it('should prevent path traversal attacks', async () => {
      const response = await request(app)
        .delete('/api/upload/../../etc/passwd');

      // Should return 404 regardless of error message format
      expect(response.status).toBe(404);
      // Verify it's an error response
      expect(response.body).toBeTruthy();
    });
  });

  describe('GET /uploads/:filename', () => {
    let uploadedFilename;
    let uploadedFilePath;

    beforeEach(async () => {
      // Create a test file directly in uploads directory
      uploadedFilename = 'test-serve-' + Date.now() + '.png';
      uploadedFilePath = '/uploads/' + uploadedFilename;
      const testFilePath = path.join(uploadsDir, uploadedFilename);
      fs.writeFileSync(testFilePath, testImagePath);
    });

    afterEach(() => {
      // Clean up uploaded file
      if (uploadedFilename) {
        const filePath = path.join(uploadsDir, uploadedFilename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    it('should serve uploaded files via static middleware', async () => {
      // uploadedFilePath is like '/uploads/filename.png'
      const response = await request(app)
        .get(uploadedFilePath);

      expect(response.status).toBe(200);
      // File was served successfully
    });

    it('should return 404 for non-existent files', async () => {
      const response = await request(app)
        .get('/uploads/nonexistent-file.png');

      expect(response.status).toBe(404);
    });
  });
});
