# SentinelKey Browser Extension (Manifest V3)

Zero-trust client defense companion for SentinelKey. Intercepts suspicious link navigations and dangerous file uploads directly inside the browser before transactions occur.

## Architecture

- **`manifest.json`**: Manifest V3 compliant specification with isolated permissions.
- **`sdk-client.js`**: Lightweight browser-compatible SentinelKey SDK client with built-in fail-safe protection.
- **`background.js`**: Background service worker orchestrating security classification, threat incident logs, and badge indicators.
- **`content.js`**: In-page DOM inspector intercepting `<a href>` clicks and `<input type="file">` file uploads.
- **`content.css`**: Non-intrusive dark-mode glassmorphic modal warning dialog for threat alerts.
- **`popup.html` / `popup.css` / `popup.js`**: Interactive popup with live health status, quick URL scanner, pre-flight file scanner, incident ledger, and settings.
- **`SUBMISSION_CHECKLIST.md`**: Chrome Web Store submission, privacy policy, and developer review checklist.

## Loading Unpacked in Chrome (Local Testing)

1. Open Google Chrome (or Chromium/Brave/Edge).
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select this `extension/` directory.
6. The **SentinelKey Security Companion** icon will appear in your extensions bar!

## Fail-Safe Defense

The extension implements a strict fail-safe security posture:
- If the SentinelKey backend API is offline, unreachable, or times out, the extension **fails closed** (blocks high-risk actions with code `FAIL-SAFE-001 Backend Unreachable`) rather than silently letting potential zero-day malware or phishing links proceed.

