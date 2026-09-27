# Full Security Stack — Implementation Roadmap

**Stack:** MERN (MongoDB, Express, React, Node.js) + Python microservice (ML)
**Package manager:** pnpm (monorepo / workspaces)
**Build tooling:** Antigravity IDE + DeepSeek V4 Pro (0813)
**Core principle:** All security-critical logic is hand-built (no delegation to third-party security SaaS). External APIs are permitted ONLY for peripheral delivery (email/SMS sending, optional KMS for key storage). See "Core vs Peripheral" table in Phase 0.

This document is the single source of truth for the AI coding agent. Each phase is self-contained, has explicit inputs/outputs, and must be completed and verified before the next phase begins. Do not skip ahead. Do not silently substitute a third-party service for a "must be hardcoded" item — if a substitution seems necessary, stop and flag it instead of proceeding.

---

## Phase 0 — Repo & Environment Setup

**Goal:** A working pnpm monorepo skeleton with all services wired but empty, so every later phase has a fixed place to land.

**Scope:**
- Initialize a pnpm workspace monorepo with this structure:
  ```
  /apps
    /api           (Express backend — auth, RBAC, encryption, IDS, compliance, logs)
    /dashboard     (React frontend)
    /ml-service    (Python — Flask/FastAPI anomaly detection)
  /packages
    /security-stack-sdk   (Node.js SDK, published internally first)
    /shared-types         (shared TS types/interfaces used by api + dashboard + sdk)
  /extension        (browser extension — Phase 8, stubbed only for now)
  pnpm-workspace.yaml
  ```
- `pnpm-workspace.yaml` referencing `apps/*` and `packages/*`.
- Root-level `package.json` with shared dev-dependencies (eslint, prettier, typescript, husky for pre-commit).
- `.env.example` files per app — never commit real `.env`.
- Docker Compose file for local dev: MongoDB, api, ml-service, dashboard (Python service isolated from Node services).
- Decide and document TypeScript vs JavaScript for `apps/api` and `apps/dashboard` (recommend TypeScript for a security product — stronger contracts).

**Core vs Peripheral reference table (carry into every phase):**

| Module | Hardcoded (core) | External API allowed (peripheral) |
|---|---|---|
| Auth | JWT sign/verify, session lifecycle, RBAC engine, password hashing (via library, not API) | — |
| MFA | OTP generation + verification + attempt limiting | SMS/email *delivery* only |
| Encryption | Encrypt/decrypt logic, key derivation, rotation policy | Optional cloud KMS for master-key storage |
| Intrusion Detection | All detection heuristics/scoring | — |
| ML Anomaly Detection | Training pipeline, feature extraction, model | — |
| Compliance/Classification | Rules engine, taxonomy logic | Explicit exception if using LLM API — decide in Phase 7, not silently |
| Alerting | Trigger logic, dedup/throttle logic | Delivery channel (Slack webhook, email, SMS) |
| Dashboard | All aggregation/report logic | Charting library (not an API) |

**Deliverables:** empty-but-runnable skeleton; `pnpm install` and `docker compose up` succeed; a health-check route (`GET /health`) returns 200 from `apps/api`.

**Definition of done:** Fresh clone → `pnpm install` → `docker compose up` → health check passes. No feature logic yet.

---

## Phase 1 — Auth + RBAC (fully custom)

**Goal:** A working login → protected-route flow with custom JWT and role-based permissions. No third-party auth provider anywhere in this phase.

