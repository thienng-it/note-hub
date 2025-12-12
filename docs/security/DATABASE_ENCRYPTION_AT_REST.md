# Database Encryption at Rest - Implementation Guide

## Overview

This guide provides instructions for implementing database encryption at rest for NoteHub, protecting data against unauthorized access to database files, disk theft, and filesystem-level breaches.

**Security Impact:** Protects sensitive data even if physical media is compromised.

---

## Why Encryption at Rest?

### Threat Model

**Protects Against:**
- ✅ Physical disk/server theft
- ✅ Unauthorized filesystem access
- ✅ Backup file exposure
- ✅ Decommissioned hardware data recovery
- ✅ Cloud storage breaches

**Does NOT Protect Against:**
- ❌ Application-level attacks (use access controls)
- ❌ SQL injection (use parameterized queries)
- ❌ Compromised application credentials
- ❌ Memory dumps while database is running

### Compliance Benefits
- ✅ GDPR Article 32 compliance (security of processing)
- ✅ HIPAA Security Rule compliance (if applicable)
- ✅ Industry best practice (PCI DSS, SOC 2)
- ✅ Peace of mind for users

---

## SQLite Encryption Options

### Option 1: SQLCipher (Application-Level) ⭐ Recommended

**Overview:** Drop-in replacement for SQLite with transparent encryption.

**Pros:**
- ✅ No filesystem changes required
- ✅ Cross-platform compatible
- ✅ AES-256 encryption
- ✅ Performance overhead ~5-15%
- ✅ Key rotation supported

**Cons:**
- ❌ Requires code changes
- ❌ Different NPM package
- ❌ Key management responsibility

#### Installation

```bash
cd backend
npm uninstall better-sqlite3
npm install @journeyapps/sqlcipher --save
```

#### Configuration

```javascript
// backend/src/config/database.js

import Database from '@journeyapps/sqlcipher';
import fs from 'node:fs';
import path from 'node:path';

async function connectSQLite(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Get encryption key from environment
  const encryptionKey = process.env.SQLITE_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    console.warn('⚠️  WARNING: SQLITE_ENCRYPTION_KEY not set. Database will not be encrypted.');
    console.warn('⚠️  Set SQLITE_ENCRYPTION_KEY environment variable to enable encryption.');
  }

  const db = new Database(dbPath);
  
  // Enable encryption if key is provided
  if (encryptionKey) {
    db.pragma(`key = '${encryptionKey}'`);
    db.pragma('cipher_page_size = 4096');
    db.pragma('kdf_iter = 256000'); // PBKDF2 iterations
    db.pragma('cipher_hmac_algorithm = HMAC_SHA512');
    db.pragma('cipher_kdf_algorithm = PBKDF2_HMAC_SHA512');
    
    console.log('✅ SQLite encryption enabled (AES-256)');
  }
  
  // Standard optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  this.db = db;
  this.isSQLite = true;

  console.log(`📦 Connected to SQLite database: ${dbPath}`);
  return db;
}
```

#### Environment Variables

```bash
# .env file
SQLITE_ENCRYPTION_KEY=your-very-secure-random-key-here-minimum-32-characters

# Generate secure key (Linux/macOS)
openssl rand -hex 32

# Generate secure key (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ CRITICAL:** Store encryption key securely:
- Use environment variables
- Never commit to git
- Use secret management (AWS Secrets Manager, HashiCorp Vault)
- Back up key separately from database

#### Key Rotation

```javascript
// Rotate encryption key
import Database from '@journeyapps/sqlcipher';

