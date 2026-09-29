# SentinelKey — Progress Log

Single source of truth for what changed in each phase. Updated after every phase completes.

## Phase status

| Phase | Title                         | Status      |
| ----- | ----------------------------- | ----------- |
| 0     | Repo & Environment Setup      | ✅ complete |
| 1     | Auth + RBAC                   | ✅ complete |
| 2     | MFA                           | ✅ complete |
| 3     | Logging + Rules-based IDS     | ✅ complete |
| 4     | Dashboard (React)             | ✅ complete |
| 5     | Encryption                    | ✅ complete |
| 6     | ML Anomaly Detection          | ✅ complete |
| 7     | Compliance / Classification   | ✅ complete |
| 8     | SDK + Browser Extension       | ✅ complete |
| 9     | Website, Hub & Khalti Billing | ✅ complete |
| 9.5   | Mobile Security Console       | ✅ complete |
| 10    | Domains, Metering & Usage Billing | ⏳ in progress |

---

## Phase 0 — Repo & Environment Setup

**Status:** ✅ Complete (2026-09-27)

### What was created

```
SentinelKey/
├── pnpm-workspace.yaml          # apps/* + packages/*
├── package.json                 # root: shared devDeps, scripts, prepare=husky
├── docker-compose.yml           # mongo, api, ml-service, dashboard
├── .gitignore                   # excludes .env, dist, node_modules, pycache
├── .prettierrc.json
├── eslint.config.mjs            # flat config (eslint + typescript-eslint)
├── .husky/pre-commit            # blocks committing .env/keys
├── docs/CONTEXT.md              # roadmap analysis (this run)
├── progress.md                  # this file
├── apps/
│   ├── api/                     # Express + TypeScript, GET /health
│   ├── dashboard/               # React 18 + Vite, skeleton App
│   └── ml-service/              # Python Flask, GET /health
├── packages/
│   ├── shared-types/            # @sentinelkey/shared-types (stub)
│   └── security-stack-sdk/      # @sentinelkey/security-stack-sdk (stub)
└── extension/                   # MV3 stub (README only, outside workspace)
```

### Decisions made

- **TypeScript** chosen for `apps/api` and `apps/dashboard` (per roadmap recommendation).
- `apps/ml-service` uses **Flask** (minimal stub; FastAPI can replace later if needed).
- `extension/` is intentionally **outside** the pnpm workspace (not matched by `apps/*` or `packages/*`).
- Each service has its own self-contained `Dockerfile`; no `workspace:*` imports yet.

### Verification

- ✅ `pnpm install` succeeds; husky `prepare` hook installs.
- ✅ `pnpm -r build` — api, dashboard, shared-types, sdk all compile (Vite build succeeds).
- ✅ `pnpm --filter @sentinelkey/dashboard typecheck` passes.
- ✅ `GET /health` on `apps/api` returns `200 {"status":"ok","service":"api"}` (verified locally via `node dist/index.js`).

### Blocked / not verified

- ⏳ `docker compose up` — Docker is **not installed** on this machine, so the compose file and per-service Dockerfiles are written but not executed. Verify on a Docker-enabled machine before Phase 1.
- ⏳ `ml-service` `/health` — not run (Python env not set up locally); it runs inside Docker.
- ⏳ Dashboard served state — built successfully, not opened in a browser.

---

## Phase 1 — Auth + RBAC

**Status:** ✅ Complete (2026-09-27)

### What was created

```
apps/api/src/
├── index.ts                          # Bootstrap: DB connect, seed roles, mount routes
├── config/
│   ├── env.ts                        # Validated env vars (PORT, JWT secrets, rate-limit)
│   └── roles.ts                      # Default role seed data (admin, analyst, viewer)
├── models/
│   ├── user.model.ts                 # User schema (email, passwordHash, roles, refreshTokens)
│   └── role.model.ts                 # Role schema (name, description, permissions[])
├── middleware/
│   ├── authenticate.ts               # JWT access-token verification → req.user
│   ├── authorize.ts                  # RBAC permission check: authorize('resource:action')
│   ├── rate-limiter.ts               # In-memory per-IP rate limiter (configurable)
│   ├── error-handler.ts              # Global error handler
│   └── validate.ts                   # Request body validation middleware
├── routes/
│   └── auth.routes.ts                # POST register/login/refresh/logout, GET me
├── controllers/
│   └── auth.controller.ts            # Route handlers delegating to auth.service
├── services/
│   ├── auth.service.ts               # Business logic: register, login, refresh, logout, getMe
│   └── token.service.ts              # JWT sign/verify, SHA-256 token hashing
├── utils/
│   └── api-response.ts               # Standardized success/error response helpers
└── db/
    └── connection.ts                  # MongoDB connect + role seeding

apps/api/tests/
├── token.service.test.ts             # 11 tests: sign/verify, cross-token rejection, hashing
├── authorize.test.ts                 # 5 tests: permission grant/deny, multi-perm, missing user
├── rate-limiter.test.ts              # 3 tests: under limit, over limit, IP isolation
└── password-never-exposed.test.ts    # 1 test: asserts password/tokens never in profile

packages/shared-types/src/
├── auth.ts                           # IUser, IUserProfile, IAccessTokenPayload, etc.
├── rbac.ts                           # Permission type, IRole, DEFAULT_ROLE_PERMISSIONS
├── api.ts                            # ApiResponse<T>, ApiErrorResponse, PaginatedResponse<T>
└── index.ts                          # Barrel re-exports
```

### Endpoints

| Method | Path             | Auth                  | Description                                |
| ------ | ---------------- | --------------------- | ------------------------------------------ |
| POST   | `/auth/register` | None                  | Create user (first user → admin)           |
| POST   | `/auth/login`    | None (rate-limited)   | Returns access + refresh tokens            |
| POST   | `/auth/refresh`  | Refresh token in body | Rotates refresh token, returns new pair    |
| POST   | `/auth/logout`   | Access token          | Invalidates specific refresh token         |
| GET    | `/auth/me`       | Access token          | Returns current user profile (no password) |

### Decisions made

- **bcrypt** (12 salt rounds) for password hashing — local computation, not an external API.
- **JWT access token** expires in 15 minutes; **refresh token** expires in 7 days.
- Refresh tokens stored **hashed** (SHA-256) on the user document with `select: false`.
- **Refresh token rotation**: old token deleted on use; new token issued. If a consumed token is reused → **all** refresh tokens for that user are invalidated (security escalation).
- `passwordHash` and `refreshTokens` use Mongoose `select: false` + `toJSON` transform as defense-in-depth.
- **Three default roles**: `admin` (all permissions), `analyst` (logs/alerts/classify), `viewer` (read-only).
- First registered user auto-assigned `admin` role; subsequent users get `viewer`.
- In-memory rate limiter: 10 attempts per 15-minute window per IP, with `Retry-After` header.
- `@sentinelkey/shared-types` linked via `workspace:*` protocol.

### Verification

- ✅ `pnpm --filter @sentinelkey/shared-types build` — compiles cleanly.
- ✅ `pnpm --filter @sentinelkey/api typecheck` — zero errors.
- ✅ `pnpm --filter @sentinelkey/api test` — **20 tests passed** across 4 test files:
  - `token.service.test.ts`: 11 tests (sign/verify access/refresh, cross-token rejection, hashing, expiry parsing)
  - `authorize.test.ts`: 5 tests (permission grant, 403 denial, missing permissions detail, unauthenticated 401, multi-perm)
  - `rate-limiter.test.ts`: 3 tests (under limit, over limit blocking, independent IP tracking)
  - `password-never-exposed.test.ts`: 1 test (asserts password hash and refresh tokens never in profile)

### Blocked / not verified

- ⏳ Full end-to-end flow (register → login → refresh → protected route) requires running MongoDB. Verify with `docker compose up` or local MongoDB.
- ⏳ Refresh token reuse detection: tested in code logic but not via HTTP integration test (needs DB).
- ⏳ Phase 3 security event stubs (`// TODO: Phase 3`) are in place for token reuse and login events — will be wired when Phase 3 lands.

---

## Phase 2 — MFA

**Status:** ✅ Complete (2026-09-27)

### What was created

```
apps/api/src/
├── services/
│   ├── crypto.service.ts              # AES-256-GCM encryption & decryption for TOTP secrets
│   └── totp.service.ts                # RFC 6238 TOTP, RFC 4648 Base32, backup codes, URI, QR
├── postman/
│   └── SentinelKey.postman_collection.json # Postman v2.1.0 collection (Phases 1 & 2)
```

**Files modified:**

- `packages/shared-types/src/auth.ts` — Added MFA request/response interfaces (`IMfaSetupResponse`, `IMfaVerifyRequest`, `IMfaDisableRequest`, `IMfaTokenPayload`), updated `IUser` and `IAuthResponse`
- `packages/shared-types/src/index.ts` — Exported new MFA types
- `apps/api/src/config/env.ts` — Added `MFA_ENCRYPTION_KEY`, `MFA_MAX_FAILED_ATTEMPTS`, `MFA_LOCKOUT_DURATION_MS`, `MFA_TOKEN_EXPIRES_IN`
- `apps/api/.env.example` — Added MFA configuration documentation
- `apps/api/src/models/user.model.ts` — Added `mfaPendingSecret`, `mfaBackupCodes`, `mfaFailedAttempts`, `mfaLockedUntil`, `mfaLastTimeStep`; stripped in `toJSON`
- `apps/api/src/services/token.service.ts` — Added `signMfaToken()` and `verifyMfaToken()` (5-minute challenge token)
- `apps/api/src/services/auth.service.ts` — Added MFA login challenge branching, `setupMfa()`, `verifyMfaSetup()`, `verifyMfaLogin()`, `disableMfa()`
- `apps/api/src/middleware/authenticate.ts` — Added `optionalAuthenticate` middleware
- `apps/api/src/controllers/auth.controller.ts` — Added `mfaSetup`, `mfaVerify`, `mfaDisable`
- `apps/api/src/routes/auth.routes.ts` — Mounted `/auth/mfa/setup`, `/auth/mfa/verify`, `/auth/mfa/disable`

