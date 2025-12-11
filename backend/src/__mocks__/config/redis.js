/**
 * Mock Redis module for testing
 */
const mockRedis = {
  connect: jest.fn().mockResolvedValue(),
  isEnabled: jest.fn().mockReturnValue(false),
  close: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

export default mockRedis;
