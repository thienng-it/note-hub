/**
 * Client-side encryption utility for offline data protection
 * Uses Web Crypto API for secure encryption/decryption
 */

// Encryption algorithm configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM mode

/**
 * Derives an encryption key from user credentials
 * Uses PBKDF2 for key derivation with user-specific salt
 */
async function deriveKey(userId: number, token: string): Promise<CryptoKey> {
  // Create a deterministic salt based on userId
  const salt = new TextEncoder().encode(`notehub-v1-${userId}`);

  // Import the token as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  // Derive actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // Not extractable for security
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts data using AES-GCM
 * Returns base64 encoded encrypted data with IV prepended
 */
export async function encryptData(data: unknown, userId: number, token: string): Promise<string> {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(data);
    const dataBuffer = new TextEncoder().encode(jsonString);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive encryption key
    const key = await deriveKey(userId, token);

    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      dataBuffer,
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-GCM
 * Expects base64 encoded data with IV prepended
 */
export async function decryptData<T>(
  encryptedData: string,
  userId: number,
  token: string,
): Promise<T> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedBuffer = combined.slice(IV_LENGTH);

    // Derive decryption key
    const key = await deriveKey(userId, token);

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encryptedBuffer,
    );

    // Convert back to JSON
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key is invalid');
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.encrypt === 'function'
  );
}

/**
 * Generate a secure hash of data for integrity checking
 */
export async function hashData(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
