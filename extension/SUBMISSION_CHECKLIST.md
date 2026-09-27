# SentinelKey Chrome Web Store Submission Checklist

This document details the checklist and requirements for packaging, validating, and submitting the SentinelKey Security Companion extension to the Chrome Web Store.

---

## 1. Local Testing & Verification (Unpacked)

- [ ] **Load Unpacked in Chrome**:
  1. Open Chrome and navigate to `chrome://extensions/`.
  2. Enable **Developer mode** toggle (top right).
  3. Click **Load unpacked** and select the `extension/` directory.
  4. Ensure no manifest errors, warnings, or missing resource alerts appear.
- [ ] **Service Worker Verification**:
  1. Inspect the service worker link in `chrome://extensions/` under the SentinelKey entry.
  2. Confirm `background.js` initializes without errors.
  3. Verify message handlers for `CHECK_URL`, `CHECK_FILE`, `CHECK_HEALTH`.
- [ ] **Content Script Interception**:
  1. Visit a test HTML page with links (e.g. `http://micros0ft-phish.xyz` or deceptive links).
  2. Click the link and verify that navigation is intercepted and the SentinelKey security modal renders.
  3. Test file input with an executable file or `.pdf.exe` disguised binary; verify input is cleared and warning dialog appears.
- [ ] **Fail-Safe Mode Testing**:
  1. Terminate or point the API URL to an offline host (e.g. `http://localhost:59999`).
  2. Trigger a link click or file scan.
  3. Verify the extension **fails closed** (blocks the target with `FAIL-SAFE-001 Backend Unreachable`) rather than silently letting the action through.

---

## 2. Chrome Web Store Policy Compliance

- [ ] **Manifest V3 Strict Compliance**:
  - No remote script execution (no `eval()`, `new Function()`, or CDN scripts).
  - All script resources (`background.js`, `content.js`, `popup.js`, `sdk-client.js`) are bundled locally.
- [ ] **Single Purpose Policy**:
  - Single purpose defined: *"Client-side zero-trust security inspector that scans outbound links and file uploads against heuristic intrusion detection rules."*
- [ ] **Permissions Justification**:
  - `storage`: Required to persist user configuration (API base URL, auth token, whitelist) and local threat incident history.
  - `activeTab`: Required to inspect the current tab's active target link/document safely.
  - `<all_urls>` (host_permissions): Required so the content script can intercept outbound link clicks and file inputs across user-visited web pages to block phishing and malware uploads.

---

## 3. Store Listing Assets Checklist

- [ ] **Icons**:
  - 16x16 px icon (`icons/icon16.png`)
  - 48x48 px icon (`icons/icon48.png`)
  - 128x128 px store icon (`icons/icon128.png`)
- [ ] **Screenshots**:
  - At least 1 (recommended 4-5) high-resolution screenshots (1280x800 or 640x400 px):
    1. Popup interface showing active status and Quick URL scanner.
    2. In-page modal intercepting a malicious lookalike typosquatting domain.
    3. File upload blocker intercepting a disguised binary executable.
    4. Threat Incident history tab.
- [ ] **Privacy Policy**:
  - Publicly accessible Privacy Policy URL explaining that URLs/files inspected are processed strictly for real-time security scoring and are not sold or monetized.

---

## 4. Packaging for Production Upload

Run the following command to generate the clean ZIP bundle excluding tests and dev artifacts:

```bash
# Windows PowerShell
Compress-Archive -Path extension/manifest.json, extension/background.js, extension/content.js, extension/content.css, extension/popup.html, extension/popup.css, extension/popup.js, extension/sdk-client.js, extension/icons -DestinationPath extension/sentinelkey-companion-v1.0.0.zip -Force
```

---

## 5. Developer Dashboard Submission Steps

1. Log into the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Pay the one-time $5 developer registration fee if new account.
3. Click **Add new item** and upload `sentinelkey-companion-v1.0.0.zip`.
4. Fill in:
   - **Name**: SentinelKey Security Companion
   - **Summary**: Real-time zero-trust security scanner: intercepts uploads and phishing links.
   - **Detailed Description**: Outline zero-trust architecture, heuristic rule engine, and fail-safe defense.
   - **Category**: Productivity / Developer Tools / Security.
5. In **Privacy practices** tab:
   - Check data types processed (Web history / File data for security scanning only).
   - Enter justification for `<all_urls>` host permissions.
6. Submit for review.
