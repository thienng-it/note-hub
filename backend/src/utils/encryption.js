/**
 * Encryption utilities for chat messages
 * Uses AES-256-GCM for encryption with user-specific keys derived from app secret
 */

import crypto from 'node:crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive encryption key from base secret and user-specific salt
 * @param {string} baseSecret - Application encryption secret
 * @param {string} salt - User-specific salt (hex string)
 * @returns {Buffer} - Derived encryption key
 */
function deriveKey(baseSecret, salt) {
  return crypto.pbkdf2Sync(baseSecret, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
}

/**
 * Generate a random salt for key derivation
 * @returns {string} - Salt as hex string
 */
export function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Encrypt a message
 * @param {string} message - Plain text message to encrypt
 * @param {string} baseSecret - Application encryption secret
 * @param {string} salt - User-specific salt (hex string)
 * @returns {string} - Encrypted message (iv:authTag:encryptedData in hex)
 */
export function encryptMessage(message, baseSecret, salt) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a non-empty string');
  }

  if (!baseSecret) {
    throw new Error('Encryption secret is required');
  }

  // Derive key from base secret and salt
  const key = deriveKey(baseSecret, salt);

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt message
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag for integrity verification
  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a message
 * @param {string} encryptedMessage - Encrypted message (iv:authTag:encryptedData in hex)
 * @param {string} baseSecret - Application encryption secret
 * @param {string} salt - User-specific salt (hex string)
 * @returns {string} - Decrypted plain text message
 */
export function decryptMessage(encryptedMessage, baseSecret, salt) {
  if (!encryptedMessage || typeof encryptedMessage !== 'string') {
    throw new Error('Encrypted message must be a non-empty string');
  }

  if (!baseSecret) {
    throw new Error('Encryption secret is required');
  }

  // Parse encrypted message
  const parts = encryptedMessage.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted message format');
  }

  const [ivHex, authTagHex, encryptedData] = parts;

  // Derive key from base secret and salt
  const key = deriveKey(baseSecret, salt);

  // Convert from hex
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt message
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a message appears to be encrypted
 * @param {string} message - Message to check
 * @returns {boolean} - True if message appears to be encrypted
 */
export function isEncrypted(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  // Check if message matches encrypted format: hex:hex:hex
  const parts = message.split(':');
  if (parts.length !== 3) {
    return false;
  }
  // Verify each part is valid hex
  return parts.every((part) => /^[0-9a-fA-F]+$/.test(part));
}
