# Feature Report: Authentication & Role-Based Access Control (RBAC)

| Field | Value |
|---|---|
| **Feature ID** | SK-01 |
| **Roadmap Phase** | Phase 1 |
| **Status** | Complete |
| **Primary location** | `apps/api/src/services/auth.service.ts`, `token.service.ts`, `middleware/authenticate.ts`, `middleware/authorize.ts` |
| **Shared types** | `packages/shared-types/src/auth.ts`, `rbac.ts` |
| **Hardcoded (core)** | JWT sign/verify, session lifecycle, RBAC engine, password hashing |
| **External APIs** | None |

---

## 1. Purpose

SentinelKey’s identity layer issues and validates its own tokens, hashes passwords locally, and enforces permission checks on every protected route. No third-party auth provider (Auth0, Cognito, Firebase Auth, etc.) is used.

This feature is the foundation for MFA, logging, the dashboard, encryption endpoints, classification, and the SDK.

---

## 2. Problem Statement

Self-hosted security products cannot outsource identity without giving up sovereignty over session lifecycle, token rotation policy, and permission semantics. SentinelKey needs:

- Short-lived access credentials with longer-lived, rotatable refresh credentials
- Fine-grained permissions (`resource:action`) rather than coarse “admin/user” flags alone
- Rate limiting on login to blunt credential stuffing at the edge
- Guarantees that password material never appears in API responses

---

## 3. Architecture Overview

```
Client
  │
  ├─ POST /auth/register ──► auth.service ──► User + Role (MongoDB)
  ├─ POST /auth/login    ──► bcrypt verify ──► token.service (access + refresh JWTs)
  ├─ POST /auth/refresh  ──► hash lookup + rotate refresh token
  ├─ POST /auth/logout   ──► invalidate refresh token
  └─ GET  /auth/me       ──► authenticate middleware ──► profile (no secrets)

Protected routes:
  Authorization: Bearer <access>
       │
       ▼
  authenticate → req.user
       │
       ▼
  authorize('resource:action') → 200 | 403 (+ PERMISSION_DENIED event)
```

### Key components

| Component | Role |
|---|---|
| `User` model | Email, `passwordHash`, `roles[]`, hashed `refreshTokens[]` |
| `Role` model | Name, description, `permissions[]` |
| `token.service` | Sign/verify access, refresh, and MFA challenge JWTs; SHA-256 token hashing |
| `auth.service` | Register, login, refresh, logout, profile |
| `authenticate` middleware | Verifies access JWT → `req.user` |
| `authorize(...perms)` | Checks permissions; emits security event on deny |
| `rate-limiter` | In-memory per-IP counters on login |

---

## 4. Data Model

### User (sensitive fields `select: false`)

- `email` (unique)
- `passwordHash` — bcrypt, 12 salt rounds
- `roles` — string references to role names
- `refreshTokens[]` — `{ hash, expiresAt, createdAt }` (hashes only)
- `lastLogin`, `createdAt`, MFA fields (see SK-02)

`toJSON` strips password hash, refresh tokens, and MFA secrets.

### Roles (seeded)

| Role | Intent | Example permissions |
|---|---|---|
| `admin` | Full control | All `*:read/write/manage` |
| `analyst` | Operate SOC | logs/alerts/classify/files read-write (not encryption key rotate unless granted) |
| `viewer` | Read-only | `logs:read`, `alerts:read`, limited file self-access |

First registered user is assigned `admin`; subsequent users default to `viewer`.

---

## 5. Token Design

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access JWT | 15 minutes | Client memory / Authorization header | API authorization |
| Refresh JWT | 7 days | Client; server stores **SHA-256 hash** only | Obtain new access/refresh pair |
| MFA challenge JWT | 5 minutes | Client (login step 2) | Complete MFA before issuing session tokens |

### Refresh rotation & reuse detection

1. On refresh, the presented token’s hash must match a stored entry.
2. Matched entry is deleted; a new refresh token is issued (rotation).
3. If a **already-consumed** refresh token is presented again, **all** refresh tokens for that user are invalidated and `AUTH_TOKEN_REUSE` is logged (feeds IDS).

---

## 6. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create account |
| `POST` | `/auth/login` | Public (rate-limited) | Issue tokens or MFA challenge |
| `POST` | `/auth/refresh` | Refresh body | Rotate tokens |
| `POST` | `/auth/logout` | Access | Invalidate refresh token |
| `GET` | `/auth/me` | Access | Current profile (no password) |

---

## 7. Security Controls

- **Password hashing:** bcrypt (local library; not an external API)
- **Defense in depth:** Mongoose `select: false` + `toJSON` transform
- **Login rate limit:** 10 attempts / 15 minutes / IP; `Retry-After` on 429; emits `RATE_LIMIT_EXCEEDED`
- **RBAC:** middleware `authorize('resource:action')` — UI hiding is not sufficient; API rejects with 403
- **Password never exposed:** dedicated unit test asserts profile payloads omit password/hash/tokens

---

## 8. Integration Points

| Downstream | How Auth/RBAC is used |
|---|---|
| MFA (SK-02) | Login branches to MFA challenge token |
| Logging/IDS (SK-03) | Login success/fail, token reuse, permission denial events |
| Dashboard (SK-04) | Session + permission-aware nav |
| Files/Encryption (SK-05) | `files:*`, `encryption:*` permissions |
| Classification (SK-07) | `classify:*`, `policies:*` |
| SDK (SK-08) | `login`, `refreshTokens`, auto-refresh on 401 |

---

## 9. Testing

| Suite | Coverage |
|---|---|
| `token.service.test.ts` | Sign/verify, cross-token rejection, hashing, expiry |
| `authorize.test.ts` | Grant/deny, multi-permission, unauthenticated |
| `rate-limiter.test.ts` | Under/over limit, IP isolation |
| `password-never-exposed.test.ts` | Secrets absent from profile |

---

## 10. Configuration

See `apps/api/.env.example`:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- Rate-limit window/max settings

---

## 11. Acceptance Criteria (met)

- [x] Register → login → access + refresh tokens
- [x] Missing/expired/invalid access → 401
- [x] Valid token without permission → 403
- [x] Refresh rotates; reuse escalates to full invalidation + security log
- [x] Password never returned in any API response

---

## 12. Known Limitations

- End-to-end HTTP flows against live MongoDB depend on a running database (unit/service tests cover logic).
- Rate limiter is in-memory (per-process); multi-instance deploys should move counters to Redis without changing the API contract.