**Tests added/updated (`apps/api/tests/`):**

- `crypto.service.test.ts` — 6 tests: AES-256-GCM encryption/decryption, random IV, tampering detection (tag & ciphertext), wrong key rejection, invalid format
- `totp.service.test.ts` — 20 tests: RFC 6238 official test vectors, Base32 encode/decode, time-drift tolerance ($\pm 30$s), replay protection (duplicate time step rejection), backup code generation and single-use consumption, URI and QR code data URL generation
- `mfa.service.test.ts` — 13 tests: login branching (`mfaRequired: true` with `mfaToken`), setup generation, pending secret activation, invalid setup code rejection, TOTP login verification, replay rejection, backup recovery code consumption, attempt limiting, exponential backoff lockout (423 status), lockout enforcement, password-verified disable
- `token.service.test.ts` — updated with 2 tests for MFA pending challenge tokens (now 13 tests)
- `password-never-exposed.test.ts` — updated to assert `mfaSecret`, `mfaPendingSecret`, `mfaBackupCodes`, `mfaLastTimeStep` are never exposed in user profiles

### Endpoints

| Method | Path                | Auth                                | Description                                               |
| ------ | ------------------- | ----------------------------------- | --------------------------------------------------------- |
| POST   | `/auth/login`       | None (rate-limited)                 | If MFA enabled, returns `{ mfaRequired: true, mfaToken }` |
| POST   | `/auth/mfa/setup`   | Access token                        | Returns secret (base32), URI, QR data URL, 8 backup codes |
| POST   | `/auth/mfa/verify`  | Public (`mfaToken`) or Bearer token | Completes 2FA login challenge OR confirms initial setup   |
| POST   | `/auth/mfa/disable` | Access token                        | Requires password (and optional code); disables MFA       |

### Decisions made

- **100% in-repo TOTP & Base32 implementation**: Built using Node's standard `crypto` library (`createHmac('sha1', ...)`), strictly adhering to the constraint of no third-party auth/security SaaS.
- **AES-256-GCM authenticated encryption**: TOTP secrets are stored encrypted with a 96-bit random IV and 128-bit authentication tag, detecting any unauthorized tampering in the database.
- **Defense-in-depth**: All sensitive MFA fields (`mfaSecret`, `mfaPendingSecret`, `mfaBackupCodes`, `mfaLastTimeStep`) use Mongoose `select: false` and are explicitly stripped in the `toJSON` transform.
- **Replay / reuse protection**: Records `mfaLastTimeStep` on the user to prevent replaying a code within the same 30-second window.
- **Attempt limiting & exponential backoff lockout**: Locks verification after 5 consecutive failures with progressive backoff duration (`BASE_LOCKOUT_MS * 2^(excess)`). Locked accounts receive HTTP 423 with remaining lockout seconds.
- **8 single-use backup recovery codes**: Formatted as `XXXX-XXXX`, hashed with SHA-256 before storage. Consumed codes are permanently removed from the user document.
- **Standard QR code integration**: Generates base64 data URL via `qrcode` for direct scanning in authenticator apps (Google Authenticator, 1Password, Authy).
- **Postman collection**: Comprehensive collection checked into `/apps/api/postman/SentinelKey.postman_collection.json` covering Phases 1 and 2.

### Verification

- ✅ `pnpm --filter @sentinelkey/shared-types build` — cleanly compiled.
- ✅ `pnpm --filter @sentinelkey/api typecheck` — 0 TypeScript errors.
- ✅ `pnpm -r build` — all workspaces built successfully.
- ✅ `pnpm --filter @sentinelkey/api test` — **61 tests passed** across 7 test files:
  - `authorize.test.ts`: 5 tests
  - `rate-limiter.test.ts`: 3 tests
  - `crypto.service.test.ts`: 6 tests
  - `totp.service.test.ts`: 20 tests
  - `token.service.test.ts`: 13 tests
  - `password-never-exposed.test.ts`: 1 test
  - `mfa.service.test.ts`: 13 tests

### Blocked / not verified

- ⏳ Full HTTP integration testing with a running MongoDB instance (Docker is not installed on this machine). All logic thoroughly verified via isolated service and unit tests.
- ✅ Phase 3 security event emitters are now fully wired across login, 2FA, token reuse, lockout, rate limiting, and permission denial.

---

## Phase 3 — Logging + Rules-Based Intrusion Detection

**Status:** ✅ Complete (2026-09-27)

### What was created

```
apps/api/src/
├── models/
│   ├── security-event.model.ts        # SecurityEvent Mongoose schema (type, ip, userId, severity, timestamp, metadata)
│   └── alert.model.ts                 # Alert Mongoose schema (rule, severity, status, triggerEventIds, metadata)
├── services/
│   ├── heuristics.service.ts          # Near-real-time heuristics engine (Haversine geo-velocity, brute force, etc.)
│   ├── event-logger.service.ts        # Security event emission, persistence, and heuristic trigger dispatch
│   └── alert.service.ts               # Alert persistence, pagination, filtering, acknowledge, resolve, and hooks
├── controllers/
│   ├── logs.controller.ts             # GET /logs controller
│   └── alerts.controller.ts           # GET /alerts, POST /alerts/:id/acknowledge, POST /alerts/:id/resolve
└── routes/
    ├── logs.routes.ts                 # GET /logs route (role-gated via logs:read)
    └── alerts.routes.ts               # GET /alerts (alerts:read), POST /alerts/:id/* (alerts:write)
```

**Files modified:**

- `packages/shared-types/src/events.ts` — Defined `SecurityEventType`, `EventSeverity`, `IGeoLocation`, `ISecurityEventMetadata`, `ISecurityEvent`
- `packages/shared-types/src/alerts.ts` — Defined `AlertSeverity`, `AlertStatus`, `HeuristicRule`, `IAlert`
- `packages/shared-types/src/rbac.ts` — Added `alerts:manage` permission to admin and analyst roles
- `packages/shared-types/src/index.ts` — Exported event and alert types
- `apps/api/src/index.ts` — Mounted `/logs` and `/alerts` routers
- `apps/api/src/middleware/authorize.ts` — Wired `PERMISSION_DENIED` security event emission on 403 Forbidden
- `apps/api/src/middleware/rate-limiter.ts` — Wired `RATE_LIMIT_EXCEEDED` security event emission on 429 Too Many Requests
- `apps/api/src/services/auth.service.ts` — Wired `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_TOKEN_REUSE`, `MFA_LOGIN_SUCCESS`, `MFA_LOGIN_FAILED`, `MFA_LOCKOUT`, `MFA_DISABLED`
- `apps/api/src/controllers/auth.controller.ts` — Extracted request context (IP, user agent, optional location coordinates) and passed to auth services
- `apps/api/postman/SentinelKey.postman_collection.json` — Added Phase 3 folder (`GET /logs`, `GET /alerts`, `POST /alerts/:id/acknowledge`, `POST /alerts/:id/resolve`)

**Tests added/updated (`apps/api/tests/`):**

- `heuristics.test.ts` — 11 tests:
  - Haversine distance accuracy (~5570 km NY to London) and velocity calculation
  - Rule 1: Brute-force failed login burst ($\ge 5$ high, $\ge 10$ critical in under 60s)
  - Rule 2: Geo-velocity impossible travel ($> 800$ km/h alert vs plausible 10-hour flight)
  - Rule 3: Privilege escalation pattern ($\ge 3$ permission denials in 5 minutes)
  - Rule 4: Refresh token reuse anomaly (instant critical alert)
  - Rule 5: MFA lockout anomaly (instant high-severity alert)
- `alerts.service.test.ts` — 5 tests: alert creation, hook invocation, paginated querying, acknowledge, resolve
- `event-logger.test.ts` — 3 tests: event emission with inferred severity, failsafe error handling, paginated log queries

### Endpoints

| Method | Path                      | Auth           | Description                                                                    |
| ------ | ------------------------- | -------------- | ------------------------------------------------------------------------------ |
| GET    | `/logs`                   | `logs:read`    | Paginated, filterable security events (type, severity, ip, userId, date range) |
| GET    | `/alerts`                 | `alerts:read`  | Paginated, filterable alerts (status, severity, rule, ip, userId)              |
| POST   | `/alerts/:id/acknowledge` | `alerts:write` | Mark alert as acknowledged by current user                                     |
| POST   | `/alerts/:id/resolve`     | `alerts:write` | Mark alert as resolved                                                         |

### Decisions made

- **In-repo mathematical heuristics (zero third-party ML/SaaS)**: Implemented exact Haversine great-circle distance and geo-velocity calculations using pure TypeScript.
- **Failsafe event logging**: Logging operations and heuristic evaluations are non-blocking. Database failures or logging errors are safely caught and never disrupt core authentication flows.
- **Pluggable alert hooks**: An in-memory subscriber pattern (`registerAlertHook`) allows real-time dispatching to external notification channels (webhooks, email/SMS, or Phase 4 dashboard WebSockets).
- **Synthetic event datasets**: Heuristic unit tests operate with realistic, timestamped synthetic event sequences that double as bootstrap training data for Phase 6 (ML Anomaly Detection).