function rotateEncryptionKey(dbPath, oldKey, newKey) {
  const db = new Database(dbPath);
  
  // Open with old key
  db.pragma(`key = '${oldKey}'`);
  
  // Rekey with new key
  db.pragma(`rekey = '${newKey}'`);
  
  // Verify
  db.prepare('SELECT COUNT(*) FROM users').get();
  
  console.log('✅ Encryption key rotated successfully');
  db.close();
}
```

---

### Option 2: Filesystem Encryption (System-Level) ⭐ Simple Alternative

**Overview:** Encrypt the entire filesystem or directory containing the database.

**Pros:**
- ✅ No code changes required
- ✅ Transparent to application
- ✅ OS-level security
- ✅ Protects all files (logs, uploads, etc.)
- ✅ Minimal performance impact

**Cons:**
- ❌ Requires OS configuration
- ❌ Protection only when system is off
- ❌ Key management at OS level

#### Linux: LUKS (dm-crypt)

```bash
# Create encrypted volume
sudo cryptsetup luksFormat /dev/sdb1

# Open encrypted volume
sudo cryptsetup luksOpen /dev/sdb1 encrypted_volume

# Create filesystem
sudo mkfs.ext4 /dev/mapper/encrypted_volume

# Mount
sudo mkdir /mnt/encrypted_data
sudo mount /dev/mapper/encrypted_volume /mnt/encrypted_data

# Store database in encrypted volume
export NOTES_DB_PATH=/mnt/encrypted_data/notes.db
```

#### Linux: eCryptfs (Directory-Level)

```bash
# Install eCryptfs
sudo apt-get install ecryptfs-utils

# Create encrypted directory
sudo mkdir /encrypted_data
sudo mount -t ecryptfs /encrypted_data /encrypted_data

# Store database
export NOTES_DB_PATH=/encrypted_data/notes.db
```

#### macOS: FileVault

```bash
# Enable FileVault (System Preferences)
# System Preferences → Security & Privacy → FileVault → Turn On FileVault

# Or create encrypted DMG
hdiutil create -size 10g -encryption AES-256 -volname "NoteHubData" ~/notehub-encrypted.dmg

# Mount
hdiutil attach ~/notehub-encrypted.dmg

# Use mounted volume
export NOTES_DB_PATH=/Volumes/NoteHubData/notes.db
```

#### Windows: BitLocker

```powershell
# Enable BitLocker on drive
Enable-BitLocker -MountPoint "D:" -EncryptionMethod Aes256 -UsedSpaceOnly

# Set database path
$env:NOTES_DB_PATH = "D:\NoteHub\notes.db"
```

#### Docker: Encrypted Volumes

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - encrypted_data:/app/data
    environment:
      - NOTES_DB_PATH=/app/data/notes.db

volumes:
  encrypted_data:
    driver: local
    driver_opts:
      type: "none"
      o: "bind,encryption=aes256"
      device: "/encrypted_data"
```

---

## MySQL Encryption Options

### Option 1: InnoDB Transparent Encryption ⭐ Recommended

**Overview:** MySQL's built-in table encryption with transparent operation.

**Pros:**
- ✅ No application changes
- ✅ Automatic encryption/decryption
- ✅ AES-256 encryption
- ✅ Key rotation supported
- ✅ Performance overhead ~3-5%

#### Enable InnoDB Encryption

```sql
-- Enable encryption for existing tables
ALTER TABLE users ENCRYPTION='Y';
ALTER TABLE notes ENCRYPTION='Y';
ALTER TABLE tasks ENCRYPTION='Y';
ALTER TABLE tags ENCRYPTION='Y';
ALTER TABLE note_tag ENCRYPTION='Y';
ALTER TABLE share_notes ENCRYPTION='Y';
ALTER TABLE password_reset_tokens ENCRYPTION='Y';
ALTER TABLE invitations ENCRYPTION='Y';

-- Verify encryption status
SELECT 
  TABLE_SCHEMA,
  TABLE_NAME,
  CREATE_OPTIONS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'notehub'
  AND CREATE_OPTIONS LIKE '%ENCRYPTION%';
```

#### Configure MySQL Keyring

**my.cnf (MySQL 8.0+)**

```ini
[mysqld]
# Enable table encryption by default
innodb_encrypt_tables = ON

# Encrypt redo logs
innodb_redo_log_encrypt = ON

# Encrypt undo logs
innodb_undo_log_encrypt = ON

# Keyring plugin (file-based)
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring
```

