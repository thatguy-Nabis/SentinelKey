# Feature Report: Security Stack SDK & Browser Extension

| Field | Value |
|---|---|
| **Feature ID** | SK-08 |
| **Roadmap Phase** | Phase 8 (8a SDK, 8b Extension) |
| **Status** | Complete |
| **SDK** | `packages/security-stack-sdk` (`@sentinelkey/security-stack-sdk`) |
| **Example app** | `apps/sdk-example` |
| **Extension** | `extension/` (Manifest V3) |
| **Hardcoded (core)** | Client wrappers, fail-closed policy, interception logic |
| **External APIs** | Calls only the self-hosted SentinelKey API |

---

## 1. Purpose

**8a** exposes Phases 1–7 as a typed Node/browser-friendly client so apps never reimplement raw HTTP auth, classify, or encrypt flows.

**8b** ships a Chrome MV3 companion that intercepts risky clicks and file picks **before** the user proceeds, using the same classification semantics and **failing closed** when the backend is unreachable.

---

## 2. Problem Statement

Integrators and end-users need:

- One consistent client with auto token refresh
- Classification helpers (`checkProduct`, URL/file checks) without duplicating rule IDs
- Browser protection that does not silently allow threats during API outages
- Store-ready packaging docs without putting secrets in the extension

---

## 3. SDK Architecture (`SentinelKeyClient`)

Factory: `createSentinelKeyClient({ baseUrl, failSafe, timeoutMs, token, refreshToken, onTokenRefresh })`.

### Capabilities

| Area | Methods (representative) |
|---|---|
| Auth | `login`, `register`, `refreshTokens`, `logout`, `getMe` |
| MFA | `setupMfa`, `verifyMfa`, `disableMfa` |
| Classification | `classifyEvent`, `classifyFile`, `classifyEmail`, `classifyUrl`, `checkProduct`, `getClassificationHistory` |
| Encryption | `uploadFile`, `downloadFile`, `listFiles`, `rotateFileKey`, `encryptField`, `decryptField`, `getKeyStatus`, `rotateMasterKey` |
| IDS | `getLogs`, `getAlerts`, `acknowledgeAlert`, `resolveAlert` |
| Policies | `getPolicies`, `getPolicy`, `updatePolicy` |

### Transport behaviors

- Bearer access token on requests
- On **401**, attempt refresh once, invoke `onTokenRefresh`, retry original request
- Configurable timeout via `AbortController`
- Versioned changelog: `packages/security-stack-sdk/CHANGELOG.md` (Keep a Changelog)

### Fail-safe (default `failSafe: true`)

If the API is unreachable/times out during a classification-style check, the client returns a synthetic **critical blocked** verdict with code `FAIL-SAFE-001 Backend Unreachable` instead of allowing the action.

---

## 4. SDK Example App

`apps/sdk-example` consumes the package via `workspace:*` and performs:

health → login → classify → encrypt round-trip → fail-safe offline check

**Acceptance:** no raw `fetch` to the API — only SDK methods (`sdk-example.test.ts`).

---

## 5. Browser Extension (MV3)

| File | Role |
|---|---|
| `manifest.json` | MV3 permissions: storage, activeTab, host permissions |
| `sdk-client.js` | Browser SDK client + fail-safe |
| `background.js` | Service worker: checks, incidents, badge |
| `content.js` | Intercepts external `<a>` clicks and `<input type="file">` |
| `content.css` | Warning modal overlay |
| `popup.*` | Health, URL scanner, file dropzone, incidents, settings |
| `SUBMISSION_CHECKLIST.md` | Chrome Web Store packaging & privacy checklist |
| `README.md` | Load unpacked instructions |

### Interception flows

1. **Link click** → classify URL/email heuristics (typosquat, href mismatch, bad TLD) → block/warn modal  
2. **File select** → SHA-256 (`crypto.subtle`), magic/header checks → block dangerous uploads  
3. **Offline / timeout** → fail closed (`FAIL-SAFE-001`)

Zero duplicated backend rule engines: companion client mirrors SDK contracts against the API.

---

## 6. Testing

| Suite | Coverage |
|---|---|
| `packages/security-stack-sdk/tests/client.test.ts` | Auth tokens, auto-refresh, classify, encrypt, fail-safe |
| `extension-companion.test.ts` | Threat interception, file block, fail-closed offline |
| `apps/sdk-example/tests/sdk-example.test.ts` | Full round-trip via SDK only |

---

## 7. Local Extension Load

1. Chrome → `chrome://extensions` → Developer mode  
2. Load unpacked → select `extension/`  
3. Ensure API (and ML if used) reachable at configured base URL  

---

## 8. Integration Map

```
Extension / App
      │
      ▼
@sentinelkey/security-stack-sdk
      │
      ▼
apps/api  (Auth, MFA, Logs, Alerts, Files, Classify, Policies)
      │
      └─► apps/ml-service (optional scoring path)
```

---

## 9. Acceptance Criteria (met)

- [x] Sample app completes login + classify + encrypt using only SDK calls
- [x] Extension warns/blocks known-bad URL/file fixtures
- [x] Extension fails safe when backend unreachable (explicit, tested)
- [x] Loadable unpacked; store checklist documented as follow-up packaging work

---

## 10. Known Limitations

- Extension hosts must be configured to reach the developer’s API origin (CORS/host permissions).
- Web Store submission is checklist-ready but not an automated publish step.
- Field encrypt/decrypt SDK helpers depend on corresponding API surfaces being enabled for the caller’s role.