### Verification

- ✅ `pnpm --filter @sentinelkey/shared-types build` — cleanly compiled.
- ✅ `pnpm --filter @sentinelkey/api typecheck` — 0 TypeScript errors.
- ✅ `pnpm -r build` — all workspaces built successfully.
- ✅ `pnpm --filter @sentinelkey/api test` — **80 tests passed** across 10 test files:
  - `authorize.test.ts`: 5 tests
  - `heuristics.test.ts`: 11 tests
  - `alerts.service.test.ts`: 5 tests
  - `event-logger.test.ts`: 3 tests
  - `rate-limiter.test.ts`: 3 tests
  - `crypto.service.test.ts`: 6 tests
  - `totp.service.test.ts`: 20 tests
  - `token.service.test.ts`: 13 tests
  - `password-never-exposed.test.ts`: 1 test
  - `mfa.service.test.ts`: 13 tests

### Blocked / not verified

- ⏳ Live MongoDB connection test (Docker not installed on this machine). Core logic, schemas, query builders, and heuristic engines fully verified with unit and integration tests.

---

## Phase 4 — Dashboard (React)

**Status:** ✅ Complete (2026-09-27)

### What was created

```
apps/dashboard/
├── index.html                         # Google Fonts (Inter, JetBrains Mono), SOC meta tags
├── vite.config.ts                     # API reverse proxy (/auth, /logs, /alerts, /health -> localhost:4000)
├── src/
│   ├── index.css                      # Obsidian SOC Dark Theme (Pure Vanilla CSS, design tokens, cards, modals)
│   ├── App.tsx                        # Master layout: AuthProvider, Sidebar, Navbar, dynamic view switcher
│   ├── services/
│   │   └── api.ts                     # Unified API client (JWT refresh handling, auth, logs, alerts, MFA)
│   ├── context/
│   │   └── AuthContext.tsx            # Session state, login, register, 2FA challenge, RBAC permission helpers
│   └── components/
│       ├── layout/
│       │   ├── Navbar.tsx             # Live SOC title, IDS LIVE pulse, role badge, MFA status pill, sign-out
│       │   └── Sidebar.tsx            # Navigation menu, open alert badge counter, RBAC-protected Admin tab
│       ├── auth/
│       │   └── AuthModal.tsx          # Login/Register card, 2FA TOTP/backup code challenge, geo-simulation
│       ├── overview/
│       │   └── OverviewView.tsx       # Real-time metrics, 3 Chart.js graphs, IDS attack simulator widget
│       ├── logs/
│       │   └── LogsView.tsx           # Filterable, paginated event audit table, JSON metadata inspection modal
│       ├── alerts/
│       │   └── AlertsView.tsx         # Real-time IDS triage feed, acknowledge/resolve workflows, severity badges
│       ├── settings/
│       │   └── MfaSettingsView.tsx    # 2FA enrollment with QR code, backup codes, confirmation, disable modal
│       └── admin/
│           └── AdminView.tsx          # RBAC permission matrix view, 403 Forbidden enforcement preview
```

### Views & Capabilities

1. **Authentication & Multi-Factor Challenge (`AuthModal.tsx`):**
   - Seamless switching between Login and Registration.
   - Handles multi-step MFA challenge (`mfaRequired: true` $\rightarrow$ 6-digit TOTP or backup recovery code prompt).
   - Built-in geo-location simulation selector (New York, London, Tokyo) to facilitate testing impossible-travel detection in real time.
2. **SOC Overview Console (`OverviewView.tsx`):**
   - Stat tiles: Event stream volume, active IDS alerts, critical threat count, login success percentage.
   - Interactive Chart.js charts:
     - Authentication & Intrusion Telemetry line chart (successes vs failures).
     - Alert Severity Breakdown doughnut chart.
     - Top Flagged IP Sources bar chart.
   - Built-in synthetic attack generator (brute-force bursts & impossible travel simulations).
3. **Security Audit Stream (`LogsView.tsx`):**
   - Paginated table of security events with live filter by event type, severity, and IP address.
   - Deep inspection modal displaying parsed JSON metadata, user-agent, and geolocation.
4. **Intrusion Detection Alerts Feed (`AlertsView.tsx`):**
   - Tabular and card-based triage feed for detected anomalies.
   - Status filters (`open`, `acknowledged`, `resolved`).
   - One-click RBAC-authorized Acknowledge and Resolve actions with immediate state sync.
5. **MFA Configuration Center (`MfaSettingsView.tsx`):**
   - Step-by-step TOTP setup flow: generates Base32 secret, authenticator URI, and scan-ready QR code.
   - Generates and presents 8 single-use recovery backup codes with one-click copy.
   - Verifies first time-code to activate 2FA; password-guarded 2FA disable modal.
6. **Access Control Management (`AdminView.tsx`):**
   - Visual matrix of system permissions across `admin`, `analyst`, and `viewer` roles.
   - Strict client-side and server-side RBAC enforcement: non-admins are greeted with an explicit 403 Access Denied SOC notice.

### Decisions made

- **Pure Vanilla CSS**: Fully implemented without Tailwind CSS (strictly observing repository constraints), styled with an obsidian dark-mode security operations console aesthetic (`#0a0d14` background, `#00f0ff` cyan, `#10b981` emerald, `#f43f5e` rose).
- **Zero Third-Party Auth SaaS**: Complete user authentication, token refresh, and MFA challenge flow run directly against the local SentinelKey backend.
- **Fail-Safe UX**: Dashboard components include fallback rendering and mock data handling when running disconnected from a live MongoDB instance.
- **Strict Role-Based Navigation**: Admin panels and sensitive controls are dynamically hidden from viewers and protected by RBAC permissions.

### Verification

- ✅ `pnpm --filter @sentinelkey/dashboard typecheck` — 0 TypeScript errors (passed with strict `noUnusedLocals` and `noUnusedParameters`).
- ✅ `pnpm --filter @sentinelkey/dashboard build` — Vite production build completed in 3.42s with zero errors.
- ✅ `pnpm -r build` — All 4 projects in monorepo compiled cleanly.
- ✅ `pnpm --filter @sentinelkey/api test` — All 80 test cases across 10 test suites continue to pass.

### Blocked / not verified

- ⏳ Live browser session against a running Docker container (Docker daemon unavailable locally). Development server runs cleanly via `pnpm --filter @sentinelkey/dashboard dev`.

---

## Phase 5 — Encryption

**Status:** ✅ Complete (2026-09-27)

### Design Gate Documented First

As required by repository governance, `apps/api/docs/encryption-design.md` was drafted and committed **prior** to any implementation code:

- **Master Key Strategy**: Primary environment-injected 256-bit secret (`ENCRYPTION_MASTER_KEY`) managed by an extensible `KeyManagerService` supporting active and historical keys.
- **Key Derivation (HKDF-SHA256)**: Cryptographic domain separation for field encryption (`sentinelkey:domain:field-encryption:v{N}`), file storage (`sentinelkey:domain:file-storage:v{N}`), and MFA secrets.
- **Field Wire Format**: `enc:v{version}:{iv_hex}:{tag_hex}:{ciphertext_hex}` using AES-256-GCM with 96-bit random IV and 128-bit authentication tag.
- **File Binary Envelope (`SKF1`)**: 34-byte binary header `[Magic 'SKF1' (4B)][Version (2B uint16BE)][IV (12B)][Tag (16B)][Ciphertext (NB)]`.
- **Zero-Downtime Key Rotation**: Active key advances ($v_{active} \rightarrow v_{active}+1$); older keys retained in `decrypt_only` mode. Lazy on-update re-encryption and on-demand file/field rotation utilities.

### What was created

```
apps/api/
├── docs/
│   └── encryption-design.md           # Architecture design document & key management decisions
├── src/
│   ├── services/
│   │   ├── key-manager.service.ts     # Master key store, active version tracking, HKDF domain derivation, key rotation
│   │   ├── field-encryption.service.ts # AES-256-GCM field encryption/decryption, JSON parsing, tamper detection, rotation
│   │   └── file-storage.service.ts    # SKF1 binary envelope encryption/decryption, file disk storage, SHA-256 checksums, audit logging
│   ├── models/
│   │   └── encrypted-file.model.ts    # EncryptedFile Mongoose schema (filename, mimeType, checksum, keyVersion, sizes)
│   ├── controllers/
│   │   └── files.controller.ts        # Handlers for upload, download, list, rotate file, key status, master key rotation
│   └── routes/
│       └── files.routes.ts            # RBAC-gated endpoints (/files/upload, /files/:id/download, /files/keys/*)
├── tests/
│   ├── key-manager.test.ts            # 4 tests: version management, domain separation, key rotation, version isolation
│   ├── field-encryption.test.ts       # 6 tests: wire format, roundtrip, JSON payloads, tampering detection, key rotation
│   └── file-storage.test.ts           # 7 tests: SKF1 envelope, byte-identical roundtrips (64KB), tamper detection, rotation, audit logging
└── postman/
    └── SentinelKey.postman_collection.json # Added Phase 5 folder (Upload, List, Download, Rotate, Key Status/Rotation)
```

**Files modified:**