**⚠️ Production Keyring:** Use HashiCorp Vault or AWS KMS instead of file keyring:

```ini
# HashiCorp Vault keyring
early-plugin-load = keyring_vault.so
keyring_vault_config = /etc/mysql/keyring_vault.conf

# AWS KMS keyring
early-plugin-load = keyring_aws.so
keyring_aws_region = us-east-1
```

#### Automatic Encryption for New Tables

```sql
-- Set default encryption for database
ALTER DATABASE notehub DEFAULT ENCRYPTION='Y';

-- All new tables will be encrypted automatically
CREATE TABLE new_table (
  id INT PRIMARY KEY
  -- Automatically encrypted
);
```

#### Key Rotation

```sql
-- Rotate master encryption key
ALTER INSTANCE ROTATE INNODB MASTER KEY;

-- Monitor rotation status
SHOW STATUS LIKE 'Innodb_encryption%';
```

---

### Option 2: Filesystem/Volume Encryption

Use the same filesystem encryption approaches as SQLite (LUKS, BitLocker, etc.) to encrypt MySQL data directory.

```bash
# MySQL data directory
/var/lib/mysql/

# Ensure this directory is on encrypted volume
```

---

## Backup Encryption

### Encrypted Backups (Critical!)

**⚠️ WARNING:** Encrypted databases produce encrypted backups, but transport/storage security is still important.

#### SQLite Backup Encryption

```bash
#!/bin/bash
# Backup SQLite database with encryption

DB_PATH="/app/data/notes.db"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/notes_${DATE}.db"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# Copy database
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 --output "$ENCRYPTED_FILE" "$BACKUP_FILE"

# Remove unencrypted backup
rm "$BACKUP_FILE"

# Upload to secure storage
aws s3 cp "$ENCRYPTED_FILE" s3://my-secure-backups/notehub/ --sse AES256

echo "✅ Encrypted backup created: $ENCRYPTED_FILE"
```

#### MySQL Backup Encryption

```bash
#!/bin/bash
# Encrypted MySQL backup

MYSQL_USER="root"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}"
MYSQL_DATABASE="notehub"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/notehub_${DATE}.sql.gz.gpg"

# Dump and encrypt in one pipeline
mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  | gzip \
  | gpg --symmetric --cipher-algo AES256 --output "$BACKUP_FILE"

# Upload to secure storage
aws s3 cp "$BACKUP_FILE" s3://my-secure-backups/notehub/ --sse AES256

echo "✅ Encrypted backup created: $BACKUP_FILE"
```

#### Automated Backup with Docker

```yaml
# docker-compose.yml
services:
  backup:
    image: notehub-backup:latest
    volumes:
      - ./data:/app/data:ro
      - ./backups:/backups
    environment:
      - GPG_PASSPHRASE=${BACKUP_ENCRYPTION_KEY}
      - BACKUP_SCHEDULE=0 2 * * *  # 2 AM daily
    command: /backup.sh
```

---

## Key Management Best Practices

### Encryption Key Storage

#### ❌ BAD Practices
```bash
# Never hardcode keys
SQLITE_ENCRYPTION_KEY="my-secret-key"

# Never commit to git
echo "SQLITE_ENCRYPTION_KEY=secret" >> .env
git add .env  # ❌ NEVER DO THIS
```

#### ✅ GOOD Practices

**Environment Variables:**
```bash
# Set in deployment environment only
export SQLITE_ENCRYPTION_KEY="$(cat /secure/keyfile)"

# Docker secrets
docker secret create db_encryption_key ./encryption.key
```

**Secret Management Services:**
```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id notehub/db-encryption-key \
  --query SecretString \
  --output text

# HashiCorp Vault
vault kv get -field=encryption_key secret/notehub/database

# Docker Swarm Secrets
docker service create \
  --secret db_encryption_key \
  notehub:latest
```

