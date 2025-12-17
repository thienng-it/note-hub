/**
 * Email Service Tests
 */

import { jest } from '@jest/globals';

// Mock the logger before importing emailService
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.unstable_mockModule('../src/config/logger.js', () => ({
  default: mockLogger,
}));

// Mock Mailjet
const mockMailjetRequest = jest.fn();
const mockMailjetPost = jest.fn(() => ({
  request: mockMailjetRequest,
}));
const mockMailjetApiConnect = jest.fn(() => ({
  post: mockMailjetPost,
}));

jest.unstable_mockModule('node-mailjet', () => ({
  default: {
    apiConnect: mockMailjetApiConnect,
  },
}));

const { default: EmailService } = await import('../src/services/emailService.js');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be disabled without Mailjet configuration', () => {
      // EmailService is a singleton initialized without env vars in test environment
      expect(EmailService.isEnabled()).toBe(false);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should log email to console when Mailjet is not configured', async () => {
      const result = await EmailService.sendPasswordResetEmail(
        'user@example.com',
        'testuser',
        'reset-token-123',
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('logged to console');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Mailjet not configured'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('To: user@example.com'),
      );
    });

    it('should include reset token in email content', async () => {
      await EmailService.sendPasswordResetEmail('user@example.com', 'testuser', 'reset-token-123');

      // Check that the token was logged
      const logCalls = mockLogger.info.mock.calls;
      const contentLog = logCalls.find((call) => call[0].includes('Content:'));
      expect(contentLog).toBeDefined();
      expect(contentLog[0]).toContain('reset-token-123');
      expect(contentLog[0]).toContain('testuser');
    });

    it('should construct reset URL with token', async () => {
      await EmailService.sendPasswordResetEmail('user@example.com', 'testuser', 'reset-token-123');

      const logCalls = mockLogger.info.mock.calls;
      const contentLog = logCalls.find((call) => call[0].includes('Content:'));
      expect(contentLog[0]).toContain('reset-password?token=reset-token-123');
    });

    it('should use custom reset URL if provided', async () => {
      await EmailService.sendPasswordResetEmail(
        'user@example.com',
        'testuser',
        'reset-token-123',
        'https://custom.com/reset?token=reset-token-123',
      );

      const logCalls = mockLogger.info.mock.calls;
      const contentLog = logCalls.find((call) => call[0].includes('Content:'));
      expect(contentLog[0]).toContain('https://custom.com/reset?token=reset-token-123');
    });
  });

  describe('sendEmail', () => {
    it('should throw error if recipient email is missing', async () => {
      await expect(
        EmailService.sendEmail({
          to: '',
          subject: 'Test',
          textContent: 'Test',
          htmlContent: '<p>Test</p>',
        }),
      ).rejects.toThrow('Recipient email address is required');
    });

    it('should log email to console when Mailjet is not configured', async () => {
      const result = await EmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        textContent: 'Test Content',
        htmlContent: '<p>Test Content</p>',
      });

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('To: test@example.com'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Subject: Test Subject'),
      );
    });
  });

  describe('isEnabled', () => {
    it('should return false when Mailjet is not configured', () => {
      expect(EmailService.isEnabled()).toBe(false);
    });
  });
});