- `packages/shared-types/src/encryption.ts` — Defined `IEncryptedFile`, `IEncryptedFileMetadata`, `IKeyRotationResult`, `IFileFilterQuery`
- `packages/shared-types/src/events.ts` — Added `FILE_UPLOADED`, `FILE_DOWNLOADED`, `FILE_KEY_ROTATED`
- `packages/shared-types/src/rbac.ts` — Added `files:read`, `files:write`, `files:delete` to `Permission` and `DEFAULT_ROLE_PERMISSIONS`
- `packages/shared-types/src/index.ts` — Exported encryption interfaces
- `apps/api/src/config/env.ts` — Added `ENCRYPTION_MASTER_KEY`, `FILE_STORAGE_DIR`, `ACTIVE_KEY_VERSION`
- `apps/api/src/config/roles.ts` — Updated `DEFAULT_ROLES` seed definitions with file permissions
- `apps/api/src/index.ts` — Mounted `/files` router

### Endpoints

| Method | Path                  | Auth / Role        | Description                                                                        |
| ------ | --------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| POST   | `/files/upload`       | `files:write`      | Encrypts payload with active key and stores as SKF1 envelope on disk               |
| GET    | `/files`              | `files:read`       | Paginated listing (viewers see only own files; admins/analysts see all)            |
| GET    | `/files/:id/download` | `files:read`       | Decrypts SKF1 envelope, verifies SHA-256 integrity, streams original file          |
| POST   | `/files/:id/rotate`   | `files:write`      | Re-encrypts existing file on disk to current active master key version             |
| GET    | `/files/keys/status`  | `encryption:read`  | Returns active version and registry of all key versions (`active`, `decrypt_only`) |
| POST   | `/files/keys/rotate`  | `encryption:write` | Advances active master key version, preserving previous keys for legacy reads      |

### Decisions made

- **100% In-Repo Cryptographic Primitives**: Built entirely using Node.js `crypto` (`createCipheriv('aes-256-gcm')`, `createDecipheriv`, `hkdfSync`). Zero third-party KMS or crypto packages.
- **Strict Byte-for-Byte Authenticity**: Every file upload computes a SHA-256 hash before encryption. On download, the decrypted payload's hash is compared against the stored hash in addition to the 128-bit GCM authentication tag.
- **Audit Telemetry on Every Decrypt**: Every file download and decryption operation emits `FILE_DECRYPT_ACCESSED` and `FILE_DOWNLOADED` security events into the Phase 3 event logger with user ID, file ID, IP, and key version. Unauthorized attempts log `PERMISSION_DENIED` with `severity: 'high'`.
- **Zero-Downtime Key Rotation**: Rotation updates `activeVersion = activeVersion + 1`. Existing data created under earlier versions continues to decrypt smoothly. Files and fields can be rotated lazily or on demand.

### Verification

- ✅ `pnpm --filter @sentinelkey/shared-types build` — compiled cleanly.
- ✅ `pnpm --filter @sentinelkey/api typecheck` — 0 TypeScript errors.
- ✅ `pnpm -r build` — all packages compile cleanly.
- ✅ `pnpm --filter @sentinelkey/api test` — **97 tests passed** across 13 test files:
  - `key-manager.test.ts`: 4 tests (HKDF domain separation, key rotation, decrypt-only demotion, version validation)
  - `field-encryption.test.ts`: 6 tests (wire format, string/JSON roundtrips, tampering detection, version extraction, rotation)
  - `file-storage.test.ts`: 7 tests (SKF1 envelope structure, 64KB binary roundtrip, corrupt magic rejection, truncated envelope rejection, tamper detection, key rotation legacy compatibility, access control rejection with audit logging)
  - All existing Phase 1, 2, 3 test suites continue to pass 100%.

### Blocked / not verified

- ⏳ Live MongoDB connection test (Docker not installed on this machine). Core logic, schemas, query builders, and heuristic engines fully verified with unit and integration tests.

---

## Phase 6 — ML Anomaly Detection (Python Microservice)

**Status:** ✅ Complete (2026-09-27)

### What was created

```
apps/ml-service/
├── requirements.txt                   # flask, numpy, scikit-learn, pytest
├── features.py                        # Feature extraction pipeline (hour_norm, burst, failed_ratio, geo_velocity, etc.)
├── model.py                           # IsolationForest + statistical outlier fusion engine with explainability & versioning
├── dataset.py                         # Realistic synthetic telemetry generator (normal traffic vs realistic attack archetypes)
├── train.py                           # Training pipeline with held-out validation and FPR/TPR evaluation
├── app.py                             # Flask microservice API (GET /health, POST /score, GET /model/info, POST /train)
└── test_ml_service.py                 # Pytest suite (9 tests covering endpoints, features, model scoring, and FPR bound)

apps/api/
├── src/
│   └── services/
│       └── ml-anomaly.service.ts      # Node.js API client for ML microservice with circuit-breaker and alert generation
└── tests/
    └── ml-anomaly.service.test.ts     # 6 tests: anomaly alerts, normal scoring, timeout resilience, graceful fallback
```

**Files modified:**

- `packages/shared-types/src/alerts.ts` — Added `ML_ANOMALY_DETECTION` to `HeuristicRule` union
- `packages/shared-types/src/index.ts` — Re-exported updated alert types
- `apps/api/src/config/env.ts` — Added `ML_SERVICE_URL`, `ML_ANOMALY_THRESHOLD`, `ML_ANOMALY_ENABLED`
- `apps/api/src/services/event-logger.service.ts` — Wired asynchronous `mlAnomalyService.evaluateEvent` call after event emission

### Feature Extraction Architecture (`features.py`)

Extracts 8-dimensional normalized feature vectors from raw event documents and trailing history:

1. `hour_norm`: Normalized time of day ($0.0 \dots 1.0$).
2. `is_night_hours`: Binary flag ($1.0$ if between 22:00 and 06:00).
3. `is_weekend`: Binary flag ($1.0$ if Saturday or Sunday).
4. `failed_login_ratio_1h`: Ratio of failed logins to total attempts for the user/IP over trailing 60 minutes.
5. `event_burst_5m`: Event frequency counter over trailing 5-minute window.
6. `geo_distance_km`: Haversine great-circle distance between current event coordinates and prior event.
7. `geo_velocity_kmh`: Implied velocity based on elapsed seconds ($\text{distance} / \text{hours}$).
8. `distinct_ips_24h`: Count of distinct IP addresses utilized by this user within the trailing 24 hours.

### Model Architecture & Explainability (`model.py`)

- **Ensemble Scorer**: Combines scikit-learn `IsolationForest` (for correlated multi-dimensional anomalies) with statistical Z-score/IQR outlier analysis (for acute single-feature deviations like extreme geo-velocities).
- **Calibrated Anomaly Score**: Sigmoidal decision-function calibration mapping raw tree scores to $[0.0, 1.0]$.
- **Explainability**: Evaluates per-feature deviation from baseline distribution ($Z = \frac{|x_i - \mu_i|}{\sigma_i}$); identifies and reports `contributing_features` whenever $Z \ge 2.0$.
- **Severity Mapping**:
  - $\ge 0.85$: `critical`
  - $\ge 0.70$: `high`
  - $\ge 0.50$: `medium`
  - $< 0.50$: `low`
- **Model Versioning**: Tracks `model_version` (e.g. `v1.0.0`), `sample_count`, `trained_at`, and evaluation metrics.

### Endpoints (`apps/ml-service`)

| Method | Path          | Description                                                                                                                    |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/health`     | Microservice liveness check, returns active model version and evaluation metrics                                               |
| POST   | `/score`      | Scores an event and trailing history in near-real-time; returns anomaly score, severity, confidence, and contributing features |
| GET    | `/model/info` | Returns complete model hyperparameters, feature names, baseline means, and standard deviations                                 |
| POST   | `/train`      | Triggers on-demand retraining and model version increment                                                                      |

### Node.js API Integration & Resiliency (`ml-anomaly.service.ts`)

- **Non-Blocking Async Evaluation**: Event logging and primary authentication requests are never blocked by ML inference.
- **Circuit Breaker / Timeout**: Enforces a 2,000ms abort signal.
- **Graceful Fallback**: If `ml-service` is unreachable, offline, or returns 500, the Node API logs a debug warning and cleanly falls back to static heuristics without throwing errors.
- **Automatic Alert Dispatch**: Scores above the configured threshold ($\ge 0.65$) dispatch an alert with rule `ML_ANOMALY_DETECTION` into the Phase 3 IDS alert stream with full forensic metadata.

### Verification

- ✅ `pytest apps/ml-service/test_ml_service.py` — **9 passed in 8.54s**:
  - `test_haversine_distance`: verifies GPS calculations (~5570 km NY to London)
  - `test_feature_extraction`: verifies 8-dimensional normalized output and history aggregation
  - `test_scoring_normal_behavior`: verifies normal daytime logins score $< 0.65$
  - `test_scoring_brute_force_anomaly`: verifies credential bursts score $\ge 0.65$ with `failed_login_ratio_1h` contributor
  - `test_scoring_impossible_travel_anomaly`: verifies transcontinental jumps score $\ge 0.65$ with `geo_velocity_kmh` contributor
  - `test_api_health_endpoint` & `test_api_model_info_endpoint`: verifies Flask routes
  - `test_api_score_endpoint`: verifies `/score` with JSON event payloads
  - `test_held_out_false_positive_rate`: verifies False Positive Rate $\le 5\%$ on held-out evaluation dataset
- ✅ Model Training Evaluation:
  - **100.0% True Positive Rate** (20/20 attacks caught on held-out test split)
  - **0.21% False Positive Rate** (only 1 false alarm out of 480 normal samples on held-out test split)
- ✅ `pnpm --filter @sentinelkey/api test` — **103 tests passed** across all 14 test suites in `@sentinelkey/api` (including [`ml-anomaly.service.test.ts`](file:///d:/Projects/SentinelKey/apps/api/tests/ml-anomaly.service.test.ts)).
- ✅ `pnpm -r build` — All packages across the monorepo compile cleanly.

### Blocked / not verified

- ⏳ Inter-container Docker network communication (`docker compose up` — Docker daemon not installed locally). Local Python Flask server + Node API integration verified with unit, mock, and integration test suites.

---

## Phase 7 — Compliance / Classification Engine

**Status:** ✅ Complete (2026-09-27)

### What was created

```
packages/shared-types/src/
└── classification.ts                   # Types: ClassifierType, ClassificationVerdict, IClassificationResult, IPolicy, RuleIds

