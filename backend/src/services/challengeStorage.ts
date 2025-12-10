/**
 * Challenge Storage Service
 * Handles storage and retrieval of WebAuthn challenges.
 * Uses Redis when available, falls back to in-memory storage for single-instance deployments.
 */
import cache from '../config/redis';
import logger from '../config/logger';

interface ChallengeEntry {
  challenge: string;
  expires: number;
}

// Fallback in-memory storage for when Redis is not available
const memoryStore = new Map<string, ChallengeEntry>();

/**
 * Store a challenge with expiration.
 */
export async function storeChallenge(
  key: string,
  challenge: string,
  expirationMs = 5 * 60 * 1000,
): Promise<boolean> {
  const expirationSeconds = Math.floor(expirationMs / 1000);

  // Try Redis first
  if (cache.isEnabled()) {
    try {
      const success = await cache.set(`challenge:${key}`, challenge, expirationSeconds);
      return success;
    } catch (error: any) {
      logger.warn('Redis challenge storage error, falling back to memory', {
        error: error.message,
      });
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
 */
export async function getAndRemoveChallenge(key: string): Promise<string | null> {
  // Try Redis first
  if (cache.isEnabled()) {
    try {
      const challenge = await cache.get<string>(`challenge:${key}`);
      if (challenge) {
        // Delete the challenge (one-time use)
        await cache.del(`challenge:${key}`);
        return challenge;
      }
    } catch (error: any) {
      logger.warn('Redis challenge retrieval error, falling back to memory', {
        error: error.message,
      });
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
 */
export function isUsingRedis(): boolean {
  return cache.isEnabled();
}

export default {
  storeChallenge,
  getAndRemoveChallenge,
  isUsingRedis,
};
