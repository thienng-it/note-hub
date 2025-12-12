# Data Compliance Investigation: Database Hashing Requirements

## Executive Summary

This document investigates whether NoteHub should hash sensitive data (notes content, task descriptions) in the database, examining real-world compliance requirements, security best practices, and practical considerations.

**Key Finding:** **Notes and task content should NOT be hashed in the database** for a personal notes application. Instead, **encryption at rest** is the appropriate security measure for this use case.

---

## Investigation Scope

### Questions Addressed
1. Should we hash note content (body field) in the database?
2. Should we hash task descriptions in the database?
3. What are real-world data compliance requirements (GDPR, privacy laws)?
4. What security measures are appropriate for a personal notes application?

### Current Security Implementation

#### ✅ Already Implemented (Excellent)
- **Password Hashing**: bcrypt with 14 rounds (industry best practice)
- **TOTP Secrets**: Stored for 2FA functionality
- **JWT Tokens**: Secure authentication with refresh tokens
- **SQL Injection Protection**: Parameterized queries throughout
- **XSS Protection**: HTML sanitization with sanitize-html
- **HTTPS/TLS**: SSL certificates with Let's Encrypt
- **Rate Limiting**: Protection against brute force attacks

#### Current Data Storage
```sql
-- Users table
password_hash TEXT      -- ✅ HASHED (bcrypt, 14 rounds)
email TEXT              -- ❌ PLAINTEXT
totp_secret TEXT        -- ❌ PLAINTEXT (required for 2FA)
bio TEXT                -- ❌ PLAINTEXT

-- Notes table
title TEXT              -- ❌ PLAINTEXT
body TEXT               -- ❌ PLAINTEXT
images TEXT             -- ❌ PLAINTEXT (JSON paths)

-- Tasks table
title TEXT              -- ❌ PLAINTEXT
description TEXT        -- ❌ PLAINTEXT
images TEXT             -- ❌ PLAINTEXT (JSON paths)
```

---

## Understanding Hashing vs Encryption

### Hashing
**Purpose:** One-way transformation for data integrity and password storage

**Characteristics:**
- ✅ One-way only (cannot be reversed)
- ✅ Same input always produces same output
- ✅ Perfect for passwords
- ❌ Cannot retrieve original data
- ❌ Useless for content that needs to be displayed

**Use Cases:**
- Passwords
- Data integrity verification (checksums)
- Digital signatures

### Encryption
**Purpose:** Two-way transformation for data confidentiality

**Characteristics:**
- ✅ Can be reversed with key
- ✅ Protects data at rest
- ✅ Allows retrieval of original content
- ❌ Requires key management
- ❌ Performance overhead

**Use Cases:**
- Database encryption at rest
- File encryption
- Communication encryption (HTTPS)
- Sensitive personal data

---

## Real-World Data Compliance Analysis

### GDPR (General Data Protection Regulation)

**Key Requirements:**
1. **Data Minimization** - Collect only necessary data ✅
2. **Purpose Limitation** - Use data only for stated purpose ✅
3. **Storage Limitation** - Don't keep data longer than needed ✅
4. **Integrity and Confidentiality** - Protect with appropriate security ⚠️

**GDPR Article 32 - Security of Processing:**
> "Taking into account the state of the art... implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including... the pseudonymisation and **encryption of personal data**."

**Key Points:**
- GDPR requires **encryption**, not hashing
- Personal data = names, emails, user content
- Notes and tasks are user-generated content (not PII by default)
- Encryption at rest + HTTPS in transit satisfies GDPR

### HIPAA (Health Insurance Portability and Accountability Act)

**Scope:** Only applies if handling Protected Health Information (PHI)

**For NoteHub:**
- ❌ Not a healthcare application
- ❌ Not designed for medical records
- ⚠️ Users might store health notes (not our intended use)
- ✅ If users store PHI, encryption at rest + access controls sufficient

### CCPA (California Consumer Privacy Act)

**Requirements:**
- Reasonable security measures
- Encryption recommended but not mandated
- Focus on access control and user rights

### Industry Standards (OWASP, NIST)

**OWASP Top 10 2021:**
- A02:2021 – Cryptographic Failures
  - Use encryption for sensitive data at rest
  - Use TLS for data in transit
  - **Never hash data that needs to be retrieved**