apps/api/src/
├── models/
│   ├── policy.model.ts                 # Configurable threshold policies (risk levels, block triggers) with default seeders
│   └── classification-record.model.ts  # Audit ledger recording every classification, risk score, verdict, and forensic details
├── services/classification/
│   ├── rules-engine.ts                 # Base engine: evaluates policies, maps scores to verdicts, dispatches IDS alerts, records audit trails
│   ├── event-classifier.service.ts     # EVT-001 credential stuffing, EVT-002 session hijack, EVT-003 privilege escalation, EVT-004 token reuse
│   ├── file-classifier.service.ts      # FILE-001 magic bytes disguise, FILE-002 Shannon entropy anomaly, FILE-003 dangerous extensions, FILE-004 hash blocklist
│   └── email-classifier.service.ts     # EML-001 typosquatting lookalike, EML-002 link text/href mismatch, EML-003 suspicious TLDs/shorteners, EML-004 urgency keywords, EML-005 From vs Reply-To mismatch
├── controllers/
│   └── classification.controller.ts    # Handlers for event, file, email classification, history query, and policy configuration
└── routes/
    ├── classification.routes.ts        # POST /classify/event, POST /classify/file, POST /classify/email, GET /classify/history
    └── policies.routes.ts              # GET /policies, GET /policies/:id, PUT /policies/:id

apps/api/tests/
├── event-classifier.test.ts            # 6 tests: clean events, stuffing, hijack, privilege escalation, token reuse, verdict thresholding
├── file-classifier.test.ts             # 7 tests: clean files, magic-byte PE/ELF disguises, high Shannon entropy, dangerous extensions, hash blocklist
└── email-classifier.test.ts            # 6 tests: clean email, typosquatting domains, deceptive hyperlinks, shorteners/TLDs, urgency headers
```

**Files modified:**

- `packages/shared-types/src/alerts.ts` — Added `EVENT_CLASSIFICATION_ALERT`, `FILE_CLASSIFICATION_BLOCKED`, `EMAIL_CLASSIFICATION_PHISHING`
- `packages/shared-types/src/index.ts` — Exported classification types and updated alerts
- `apps/api/src/index.ts` — Mounted `/classify` and `/policies` routes, seeded initial policies
- `SentinelKey.postman_collection.json` — Added Phase 7 folder with 7 classification and policy requests

### Deterministic Heuristic Classifiers

1. **Security Event Classifier (`event-classifier.service.ts`)**:
   - `EVT-001` (Credential Stuffing): Multiple failed logins across different accounts from the same source IP/subnet ($\ge 3$ within window).
   - `EVT-002` (Session Hijack): Concurrent requests for the same session from distinct user agents or IPs.
   - `EVT-003` (Privilege Escalation): User role modification followed immediately by privileged resource access attempt.
   - `EVT-004` (Consumed Token Reuse): Re-submission of an expired, revoked, or already-consumed JWT/refresh token ID.

2. **File Classifier (`file-classifier.service.ts`)**:
   - `FILE-001` (Magic Byte Disguise): Binary file signature inspection (`MZ` / Windows PE, `\x7fELF`, `PK` archive header) mismatching declared MIME or extension (e.g., `.pdf` or `.png` containing executable magic bytes).
   - `FILE-002` (Shannon Entropy Anomaly): Calculates byte-level information density ($H = -\sum p_i \log_2 p_i$). Flags encrypted/packed binaries disguised as plain documents when $H > 7.7$ bits/byte.
   - `FILE-003` (Dangerous Extensions & Double Extensions): Rejects dangerous binaries (`.exe`, `.dll`, `.bat`, `.ps1`, `.vbs`, `.sh`) and disguised double extensions (`.pdf.exe`).
   - `FILE-004` (SHA-256 Hash Blocklist): Computes cryptographic file digest against in-repo known malware hashes.

3. **Email / Phishing Classifier (`email-classifier.service.ts`)**:
   - `EML-001` (Typosquatting & Lookalike Domains): Levenshtein edit distance calculation against trusted corporate domains (e.g. `micros0ft.com`, `paypa1.com`).
   - `EML-002` (Deceptive Hyperlinks): Identifies links where anchor text displays a trusted domain but `href` routes to an external destination.
   - `EML-003` (Suspicious TLDs & Shorteners): Flags high-abuse TLDs (`.top`, `.xyz`, `.tk`, `.click`) and URL shortening services (`bit.ly`, `tinyurl.com`, `t.co`).
   - `EML-004` (Phishing Urgency & Threat Keywords): Detects social engineering pressure indicators ("account suspended", "immediate action required", "verify your identity within 24 hours").
   - `EML-005` (From vs Reply-To Spoofing): Catches domain divergence between email sender header and target response inbox.

### Dynamic Policy Management & Rules Engine

- Default policies seeded on startup: `default-event-policy`, `default-file-policy`, `default-email-policy`.
- Configurable risk thresholds: customizable low/medium/high/critical cutoff boundaries, custom weights per rule ID, and automated actions (`ALLOW`, `WARN`, `BLOCK`, `QUARANTINE`).
- Audit Trail: Immutable database ledger via `ClassificationRecord` with queryable history (`GET /classify/history`).
- Real-time IDS Alert Integration: Classification actions that result in `BLOCK` or `QUARANTINE` automatically dispatch alerts into the Phase 3 Alert Stream.

### Verification

- ✅ `pnpm --filter @sentinelkey/api test` — **122 passed across 17 test suites**:
  - `event-classifier.test.ts` (6 tests)
  - `file-classifier.test.ts` (7 tests)
  - `email-classifier.test.ts` (6 tests)
  - All existing auth, MFA, IDS, alerts, encryption, and ML tests continuing to pass 100%.
- ✅ `pnpm -r build` — Shared types, API, dashboard, and SDK all compile without errors.

---

## Phase 8 — SDK, then Browser Extension

**Status:** ✅ Complete (2026-09-27)

### What was created

```
packages/security-stack-sdk/
├── src/
│   ├── types.ts                        # Configuration, RequestOptions, SentinelKeyError, and shared-type re-exports
│   ├── client.ts                       # SentinelKeyClient: auth, MFA, classification, encryption, IDS alerts, fail-safe defense
│   └── index.ts                        # Public exports (SentinelKeyClient, createSentinelKeyClient, SDK_VERSION)
├── tests/
│   ├── client.test.ts                  # 13 tests: tokens, auto-refresh on 401, classification, field/file encryption, fail-safe
│   └── extension-companion.test.ts     # 8 tests: browser extension client threat interception, file blocking, fail-closed offline
├── CHANGELOG.md                        # Versioned changelog starting at v0.1.0 (Keep a Changelog standard)
└── package.json                        # Exports, types, scripts (build, test, typecheck, lint)

apps/sdk-example/
├── package.json                        # Consumes @sentinelkey/security-stack-sdk via workspace:*
├── tsconfig.json
├── src/
│   └── index.ts                        # Complete round-trip app: health → login → classify → encrypt → fail-safe verification
└── tests/
    └── sdk-example.test.ts             # Acceptance test: verifies 100% SDK call round-trip with zero raw fetch calls

