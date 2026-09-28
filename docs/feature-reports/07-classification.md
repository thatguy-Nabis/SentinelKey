# Feature Report: Compliance & Classification Engine

| Field | Value |
|---|---|
| **Feature ID** | SK-07 |
| **Roadmap Phase** | Phase 7 |
| **Status** | Complete |
| **Primary location** | `apps/api/src/services/classification/` |
| **Shared types** | `packages/shared-types/src/classification.ts` |
| **Hardcoded (core)** | Rules engine, event/file/email classifiers, policy versioning |
| **External APIs** | None (no LLM classification) |

---

## 1. Purpose

Three deterministic classifiers — **event**, **file**, and **email** — share one rules engine, policy store, verdict taxonomy, and audit ledger. Block/flag outcomes escalate into the IDS alert stream (SK-03). Fully custom; no third-party classification SaaS and no LLM.

---

## 2. Problem Statement

Compliance and content risk need:

- Repeatable verdicts (same input + same policy version → same result)
- Auditable decisions with policy version stamps
- Shared action mapping (`ALLOW` / `WARN` / `BLOCK` / `QUARANTINE`) across subject types
- Integration with encryption upload path and client SDK/extension pre-checks

---

## 3. Shared Foundation

### `ClassificationResult` shape

`{ subjectType, subjectId, verdict, matchedRules[], severity, policyVersion, timestamp, … }`

### Rules engine (`rules-engine.ts`)

- Load versioned policy
- Aggregate rule hits / risk score
- Map score → verdict via thresholds
- Persist `ClassificationRecord`
- On `BLOCK` / `QUARANTINE` → create IDS alert

### Policies

Seeded defaults:

- `default-event-policy`
- `default-file-policy`
- `default-email-policy`

Configurable: rule weights, severity cutoffs, actions. Updates are versioned so historical records keep the version that applied.

---

## 4. Event Classifier (`event-classifier.service.ts`)

Consumes security event sequences (beyond SK-03 basic heuristics):

| Rule ID | Pattern |
|---|---|
| `EVT-001` | Credential stuffing — many failed logins across accounts from same IP/subnet |
| `EVT-002` | Session hijack — same session, divergent UA/IP |
| `EVT-003` | Privilege escalation chain — role change then privileged access |
| `EVT-004` | Consumed/revoked token reuse |

---

## 5. File Classifier (`file-classifier.service.ts`)

Runs at/near upload time (alongside SK-05 encryption):

| Rule ID | Check |
|---|---|
| `FILE-001` | Magic-byte vs declared MIME/extension (PE `MZ`, ELF, `PK`, …) |
| `FILE-002` | Shannon entropy \( H = -\sum p_i \log_2 p_i \); flag \( H > 7.7 \) (packed/encrypted disguise) |
| `FILE-003` | Dangerous extensions / double extensions (`.pdf.exe`, `.ps1`, …) |
| `FILE-004` | SHA-256 against in-repo blocklist |

Verdicts can allow storage, quarantine, or reject before encrypt-store.

---

## 6. Email Classifier (`email-classifier.service.ts`)

| Rule ID | Check |
|---|---|
| `EML-001` | Lookalike / typosquat domains (Levenshtein vs trusted list) |
| `EML-002` | Display text vs `href` domain mismatch |
| `EML-003` | Suspicious TLDs / URL shorteners |
| `EML-004` | Urgency / phishing keyword patterns |
| `EML-005` | From vs Reply-To domain divergence |

Used by API, SDK `classifyEmail` / `classifyUrl` / `checkProduct`, and the browser extension.

---

## 7. API Surface

| Method | Path | Description |
|---|---|---|
| `POST` | `/classify/event` | Classify event sequence |
| `POST` | `/classify/file` | Classify file payload/metadata |
| `POST` | `/classify/email` | Classify email/URL content |
| `GET` | `/classify/history` | Audit ledger query |
| `GET` | `/policies` | List policies |
| `GET` | `/policies/:id` | Get one |
| `PUT` | `/policies/:id` | Update (RBAC-gated, versioned) |

---

## 8. Alert Integration

| Classification outcome | Alert rule examples |
|---|---|
| Event block/escalate | `EVENT_CLASSIFICATION_ALERT` |
| File blocked | `FILE_CLASSIFICATION_BLOCKED` |
| Email phishing | `EMAIL_CLASSIFICATION_PHISHING` |

Same acknowledge/resolve path as heuristic alerts.

---

## 9. Testing

| Suite | Coverage |
|---|---|
| `event-classifier.test.ts` | Clean vs stuffing/hijack/escalation/reuse; thresholds |
| `file-classifier.test.ts` | Clean, magic disguise, entropy, extensions, hash blocklist |
| `email-classifier.test.ts` | Clean, typosquat, deceptive links, TLD/shortener, urgency |

Determinism is inherent (no stochastic LLM).

---

## 10. Acceptance Criteria (met)

- [x] Same input + policy version → same verdict for each classifier
- [x] Policy changes versioned; history retains applied version
- [x] Known-bad / known-safe fixtures pass per classifier
- [x] Block/flag integrates with Phase 3 alerting
- [x] Shared engine + audit across all three

---

## 11. Known Limitations

- Hash blocklist and trusted-domain lists are operator-maintained (no external threat-intel feed by design).
- LLM assistance explicitly deferred/rejected for this phase to preserve determinism and sovereignty.