**NIST Cybersecurity Framework:**
- Protect (PR) → Data Security (PR.DS)
  - PR.DS-1: Data-at-rest is protected
  - **Recommendation:** Encryption, not hashing

---

## Analysis: Should We Hash Notes and Tasks?

### ❌ Why Hashing Note Content is WRONG

#### 1. **Functional Impossibility**
```javascript
// What happens if we hash notes?
const noteContent = "My important meeting notes";
const hashed = bcrypt.hash(noteContent, 14);
// Result: $2b$14$xyz...abc123 (60 characters of gibberish)

// When user tries to view the note:
// ❌ CANNOT decrypt/unhash
// ❌ User sees: $2b$14$xyz...abc123
// ❌ Application is useless
```

#### 2. **Defeats the Purpose of Notes Application**
- Notes must be **readable** to be useful
- Hashing makes data **permanently unreadable**
- Users would never be able to view their notes
- Search functionality would be impossible

#### 3. **Not a Security Best Practice**
- No major notes application hashes content:
  - ❌ Notion: Doesn't hash notes
  - ❌ Evernote: Doesn't hash notes
  - ❌ OneNote: Doesn't hash notes
  - ❌ Apple Notes: Doesn't hash notes
  - ✅ All use encryption at rest instead

#### 4. **Misunderstanding of Compliance**
- GDPR requires **encryption**, not hashing
- Healthcare regulations require **encryption**, not hashing
- Industry standards recommend **encryption**, not hashing

### ✅ What We SHOULD Do Instead

#### 1. **Encryption at Rest (Database Level)**

**SQLite Encryption:**
```bash
# Option A: SQLCipher (encrypted SQLite)
npm install better-sqlite3-sqlcipher

# Option B: Filesystem encryption (simpler)
# - Linux: LUKS, dm-crypt
# - macOS: FileVault
# - Windows: BitLocker
```

**MySQL Encryption:**
```sql
-- Enable InnoDB encryption at rest
ALTER TABLE notes ENCRYPTION='Y';
ALTER TABLE tasks ENCRYPTION='Y';
ALTER TABLE users ENCRYPTION='Y';

-- Configure in my.cnf
[mysqld]
innodb_encrypt_tables=ON
innodb_encrypt_log=ON
```

**Benefits:**
- ✅ Protects data at rest
- ✅ Transparent to application
- ✅ No code changes needed
- ✅ Standard industry practice
- ✅ GDPR compliant

#### 2. **Enhanced Access Controls**

```javascript
// Already implemented ✅
- JWT authentication
- Row-level security (owner_id checks)
- Session management
- Rate limiting
```

#### 3. **Audit Logging**

```javascript
// Log sensitive operations
logger.info('Note accessed', { 
  noteId, 
  userId, 
  action: 'view',
  timestamp: new Date(),
  ip: req.ip 
});
```

#### 4. **Optional: End-to-End Encryption (E2EE)**

For users requiring maximum security:

```javascript
// Client-side encryption (advanced feature)
class E2EEncryption {
  static async encryptNote(content, userKey) {
    // Encrypt on client before sending to server
    // Server stores encrypted content
    // Only user with key can decrypt
  }
}
```

**Trade-offs:**
- ✅ Maximum security (zero-knowledge)
- ❌ Server-side search disabled
- ❌ Complex key management
- ❌ Lost key = lost data
- ⚠️ Only for high-security use cases

---

## Recommendations

### 1. Current Implementation is Appropriate ✅

**What's Already Secure:**
- Password hashing (bcrypt, 14 rounds) ✅
- HTTPS/TLS encryption in transit ✅
- SQL injection protection ✅
- XSS protection ✅
- JWT authentication ✅
- Rate limiting ✅

### 2. Optional Enhancements (Priority Order)

#### High Priority
1. **Database Encryption at Rest**
   - **SQLite:** Document filesystem encryption setup
   - **MySQL:** Enable InnoDB table encryption
   - **Impact:** Protects against disk theft, unauthorized filesystem access
   - **Effort:** Low (configuration only)

2. **Audit Logging**
   - Log note/task access, modifications, deletions
   - Helps with compliance and security monitoring
   - Already partially implemented with request logging

#### Medium Priority
3. **Data Retention Policy**
   - Implement automatic deletion of old data (if requested)
   - GDPR "right to be forgotten" compliance
   - Add archive functionality