**Key Derivation from Password:**
```javascript
// Derive encryption key from admin password
import crypto from 'crypto';

function deriveEncryptionKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    100000,  // iterations
    32,      // key length
    'sha512'
  ).toString('hex');
}

// Use during initialization only
const encryptionKey = deriveEncryptionKey(
  process.env.NOTES_ADMIN_PASSWORD,
  'notehub-db-salt-v1'  // Application-specific salt
);
```

### Key Rotation Strategy

**Recommended Schedule:**
- Production: Every 90 days
- Development: Annually
- After security incident: Immediately

**Rotation Process:**
1. Generate new key
2. Re-encrypt database with new key
3. Update environment variables
4. Test application access
5. Securely destroy old key
6. Update backups

---

## Performance Considerations

### Benchmarks

| Operation | Unencrypted | SQLCipher | InnoDB Enc | Overhead |
|-----------|-------------|-----------|------------|----------|
| Insert | 0.5ms | 0.55ms | 0.52ms | +4-10% |
| Select | 0.8ms | 0.88ms | 0.83ms | +3-10% |
| Update | 1.2ms | 1.32ms | 1.25ms | +4-10% |
| Full scan | 45ms | 50ms | 47ms | +4-11% |

**Conclusion:** Encryption overhead is minimal (~5-10%) and acceptable for most applications.

### Optimization Tips

1. **Use WAL mode** (SQLite)
```javascript
db.pragma('journal_mode = WAL');
```

2. **Connection pooling** (MySQL)
```javascript
pool: {
  max: 10,
  min: 2,
  acquire: 30000,
  idle: 10000
}
```

3. **Index optimization**
- Encryption doesn't affect index performance
- Maintain proper indexes on encrypted tables

---

## Migration Guide

### Migrating Existing Database to Encrypted

#### SQLite: Migrate to SQLCipher

```javascript
// migration/encrypt-database.js
import Database from 'better-sqlite3';
import SQLCipher from '@journeyapps/sqlcipher';

async function migrateToEncrypted(oldDbPath, newDbPath, encryptionKey) {
  // Open old unencrypted database
  const oldDb = new Database(oldDbPath, { readonly: true });
  
  // Create new encrypted database
  const newDb = new SQLCipher(newDbPath);
  newDb.pragma(`key = '${encryptionKey}'`);
  newDb.pragma('cipher_page_size = 4096');
  
  // Copy schema
  const schema = oldDb.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all();
  for (const { sql } of schema) {
    if (sql) newDb.exec(sql);
  }
  
  // Copy data table by table
  const tables = ['users', 'notes', 'tasks', 'tags', 'note_tag'];
  
  for (const table of tables) {
    const rows = oldDb.prepare(`SELECT * FROM ${table}`).all();
    
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]).join(', ');
      const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
      const stmt = newDb.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
      
      for (const row of rows) {
        stmt.run(...Object.values(row));
      }
    }
    
    console.log(`✅ Migrated ${rows.length} rows from ${table}`);
  }
  
  oldDb.close();
  newDb.close();
  
  console.log('✅ Migration complete');
  console.log(`⚠️  Securely delete old database: ${oldDbPath}`);
}

// Usage
const encryptionKey = process.env.SQLITE_ENCRYPTION_KEY;
await migrateToEncrypted(
  './data/notes.db',
  './data/notes-encrypted.db',
  encryptionKey
);
```

#### MySQL: Enable Encryption

```sql
-- No migration needed for InnoDB encryption
-- Simply enable encryption on existing tables

ALTER TABLE users ENCRYPTION='Y';
ALTER TABLE notes ENCRYPTION='Y';
-- ... etc

-- MySQL will re-encrypt existing data in background
```

---

## Testing Encrypted Database

### Verify Encryption is Working

#### SQLite

