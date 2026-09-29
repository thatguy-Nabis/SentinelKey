# Phase 10 — Domains, Metering & Usage Billing

**Project:** SentinelKey (pnpm monorepo: `apps/api`, `apps/dashboard`, `apps/website`, `apps/ml-service`, `packages/shared-types`, `packages/security-stack-sdk`, `extension/`)
**Depends on:** Phases 0–9 complete (auth/RBAC, MFA, IDS, dashboard, encryption, ML, classification, SDK/extension, website + Khalti billing)
**Read first:** `progress.md`, `apps/api/src/config/plans.ts`, `apps/api/src/services/billing.service.ts`, `apps/api/src/services/payment-provider.ts`

This document is the source of truth for the AI coding agent for Phase 10. Complete sub-phases in order (10a → 10f). Each sub-phase must meet its Definition of Done, with tests passing, before the next begins. Do not substitute third-party services for anything marked hardcoded. Do not add features not listed here.

---

## 0. Context and Locked Decisions

**Goal:** Let a client register a local "domain" (a `localhost` origin with a port), get a site key for it, and be metered and billed per domain based on API usage. Extend billing and both dashboards accordingly.

**Environment constraints:**
- Local integration only. Not deployed. **Single-tenant**: no tenant isolation layer, no per-tenant encryption keys, no schema-wide tenant scoping.
- `domainId` is a **tag** on new records (usage, events, alerts, classification records). It is not a security boundary between customers.
- pnpm only. No npm/yarn lockfiles. Internal packages via `workspace:*`.
- Currency is NPR. **All money is integer paisa.** Never use floating point for money.
- Payments go through the existing `PaymentProvider` abstraction (Khalti in production mode, `MockPaymentProvider` in dev). No new payment vendor.
- Khalti is a one-time payment gateway, not a recurring billing engine. Recurring behavior is implemented by our own billing service (see 10c).

**Interpretation of "billed separately" (assumption, confirm if wrong):** each domain has its own usage meter and its own overage invoice. The Pro platform fee stays account-level and unchanged. If this is wrong, only 10c changes (replace metered overage with a flat per-domain fee line item).

### Plan matrix (all values live in config, never hardcoded in logic)

| | Free | Pro | Enterprise |
|---|---|---|---|
| Max active domains | 1 | 5 | configurable (default 25) |
| Included units / period | 10,000 per user, **hard cap** | 25,000 **per domain** | custom |
| Overage rate | none (requests over cap get 429) | 4 paisa/unit | custom |
| Platform fee | 0 | NPR 2,499/mo (existing) | existing |

Pay-as-you-go **list rate** is 5 paisa/unit (used for display and for computing the "value" of allowances).

### Unit tiers

| Tier | Units per call | Applies to |
|---|---|---|
| Light | 1 | field encrypt/decrypt, key status, log/alert reads |
| Standard | 3 | classify event / email / URL / product |
| Heavy | 10 | file classify, file upload/download encryption, ML-scored events |

**Unmetered:** `/health`, billing endpoints, policy management, domain management, and all calls made by the dashboards/website using a user JWT.

**Billing rules:**
- Bill only successful responses (2xx). A classification verdict of "blocked" is a successful call and is billable.
- Never bill 5xx, failed authentication, or requests rejected by quota.
- All rates and weights come from a single config module so they can be tuned without code changes elsewhere.

### Domain rules
- Allowed hosts: `localhost`, `127.0.0.1`, `[::1]`. Port must be an integer from 1 to 65535.
- Reject ports used by SentinelKey's own services (api, dashboard, website, ml-service). Read these from env/config (`RESERVED_PORTS`), do not hardcode.
- The normalized origin (`host:port`) is unique across the whole system among non-deleted domains.
- Deletion is soft. Usage history and invoices for deleted domains must remain queryable.
- Free-tier allowance is tracked **per user per period**, not per domain, so deleting and re-adding a domain does not reset usage.
- Downgrade or cancellation with more active domains than the new plan allows: the user chooses which to keep; the rest become `suspended` (not deleted) and reactivate on upgrade.

