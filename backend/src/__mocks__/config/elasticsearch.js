/**
 * Mock Elasticsearch module for testing
 */
const mockElasticsearch = {
  connect: jest.fn().mockResolvedValue(),
  isEnabled: jest.fn().mockReturnValue(false),
  close: jest.fn().mockResolvedValue(),
  indexNote: jest.fn().mockResolvedValue(),
  deleteNote: jest.fn().mockResolvedValue(),
  search: jest.fn().mockResolvedValue([]),
};

export default mockElasticsearch;
