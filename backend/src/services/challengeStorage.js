/**
 * Challenge Storage Service
 * Handles storage and retrieval of WebAuthn challenges.
 * Uses Redis when available, falls back to in-memory storage for single-instance deployments.
 */
const cache = require('../config/redis');
const logger = require('../config/logger');

// Fallback in-memory storage for when Redis is not available
const memoryStore = new Map();

/**
 * Store a challenge with expiration.
 * @param {string} key - The challenge key
 * @param {string} challenge - The challenge value
 * @param {number} expirationMs - Expiration time in milliseconds (default: 5 minutes)
 * @returns {Promise<boolean>} - Success status
 */
async function storeChallenge(key, challenge, expirationMs = 5 * 60 * 1000) {
  const expirationSeconds = Math.floor(expirationMs / 1000);
  
  // Try Redis first
  if (cache.isEnabled()) {
    try {
      const success = await cache.set(`challenge:${key}`, challenge, expirationSeconds);
      return success;
    } catch (error) {
      logger.warn('Redis challenge storage error, falling back to memory', { error: error.message });
    }
  }
  
  // Fall back to in-memory storage
  memoryStore.set(key, {
    challenge,
    expires: Date.now() + expirationMs,
  });
  
  // Clean up expired challenges periodically
  setTimeout(() => {
    const entry = memoryStore.get(key);
    if (entry && entry.expires < Date.now()) {
      memoryStore.delete(key);
    }
  }, expirationMs);
  
  return true;
}

/**
 * Retrieve and remove a challenge.
 * @param {string} key - The challenge key
 * @returns {Promise<string|null>} - The challenge value or null if not found/expired
 */
async function getAndRemoveChallenge(key) {
  // Try Redis first
  if (cache.isEnabled()) {
    try {
      const challenge = await cache.client.get(`challenge:${key}`);
      if (challenge) {
        // Delete the challenge (one-time use)
        await cache.del(`challenge:${key}`);
        return challenge;
      }
    } catch (error) {
      logger.warn('Redis challenge retrieval error, falling back to memory', { error: error.message });
    }
  }
  
  // Fall back to in-memory storage
  const entry = memoryStore.get(key);
  memoryStore.delete(key);
  
  if (!entry) return null;
  if (entry.expires < Date.now()) return null;
  
  return entry.challenge;
}

/**
 * Check if challenge storage is using Redis.
 * @returns {boolean} - True if using Redis, false if using in-memory storage
 */
function isUsingRedis() {
  return cache.isEnabled();
}

module.exports = {
  storeChallenge,
  getAndRemoveChallenge,
  isUsingRedis,
};
