# Feature Report: Multi-Factor Authentication (MFA)

| Field | Value |
|---|---|
| **Feature ID** | SK-02 |
| **Roadmap Phase** | Phase 2 |
| **Status** | Complete |
| **Primary location** | `apps/api/src/services/totp.service.ts`, `crypto.service.ts`, `auth.service.ts` (MFA methods) |
| **Shared types** | `packages/shared-types/src/auth.ts` (MFA interfaces) |
| **Hardcoded (core)** | TOTP generation/verification, attempt limiting, backup codes |
| **External APIs** | None for crypto; QR rendering via local `qrcode` library |

---

## 1. Purpose

Adds a second authentication factor on top of password login using **RFC 6238 TOTP**, encrypted secret storage, single-use backup codes, and lockout with exponential backoff. All generation and verification logic is implemented in-repo with Node.js `crypto`.

---

## 2. Problem Statement

Password-only auth fails under phishing, credential dumps, and stuffing. MFA must:

- Bind login completion to a time-based code the attacker does not possess
- Prevent brute-force of the 6-digit space via attempt limits and lockout
- Survive authenticator loss via hashed backup codes
- Never store TOTP secrets or backup codes in plaintext

---

## 3. Architecture Overview

```
Login (password OK, MFA enabled)
  → issue short-lived mfaToken (JWT)
  → client POST /auth/mfa/verify { mfaToken, code }
  → decrypt TOTP secret → verify window ±1 step
  → on success: issue access + refresh tokens

Setup (authenticated)
  → generate secret + 8 backup codes
  → store mfaPendingSecret (encrypted) + hashed backups
  → return Base32 secret, otpauth URI, QR data URL
  → POST /auth/mfa/verify confirms first code → activate MFA
```

### Key components

| Component | Role |
|---|---|
| `totp.service` | RFC 6238 TOTP, Base32, URI, QR data URL, backup codes |
| `crypto.service` | AES-256-GCM encrypt/decrypt for secrets at rest |
| `token.service` | `signMfaToken` / `verifyMfaToken` (5-minute challenge) |
| `auth.service` | `setupMfa`, `verifyMfaSetup`, `verifyMfaLogin`, `disableMfa` |
| User model MFA fields | Encrypted secret, pending secret, backup hashes, attempt/lock state, last time step |

---

## 4. Cryptography & Storage

### TOTP

- HMAC-SHA1 over time counter (30s steps), 6-digit codes
- Drift window: ±1 step (±30s)
- **Replay protection:** `mfaLastTimeStep` rejects reuse within the same step

### Secret encryption

- AES-256-GCM, random 96-bit IV, 128-bit tag
- Key from `MFA_ENCRYPTION_KEY` (aligned with Phase 5 HKDF domain for MFA when master-key system is active)

### Backup codes

- 8 codes, format `XXXX-XXXX`
- Stored as SHA-256 hashes; consumed codes removed permanently

### Fields never exposed via API

`mfaSecret`, `mfaPendingSecret`, `mfaBackupCodes`, `mfaLastTimeStep` — `select: false` + `toJSON` strip.

---

## 5. Lockout Policy

| Setting | Default behavior |
|---|---|
| Max failed attempts | Configurable (`MFA_MAX_FAILED_ATTEMPTS`, typically 5) |
| Lockout | Exponential backoff: `BASE_LOCKOUT_MS * 2^(excess)` |
| HTTP status when locked | **423 Locked** with remaining seconds |
| Security event | `MFA_LOCKOUT` (feeds IDS heuristics) |

---

## 6. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public (rate-limited) | If MFA on → `{ mfaRequired: true, mfaToken }` |
| `POST` | `/auth/mfa/setup` | Access token | Secret, URI, QR, backup codes |
| `POST` | `/auth/mfa/verify` | `mfaToken` or Bearer | Complete login **or** confirm setup |
| `POST` | `/auth/mfa/disable` | Access + password | Disable MFA |

---

## 7. Login State Machine

```
[Credentials]
    │
    ├─ MFA disabled ──► access + refresh
    │
    └─ MFA enabled ──► mfaToken (no session yet)
                           │
                           ├─ valid TOTP / unused backup ──► access + refresh
                           ├─ invalid ──► increment failures
                           └─ locked ──► 423 + MFA_LOCKOUT event
```

---

## 8. Security Events Emitted

| Event | When |
|---|---|
| `MFA_LOGIN_SUCCESS` | Challenge completed |
| `MFA_LOGIN_FAILED` | Bad code |
| `MFA_LOCKOUT` | Threshold exceeded |
| `MFA_DISABLED` | User disables MFA |

---

## 9. Integration Points

| Feature | Integration |
|---|---|
| Auth/RBAC (SK-01) | Challenge token; disable requires authenticated session |
| Encryption (SK-05) | Secrets encrypted at rest; design aligns with key manager domains |
| Logging/IDS (SK-03) | Failures and lockouts drive heuristics |
| Dashboard (SK-04) | Auth modal challenge + MFA settings with QR |
| SDK (SK-08) | `setupMfa`, `verifyMfa`, `disableMfa` |

---

## 10. Testing

| Suite | Coverage |
|---|---|
| `totp.service.test.ts` | RFC 6238 vectors, Base32, drift, replay, backups, URI/QR |
| `crypto.service.test.ts` | AES-GCM roundtrip, tamper detection, wrong key |
| `mfa.service.test.ts` | Login branch, setup, verify, lockout, disable |
| `token.service.test.ts` | MFA challenge JWT |
| `password-never-exposed.test.ts` | MFA secrets omitted from profiles |

---

## 11. Configuration

- `MFA_ENCRYPTION_KEY`
- `MFA_MAX_FAILED_ATTEMPTS`
- `MFA_LOCKOUT_DURATION_MS`
- `MFA_TOKEN_EXPIRES_IN`

---

## 12. Acceptance Criteria (met)

- [x] MFA-enabled login requires second step before session tokens
- [x] Expired/reused codes rejected
- [x] Lockout after configurable failures with logged event
- [x] Per-user toggle (setup / disable with password)

---

## 13. Known Limitations

- App-based TOTP only (no SMS/email OTP delivery wired; delivery would be a peripheral channel if added later).
- Live HTTP MFA e2e requires running MongoDB; service-level tests cover the crypto and state machine.
