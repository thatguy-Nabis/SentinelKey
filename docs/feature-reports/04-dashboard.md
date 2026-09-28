# Feature Report: Security Operations Dashboard

| Field | Value |
|---|---|
| **Feature ID** | SK-04 |
| **Roadmap Phase** | Phase 4 |
| **Status** | Complete |
| **Primary location** | `apps/dashboard/` |
| **Stack** | React 18 + Vite + Chart.js + vanilla CSS |
| **Hardcoded (core)** | Aggregation presentation, RBAC-aware navigation, live API consumption |
| **External APIs** | None (Chart.js is a local charting *library*) |

---

## 1. Purpose

Make Phases 1–3 (and later encryption/MFA settings) visible and demoable. The dashboard is a dark SOC-style console: authenticate, challenge MFA, inspect the event stream, triage alerts, configure MFA, and view RBAC capabilities — always against the real API, not mock-only data by end of phase.

---

## 2. Problem Statement

A security stack without an operator surface cannot be demonstrated or operated. The UI must:

- Respect server-side RBAC (hiding nav is not enough)
- Support MFA enrollment and login challenge
- Visualize login telemetry and alert severity from live endpoints
- Help operators reproduce IDS scenarios (attack simulator)

---

## 3. Architecture Overview

```
Browser (Vite dev / production build)
  │  proxy: /auth, /logs, /alerts, /health → api:4000
  ▼
AuthContext (session, permissions, MFA challenge state)
  │
  ├─ AuthModal          login / register / TOTP challenge
  ├─ OverviewView       metrics + Chart.js + attack simulator
  ├─ LogsView           filterable SecurityEvent table
  ├─ AlertsView         triage feed (ack / resolve)
  ├─ MfaSettingsView    QR setup, backup codes, disable
  └─ AdminView          permission matrix (admin-only)
```

### Key files

| Path | Role |
|---|---|
| `src/services/api.ts` | Typed client: auth, refresh, logs, alerts, MFA |
| `src/context/AuthContext.tsx` | Session + permission helpers |
| `src/components/layout/*` | Navbar (IDS LIVE), Sidebar (RBAC tabs) |
| `src/index.css` | Obsidian SOC theme tokens |

---

## 4. Views & Capabilities

### 4.1 Authentication (`AuthModal.tsx`)

- Login / register toggle
- MFA step when API returns `mfaRequired` + `mfaToken`
- Accepts 6-digit TOTP or backup recovery code
- Optional geo simulation (NY / London / Tokyo) for impossible-travel demos

### 4.2 Overview (`OverviewView.tsx`)

- Stat tiles: event volume, open alerts, critical count, login success rate
- Charts (Chart.js):
  - Auth success vs failure over time
  - Alert severity doughnut
  - Top flagged IPs bar chart
- Synthetic attack generator: brute-force bursts and impossible-travel simulations against the live API

### 4.3 Logs (`LogsView.tsx`)

- Paginated table filtered by type, severity, IP
- Metadata inspection modal (JSON, UA, geo)

### 4.4 Alerts (`AlertsView.tsx`)

- Status filters: open / acknowledged / resolved
- Acknowledge and resolve actions (`alerts:write`)

### 4.5 MFA Settings (`MfaSettingsView.tsx`)

- Setup → QR + Base32 + 8 backup codes
- Confirm with first TOTP to activate
- Password-guarded disable

### 4.6 Admin (`AdminView.tsx`)

- Role × permission matrix
- Non-admins receive explicit 403-style denial UI; API also rejects

---

## 5. RBAC UX Rules

| Role | Typical UI access |
|---|---|
| `viewer` | Overview, logs/alerts read paths they are permitted |
| `analyst` | Logs, alerts triage, classify-related ops as permitted |
| `admin` | Admin tab + encryption/policy surfaces as permissions allow |

Sidebar hides unauthorized sections; every sensitive call still goes through JWT + `authorize` on the API.

---

## 6. Visual / UX Decisions

- Vanilla CSS only (no Tailwind), dark SOC aesthetic
- Design tokens: near-black background, cyan/emerald/rose accents
- Fail-soft empty states when API/Mongo unavailable in local demos

---

## 7. Dev & Build

```bash
pnpm --filter @sentinelkey/dashboard dev
pnpm --filter @sentinelkey/dashboard build
pnpm --filter @sentinelkey/dashboard typecheck
```

Vite proxies `/auth`, `/logs`, `/alerts`, `/health` to `localhost:4000`.

---

## 8. Integration Points

| Backend feature | UI surface |
|---|---|
| Auth + RBAC | Login, session, Admin matrix |
| MFA | Challenge modal + settings |
| Logging/IDS | Logs + Alerts + Overview charts |
| (Later) Encryption / Classification | Consumable via same `api.ts` patterns / SDK |

---

## 9. Acceptance Criteria (met)

- [x] Viewer cannot access admin-only panels (UI + API enforcement)
- [x] Charts driven from API data (not permanent mocks)
- [x] Runnable via `pnpm --filter @sentinelkey/dashboard dev`
- [x] MFA enrollment and login challenge supported

---

## 10. Known Limitations

- Browser e2e against Docker Compose not verified on machines without Docker; local Vite + API is the primary demo path.
- Real-time push (WebSockets) not required; views poll/fetch on interaction and load.