---

## Phase 10a — Domain Registry, Limits and Site Keys

**Goal:** Users can register, list, update, suspend/reactivate, rotate keys for, and delete domains within their plan limits.

**Data model (describe, then implement in Mongoose):**
- `Domain`: owner user id, label, host, port, normalized origin, status (`pending`, `active`, `suspended`, `deleted`), suspension reason (`plan_limit`, `unpaid`, `manual`), site key prefix (for display), site key hash, key created/rotated timestamps, last seen timestamp, created/updated timestamps.
- Site key: high-entropy random value generated with Node `crypto`, shown **once** at creation/rotation, stored only as a SHA-256 hash plus a short display prefix (same pattern as refresh tokens). Never returned by any list/read endpoint.

**Endpoints (user JWT, RBAC-gated):**
- `POST /domains` — register (enforces plan limit and validation)
- `GET /domains` — list own domains (admins may list all via 10e endpoint)
- `GET /domains/:id`
- `PATCH /domains/:id` — label only
- `POST /domains/:id/rotate-key` — returns new key once, old key invalid immediately
- `POST /domains/:id/suspend` and `POST /domains/:id/reactivate` (reactivate re-checks plan limit)
- `DELETE /domains/:id` — soft delete
- `POST /domains/keep` — used on downgrade to choose which domains stay active

**RBAC:** add permissions `domains:read`, `domains:write`, `domains:manage`. Viewers/analysts manage only their own domains; `domains:manage` (admin) is required to act on others'. Update `DEFAULT_ROLE_PERMISSIONS` and role seeding.

**Security events to emit (Phase 3 logger):** `DOMAIN_REGISTERED`, `DOMAIN_KEY_ROTATED`, `DOMAIN_SUSPENDED`, `DOMAIN_REACTIVATED`, `DOMAIN_DELETED`. Add to shared types.

**Acceptance criteria:**
- Free user registering a second active domain gets 403 with a clear plan-limit error; Pro user is blocked at the sixth.
- Invalid hosts (e.g. `example.com`, `192.168.1.5`), out-of-range ports, reserved ports, and duplicate origins are rejected with specific error messages.
- Site key appears exactly once in a response (create/rotate) and is never present in any other response or log. Add a test asserting this, like `password-never-exposed`.
- Rotating a key invalidates the old key immediately.
- Downgrade flow suspends extra domains with reason `plan_limit`; upgrading and reactivating restores them.
- Deleting then re-adding a domain does not reset Free-tier usage (verified in 10b tests).

**Definition of Done:** All endpoints work with tests; shared types updated; Postman collection has a Phase 10a folder; `progress.md` updated.

---

## Phase 10b — Site-Key Authentication, Metering and Quotas

**Goal:** SDK-facing routes accept a site key as a second authentication strategy, attribute every call to a domain, meter it in units, and enforce quotas.

**Authentication:**
- Add a site-key authentication middleware for the SDK-facing routes: classification (`/classify/*`), files and encryption routes, and read routes the SDK uses. User JWT auth continues to work everywhere it does today.
- A request is attributed to a domain only when authenticated by site key. JWT calls from the dashboards are unmetered.
- Site key is sent in a dedicated header. Look up by hash. Suspended/deleted domains are rejected (402 for `unpaid`, 403 otherwise).
- If a browser `Origin` header is present, it must match the domain's registered origin; mismatch is rejected and emits an event (see 10e). Absence of `Origin` (server-to-server) is allowed because the key is the credential.
- Update `lastSeen` on the domain, throttled (not every request) to avoid write amplification. First successful authenticated call moves a domain from `pending` to `active`.