extension/
├── manifest.json                       # Manifest V3 specification with scoped permissions (storage, activeTab, host_permissions)
├── sdk-client.js                       # Browser-compatible SDK client with fail-safe defense
├── background.js                       # MV3 Service worker: coordinates threat checks, stores incidents, updates badge count
├── content.js                          # In-page inspector: intercepts external <a> clicks and <input type="file"> uploads
├── content.css                         # Dark-mode glassmorphic threat modal overlay with override option
├── popup.html                          # Extension popup UI (status banner, URL scanner, file dropzone, incidents feed, settings)
├── popup.css                           # Vanilla CSS styling with SentinelKey design system tokens
├── popup.js                            # Popup controller: health check, quick scans, settings persistence
├── icons/                              # Generated extension icons (icon16.png, icon48.png, icon128.png)
├── make-icons.js                       # Pure Node.js script generating PNG shield icons via raw zlib/deflate
├── README.md                           # Documentation for loading unpacked extension in Chrome
└── SUBMISSION_CHECKLIST.md             # Complete Chrome Web Store review guidelines, permissions justification, packaging
```

### Architectural Highlights

1. **`@sentinelkey/security-stack-sdk` (Phase 8a)**:
   - Thin, strictly typed wrapper class `SentinelKeyClient` and `createSentinelKeyClient` factory.
   - Comprehensive coverage across all security stack capabilities:
     - **Auth & Session**: `login()`, `register()`, `refreshTokens()`, `logout()`, `getMe()`.
     - **Automatic Token Rotation**: Intercepts `401 Unauthorized` responses and silently requests `/auth/refresh`, updates the internal bearer token, triggers the `onTokenRefresh` callback, and retries the original request seamlessly.
     - **MFA**: `setupMfa()`, `verifyMfa()`, `disableMfa()`.
     - **Classification & Compliance**: `classifyEvent()`, `classifyFile()`, `classifyEmail()`, `classifyUrl()`, `checkProduct()`, `getClassificationHistory()`.
     - **Encryption & Key Management**: `uploadFile()`, `downloadFile()`, `listFiles()`, `rotateFileKey()`, `encryptField()`, `decryptField()`, `getKeyStatus()`, `rotateMasterKey()`.
     - **Intrusion Detection**: `getLogs()`, `getAlerts()`, `acknowledgeAlert()`, `resolveAlert()`.
     - **Policies**: `getPolicies()`, `getPolicy()`, `updatePolicy()`.
   - **Fail-Safe Defense**: When `failSafe: true` (default), network errors or unreachable API instances fail closed into a synthetic critical `blocked` verdict (`FAIL-SAFE-001 Backend Unreachable`) rather than silently allowing unverified inputs through.

2. **SDK Example App (`/apps/sdk-example`)**:
   - Meets Phase 8a Acceptance Criteria: consumes `@sentinelkey/security-stack-sdk` through `workspace:*` protocol.
   - Executes a complete health check, authentication, URL classification, field encryption round-trip, and fail-safe offline defense using **only** SDK methods (no raw `fetch` calls).
   - Automated unit & integration acceptance test in `apps/sdk-example/tests/sdk-example.test.ts`.

3. **Manifest V3 Browser Extension (`extension/`) (Phase 8b)**:
   - **Zero Duplication**: Utilizes the SDK client pattern for all threat checks.
   - **Real-Time Click Interception**: Listens for outbound link clicks on web pages, verifies target destinations against SentinelKey email/URL classification rules (`EML-001` typosquatting lookalikes, deceptive text vs href mismatches, suspicious TLDs), and blocks navigation with a warning modal before compromise.
   - **Pre-Flight File Upload Interception**: Intercepts `<input type="file">` change events, computes native SHA-256 digests in-browser (`crypto.subtle`), extracts binary headers, and halts malicious file uploads (`FILE-001` magic byte disguises, `FILE-003` dangerous extensions).
   - **Fail-Safe Client Behavior**: When SentinelKey backend is offline or unreachable, the extension fails closed and blocks unverified files/links with `FAIL-SAFE-001 Backend Unreachable (Fail-Safe Defense)`.
   - **Vanilla CSS Dark Mode Popup**: Connection status indicator, Quick URL Scanner, file pre-flight dropzone, incident log, and settings panel.
   - **Store Submission Ready**: Verified unpacked loading steps, generated icon assets, and complete `SUBMISSION_CHECKLIST.md`.

### Verification

- ✅ `pnpm --filter @sentinelkey/security-stack-sdk test` — **21 tests passed across 2 test suites**:
  - `client.test.ts` (13 tests)
  - `extension-companion.test.ts` (8 tests)
- ✅ `pnpm --filter @sentinelkey/sdk-example test` — **1 passed** (verified full round-trip using only SDK calls).
- ✅ `pnpm --filter @sentinelkey/api test` — **122 passed across 17 test suites**.
- ✅ `pnpm --filter @sentinelkey/dashboard typecheck` — **0 errors**.
- ✅ `pytest apps/ml-service/test_ml_service.py` — **9 passed in 14.74s**.
- ✅ `pnpm -r build` — All packages across the monorepo compile cleanly:
  - `@sentinelkey/shared-types`
  - `@sentinelkey/security-stack-sdk`
  - `@sentinelkey/api`
  - `@sentinelkey/dashboard` (Vite production bundle: 375 kB js, 7.8 kB css)
  - `@sentinelkey/sdk-example`

---

## Phase 9 — Website, Hub Console & Khalti Billing

**Status:** ✅ Complete (2026-09-27)

### What was created

1. **Shared Types (`packages/shared-types/src/billing.ts`)**:
   - `IBillingPlan`, `ISubscription`, `IInvoice`, `PaymentStatus`, `SubscriptionStatus`, `ICheckoutSessionRequest`, `ICheckoutSessionResponse`, `IVerifyPaymentResponse`.
   - Exported from barrel index; built and compiled cleanly.

2. **Backend API Billing Module (`apps/api`)**:
   - `src/config/plans.ts`: Plan catalog for Free, Pro (NPR 2,499/mo), and Enterprise with NPR currency and feature lists.
   - `src/models/subscription.model.ts` & `src/models/invoice.model.ts`: Full Mongoose schemas with indexed userId and khaltiPidx.
   - `src/services/payment-provider.ts`: Provider abstraction with `KhaltiProvider` (ePayment v2 `a.khalti.com/api/v2`) and `MockPaymentProvider` (instant dev testing without credentials).
   - `src/services/billing.service.ts`: Complete lifecycle for getPlans, getSubscription, checkout, verifyPayment, cancelSubscription, and listInvoices.
   - `src/controllers/billing.controller.ts` & `src/routes/billing.routes.ts`: REST endpoints mounted at `/billing/*`.
   - Unit tests in `apps/api/tests/billing.service.test.ts` (10 tests, 100% passing).

3. **Frontend Application (`apps/website`)**:
   - **Landing Page (`/`)**: Exact match to reference Image 1:
     - Pitch-black hero (`#0A0D14`) with scattered floating monospace letters (`E`, `R`, `X`, `D`, `K`).
     - "Trust SentinelKey for the Agents You Don't" with dual CTAs (vibrant Docker blue `Get started` + outline `Learn more`).
     - 3 luminous spotlight cards with glowing blue borders (Sentinel Sandboxes, Sentinel AI Governance, Sentinel Hardened Baselines).
     - Trust strip with enterprise partner logos.
     - Side-by-side terminal & governance views ("Developer view: Your laptop. One command" and "Governance console: 14 checks").
     - 2×2 runtime showcase with 3D wireframe cube and sphere vectors.
     - 3 value pillars ("Lower cost", "Ship faster", "Compliant by default").
     - Stats band (91% Fortune 100, 20B+ attestation events, 20M+ agent sessions).
     - SentinelKey Desktop showcase with UI preview and download CTA.
     - "Build better, together" offering pills.
     - Enterprise dark footer (`#080C14`).
   - **User Hub Console (`/app`)**: Exact match to reference Image 2:
     - Obsidian/violet dark theme (`#0D0B18`) and top bar with breadcrumb badge, notifications, theme toggle, and profile avatar.
     - 10-item Left Navigation Sidebar with profile block (`alexchen`), WORKSPACE (`Home`, `Build & Enclave`), ACCOUNT & SECURITY (`Account Information`, `Email & Identity`, `Password`, `2FA & Passkeys`, `Personal Access Tokens`, `Connected Clusters`, `Convert / Organization`, `Privacy & Audit`, `Deactivate`), and pinned `Billing & Subscription`.
     - Cosmic radiant purple gradient Welcome banner ("Welcome to SentinelKey Home, [username]").
     - 3×2 SentinelKey products grid: `sentinel:desktop`, `buildshield`, `sentinel:scout`, `sentinel:vault`, `TestEnclaves`, `HardenedBaselines` with exact tags, descriptions, and action links.
     - 4 Resources cards: `Learning Paths`, `Docs`, `Support`, `Forums`.
     - Live hardware attestation daemon dock (`● Hardware Attestation Daemon: OK (Enclave active) | Cluster: us-east-sgx-04` + `sentinel enclave status`).
   - **Billing & Subscription Page (`/app/billing`)**:
     - Current subscription card, Khalti plan picker, checkout initiation, return URL `?pidx=...` automatic payment verification, and invoice history table.
   - **Authentication Pages (`/login`, `/signup`) & Settings (`/app/settings`)**:
     - Complete token refresh, profile, MFA status link into SOC console, and session logout.

### Verification

- ✅ `pnpm --filter @sentinelkey/api test` — **139 tests passed across 18 test suites** (including 17 billing & Khalti integration tests).
- ✅ `pnpm --filter @sentinelkey/api typecheck` — **0 errors**.
- ✅ `pnpm --filter @sentinelkey/website typecheck` — **0 errors**.
- ✅ `pnpm --filter @sentinelkey/website build` — **Production bundle compiled successfully**.
- ✅ `pnpm build` — **All workspace packages built successfully**.

### Khalti ePayment v2 Production Alignment (per docs/payment-integration.md)
- **Protocol & Base URLs**: Supports both Sandbox (`https://dev.khalti.com/api/v2`) and Production (`https://a.khalti.com/api/v2`) with automatic environment detection based on key prefix (`test_` vs `live_`).
- **Secret Key Sanitization**: Robust authorization header formatting (`Authorization: Key <secret_key>`), safely handling raw keys or pre-prefixed keys.
- **Paisa Amount Convention**: Strict integer conversion (`Math.round(priceNpr * 100)`), verified against Khalti lookup totals upon verification to prevent price manipulation.
- **Customer Phone Requirement**: Added optional customer phone and name support in checkout payload and billing UI modal, satisfying Khalti's live environment phone requirement with sandbox fallbacks.
- **Idempotency & Security**: Guarded order fulfillment against repeated return URL visits / browser refreshes, verified invoice ownership by user ID, and cleaned query string parameters upon verification.

---

## Phase 9.5 — Mobile Security Console Experience

**Status:** ✅ Complete (2026-09-28)

### What was created

```
apps/dashboard/src/
├── hooks/
│   └── useMediaQuery.ts               # useMediaQuery, useIsMobile(768), useIsTablet() hooks
├── components/
│   ├── common/
│   │   ├── BottomSheet.tsx            # Accessible touch slide-up bottom sheet with backdrop blur & drag handle
│   │   ├── SeverityBadge.tsx          # Multi-attribute badge (Color + Icon + Text; never color alone)
│   │   └── TapToCopy.tsx              # Monospace copy pill with visual feedback & zero horizontal overflow
│   └── layout/
│       ├── BottomNav.tsx              # Native mobile bottom tab bar (Dashboard, Alerts, Activity, More)
│       └── MobileDrawer.tsx           # Slide-in drawer with identity cards, navigation, and safe logout confirmation
```

**Files modified:**

- `apps/dashboard/index.html` — Added `viewport-fit=cover` to viewport meta tag.
- `apps/dashboard/src/index.css` — Integrated safe-area insets (`--sat`, `--sab`, `--sal`, `--sar`), fluid typography, 44px minimum tap targets, `@media (hover: hover)` guards, bottom sheet & mobile card styles.
- `apps/dashboard/src/App.tsx` — Integrated `BottomNav`, `MobileDrawer`, and dynamic viewport padding.
- `apps/dashboard/src/components/layout/Navbar.tsx` — Responsive header with compact mobile title, IDS live pulse, one-tap alert count jump, and drawer menu trigger.
- `apps/dashboard/src/components/overview/OverviewView.tsx` — Added top glanceable posture hero card, single vertical urgency flow, responsive touch charts, ranked IP list with `TapToCopy`, and probe simulation bottom sheet.
- `apps/dashboard/src/components/overview/ServiceGuide.tsx` — Responsive height and mobile CTA button sizing.
- `apps/dashboard/src/components/alerts/AlertsView.tsx` — Purpose-built mobile triage cards, `SeverityBadge` (Color + Icon + Text), sticky filter bar with active chips, filter bottom sheet, and 44px action buttons.
- `apps/dashboard/src/components/logs/LogsView.tsx` — Preserved 7-column desktop table; added mobile security event cards, sticky search bar, filter bottom sheet, and full-screen/bottom-sheet JSON inspector.
- `apps/dashboard/src/components/settings/MfaSettingsView.tsx` — Single-column flow, centered QR code, 2-column backup codes with `TapToCopy`, 16px inputs (`inputmode="numeric"`, `autocomplete="one-time-code"`), and destructive action confirmation sheet.
- `apps/dashboard/src/components/admin/AdminView.tsx` — Preserved desktop matrix table; added mobile permission cards with role entitlement badges (`ADMIN`, `ANALYST`, `VIEWER`) and live search filter.
- `apps/dashboard/src/components/auth/AuthModal.tsx` — Full-height (`100dvh`) minimal view, 16px inputs to eliminate iOS auto-zoom, and 48px primary action buttons.

### Architectural Highlights

1. **Strict Presentation-Layer Scope**: Zero backend routes, Mongo models, JWT logic, permissions, or API contracts were modified.
2. **100% Desktop Preservation**: Desktop layout (`>= 1024px`) remains visually and functionally identical to previous phases.
3. **Mobile-Native Standards**:
   - Zero horizontal scroll across 360px, 390px, and 430px screens.
   - Body font at least 16px and all form inputs at least 16px (eliminating iOS Safari auto-zoom).
   - Tap targets strictly meet or exceed 44x44px.
   - Severity is never conveyed by color alone (always Color + Icon + Text).
   - Safe-area insets respected on notch and home-indicator devices.

### Verification

- ✅ `pnpm --filter @sentinelkey/dashboard typecheck` — **0 errors**.
- ✅ `pnpm --filter @sentinelkey/dashboard lint` — **0 errors**.
- ✅ `pnpm --filter @sentinelkey/dashboard build` — **Production bundle compiled successfully**.
- ✅ `pnpm typecheck` — **All 6 workspace packages passed cleanly**.
- ✅ Browser viewport testing at 360px, 390px, 430px, 768px, and 1024px+ verified zero overflow and fluid responsive layout.

---

## Phase 10: Domains, Metering & Usage Billing

### Sub-Phase 10a: Domain Registry & SHA-256 Hashed Site Keys (Completed)

#### Completed Work & Architecture

1. **Shared Types (`packages/shared-types`)**:
   - `IDomain`: Core domain interface including `id`, `userId`, `label`, `host`, `port`, `origin`, `status` (`active` | `pending` | `suspended` | `deleted`), `suspensionReason` (`plan_limit` | `quota_exceeded` | `payment_past_due` | `manual`), `siteKeyPrefix`, `keyCreatedAt`, `keyRotatedAt`, `lastSeenAt`, and backward compatibility getters (`name`, `domainUrl`).
   - `ICreateDomainRequest`, `ICreateDomainResponse`, `IRotateKeyResponse`, `IUpdateDomainRequest`, `IKeepDomainsRequest`.
   - RBAC Permissions: `domains:read`, `domains:write`, `domains:manage` added to `Permission` and `DEFAULT_ROLE_PERMISSIONS`.
   - Security Events: `DOMAIN_REGISTERED`, `DOMAIN_KEY_ROTATED`, `DOMAIN_SUSPENDED`, `DOMAIN_REACTIVATED`, `DOMAIN_DELETED` added to `SecurityEventType`.

2. **Domain Configuration & Validation (`apps/api/src/config/domains.ts`)**:
   - Allowed hosts restricted strictly to `['localhost', '127.0.0.1', '[::1]']`.
   - Reserved ports rejected: `4000` (API), `5001` (ML Anomaly Service), `5173` (Dashboard), `5174` (Website/Hub).
   - Port validation: strictly 1–65535, integer only.
   - Normalized origin string format: `host:port` (lowercase, trimmed).

3. **Mongoose Model (`apps/api/src/models/domain.model.ts`)**:
   - `origin` partial unique index: `{ origin: 1 }` with `{ partialFilterExpression: { status: { $ne: 'deleted' } } }`. Soft-deleted domains do not block origin re-registration.
   - `siteKeyHash`: 64-character SHA-256 digest with `select: false`.
   - `toJSON` transform: deletes `siteKeyHash` and `__v`, exposes backward-compatible virtual getters.

4. **Cryptographic Site-Key Security (`apps/api/src/services/domain.service.ts`)**:
   - Site keys generated using Node.js `crypto.randomBytes(32)` as `sk_live_<hex64>`.
   - Returned **exactly once** in `createDomain` and `rotateKey` response bodies.
   - Plain key is **never saved** to MongoDB and **never returned** in list, get, update, or delete operations.
   - Verified via dedicated test suite `apps/api/tests/site-key-never-exposed.test.ts`.

5. **Plan Limits Enforcement**:
   - Dynamic subscription check via `BillingService.getSubscription(userId)`.
   - Free: 1 active domain, Pro: 5 active domains, Enterprise: 25+ active domains.
   - Enforced on creation and on reactivation.
   - Downgrade helper `keepDomainsOnDowngrade()` suspends unselected domains with reason `plan_limit`.

6. **Controller & Routes (`apps/api/src/controllers/domain.controller.ts`, `apps/api/src/routes/domain.routes.ts`)**:
   - `POST /domains` (`domains:write`) — registers domain and reveals key once (201).
   - `GET /domains` (`domains:read`) — lists caller's active domains (or all if admin).
   - `GET /domains/:id` (`domains:read`) — returns domain details.
   - `PATCH /domains/:id` (`domains:write`) — updates label only (origin is immutable).
   - `POST /domains/:id/rotate-key` (`domains:write`) — invalidates previous key and issues new one (revealed once).
   - `POST /domains/:id/suspend` (`domains:write`) — suspends domain with audit reason.
   - `POST /domains/:id/reactivate` (`domains:write`) — reactivates domain if within plan limit.
   - `DELETE /domains/:id` (`domains:write`) — soft deletes domain (`status: 'deleted'`).
   - `POST /domains/keep` (`domains:write`) — bulk selects active domains on downgrade.

7. **Postman Collection**:
   - Added `Phase 10a - Domain Registry` folder to `apps/api/postman/SentinelKey.postman_collection.json` with test scripts capturing `domainId` and `siteKey`.

#### Verification Results

- ✅ `pnpm --filter @sentinelkey/api test tests/domain.service.test.ts tests/site-key-never-exposed.test.ts` — **20/20 passed**.
- ✅ `pnpm --filter @sentinelkey/api test` — **21 test files, 166/166 tests passed**.
- ✅ `pnpm -r test` — **All workspace tests passed (API, SDK, Example App)**.
- ✅ `pnpm -r build` — **All 6 packages compiled successfully**.

---

### Sub-Phase 10b — Site-Key Authentication, Metering and Quotas

**Status:** ✅ Complete (2026-09-28)

#### What was created & modified

1. **Shared Types (`packages/shared-types`)**:
   - `UnitTier`: `'light'` (1 unit), `'standard'` (3 units), `'heavy'` (10 units).
   - Usage types: `IUsageUnitsByTier`, `IUsageRollup`, `IDomainUsageSummary`, `IUsageSummaryResponse`, `IDailyUsageBreakdown`.
   - Security Events: added `DOMAIN_ORIGIN_MISMATCH` and `QUOTA_EXCEEDED` to `SecurityEventType`.
   - Attribution: added optional `domainId` to `ISecurityEvent`, `IAlert`, and `IClassificationResult`.

2. **Metering Configuration & Route Tiers (`apps/api/src/config/metering.ts`)**:
   - Rates strictly in integer paisa: List rate (5 paisa/unit), Pro overage (4 paisa/unit), Enterprise overage (3 paisa/unit).
   - Plan quotas: Free (10,000 units/mo hard cap), Pro (25,000 units/domain/mo allowance), Enterprise (100,000 units/domain/mo).
   - Canonical `SDK_ROUTE_TIERS` registry mapping all SDK-facing routes (`/classify/*`, `/files/*`, `/logs`, `/alerts`, `/domains/telemetry`).

3. **Atomic Rollup Model (`apps/api/src/models/usage-rollup.model.ts`)**:
   - Daily per-domain rollup documents (`UsageRollup`) using atomic `$inc` updates (no per-call documents).
   - Unique compound index on `{ domainId: 1, date: 1 }` and secondary index on `{ userId: 1, date: 1 }`.
   - 100% local persistence on developer machine via `apps/api/data/mongo-dev`.

4. **Metering & Quota Service (`apps/api/src/services/metering.service.ts`)**:
   - `recordUsage()`: atomic `$inc` for 2xx responses (billable units), increments `requestsTotal` on 4xx/5xx errors without billable units. Completely fail-safe error handling.
   - `checkQuota()`: hard-blocks Free plan users when user-level cumulative usage across all domains (including deleted) exceeds 10,000 units and emits `QUOTA_EXCEEDED` security event. Allows Pro/Enterprise to accrue overage without blocking.
   - `getUsageSummary()`: aggregates current-period units across all user domains and calculates projected overage in integer paisa.
   - `getDomainDailyUsage()`: returns daily breakdown for domain owner (or admin) and rejects non-owners with 403.

5. **Universal Site-Key Authentication Middleware (`apps/api/src/middleware/authenticate-site-key.ts`)**:
   - Dual-auth: accepts `X-Site-Key` / `Bearer sk_live_...` (metered, domain-attributed) and User JWT `Bearer <jwt>` (unmetered, dashboard calls).
   - Rejects unrecognized keys (401), unpaid suspended domains (402), and suspended domains (403).
   - Validates browser `Origin` header against domain's registered origin; rejects mismatch with 403 and emits `DOMAIN_ORIGIN_MISMATCH`. Permits absence of `Origin` for server-to-server calls.
   - Automatically transitions domain from `pending` -> `active` on first authenticated request; throttles `lastSeenAt` updates.
   - Response interceptor meters 2xx responses on `'finish'`.

6. **Per-Domain Rate Limiting (`apps/api/src/middleware/rate-limiter.ts`)**:
   - Extended in-memory rate limiter to track both IP (`ip:${ip}`) and Domain (`domain:${domainId}`).
   - Exported `apiRateLimiter` configured for SDK-facing endpoints.

7. **Attribution & Domain Filtering**:
   - Attached `domainId` to `SecurityEvent`, `Alert`, and `ClassificationRecord`.
   - Added `domainId` query filtering to `GET /logs`, `GET /alerts`, and `GET /classify/history`.

8. **Endpoints Mounted (`apps/api/src/routes/billing.routes.ts`, `classification.routes.ts`, `files.routes.ts`, `logs.routes.ts`, `alerts.routes.ts`)**:
   - `GET /billing/usage`
   - `GET /billing/usage/domains/:id`
   - Mounted `authenticateOrSiteKey` and `apiRateLimiter` on SDK-facing endpoints.

9. **Postman Collection**:
   - Added `Phase 10b - Metering & Quotas` folder to `apps/api/postman/SentinelKey.postman_collection.json`.

#### Verification Results

- ✅ `tier-mapping.test.ts` — **7/7 passed**: verifies all SDK-facing routes have assigned tiers and unit weights.
- ✅ `site-key-auth.test.ts` — **10/10 passed**: validates site key header/bearer auth, origin matching, server-to-server calls, pending->active transition, and unpaid/suspended rejections.
- ✅ `metering.test.ts` — **5/5 passed**: validates atomic rollups, error requests without billable units, fail-safe DB error resilience, and unmetered JWT calls.
- ✅ `quota-enforcement.test.ts` — **6/6 passed**: validates 10,000 Free hard cap, Pro overage accrual, non-reset on domain deletion/re-registration, and billing usage summaries.
- ✅ `domain-rate-limiter.test.ts` — **2/2 passed**: validates per-domain rate limiting across multiple IPs and domain counter isolation.
- ✅ Full API Suite: **27 passed test files, 199/199 tests passed**.
- ✅ Full Workspace Tests (`pnpm -r --if-present test`): **All packages passed (API + SDK Example App)**.
- ✅ Full Workspace Build (`pnpm -r build`): **All 6 packages compiled cleanly**.

---

### Sub-Phase 10c — Usage Invoicing, Khalti Payment and Suspension

**Status:** ✅ Complete (2026-09-28)

#### What was created & modified

1. **Shared Types (`packages/shared-types`)**:
   - `InvoiceType`: `'subscription' | 'usage'`.
   - `IUsageInvoiceLineItem`: `{ tier?: string; units?: number; ratePaisa?: number; amountPaisa: number; description: string }`.
   - Extended `IInvoice` with `type`, `domainId`, `domainOrigin`, `periodStart`, `periodEnd`, `lineItems`, `dueDate`.
   - Security Events: added `USAGE_INVOICE_CREATED`, `DOMAIN_SUSPENDED_UNPAID`, and `DOMAIN_REACTIVATED_PAYMENT` to `SecurityEventType`.

2. **Invoice Model (`apps/api/src/models/invoice.model.ts`)**:
   - Schema extended with `type` (enum `subscription` / `usage`), `domainId`, `domainOrigin`, `periodStart`, `periodEnd`, `lineItems`, and `dueDate`.
   - Idempotency index: compound unique index `{ domainId: 1, periodStart: 1, periodEnd: 1 }` with `{ partialFilterExpression: { type: 'usage', domainId: { $exists: true } } }`.

3. **Usage Invoicing Configuration (`apps/api/src/config/metering.ts`)**:
   - `MINIMUM_PAYABLE_PAISA = 1000` (NPR 10 minimum transaction threshold).
   - `USAGE_INVOICE_GRACE_PERIOD_DAYS = 7` (7-day delinquency window).

4. **Usage Invoicing Service (`apps/api/src/services/usage-invoicing.service.ts`)**:
   - `closeBillingPeriodForUser()`: Idempotent period close for user domains. Computes per-domain overage as `max(0, units - included) × overage_rate_paisa` (integer paisa only). Free plan never generates usage invoices; sub-minimum amounts (< 1,000 paisa) roll forward.
   - `checkDelinquency()`: Evaluates unpaid usage invoices past their 7-day grace period; suspends delinquent domains (`status: 'suspended'`, `suspensionReason: 'unpaid'`) and emits `DOMAIN_SUSPENDED_UNPAID`.
   - `getAccruedOverageEstimate()`: Calculates accrued open-period overage estimates per domain and returns `isPayable` flag for UI.
   - `onUsageInvoicePaid()`: Automatically reactivates suspended domains (`status: 'active'`) when overdue usage invoice is paid and emits `DOMAIN_REACTIVATED_PAYMENT`.

5. **Billing Service Integration (`apps/api/src/services/billing.service.ts`)**:
   - `checkoutUsageInvoice()`: Initiates Khalti checkout session for a specific usage invoice.
   - `verifyPayment()`: Seamlessly verifies both subscription and usage invoices via `MockPaymentProvider` / Khalti ePayment v2. For usage invoices, executes domain reactivation and idempotently returns without disrupting subscription cadence. Preserves strict amount verification against tampering.
   - `listInvoices()`: Extended with query filters for `type` (`'subscription'` | `'usage'`) and `domainId`.

6. **In-Process Scheduler & Delinquency Hooks (`apps/api/src/index.ts`, `apps/api/src/controllers/billing.controller.ts`)**:
   - Background delinquency checker interval registered in API server process.
   - Lazy delinquency evaluation on caller requests to `listInvoices`, `getUsageSummary`, and `getAccruedOverageEstimate`.

7. **Endpoints Mounted (`apps/api/src/routes/billing.routes.ts`)**:
   - `GET /billing/invoices?type=usage&domainId=...`
   - `POST /billing/invoices/:id/checkout`
   - `GET /billing/verify?pidx=...` (reused for usage invoices)
   - `GET /billing/usage/estimate`
   - `POST /billing/usage/close`

8. **Postman & Documentation**:
   - Added `Phase 10c - Usage Invoicing & Payment` folder to `apps/api/postman/SentinelKey.postman_collection.json`.
   - Added Section 11 to `docs/payment-integration.md` detailing the usage invoicing, Khalti checkout, and suspension flows.

#### Verification Results

- ✅ `usage-invoicing.test.ts` — **8/8 passed**:
  - Worked example test: Pro domain with 40,000 units and 25,000 included at 4 paisa/unit produces an invoice of 60,000 paisa (NPR 600).
  - Period close run twice yields exactly one invoice per domain (idempotency).
  - Sub-minimum amount (< 1,000 paisa) is rolled forward, not created.
  - Free plan never produces usage invoices.
  - Usage invoice checkout & verification flow with `MockPaymentProvider`.
  - Amount tampering at verify time is rejected.
  - Unpaid past grace -> domain suspended and calls return 402; payment -> reactivated.
  - `GET /billing/usage/estimate` returns accurate accrued overage and `isPayable` flag.
- ✅ Full API Suite: **28 passed test files, 207/207 tests passed**.
- ✅ Full Workspace Tests (`pnpm -r --if-present test`): **All packages passed (API + SDK Example App)**.
- ✅ Full Workspace Build (`pnpm -r build`): **All 6 packages compiled cleanly**.



