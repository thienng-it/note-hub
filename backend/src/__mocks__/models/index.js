/**
 * Mock Sequelize models for testing
 */
export const initializeSequelize = jest.fn().mockResolvedValue();
export const syncDatabase = jest.fn().mockResolvedValue();
export const closeDatabase = jest.fn().mockResolvedValue();
export const getSequelize = jest.fn().mockReturnValue(null);

// Mock models
export const User = {};
export const Note = {};
export const Tag = {};
export const Task = {};
export const ShareNote = {};
export const PasswordResetToken = {};
export const Invitation = {};
export const NoteTag = {};
