# SentinelKey — Encryption Architecture & Key Management Design

**Document Version:** 1.0.0  
**Phase:** 5 (Encryption at Rest & File Pipeline)  
**Status:** Approved for Implementation  
**Author:** SentinelKey Core Security Architecture  

---

## 1. Executive Summary & Design Gate

Phase 5 establishes a centralized, cryptographically sound encryption layer for **field-level database encryption** and **encrypted file storage and streaming**.

In accordance with SentinelKey core constraints:
- All cryptographic primitives use Node.js standard `crypto` (AES-256-GCM, HKDF, SHA-256).
- Zero third-party SaaS or proprietary external encryption SDKs.
- This design document is committed **before** implementation code is written.

---

## 2. Key Management Architecture

### 2.1 Master Key Storage Options & Decision

| Strategy | Feasibility in Self-Hosted Stack | Decision |
|---|---|---|
| **Environment Variable Injection** (`ENCRYPTION_MASTER_KEY_V1`) | Native, 12-factor standard, zero external network dependency | **Primary Default** |
| **Self-Hosted Restricted Key File** (`/etc/sentinelkey/keys/master.key`) | Supports file permission locking (`chmod 400`), local root isolation | **Supported via Provider** |
| **Cloud KMS** (AWS KMS / GCP Cloud KMS / Vault) | High assurance, hardware HSM | **Optional Peripheral Adapter** |

**Adopted Decision:**  
SentinelKey implements an `IKeyProvider` interface with a primary **Environment & Keystore Provider** (`EnvKeyProvider`). Master keys are supplied as 256-bit (32-byte) hex strings.
A versioned key registry manages active and historical keys:
```typescript
export interface KeyEntry {
  version: number;          // Monotonically increasing version (e.g. 1, 2, 3)
  key: Buffer;              // 32-byte raw binary AES key
  status: 'active' | 'decrypt_only' | 'retired';
  createdAt: Date;
}
```

### 2.2 Key Derivation & Domain Separation (HKDF)

To prevent cross-protocol attacks and avoid reusing the master key directly across different cryptographic contexts, we use **RFC 5869 HKDF (HMAC-based Key Derivation Function)** with SHA-256:
- Master Key $\rightarrow$ `HKDF(masterKey, salt, info="sentinelkey:field-encryption:v1")` $\rightarrow$ Field Key
- Master Key $\rightarrow$ `HKDF(masterKey, salt, info="sentinelkey:file-storage:v1")` $\rightarrow$ File Key
- Master Key $\rightarrow$ `HKDF(masterKey, salt, info="sentinelkey:mfa-secrets:v1")` $\rightarrow$ MFA Key

---

## 3. Cryptographic Envelopes & Wire Formats

### 3.1 Field-Level Encryption Format

For sensitive database fields (e.g. user personal identifiers, recovery credentials, confidential notes):

**Cipher:** AES-256-GCM (Authenticated Encryption with Associated Data - AEAD)  
**IV Length:** 96 bits (12 bytes, cryptographically secure random per encryption)  
**Auth Tag Length:** 128 bits (16 bytes)  
**Serialization Format:** Compact prefixed string:
```
enc:v{version}:{iv_hex}:{tag_hex}:{ciphertext_hex}
```
*Example:*
```
enc:v1:a1b2c3d4e5f60718293a4b5c:0102030405060708090a0b0c0d0e0f10:9876543210fedcba...
```

**Benefits:**
- Human-inspectable prefix (`enc:v1`) prevents accidental double-encryption.
- Atomic extraction of IV, authentication tag, and version tag without secondary metadata collections.
- Database administrators inspecting raw Mongo documents see high-entropy ciphertext with zero plaintext leakage.

### 3.2 File-Level Encryption Format (`.skenc`)

For binary file storage (uploads, attachments, sensitive documents):

**Binary Header Format (34 bytes header + ciphertext):**
```
+---------------+-------------------+------------------+---------------------+-------------------+
| Magic (4B)    | Version (2B uint) | IV / Nonce (12B) | Auth Tag (16B)      | Ciphertext (NB)   |
| 'SKF1'        | 0x0001            | 12 random bytes  | 16 bytes GCM tag    | Encrypted payload |
+---------------+-------------------+------------------+---------------------+-------------------+
```