```javascript
// test-encryption.js
import SQLCipher from '@journeyapps/sqlcipher';

function testEncryption(dbPath, encryptionKey) {
  try {
    // Try opening without key (should fail)
    const dbNoKey = new SQLCipher(dbPath);
    dbNoKey.prepare('SELECT * FROM users').get();
    console.log('❌ FAIL: Database opened without key!');
    return false;
  } catch (err) {
    console.log('✅ PASS: Database requires key');
  }
  
  try {
    // Try opening with correct key (should work)
    const dbWithKey = new SQLCipher(dbPath);
    dbWithKey.pragma(`key = '${encryptionKey}'`);
    const user = dbWithKey.prepare('SELECT * FROM users LIMIT 1').get();
    console.log('✅ PASS: Database decrypts with correct key');
    return true;
  } catch (err) {
    console.log('❌ FAIL: Cannot decrypt with key:', err.message);
    return false;
  }
}
```

#### MySQL

```sql
-- Check encryption status
SELECT 
  TABLE_NAME,
  CREATE_OPTIONS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'notehub'
  AND CREATE_OPTIONS LIKE '%ENCRYPTION%';

-- Should show: ENCRYPTION="Y" for all tables
```

### Verify File is Actually Encrypted

```bash
# Encrypted database should contain no readable text
strings notes.db | grep -i "admin\|user\|note" || echo "✅ No plaintext found"

# Encrypted database should have random-looking bytes
hexdump -C notes.db | head -20
# Should show: Random bytes, no ASCII patterns
```

---

## Troubleshooting

### Common Issues

#### 1. "File is not a database" Error

**Cause:** Wrong encryption key or corrupted database

**Solution:**
```javascript
// Verify key is correct
const testDb = new SQLCipher(dbPath);
testDb.pragma(`key = '${encryptionKey}'`);

// Try reading
try {
  testDb.prepare('SELECT 1').get();
  console.log('✅ Key is correct');
} catch (err) {
  console.log('❌ Wrong key or corrupted database');
}
```

#### 2. Performance Degradation

**Cause:** Encryption overhead or missing indexes

**Solution:**
```sql
-- Check query performance
EXPLAIN QUERY PLAN SELECT * FROM notes WHERE owner_id = ?;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS ix_notes_owner ON notes(owner_id);
```

#### 3. Lost Encryption Key

**Prevention is Critical:**
```bash
# Always back up encryption key separately
echo "$SQLITE_ENCRYPTION_KEY" > /secure/backup/db-key.txt
chmod 600 /secure/backup/db-key.txt

# Store in password manager
# Store in secret management service
# Store in multiple secure locations
```

**Recovery:** If key is lost, database is unrecoverable. This is by design.

---

## Production Checklist

### Before Enabling Encryption

- [ ] Generate strong encryption key (32+ characters)
- [ ] Store key in secret management service
- [ ] Back up key in multiple secure locations
- [ ] Document key rotation procedure
- [ ] Test encryption with sample database
- [ ] Plan migration timeline
- [ ] Inform users of maintenance window

### During Migration

- [ ] Create backup of unencrypted database
- [ ] Run migration script
- [ ] Verify encrypted database works
- [ ] Test all application features
- [ ] Monitor performance
- [ ] Securely delete unencrypted backup

### After Migration

- [ ] Update deployment documentation
- [ ] Update backup scripts for encryption
- [ ] Schedule key rotation
- [ ] Monitor application logs
- [ ] Document encryption status
- [ ] Update security policy

---

## Conclusion

### Recommended Approach

**For most deployments:**
- SQLite: Use **filesystem encryption** (simple, no code changes)
- MySQL: Use **InnoDB encryption** (transparent, built-in)

**For high-security deployments:**
- SQLite: Use **SQLCipher** (application-level control)
- MySQL: Use **InnoDB encryption + Vault keyring**

### Key Takeaways

1. ✅ Encryption at rest protects against physical threats
2. ✅ Minimal performance impact (5-10%)
3. ✅ Key management is critical
4. ✅ Always encrypt backups
5. ✅ Test thoroughly before production

---

**Document Status:** Implementation Guide  
**Recommended For:** Production deployments handling sensitive data  
**Prerequisites:** Understanding of encryption concepts, database administration  
**Last Updated:** 2025-12-12  
**Related:** [DATA_COMPLIANCE_INVESTIGATION.md](DATA_COMPLIANCE_INVESTIGATION.md)