**Metering:**
- A metering step runs after the response completes, only for 2xx, and records units by tier for the domain.
- Storage: **atomic increments on a per-domain, per-day rollup document**. Do not write one document per API call.
- Endpoint-to-tier mapping lives in one config module and is covered by a test that fails if a new SDK-facing route lacks a tier.
- Metering failures must never fail or delay the API response. Log and continue (consistent with the fail-safe logging in Phase 3).

**Quotas:**
- Billing period is aligned to the user's subscription period (Free users: calendar month).
- Free: enforce the per-user hard cap across their single domain; over cap returns 429 with an upgrade hint.
- Pro/Enterprise: never hard-block on allowance; usage beyond the included units accrues overage (billed in 10c).
- Quota checks use current-period totals; caching is allowed but must reconcile with the rollups.
- No proration: the per-domain allowance applies for the whole subscription period regardless of when the domain was added.

**Attribution of existing records:** add optional `domainId` to `SecurityEvent`, `Alert`, and `ClassificationRecord`, populated when the originating request was site-key authenticated. Add filters for it to `/logs`, `/alerts` and `/classify/history`.

**Per-domain rate limiting:** extend the in-memory rate limiter to also key by domain for site-key routes (in addition to IP).

**Endpoints:**
- `GET /billing/usage` — current-period usage for the caller across their domains (units by tier, included, remaining, projected overage in paisa)
- `GET /billing/usage/domains/:id` — daily breakdown for one domain

**Acceptance criteria:**
- A call with a valid key is attributed to the right domain and increments the correct tier units; a call with a JWT increments nothing.
- 4xx/5xx responses and quota-rejected requests are not metered.
- Free user over the cap gets 429 and no further units accrue; Pro user over allowance keeps working and accrues overage units.
- Deleting and re-adding a Free domain does not reset the per-user usage.
- Metering write failure (simulated) does not change the HTTP response.
- Tier-mapping completeness test passes.

**Definition of Done:** Auth strategy, metering, quotas, attribution and usage endpoints implemented and tested; Postman folder added; `progress.md` updated.

---

## Phase 10c — Usage Invoicing, Khalti Payment and Suspension

**Goal:** Close billing periods, generate one overage invoice per domain, collect payment through the existing Khalti flow, and suspend domains on non-payment.