4. **Backup Encryption**
   - Encrypt database backups
   - Secure backup storage locations

#### Low Priority (Advanced Features)
5. **End-to-End Encryption (Optional)**
   - Client-side encryption for paranoid users
   - Disable server-side search for encrypted notes
   - Complex feature, high maintenance

### 3. Documentation Updates

Create/update the following documentation:

1. **Data Compliance Guide** (NEW)
   - GDPR compliance measures
   - Data protection strategy
   - Encryption recommendations
   - Privacy policy guidance

2. **Deployment Security Guide** (UPDATE)
   - Add database encryption setup
   - Filesystem encryption instructions
   - Backup encryption procedures

3. **Security Policy** (UPDATE)
   - Document data protection measures
   - Add encryption at rest section
   - Update threat model

---

## Implementation Plan (Optional Enhancements)

### Phase 1: Documentation (Recommended)
1. Create data compliance documentation ✅ (This document)
2. Update security documentation
3. Add deployment guide for encryption at rest
4. Document backup encryption procedures

**Effort:** 1-2 hours  
**Impact:** High (helps users understand security)  
**Priority:** HIGH

### Phase 2: Database Encryption Guide (Recommended)
1. Document SQLite encryption options
2. Document MySQL encryption setup
3. Provide configuration examples
4. Add troubleshooting section

**Effort:** 2-3 hours  
**Impact:** High (improves security posture)  
**Priority:** HIGH

### Phase 3: Audit Logging (Optional)
1. Enhance logging for data access
2. Add note/task modification logs
3. Implement log rotation
4. Create audit report functionality

**Effort:** 4-6 hours  
**Impact:** Medium (helps with compliance)  
**Priority:** MEDIUM

### Phase 4: E2E Encryption (Optional - Advanced)
1. Design client-side encryption system
2. Implement key management
3. Add encrypted note marker
4. Disable search for encrypted notes
5. UI for encryption toggle

**Effort:** 20+ hours  
**Impact:** Low (niche feature)  
**Priority:** LOW

---

## Conclusion

### Answer to Original Question

**Q: Should we hash note content and task descriptions in the database?**

**A: NO. Hashing is the WRONG approach.**

### Why?
1. **Hashing is one-way** - You cannot retrieve hashed data
2. **Notes must be readable** - Application would be useless
3. **Not a compliance requirement** - GDPR requires encryption, not hashing
4. **Not industry practice** - No major notes app hashes content
5. **Defeats the purpose** - Users need to read their notes

### What to Do Instead?
1. **Keep current implementation** - Already secure for a notes app
2. **Add encryption at rest** - Protect database files (optional but recommended)
3. **Document security measures** - Help users understand protections
4. **Continue best practices** - Maintain password hashing, HTTPS, access controls

### Current Security Grade: B+ → A with encryption at rest

**Strengths:**
- ✅ Strong password hashing (bcrypt, 14 rounds)
- ✅ HTTPS/TLS encryption
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ JWT authentication
- ✅ Rate limiting

**To Reach A+ (Optional):**
- Add database encryption at rest
- Enhance audit logging
- Document compliance measures

---

## References

### Data Protection Regulations
- [GDPR Official Text](https://gdpr-info.eu/) - European data protection
- [CCPA Overview](https://oag.ca.gov/privacy/ccpa) - California privacy law
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/) - Healthcare data

### Security Standards
- [OWASP Top 10 2021](https://owasp.org/Top10/) - Web application security
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) - Security best practices
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks) - Configuration standards

### Encryption Best Practices
- [SQLCipher](https://www.zetetic.net/sqlcipher/) - SQLite encryption
- [MySQL InnoDB Encryption](https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html)
- [PostgreSQL Encryption](https://www.postgresql.org/docs/current/encryption-options.html)

### Industry Examples
- [Notion Security](https://www.notion.so/security) - Encryption at rest, HTTPS
- [Evernote Security](https://evernote.com/security) - Database encryption, TLS
- [Apple Notes Security](https://support.apple.com/en-us/HT202303) - Optional E2E encryption

---

**Document Status:** Investigation Complete  
**Recommendation:** Do NOT hash notes/tasks. Optionally add encryption at rest.  
**Next Steps:** Update documentation with encryption at rest guidance  
**Last Updated:** 2025-12-12  
**Author:** Security Investigation Team