**Must be hardcoded:**
- User schema (Mongo): email, hashed password, roles[], createdAt, lastLogin.
- Password hashing via `bcrypt` or `argon2` (library call — this is a local computation, not an "external API," so it's fine).
- Custom JWT issuing: access token (short-lived) + refresh token (longer-lived, stored hashed in DB, rotated on use).
- Custom JWT verification middleware (no auth-provider SDK).
- RBAC model: `Role -> Permission[]` stored in DB or config; middleware `requirePermission('resource:action')`.
- Rate limiting on login attempts (in-memory or Redis counter — your own logic, not a third-party rate-limit API).

**Endpoints:**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

**Acceptance criteria:**
- Register → login → receive access + refresh token.
- Protected route rejects missing/expired/invalid token with 401.
- Protected route rejects valid token lacking required permission with 403.
- Refresh token rotates on use; old refresh token is invalidated (reuse triggers a security log entry — feeds Phase 3).
- Password never returned in any API response, ever (write a test asserting this).

**Definition of done:** Full auth flow demoable via curl/Postman collection checked into `/apps/api/postman/`. Unit tests for token issuance, expiry, RBAC middleware.

---

## Phase 2 — MFA

**Goal:** Add a second factor on top of Phase 1's login flow.

**Must be hardcoded:**
- TOTP or HOTP secret generation per user (store encrypted — coordinate with Phase 5, but a temporary AES call is fine as a placeholder here).
- Code verification logic with a time-drift window (TOTP) or counter sync (HOTP).
- Attempt limiting: lock MFA verification after N failed attempts, with backoff.

**Peripheral (allowed):**
- Delivery of OTP via email (SMTP/SES) or SMS (Twilio) if you choose OTP-over-email/SMS instead of/alongside app-based TOTP. Delivery provider is swappable; the generation/verification logic is not.

**Endpoints:**
- `POST /auth/mfa/setup` — returns secret/QR data (if TOTP) or triggers first code send.
- `POST /auth/mfa/verify` — completes login.
- `POST /auth/mfa/disable`

**Acceptance criteria:**
- Login with MFA enabled requires a second step before tokens are issued.
- Expired/reused codes rejected.
- Lockout after configurable failed-attempt threshold, with a log event (feeds Phase 3).

**Definition of done:** MFA can be toggled per user; full login+MFA flow tested end to end.

---

## Phase 3 — Logging + Rules-Based Intrusion Detection

**Goal:** Every security-relevant event is logged in a consistent schema, and a set of hardcoded heuristics flags suspicious patterns in near-real-time. No ML yet — that's Phase 6, and this phase's data is what trains it.

**Must be hardcoded:**
- `SecurityEvent` schema: type, userId/IP, timestamp, metadata, severity.
- Event emitters wired into Phase 1/2 (failed login, token reuse, MFA lockout, permission-denied).
- Heuristics engine, e.g.:
  - Failed-login threshold per account/IP within a time window.
  - Geo-velocity check (impossible travel between two logins).
  - Request-rate anomaly per API key/user.
  - Privilege-escalation attempt pattern (repeated 403s on sensitive routes).
- Alert-trigger logic: when a heuristic fires, create an `Alert` record and call the alerting hook (Phase 3 stub is enough; full delivery wiring can wait for Phase 4/8 or be done now if convenient).

**Endpoints:**
- `GET /logs` (paginated, filterable — role-gated via Phase 1 RBAC)
- `GET /alerts`
- `POST /alerts/:id/acknowledge`

**Acceptance criteria:**
- Simulate 10 failed logins in under a minute → alert generated.
- Simulate login from two geographically distant IPs within an implausible time window → alert generated.
- All heuristics have unit tests with synthetic event sequences (this synthetic data doubles as Phase 6 bootstrap data).

**Definition of done:** Heuristics run automatically on incoming events (not manually triggered); alerts are queryable via API.

---

## Phase 4 — Dashboard (React)

**Goal:** Make Phases 1–3 visible and demoable. This is deliberately scheduled early because a working dashboard makes the whole project feel real before the hardest phases (5–7) begin.

**Scope:**
- Login screen (consumes Phase 1+2 endpoints).
- RBAC-aware navigation (hide sections the logged-in role can't access).
- Logs view: filterable table.
- Alerts view: list + acknowledge action.
- Charting library (Chart.js or D3 — a library, not an external API) for: login attempts over time, alert severity breakdown, top flagged IPs/users.

**Acceptance criteria:**
- A viewer-role user cannot see admin-only panels (verified against Phase 1's RBAC, not just hidden in the UI — the API must also reject it).
- Charts update from real API data, not mock data, by the end of this phase.

**Definition of done:** Dashboard runnable via `pnpm --filter dashboard dev`; demoable against a seeded dataset.

---

## Phase 5 — Encryption

**Goal:** Real encryption for sensitive fields and file uploads, with a deliberate key-management decision made *before* implementation.

**Step 1 — Design decision (must be written down, not skipped):**
- Where does the master key live? Options: environment-injected secret, self-hosted key file with restricted permissions, or external KMS (peripheral exception, allowed).
- Key rotation policy: how often, how old data gets re-encrypted or left under the old key with a key-version tag.
- Document this in `/apps/api/docs/encryption-design.md` before writing implementation code.

**Must be hardcoded:**
- Field-level encryption/decryption functions (AES-256-GCM recommended) applied to sensitive Mongo fields.
- File upload/download encryption pipeline (encrypt on upload, decrypt on authorized download only).
- Key-version tagging on encrypted data so rotation doesn't break old records.
- Access log entry every time a file is decrypted/downloaded (feeds Phase 3's event stream).

**Peripheral (allowed, optional):** master key stored in a cloud KMS rather than hardcoded storage.

**Acceptance criteria:**
- Sensitive fields are unreadable directly from the DB (verify by inspecting raw Mongo documents).
- File round-trips: upload → stored encrypted → authorized download → byte-identical to original.
- Unauthorized download attempt is rejected and logged.
- Key rotation test: rotate key, confirm old data still decrypts via version tag, new data uses new key.

**Definition of done:** Encryption design doc committed; all sensitive fields and file storage go through the encryption layer; rotation tested.

---

## Phase 6 — ML Anomaly Detection (Python microservice)

**Goal:** Replace/augment Phase 3's static heuristics with a statistical/ML model trained on real accumulated log data.

**Prerequisite:** Phase 3 must have been running long enough to produce a meaningful volume of `SecurityEvent` data (real or synthetic-seeded).

**Must be hardcoded:**
- Feature extraction from `SecurityEvent` data (login frequency, time-of-day patterns, geo-distance between logins, request rate, etc.).
- Model: start with a simple, explainable approach — isolation forest or statistical outlier detection (z-score/IQR-based) — before anything deep-learning-flavored.
- Training pipeline (Python, in `apps/ml-service`) that can be re-run on a schedule.
- Inference endpoint that the Node API calls to score new events in near-real-time.
- Model versioning (know which model produced which score).

**Interface with Node API:**
- `apps/ml-service` exposes `POST /score` (internal-only, not public-facing) — the Node API calls this after logging each event.

**Acceptance criteria:**
- Model flags synthetic anomalies (e.g., a login pattern deliberately constructed to be unusual) that the static heuristics either missed or scored differently.
- False-positive rate is measured and documented on a held-out sample, not assumed.
- Retraining can be triggered without downtime to the main API (the API should degrade gracefully to heuristics-only if `ml-service` is unreachable).

**Definition of done:** `ml-service` runs as its own container; Node API integrates its scores into the Alerts pipeline from Phase 3; fallback behavior tested.

---

## Phase 7 — Compliance / Classification Engine

**Goal:** Three hardcoded base classification services — **event**, **file**, and **email** — all rules/pattern-based. No LLM API, no third-party classification service anywhere in this phase; this is fully custom logic, consistent with the Core vs Peripheral table in Phase 0.

**Shared foundation (build once, reuse across all three):**
- A common rules engine / policy config format (JSON-based, versioned) that all three classifiers load their rules from.
- A common `ClassificationResult` shape: `{ subjectType, subjectId, verdict, matchedRules[], severity, policyVersion, timestamp }`.
- Decision thresholds and action mapping shared across classifiers (flag, block, escalate to Phase 3 alerting) — defined once, referenced by all three.
- Audit trail: every classification decision logged with the policy version used, regardless of which of the three services produced it.

**7a — Event classification**
- Consumes `SecurityEvent` records from Phase 3.
- Hardcoded pattern rules beyond Phase 3's basic heuristics — e.g., sequences of events across a session that individually look benign but together indicate a known attack pattern (credential-stuffing sequence, session-hijack pattern, privilege-escalation chain).
- Output feeds directly into Phase 3's `Alert` pipeline (same severity/escalation path).

**7b — File classification**
- Runs against files at upload time (before or alongside Phase 5's encryption step).
- Hardcoded checks: file-type/signature validation (magic-byte check, not just extension), size/entropy anomalies (e.g., unexpectedly high entropy suggesting packed/encrypted malware), filename pattern rules, hash-based blocklist matching (maintain your own hash list — no external threat-intel API).
- Verdict determines whether the file proceeds to storage, is quarantined, or is rejected outright.

**7c — Email classification**
- Runs against email content/metadata (e.g., inbound addresses submitted through the platform, or content passed in via the SDK/extension in Phase 8).
- Hardcoded checks: header/sender pattern rules, known-phishing keyword/pattern matching, link-structure heuristics (mismatched display text vs. href, suspicious TLDs, URL-shortener detection), lookalike-domain detection (edit-distance against a configured list of legitimate domains).
- Verdict maps to flag/block same as the other two.

**Endpoints:**
- `POST /classify/event`
- `POST /classify/file`
- `POST /classify/email`
- `GET /policies`, `PUT /policies/:id` (RBAC-gated) — shared policy store across all three classifiers, filterable by classifier type.

**Acceptance criteria:**
- Same input against the same policy version always produces the same verdict for each of the three classifiers (fully deterministic — no LLM non-determinism to document here).
- Policy changes are versioned; historical classifications still show which policy version applied, per classifier.
- Each classifier has its own test set of known-bad and known-safe inputs (malicious/benign files, phishing/legitimate emails, attack-pattern/benign event sequences) and classifies correctly at a threshold defined before testing, not after.
- File and email classifiers integrate with Phase 3 alerting on a "block" or "flag" verdict, same as event classification.

**Definition of done:** All three classifiers (event, file, email) implemented against the shared rules engine, sharing the audit-trail and policy-versioning infrastructure; each integrated with Phase 3's alerting pipeline; each has its own passing test set.

---

## Phase 8 — SDK, then Browser Extension

### 8a — `security-stack-sdk` (Node.js package)

**Goal:** Wrap the now-stable APIs from Phases 1–3 and 5–7 into a clean SDK.

**Scope:**
- Thin, typed wrapper functions: `securityStack.login()`, `securityStack.checkProduct(description)`, `securityStack.encryptField(value)`, etc.
- Published internally via the pnpm workspace first (`workspace:*` protocol) before considering public npm publish.
- Versioned changelog from the start.

**Acceptance criteria:** A throwaway sample app in `/apps/sdk-example` consumes the SDK and completes a full login + classify + encrypt round-trip using only SDK calls (no raw fetch calls to the API).

### 8b — Browser Extension

**Goal:** Intercept uploads/URLs client-side and check them against the backend before the user proceeds.

**Scope:**
- Manifest V3 extension.
- Uses the SDK (8a) for all backend calls — no duplicated API logic in the extension.
- Intercepts file selection / link clicks, calls `checkProduct`/classification endpoint, shows a warning UI before allowing the action.

**Acceptance criteria:**
- Extension correctly blocks/warns on a known-flagged test URL or file.
- Extension fails safe (does not silently allow through) if the backend is unreachable — define and test this behavior explicitly.

**Definition of done:** Extension loadable unpacked in Chrome for local testing; documented submission checklist for Web Store review (treated as a follow-up task, not part of this build).

---

## Cross-Phase Rules for the AI Agent

1. **Never substitute an external API for anything marked "must be hardcoded"** in the Core vs Peripheral table, even if it would be faster. If a peripheral-looking shortcut seems necessary, stop and ask rather than assume.
2. **Every phase's Definition of Done must be met before starting the next phase.** Partial phases compound into debugging problems later, especially in encryption and auth.
3. **Every security-relevant action taken anywhere in the system should emit a `SecurityEvent`** (Phase 3's schema), even from phases built before Phase 3 formally exists — retrofit emitters into Phases 1–2 when Phase 3 is reached.
4. **No secrets, keys, or `.env` files committed** — ever, at any phase.
5. **pnpm only** — no mixing in npm/yarn lockfiles; workspace protocol (`workspace:*`) for internal package references.
6. **Write tests alongside each phase, not after.** Auth, encryption, and RBAC especially should not be "tested later."
