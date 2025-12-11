/**
 * Mock database module for testing
 */
const mockDb = {
  connect: jest.fn().mockResolvedValue(),
  initSchema: jest.fn().mockResolvedValue(),
  query: jest.fn().mockResolvedValue([]),
  queryOne: jest.fn().mockResolvedValue(null),
  run: jest.fn().mockResolvedValue({ insertId: 1, changes: 1 }),
  close: jest.fn().mockResolvedValue(),
  isSQLite: true,
  getReplicationStatus: jest.fn().mockReturnValue({ enabled: false, message: 'Replication is disabled' }),
  getPoolMetrics: jest.fn().mockReturnValue(null),
};

export default mockDb;
