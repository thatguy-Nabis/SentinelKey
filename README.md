# SentinelKey

<p align="center">
  <img src="media/logo.png" alt="SentinelKey Logo" width="130" />
</p>

Authentication, Encryption, Intrusion Detection, and Compliance in One Stack.

A **self-hosted security stack**. Every security-critical algorithm (JWT/RBAC, MFA, encryption, intrusion-detection heuristics, ML anomaly detection, classification rules) is hand-built in this repo — no third-party auth/security SaaS. External services are only used for peripheral delivery (payment gateways, optional alert channels).

---

## Services

| Service | Path | Port | What it does |
|---|---|---|---|
| **API** | `apps/api` | `:4000` | Express + TypeScript backend. Auth, RBAC, MFA, logging/IDS, encryption, classification, billing. |
| **Dashboard** | `apps/dashboard` | `:5173` | React (Vite) Security Operations Console — the UI over everything else. |
| **ML service** | `apps/ml-service` | `:5001` | Python (Flask) anomaly detection: `/score` inference + training. |
| **SDK** | `packages/security-stack-sdk` | — | Typed Node client wrapping the whole API. |
| **Extension** | `extension/` | — | Manifest V3 browser extension (link/file pre-flight, fail-safe). |
| **Shared types** | `packages/shared-types` | — | Shared TS contracts (roles, permissions, API responses). |
| MongoDB | — | `:27017` | Data store (auto-started in-memory for dev — see below). |

---

## Quick start

Requirements: **Node ≥ 20**, **pnpm** (the only supported package manager). No Docker, no local MongoDB needed for development.

```bash
pnpm install

# Terminal 1 — API (auto-starts an ephemeral in-memory MongoDB on first run)
pnpm --filter @sentinelkey/api dev

# Terminal 2 — Dashboard
pnpm --filter @sentinelkey/dashboard dev
```

- **API** → http://localhost:4000 (`GET /health` → `{"status":"ok","service":"api"}`)
- **Dashboard** → http://localhost:5173
- **ML service** (optional, see below) → http://localhost:5001

Notes:
- The API runs with **zero `.env`** in dev. Copy `apps/api/.env.example` for production; prod validation rejects `dev-` prefixed secrets.
- With no `MONGODB_URI` set, the API starts an ephemeral **in-memory MongoDB** (`mongodb-memory-server`, first run downloads the binary). Data is wiped on restart — and note `tsx watch` restarts the process on every file save, which also wipes it. Set `MONGODB_URI` to point at a real Mongo, or `USE_MEMORY_MONGO=false`, to persist.
- Docker Compose (`docker-compose.yml`) is provided but not verified on this machine.

---

## How to use it

### 1. First login (bootstrap admin)

There is no seeded admin — the **first user to register becomes admin**. Everything else flows from that account:

1. Open the dashboard at http://localhost:5173.
2. Click **Register** and create an account (email + password ≥ 8 chars).
3. You are now the admin. Use the **Admin** tab to create more users and assign roles.

Three roles exist (seeded on boot): **admin** (full access), **analyst** (logs/alerts/classification read+write), **viewer** (read-only; the default).

### 2. Dashboard (SOC)

The dashboard is the primary surface. Tabs:

- **Overview** — aggregated summary, links into the other views.
- **Logs** — `SecurityEvent` stream (`GET /logs`).
- **Alerts** — open alerts with acknowledge/resolve (`GET /alerts`, `POST /alerts/:id/acknowledge`, `POST /alerts/:id/resolve`). Open-alert count auto-refreshes every 15 s.
- **MFA** — set up / verify / disable TOTP multi-factor auth.
- **Admin** — user & role management.

### 3. API (direct)

Base URL `http://localhost:4000`. A ready-made **Postman collection** is at `apps/api/postman/SentinelKey.postman_collection.json`.

