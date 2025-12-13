# Chat Encryption Investigation

## Overview
This document investigates simple encryption approaches to make the NoteHub chat more secure while maintaining ease of implementation and user experience.

## Current State
- Messages are transmitted over HTTPS (encrypted in transit)
- Messages are stored in plaintext in the database
- No end-to-end encryption (E2E) currently implemented

## Encryption Approaches

### 1. Simple Symmetric Encryption (Recommended for MVP)

**Approach:**
- Use AES-256-GCM for message encryption
- Derive encryption key from a shared secret (room-based key)
- Encrypt messages on client before sending
- Decrypt messages on client after receiving

**Pros:**
- Simple to implement
- Good performance
- Suitable for small-scale deployments

**Cons:**
- Server can still access encryption keys if compromised
- Not true end-to-end encryption
- Key management challenges

**Implementation:**
```typescript
// Using Web Crypto API
async function encryptMessage(message: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptMessage(encrypted: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
```

### 2. Signal Protocol (True E2E)

**Approach:**
- Implement Signal's Double Ratchet Algorithm
- Each user has identity key pair
- Perfect forward secrecy with rotating keys
- Uses pre-keys for asynchronous messaging

**Pros:**
- Industry-standard E2E encryption
- Perfect forward secrecy
- Deniability

**Cons:**
- Complex implementation
- Requires significant infrastructure (key server, pre-key storage)
- Larger payload sizes
- More difficult to debug

**Libraries:**
- `libsignal-protocol-javascript` - Signal Protocol implementation
- `@privacyresearch/libsignal-protocol-typescript` - TypeScript version

### 3. Hybrid Approach (Recommended)

**Approach:**
- Use symmetric encryption for message content (AES-GCM)
- Use asymmetric encryption (RSA/ECDH) for key exchange
- Store encrypted messages in database
- Implement key rotation

**Implementation Steps:**

1. **Key Generation**
   ```typescript
   // Generate user's key pair (done once on registration)
   async function generateUserKeys() {
     return await crypto.subtle.generateKey(
       {
         name: 'RSA-OAEP',
         modulusLength: 2048,
         publicExponent: new Uint8Array([1, 0, 1]),
         hash: 'SHA-256',
       },
       true,
       ['encrypt', 'decrypt']
     );
   }
   ```

2. **Room Key Exchange**
   ```typescript
   // When creating a room, generate a symmetric key
   async function generateRoomKey() {
     return await crypto.subtle.generateKey(
       { name: 'AES-GCM', length: 256 },
       true,
       ['encrypt', 'decrypt']
     );
   }
   
   // Encrypt room key for each participant using their public key
   async function shareRoomKey(roomKey: CryptoKey, recipientPublicKey: CryptoKey) {
     const exported = await crypto.subtle.exportKey('raw', roomKey);
     return await crypto.subtle.encrypt(
       { name: 'RSA-OAEP' },
       recipientPublicKey,
       exported
     );
   }
   ```

3. **Message Encryption Flow**
   ```
   Client A                    Server                     Client B
      |                          |                           |
      |-- Encrypt msg w/ room key -->                        |
      |                          |                           |
      |--- Send encrypted msg ---|                          |
      |                          |                           |
      |                          |--- Forward encrypted ---> |
      |                          |                           |
      |                          |    <-- Decrypt w/ room key |
   ```

**Pros:**
- Good balance of security and simplicity
- Messages encrypted at rest
- Key exchange is secure
- Can add features incrementally

**Cons:**
- More complex than simple symmetric
- Need to manage public keys
- Initial setup overhead

## Recommendations

### Phase 1: Basic Security (Quick Win)
1. ✅ Ensure all traffic uses HTTPS
2. ✅ Implement proper authentication (JWT)
3. ✅ Sanitize input to prevent XSS
4. ⚠️ Add message integrity checks (HMAC)

### Phase 2: Symmetric Encryption (Medium Priority)
1. Implement AES-GCM encryption for messages
2. Generate room-specific encryption keys
3. Store keys in browser's IndexedDB
4. Encrypt messages before sending to server
5. Decrypt messages after receiving from server

### Phase 3: True E2E Encryption (Long-term)
1. Implement key pair generation for users
2. Set up key exchange mechanism
3. Implement hybrid encryption (RSA + AES)
4. Add key rotation capabilities
5. Implement device verification

## Security Considerations

1. **Key Storage:**
   - Never store private keys in localStorage (vulnerable to XSS)
   - Use IndexedDB with encryption
   - Consider hardware security modules for production

2. **Key Distribution:**
   - Verify public keys out-of-band (QR codes, fingerprints)
   - Implement key verification UI
   - Warn users about unverified keys

3. **Backward Compatibility:**
   - Support unencrypted messages during transition
   - Clear indication of encryption status in UI
   - Migration path for existing messages

4. **Performance:**
   - Encrypt/decrypt operations should be < 50ms
   - Use Web Workers for heavy crypto operations
   - Implement message caching

## Implementation Priority

**Immediate (This PR):**
- ✅ Document encryption approaches
- ✅ Evaluate feasibility

**Next Sprint:**
- Implement symmetric encryption (AES-GCM)
- Add encryption toggle in settings
- Display encryption status in UI

**Future:**
- Implement proper key exchange
- Add key verification
- Implement key rotation

## Testing Strategy

1. **Unit Tests:**
   - Test encryption/decryption functions
   - Test key generation
   - Test edge cases (empty messages, special characters)

2. **Integration Tests:**
   - Test encrypted message flow
   - Test key exchange
   - Test backward compatibility

3. **Security Tests:**
   - Penetration testing
   - Code audit
   - Vulnerability scanning

## References

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Signal Protocol](https://signal.org/docs/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [libsignal-protocol-javascript](https://github.com/signalapp/libsignal-protocol-javascript)

## Conclusion

For NoteHub's current scale and requirements, a **hybrid approach** with symmetric encryption (AES-GCM) for messages and asymmetric encryption (RSA-OAEP) for key exchange provides the best balance of:
- Security (messages encrypted at rest and in transit)
- Performance (fast symmetric encryption)
- Implementation complexity (manageable with Web Crypto API)
- User experience (transparent encryption)

This approach can be implemented incrementally, starting with basic symmetric encryption and evolving toward true E2E encryption as the application matures.
