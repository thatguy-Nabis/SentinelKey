# Feature Report: Security Logging & Rules-Based Intrusion Detection

| Field | Value |
|---|---|
| **Feature ID** | SK-03 |
| **Roadmap Phase** | Phase 3 |
| **Status** | Complete |
| **Primary location** | `apps/api/src/services/event-logger.service.ts`, `heuristics.service.ts`, `alert.service.ts` |
| **Shared types** | `packages/shared-types/src/events.ts`, `alerts.ts` |
| **Hardcoded (core)** | Event schema, heuristics, alert trigger/dedup hooks |
| **External APIs** | None (alert *delivery* channels are optional peripherals) |

---

## 1. Purpose

Every security-relevant action emits a structured `SecurityEvent`. A deterministic heuristics engine evaluates events in near-real-time and creates `Alert` records when attack patterns match. This layer is the audit spine for the SOC dashboard, training data for ML anomaly detection, and the escalation path for classification verdicts.

---

## 2. Problem Statement

Without a unified event stream:

- Auth, MFA, RBAC, and encryption failures are invisible as a timeline
- Operators cannot triage incidents across IP, user, and rule
- ML models have no labeled/synthetic history to train on

Rules-based IDS provides explainable, low-latency detection before statistical models are available.

---

## 3. Architecture Overview

```
Auth / MFA / RBAC / Rate limit / Files / Classification
              │
              ▼
      eventLogger.emit(type, context, metadata)
              │
              ├─ persist SecurityEvent (MongoDB)
              ├─ run heuristics.evaluate(event, recentHistory)
              │       │
              │       └─ alert.service.create(...) + hooks
              └─ async mlAnomalyService.evaluateEvent(...)  (SK-06)
```

### Key components

| Component | Role |
|---|---|
| `SecurityEvent` model | type, userId, ip, severity, timestamp, metadata (geo, UA, …) |
| `Alert` model | rule, severity, status, triggerEventIds, metadata |
| `event-logger.service` | Emit, persist, dispatch heuristics/ML (failsafe, non-blocking) |
| `heuristics.service` | Haversine geo-velocity + pattern rules |
| `alert.service` | CRUD-ish: list/filter, acknowledge, resolve, subscriber hooks |
| Logs/Alerts routes | RBAC-gated SOC APIs |

---

## 4. Event Schema

Typical fields:

- `type` — e.g. `AUTH_LOGIN_FAILED`, `AUTH_TOKEN_REUSE`, `MFA_LOCKOUT`, `PERMISSION_DENIED`, `RATE_LIMIT_EXCEEDED`, `FILE_DOWNLOADED`, …
- `userId` (optional), `ip` (required)
- `severity` — inferred or explicit (`low` | `medium` | `high` | `critical`)
- `timestamp`
- `metadata` — geo (`latitude`/`longitude`), user-agent, route, fileId, keyVersion, etc.

Emitters are wired across login, MFA, refresh reuse, authorize 403, rate limiter 429, and later file/classification paths.

---

## 5. Heuristic Rules

Default config (`DEFAULT_HEURISTIC_CONFIG`):

| Rule | Trigger | Severity guidance |
|---|---|---|
| Brute-force login burst | ≥5 failed logins / account or IP in 60s (≥10 → critical) | high / critical |
| Impossible travel | Geo-velocity > 800 km/h over ≥100 km | high/critical |
| Privilege escalation pattern | ≥3 `PERMISSION_DENIED` in 5 minutes | high |
| Refresh token reuse | Any `AUTH_TOKEN_REUSE` | critical (immediate) |
| MFA lockout | Any `MFA_LOCKOUT` | high (immediate) |

### Geo-velocity

Pure TypeScript Haversine great-circle distance (Earth radius 6371 km), then:

\[
v = \frac{d_{\mathrm{km}}}{\max(\Delta t, 1\mathrm{s})\ \mathrm{in\ hours}}
\]

No third-party geo/IP reputation APIs.

---

## 6. Alert Lifecycle

Statuses: `open` → `acknowledged` → `resolved`

- Create when a heuristic (or ML/classification) fires
- `registerAlertHook` allows in-process subscribers (webhooks, future WebSockets)
- Operators acknowledge/resolve via API (permissions `alerts:write`)

---

## 7. API Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/logs` | `logs:read` | Paginated/filterable events |
| `GET` | `/alerts` | `alerts:read` | Paginated/filterable alerts |
| `POST` | `/alerts/:id/acknowledge` | `alerts:write` | Acknowledge |
| `POST` | `/alerts/:id/resolve` | `alerts:write` | Resolve |

Filters typically include type/severity/ip/userId/date (logs) and status/severity/rule (alerts).

---

## 8. Failsafe Design

- Logging and heuristic evaluation **must not** break auth or business flows
- DB/logging errors are caught; failures degrade to “no event/alert” rather than 500 on login
- ML scoring (SK-06) is async with timeout; heuristics remain authoritative on ML outage

---

## 9. Integration Points

| Feature | Direction |
|---|---|
| Auth, MFA, RBAC, rate limit | Emit events |
| Dashboard (SK-04) | Consume `/logs`, `/alerts` |
| Encryption (SK-05) | File decrypt/download events |
| ML (SK-06) | Trains on / scores events; may create `ML_ANOMALY_DETECTION` alerts |
| Classification (SK-07) | Block/flag → classification alerts |
| SDK (SK-08) | `getLogs`, `getAlerts`, acknowledge/resolve |

---

## 10. Testing

| Suite | Coverage |
|---|---|
| `heuristics.test.ts` | Haversine, brute force, geo-velocity, privilege burst, token reuse, MFA lockout |
| `alerts.service.test.ts` | Create, hooks, query, acknowledge, resolve |
| `event-logger.test.ts` | Emit + severity inference, failsafe, pagination |

Synthetic sequences double as bootstrap data for Phase 6 training.

---

## 11. Acceptance Criteria (met)

- [x] Simulated failed-login burst produces alert
- [x] Implausible geo travel produces alert
- [x] Heuristics unit-tested with synthetic sequences
- [x] Heuristics run automatically on emit (not manual-only)
- [x] Alerts queryable via API

---

## 12. Known Limitations

- Geo coordinates currently depend on client-supplied or simulated location (dashboard geo picker); production should attach trusted geo from server-side IP intelligence only if that remains a *peripheral* enrichment — core velocity math stays in-repo.
- In-process alert hooks are not a durable message bus; scale-out would add a queue without changing the event schema.