Auth is bearer-JWT: `Authorization: Bearer <accessToken>`. `POST /auth/login` returns `{ accessToken, refreshToken }`.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/health` | public | Liveness. |
| POST | `/auth/register` | public | Register (first user → admin). |
| POST | `/auth/login` | public | Login → tokens. |
| POST | `/auth/refresh` | public | Rotate refresh token. |
| POST | `/auth/logout` | auth | Invalidate refresh token. |
| GET | `/auth/me` | auth | Own profile. |
| POST | `/auth/mfa/setup` | auth | Generate TOTP secret + QR URI. |
| POST | `/auth/mfa/verify` | public¹ | Verify TOTP code. |
| POST | `/auth/mfa/disable` | auth | Disable MFA. |
| GET | `/logs` | `logs:read` | Event stream. |
| GET | `/alerts` | `alerts:read` | List alerts. |
| POST | `/alerts/:id/acknowledge` | `alerts:write` | Acknowledge. |
| POST | `/alerts/:id/resolve` | `alerts:write` | Resolve. |
| GET | `/files/keys/status` | `encryption:read` | Key versions/status. |
| POST | `/files/keys/rotate` | `encryption:write` | Rotate master key. |
| POST | `/files/encrypt-field` | `encryption:write` | AES-256-GCM field encryption. |
| POST | `/files/decrypt-field` | `encryption:read` | Field decryption. |
| POST | `/files/upload` | `files:write` | Encrypted file upload. |
| GET | `/files` | `files:read` | List files. |
| GET | `/files/:id/download` | `files:read` | Decrypted download. |
| POST | `/files/:id/rotate` | `files:write` | Re-encrypt file under new key. |
| POST | `/classify/event` · `/classify/file` · `/classify/email` | `classify:write` | Deterministic classification. |
| GET | `/classify/history` | `classify:read` | Past classifications. |
| GET | `/policies` · `/policies/:id` | `classify:read` | Read policy rules. |
| PUT | `/policies/:id` | `classify:write` | Update policy rules. |
| GET | `/billing/plans` | public | Plan list. |
| GET/POST | `/billing/subscription` · `/billing/checkout` · `/billing/verify` · `/billing/cancel` · `/billing/invoices` | auth | Khalti + mock billing flow. |

¹ `/auth/mfa/verify` accepts a short-lived `mfaToken` during login or the authenticated user for setup confirmation.

### 4. Encryption & files

- **Fields:** `POST /files/encrypt-field { value }` → `{ ciphertext, keyVersion }`; decrypt with `POST /files/decrypt-field`.
- **Files:** uploads are encrypted at rest under the active master-key version; downloads decrypt transparently. Rotate the master key (`/files/keys/rotate`) or re-encrypt individual files (`/files/:id/rotate`).
- Design & threat model: `apps/api/docs/encryption-design.md`.

### 5. ML anomaly detection

Run it (Python env, e.g. `python -m venv .venv` + `pip install -r requirements.txt`):

```bash
cd apps/ml-service
python app.py
```

- `GET /health` — model version, sample count, FPR/TPR.
- `POST /score` — score one event: `{ "event": {...}, "history": [...] }` or a raw `{ "features": [...] }`.
- `GET /model/info` — model metadata.

The detector is an isolation-forest / z-score baseline (see `docs/feature-reports/06-ml-anomaly-detection.md`). The API falls back to heuristic detection when the ML service is unreachable.

### 6. SDK

```ts
import { createSentinelKeyClient } from '@sentinelkey/security-stack-sdk';

const sdk = createSentinelKeyClient({ baseUrl: 'http://localhost:4000' });

await sdk.register({ email, password });
const { accessToken } = await sdk.login({ email, password });

await sdk.classifyUrl('https://…');
await sdk.classifyEmail({ email: { from, to, subject, bodyText } });
await sdk.classifyFile({ filename: 'invoice.pdf', mimeType: 'application/pdf', contentBase64: '…' });
await sdk.encryptField('secret');
await sdk.uploadFile({ originalName: 'invoice.pdf', mimeType: 'application/pdf', contentBase64: '…' });
await sdk.getLogs({ type: 'AUTH_LOGIN_FAILED' });
await sdk.getAlerts({ status: 'open' });
```

The client auto-attaches the bearer token, auto-refreshes on 401, and ships a fail-safe mode (`failSafe: true` by default) for classification. Full surface in `packages/security-stack-sdk/CHANGELOG.md`.

### 7. Browser extension

1. Chrome → `chrome://extensions/` → enable **Developer mode**.
2. **Load unpacked** → select the `extension/` directory.
3. Use the popup for live health, URL scan, file pre-flight, and the incident ledger.

The extension **fails closed**: if the backend is unreachable it blocks high-risk actions (`FAIL-SAFE-001`) rather than letting them through. Details: `extension/README.md`.

### 8. Billing (Phase 9)

`GET /billing/plans` lists plans; `POST /billing/checkout` starts a Khalti (or mock) checkout; `GET /billing/verify?pidx=…` confirms payment; `POST /billing/cancel` cancels. Invoices at `GET /billing/invoices`. See `docs/payment-integration.md`.

---

## Testing & checks

```bash
pnpm typecheck                 # all workspaces
pnpm lint                      # eslint across workspaces
pnpm --filter @sentinelkey/api test   # API unit tests (crypto, MFA, RBAC, IDS, classifiers…)
```

There is also a standalone browser demo at `demos/web-client/index.html` (plain HTML that talks straight to the API — CORS is open).

---

## Docs

- Roadmap & phase map: `docs/CONTEXT.md`, `docs/SECURITY-STACK-PHASES.md`
- Change log / current status: `progress.md`
- Per-feature deep dives (architecture, APIs, tests): `docs/feature-reports/`
- Encryption design gate: `apps/api/docs/encryption-design.md`
- Payment integration: `docs/payment-integration.md`