**Header Breakdown:**
1. **Magic Bytes (4 bytes):** `0x53 0x4B 0x46 0x31` (ASCII `"SKF1"` for SentinelKey File Format 1).
2. **Key Version (2 bytes big-endian unsigned integer):** Indicates which key version in the registry was used.
3. **Initialization Vector (12 bytes):** Unique per-file random nonce.
4. **Authentication Tag (16 bytes):** AES-256-GCM authentication tag verifying integrity of both header and body.
5. **Ciphertext (Remaining stream bytes):** AES-256-GCM encrypted payload.

---

## 4. Key Rotation Policy & Lifecycle

### 4.1 Rotation Cadence
- **Standard Cadence:** Master key rotated every 90 days or immediately upon suspected credential exposure.
- **Zero-Downtime Guarantee:** Rotating the active key **never** breaks existing data.

### 4.2 Key Lifecycle States
1. `ACTIVE`: Used for all new encryptions (fields and files).
2. `DECRYPT_ONLY`: Retained in memory to decrypt data created under previous versions; rejected for new writes.
3. `RETIRED`: Purged after all historical data has been migrated to newer versions.

### 4.3 Migration & Re-encryption Strategy
- **Lazy Re-encryption:** Whenever an existing record with an older key version is updated by the application, it is automatically re-encrypted with the current `ACTIVE` key version.
- **Batch Re-encryption CLI / Utility:** An administrative task can iterate over all stored files and sensitive collections in the background, decrypting with `v{old}` and re-encrypting with `v{new}`.

---

## 5. Security Invariants & Threat Model

1. **Compromised Database / Storage Disk:**  
   If an adversary dumps the MongoDB database or accesses the raw uploaded file storage directory, all sensitive fields and files remain fully confidential and tamper-proof.
2. **Tampering Detection:**  
   Any modification to ciphertext, IV, or header produces an immediate GCM authentication tag mismatch (`ERR_CRYPTO_TAMPERED`), halting execution and preventing corrupted data ingestion.
3. **Replay & Cross-File Integrity:**  
   Every single field and file uses a cryptographically distinct 96-bit nonce; nonces are never reused.
4. **Audit Logging Integration:**  
   Every file download and decryption operation emits an audit event to the Phase 3 `EventLoggerService` (`FILE_DOWNLOADED`, `FILE_DECRYPTED`). Unauthorized download attempts immediately emit `PERMISSION_DENIED` and trigger IDS heuristics.

---

## 6. Implementation Scope for Phase 5

1. **`KeyManagerService`** (`apps/api/src/services/key-manager.service.ts`):
   - Multi-version key registry (`PRIMARY_KEY_VERSION`, historical keys).
   - HKDF derivation for domain-specific keys.
   - Key rotation APIs (`rotateKey(newKey)`).
2. **`FieldEncryptionService`** (`apps/api/src/services/field-encryption.service.ts`):
   - `encryptField(plaintext, version?)` $\rightarrow$ string format `enc:v{version}:...`
   - `decryptField(encryptedStr)` $\rightarrow$ string
   - Schema helpers / plugins for Mongoose models.
3. **`FileStorageService`** (`apps/api/src/services/file-storage.service.ts`):
   - `saveEncryptedFile(buffer, filename, mimeType, userId)`
   - `readDecryptedFile(fileId, userId, userRoles)`
   - Full streaming / buffer encryption with `SKF1` binary header.
4. **File Model & Endpoints**:
   - `EncryptedFile` model (`id`, `filename`, `mimeType`, `sizeOriginal`, `sizeEncrypted`, `keyVersion`, `checksumSha256`, `uploadedBy`).
   - `POST /files/upload` (role: `files:write`).
   - `GET /files/:id/download` (role: `files:read`, ownership or admin).
   - `GET /files` (list user/admin files).
   - `POST /files/:id/rotate` (re-encrypt with active key).
5. **Phase 3 Telemetry Wire-up**:
   - `FILE_UPLOADED`, `FILE_DOWNLOADED`, `FILE_DECRYPTED`, `FILE_ROTATED`.
6. **Comprehensive Test Suite**:
   - Roundtrip field encryption/decryption.
   - Byte-identical file roundtrip.
   - Tamper detection.
   - Key rotation verification.
   - Unauthorized access logging.
