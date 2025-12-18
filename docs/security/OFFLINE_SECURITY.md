# Offline Mode Security Guide

## Overview

NoteHub implements multiple layers of security for offline data storage to ensure user data remains protected even when stored locally in the browser.

## Security Architecture

### 1. Encryption Layer

**Algorithm:** AES-256-GCM (Galois/Counter Mode)

```
┌─────────────────────────────────────┐
│         User Authentication         │
│     (JWT Token + User ID)           │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│    Key Derivation (PBKDF2)          │
│    - 100,000 iterations             │
│    - SHA-256 hashing                │
│    - User-specific salt             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      AES-256-GCM Encryption         │
│    - 256-bit key length             │
│    - 96-bit random IV per operation │
│    - Authenticated encryption       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      IndexedDB Storage              │
│    (Encrypted data at rest)         │
└─────────────────────────────────────┘
```

### 2. Key Derivation

**PBKDF2 Parameters:**
- **Iterations:** 100,000 (OWASP recommended minimum)
- **Hash Function:** SHA-256
- **Salt:** Deterministic per user (`notehub-v1-{userId}`)
- **Key Material:** JWT access token
- **Output:** 256-bit AES key

**Code Implementation:**
```typescript
async function deriveKey(userId: number, token: string): Promise<CryptoKey> {
  const salt = new TextEncoder().encode(`notehub-v1-${userId}`);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // Not extractable
    ['encrypt', 'decrypt']
  );
}
```

### 3. Encryption Process

**Encrypted Data Structure:**
```
[12-byte IV] + [Encrypted Data] + [16-byte Auth Tag]
         ↓
   Base64 Encoded String
```

**What Gets Encrypted:**
- ✅ Note titles
- ✅ Note body content
- ✅ Note tags
- ✅ Task titles
- ✅ Task descriptions
- ❌ Metadata (IDs, timestamps, flags)
- ❌ Folder names (less sensitive)

### 4. User Isolation

**Session Validation:**
Every offline operation validates:
1. User is authenticated (has valid token)
2. User ID matches stored session
3. Token is present and valid

**Automatic Cleanup:**
- User mismatch triggers immediate data wipe
- Logout clears all offline data
- No cross-user data contamination possible

**Code Implementation:**
```typescript
async function validateUserSession(): Promise<{ userId: number; token: string }> {
  const user = getStoredUser();
  const token = getStoredToken();
  
  if (!user || !token) {
    throw new Error('No active user session');
  }
  
  const storedUserId = await offlineStorage.getMetadata('userId');
  if (storedUserId && storedUserId !== user.id) {
    // User mismatch - clear all data for security
    await offlineStorage.clearAll();
    await offlineStorage.setMetadata('userId', user.id);
  }
  
  return { userId: user.id, token };
}
```

## Security Features

### ✅ Encryption at Rest
- All sensitive content encrypted using AES-256-GCM
- Keys derived from user session (not stored)
- Random IV for each encryption operation
- Authenticated encryption prevents tampering

### ✅ User Isolation
- Data tagged with user ID
- Session validation on every operation
- Automatic cleanup on user change
- No shared data between users

### ✅ Automatic Cleanup
- Logout clears all offline data
- User change triggers data wipe
- Authentication failure clears cache
- No orphaned data remains

### ✅ Session Security
- Keys derived from current JWT token
- Token expiration forces re-authentication
- No persistent encryption keys
- Session-specific security

### ✅ Graceful Degradation
- Falls back to unencrypted if Web Crypto unavailable
- Warns user when encryption not supported
- Still provides user isolation
- Better than no offline support

## Threat Model

### Protected Against

✅ **Local Data Access**
- Encrypted data unreadable without session
- Keys not extractable or stored
- Browser storage alone insufficient

✅ **Cross-User Contamination**
- User ID validation prevents access
- Automatic cleanup on user change
- Session mismatch detection

✅ **Data Tampering**
- GCM mode provides authentication
- Tampering detected during decryption
- Invalid data rejected

✅ **Session Hijacking Mitigation**
- Keys derived from JWT token
- Token rotation invalidates old keys
- No persistent key storage

### Not Protected Against

