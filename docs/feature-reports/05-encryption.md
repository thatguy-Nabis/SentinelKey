# Feature Report: Encryption at Rest & Encrypted File Pipeline

| Field | Value |
|---|---|
| **Feature ID** | SK-05 |
| **Roadmap Phase** | Phase 5 |
| **Status** | Complete |
| **Design doc** | [`apps/api/docs/encryption-design.md`](../../apps/api/docs/encryption-design.md) |
| **Primary location** | `key-manager.service.ts`, `field-encryption.service.ts`, `file-storage.service.ts` |
| **Shared types** | `packages/shared-types/src/encryption.ts` |
| **Hardcoded (core)** | AES-256-GCM, HKDF, rotation policy, file envelope |
| **External APIs** | Optional cloud KMS adapter (not required; env key is default) |

---

## 1. Purpose

Provide field-level and file-level encryption so that a database dump or disk theft does not expose sensitive plaintext. Design decisions were written **before** implementation (Phase 5 gate). All primitives use Node.js `crypto` only.

---

## 2. Problem Statement

MFA secrets, PII-like fields, and uploaded binaries must remain confidential and integrity-protected. Requirements:

- Authenticated encryption (confidentiality + tamper detection)
- Key versioning so rotation does not brick historical data
- Domain separation so one leaked context key does not unlock all domains
- Audit every authorized decrypt/download

---

## 3. Key Management

### Master key sources (`IKeyProvider`)

| Strategy | Status |
|---|---|
| Environment injection (`ENCRYPTION_MASTER_KEY` / versioned keys) | **Primary default** |
| Restricted key file | Supported via provider pattern |
| Cloud KMS | Optional peripheral adapter |

### Registry entry

```ts
{ version: number; key: Buffer; status: 'active' | 'decrypt_only' | 'retired'; createdAt: Date }
```

### HKDF domain separation (RFC 5869, SHA-256)

| Domain info string | Use |
|---|---|
| `sentinelkey:field-encryption:v{N}` (or equivalent domain label) | Field keys |
| `sentinelkey:file-storage:v{N}` | File keys |
| `sentinelkey:mfa-secrets:v{N}` | MFA secret keys |

Master key is never used raw across contexts.

---

## 4. Wire Formats

### Field encryption

```
enc:v{version}:{iv_hex}:{tag_hex}:{ciphertext_hex}
```

- Cipher: AES-256-GCM  
- IV: 96-bit random per encryption  
- Tag: 128-bit  

Inspecting Mongo shows opaque `enc:v…` strings, not plaintext.

### File encryption (`SKF1`)

34-byte header + ciphertext:

| Offset | Field |
|---|---|
| 4B | Magic `SKF1` |
| 2B | Key version (uint16 BE) |
| 12B | IV |
| 16B | GCM tag |
| NB | Ciphertext |

SHA-256 of plaintext stored in `EncryptedFile` metadata; verified on download in addition to GCM tag.

---

## 5. Rotation Policy

- Cadence: ~90 days or on suspected exposure
- New writes use `active` key; prior versions become `decrypt_only`
- Lazy re-encrypt on update; on-demand `POST /files/:id/rotate` and master rotate endpoint
- Zero downtime: old ciphertext remains readable via version tag

---

## 6. API Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/files/upload` | `files:write` | Encrypt + store SKF1 |
| `GET` | `/files` | `files:read` | List (own vs all by role) |
| `GET` | `/files/:id/download` | `files:read` | Decrypt + stream original |
| `POST` | `/files/:id/rotate` | `files:write` | Re-encrypt file to active key |
| `GET` | `/files/keys/status` | `encryption:read` | Active + historical versions |
| `POST` | `/files/keys/rotate` | `encryption:write` | Advance master version |

Unauthorized download → reject + `PERMISSION_DENIED` / high-severity audit path.

---

## 7. Audit Events

| Event | When |
|---|---|
| `FILE_UPLOADED` | Successful encrypted store |
| `FILE_DOWNLOADED` / decrypt access | Authorized decrypt |
| `FILE_KEY_ROTATED` / related | File or master rotation |
| `PERMISSION_DENIED` | Unauthorized download attempt |

Feeds SK-03 IDS and operator logs.

---

## 8. Threat Model Highlights

1. Compromised DB/disk → ciphertext only  
2. Bit-flip / header edit → GCM auth failure (`ERR_CRYPTO_TAMPERED`)  
3. Unique IV per field/file → no nonce reuse  
4. Ownership + RBAC on download  

---

## 9. Testing

| Suite | Coverage |
|---|---|
| `key-manager.test.ts` | Versions, HKDF domains, rotation, decrypt-only |
| `field-encryption.test.ts` | Format, roundtrip, JSON, tamper, rotate |
| `file-storage.test.ts` | SKF1 structure, 64KB byte-identical roundtrip, corrupt magic, ACL + audit |

---

## 10. Configuration

- `ENCRYPTION_MASTER_KEY` (256-bit hex)
- `ACTIVE_KEY_VERSION`
- `FILE_STORAGE_DIR`

---

## 11. Acceptance Criteria (met)

- [x] Design doc committed before code
- [x] Sensitive fields unreadable in raw DB form
- [x] Upload → encrypted store → authorized download byte-identical
- [x] Unauthorized download rejected and logged
- [x] Rotation: old data decrypts via version; new data uses new key

---

## 12. Known Limitations

- Batch re-encrypt CLI for entire collections is designed; primary path is lazy + per-file rotate.
- Production KMS adapter is optional and not required for local/dev.