**Invoicing:**
- Extend the invoice model with a type (`subscription`, `usage`), an optional domain reference, period start/end, and line items (units by tier, included, billable overage units, rate in paisa, amount in paisa).
- At period close, compute per-domain overage: `max(0, units − included) × overage_rate_paisa`. Integer math only.
- Free plan never produces usage invoices.
- Balances below the minimum payable amount (read Khalti's current minimum; make it a config value) roll into the next period instead of generating an unpayable invoice.
- Period close must be **idempotent**: running it twice for the same period must not create duplicate invoices.
- Implementation: an in-process scheduled job plus a lazy check when billing endpoints are called. No external scheduler service.

**Payment:**
- Usage invoices are paid through the same checkout/verify flow as subscription invoices, using `PaymentProvider` (Khalti or Mock). Reuse existing guards: invoice ownership check, amount verification against lookup total, idempotent fulfillment on repeated return-URL visits.

**Delinquency:**
- Unpaid usage invoice → grace period (config, default 7 days) → domain suspended with reason `unpaid`. Site-key calls then return 402.
- Paying the invoice reactivates the domain automatically.
- Suspension never deletes data.

**Plan changes:**
- Upgrade Free → Pro takes effect immediately for limits; the Free per-user usage for the current period does not carry over as overage.
- Cancel/downgrade Pro → apply the "choose domains to keep" flow from 10a at period end; final-period overage is still invoiced.

**Endpoints:**
- `GET /billing/invoices?type=usage&domainId=…`
- `POST /billing/invoices/:id/checkout` and existing verify flow reused for usage invoices
- `GET /billing/usage/estimate` — accrued overage for the open period per domain

**Security events:** `USAGE_INVOICE_CREATED`, `DOMAIN_SUSPENDED_UNPAID`, `DOMAIN_REACTIVATED_PAYMENT`.

**Acceptance criteria:**
- Worked example test: Pro domain with 40,000 units and 25,000 included at 4 paisa/unit produces an invoice of 60,000 paisa (NPR 600).
- Period close run twice yields one invoice per domain.
- Invoice below the minimum is rolled forward, not created.
- Amount tampering at verify time is rejected (existing behavior preserved for usage invoices).
- Unpaid past grace → domain suspended and calls return 402; payment → reactivated.
- All flows verified with `MockPaymentProvider` in tests; Khalti sandbox path exercised where credentials exist.

**Definition of Done:** Usage invoicing, payment, delinquency and plan-change flows implemented and tested; `docs/payment-integration.md` updated; `progress.md` updated.

---

## Phase 10d — User Hub UI (`apps/website`)

**Goal:** Users manage domains and see usage/billing in the hub console at `/app`.

**Pages and changes:**
- **Domains** (new sidebar item under WORKSPACE):
  - Registration form: label, host (select: `localhost`, `127.0.0.1`, `[::1]`), port. Client-side validation mirrors server rules; server remains authoritative.
  - Domain list: status badge, origin, last seen, usage-vs-allowance meter, actions (rotate key, suspend/reactivate, delete).
  - One-time key reveal modal with copy button and a clear "you won't see this again" warning.
  - Empty and limit states: Free at 1/1 and Pro at 5/5 show an upgrade or limit message, not a broken form.
  - Downgrade "choose domains to keep" flow.
- **Billing & Subscription** (existing page, extended):
  - Per-domain usage breakdown by tier, allowance remaining, accrued overage estimate for the open period.
  - Usage invoices listed separately from subscription invoices, each payable via the existing Khalti/mock checkout.
  - Clear suspension banners (unpaid domain, grace period countdown).

**Rules:** vanilla CSS consistent with the existing hub theme; reuse the existing API client and auth context; no new UI dependencies without noting it in `progress.md`.

**Acceptance criteria:**
- A Free user can register one domain and sees the upgrade prompt for a second; a Pro user can register five.
- Key is visible only in the reveal modal and is not retrievable afterward.
- Usage meters and invoices match API values exactly (no client-side recomputation of money).
- `pnpm --filter @sentinelkey/website typecheck` and build pass.

**Definition of Done:** All pages functional against the real API and Mock provider; `progress.md` updated.

---

## Phase 10e — SOC Dashboard and IDS Integration (`apps/dashboard`, `apps/api`)

**Goal:** Admin visibility over all domains, usage and revenue, plus domain-aware detection.

**Dashboard (admin permissions required):**
- **Domains overview:** all domains with owner, status, plan, last seen.
- **Usage analytics:** units by domain and by tier over time, top consumers, quota-utilization view (Chart.js, consistent with existing charts).
- **Revenue view:** overage billed vs paid vs outstanding, in NPR.
- **Domain filter** on Logs, Alerts and Classification history.
- Admin actions: suspend/reactivate any domain (audited).

**Admin endpoints (`domains:manage`):**
- `GET /admin/domains`, `GET /admin/usage`, `GET /admin/revenue`

**New IDS heuristics (added to the existing heuristics engine, with unit tests using synthetic event sequences):**
1. **Domain usage spike:** a domain's units in a short window exceed a configurable multiple of its own trailing baseline.
2. **Origin mismatch:** valid site key used with a non-matching `Origin` header (repeated attempts escalate severity).
3. **Suspended-domain access attempts:** repeated calls against a suspended/deleted domain's key.
4. **Key-guessing pattern:** many failed site-key lookups from one IP in a short window (reuses brute-force logic and rate limiter).

Add corresponding `HeuristicRule` values to shared types and feed alerts into the existing Phase 3 alert stream.

**ML service:** add domain-level features (units per hour, tier mix) as an optional extension only if time allows; heuristics above are the required deliverable. Do not break existing `/score` contract.

**Acceptance criteria:**
- Non-admin users receive 403 from admin endpoints (server-enforced, not just hidden in the UI).
- Each heuristic fires on a synthetic sequence and stays quiet on a benign baseline.
- Dashboard charts render from real API data.
- `pnpm --filter @sentinelkey/dashboard typecheck` and build pass; existing API tests still pass.

**Definition of Done:** Admin views, endpoints and heuristics implemented and tested; `progress.md` updated.

---

## Phase 10f — SDK and Browser Extension

**Goal:** Client apps and the extension authenticate with a site key and stay fail-safe.

**SDK (`@sentinelkey/security-stack-sdk`):**
- Add site-key configuration to the client factory. When set, requests authenticate with the site key on SDK-facing routes; JWT login flows remain available for user-level operations.
- Surface quota and suspension errors as typed errors (`QUOTA_EXCEEDED` with upgrade hint, `DOMAIN_SUSPENDED`, `INVALID_SITE_KEY`) instead of generic failures.
- Preserve fail-safe behavior: unreachable backend still fails closed. Distinguish "backend unreachable" from "quota exceeded"; both block, but with different messages.
- Add a usage helper (current-period usage for the domain).
- Bump version and add a CHANGELOG entry (semver minor).

**Extension (`extension/`):**
- Add a site-key setting in the popup options, stored in extension storage. Never log the key.
- Show quota/suspension states in the popup status banner.
- Keep using the SDK client pattern; no duplicated API logic.

**Example app (`apps/sdk-example`):** extend the round-trip to use a site key and demonstrate handling of a quota error.

**Acceptance criteria:**
- SDK tests cover site-key auth, each typed error, and fail-safe behavior for both unreachable and quota cases.
- `sdk-example` acceptance test still uses only SDK calls (zero raw `fetch`).
- Extension loads unpacked, accepts a site key, and blocks/warns correctly, including when the domain is suspended.

**Definition of Done:** SDK, extension and example app updated and tested; `SUBMISSION_CHECKLIST.md` updated if permissions changed; `progress.md` updated.

---

## Cross-Cutting Rules for the AI Agent

1. **No secrets or keys in logs, responses (except the one-time reveal), test fixtures, or commits.**
2. **Money is integer paisa everywhere**, including shared types, DB fields and UI props. Format to NPR only at the display edge.
3. **Every security-relevant action emits a `SecurityEvent`** using the Phase 3 logger, never blocking the main flow.
4. **Config over constants:** plan limits, unit weights, rates, grace period, reserved ports and minimum payable amount live in config modules with env overrides documented in `.env.example`.
5. **Idempotency:** period close, payment verification and suspension/reactivation must be safe to run repeatedly.
6. **Backward compatibility:** existing JWT-based flows, tests and the Phase 8 SDK acceptance test must keep passing. Run `pnpm -r build`, all package tests and `pytest apps/ml-service/test_ml_service.py` at the end of each sub-phase.
7. **Update `progress.md` after each sub-phase** using the existing format (what was created, endpoints, decisions, verification, blocked/not verified). Be honest about anything not verified, such as Docker or live Khalti.
8. **Stop and flag** instead of guessing if: a route's tier is ambiguous, a plan rule conflicts with existing billing behavior, or a requirement would force a third-party dependency for core logic.

---

## Phase 10 Final Definition of Done

- A user can register a localhost domain, receive a site key once, and call SDK-facing routes with it.
- Free and Pro limits (domains and allowances) are enforced as specified.
- Usage is metered per domain in units, invoiced per domain at period close, payable through Khalti/mock, with grace period and suspension.
- Both the hub and the SOC dashboard show domains, usage and billing accurately.
- New domain-aware IDS heuristics raise alerts on synthetic attack sequences.
- SDK and extension support site keys with typed quota/suspension errors and remain fail-safe.
- All tests and builds pass across the monorepo; `progress.md` reflects Phase 10 accurately.