❌ **Device Compromise**
- If device is compromised, session tokens accessible
- Mitigation: Device-level encryption recommended
- Mitigation: Always logout on shared devices

❌ **Active Session Access**
- User with active session can access data
- This is by design for usability
- Mitigation: Screen lock, auto-logout

❌ **Browser DevTools**
- User can access their own encrypted data
- Keys exist in memory during active session
- This is acceptable for client-side storage

❌ **Memory Dumps**
- Keys exist in memory while session active
- Browser security boundary relies on
- OS-level protections required

## Best Practices

### For Users

1. **Always Logout on Shared Devices**
   - Clears all offline data
   - Removes encryption keys
   - Prevents unauthorized access

2. **Enable Device Encryption**
   - Provides additional layer of security
   - Protects against physical device theft
   - OS-level protection complements app security

3. **Use Strong Passwords**
   - JWT tokens derived from authentication
   - Weak passwords compromise all security
   - Enable 2FA for additional protection

4. **Keep Browser Updated**
   - Security patches for Web Crypto API
   - Bug fixes for IndexedDB
   - Latest security features

### For Developers

1. **Never Store Keys**
   - Keys derived on-demand from session
   - Not extractable or persistent
   - Cleared on logout

2. **Validate Every Operation**
   - Check authentication before offline ops
   - Verify user session matches
   - Handle validation failures gracefully

3. **Encrypt Sensitive Data Only**
   - Balance security and performance
   - Encrypt content, not metadata
   - Consider sensitivity of each field

4. **Handle Decryption Failures**
   - Corrupted data or wrong keys
   - Legacy unencrypted data
   - Graceful fallback behavior

## Implementation Details

### Storage Schema

**Encrypted Fields:**
```typescript
interface EncryptedNote {
  id: number;                    // Unencrypted
  title: string;                 // ENCRYPTED
  body: string;                  // ENCRYPTED
  tags: string;                  // ENCRYPTED (serialized)
  images: string[];              // Unencrypted (URLs)
  pinned: boolean;               // Unencrypted
  favorite: boolean;             // Unencrypted
  archived: boolean;             // Unencrypted
  folder_id: number | null;      // Unencrypted
  created_at: string;            // Unencrypted
  updated_at: string;            // Unencrypted
  user_id: number;               // Unencrypted
}
```

### Encryption Overhead

**Performance:**
- Encryption: ~1-2ms per note
- Decryption: ~1-2ms per note
- Negligible for typical usage
- Async operations (non-blocking)

**Storage:**
- Overhead: ~30-40% size increase
- Base64 encoding: +33%
- IV + Auth tag: +28 bytes per item
- Acceptable trade-off for security

### Browser Compatibility

**Web Crypto API Support:**
- ✅ Chrome 37+
- ✅ Firefox 34+
- ✅ Safari 11+
- ✅ Edge 12+
- ❌ Internet Explorer (not supported)

**Fallback Behavior:**
- Detects Web Crypto availability
- Warns user if encryption unavailable
- Falls back to unencrypted storage
- Still provides user isolation

## Security Audit Checklist

- [x] Encryption algorithm reviewed (AES-256-GCM)
- [x] Key derivation parameters validated (PBKDF2, 100k iterations)
- [x] IV generation reviewed (crypto.getRandomValues)
- [x] User isolation implemented
- [x] Session validation on all operations
- [x] Automatic cleanup on logout
- [x] User mismatch detection
- [x] Graceful degradation for unsupported browsers
- [x] Documentation complete
- [x] No sensitive data in logs

## Future Enhancements

### Planned
- [ ] Key rotation on token refresh
- [ ] Additional integrity checks (HMAC)
- [ ] Secure key backup mechanism
- [ ] Enhanced audit logging

### Considered
- [ ] Hardware security module support
- [ ] Biometric authentication integration
- [ ] Zero-knowledge architecture
- [ ] End-to-end encryption for sync

## References

- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST AES-GCM Guidelines](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [PBKDF2 Recommendations](https://pages.nist.gov/800-63-3/sp800-63b.html)

## Contact

For security concerns or vulnerability reports, please contact the security team through GitHub's security advisory system.
