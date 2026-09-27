# Changelog — @sentinelkey/security-stack-sdk

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-27

### Added
- Initial release of `@sentinelkey/security-stack-sdk`.
- `SentinelKeyClient` and `createSentinelKeyClient` factory wrapper.
- Authentication API:
  - `register(payload)`: User registration.
  - `login(credentials)`: User login with automated token storage.
  - `refreshTokens()`: Silent refresh token rotation.
  - `logout()`: Invalidation of refresh tokens.
  - `getMe()`: Current user profile fetching.
- Multi-Factor Authentication (MFA) API:
  - `setupMfa()`: Generates TOTP secret, backup codes, and QR code URI.
  - `verifyMfa(code, mfaToken)`: Verifies TOTP or backup code.
  - `disableMfa(code)`: Disables MFA with valid token verification.
- Classification & Compliance API:
  - `classifyEvent(request)`: Security event inspection (credential stuffing, hijack, escalation, token reuse).
  - `classifyFile(request)`: File inspection (magic bytes, Shannon entropy, dangerous extensions, hash blocklists).
  - `classifyEmail(request)`: Email and phishing inspection (typosquatting, deceptive links, suspicious TLDs).
  - `classifyUrl(url, options)`: Convenience link/URL scanner.
  - `checkProduct(description)`: Content and description scanner.
  - `failSafeClassify(type, payload)`: Fail-safe classification defense that automatically blocks threats if backend is unreachable.
  - `getClassificationHistory(limit)`: Audit trail querying.
- Encryption & File Storage API:
  - `uploadFile(payload)`: Base64 / binary upload to AES-256-GCM encrypted file storage.
  - `downloadFile(fileId)`: Authenticated decrypt and download.
  - `listFiles(query)`: Paginated and filtered search of encrypted files.
  - `rotateFileKey(fileId)`: Zero-downtime key rotation for stored files.
  - `encryptField(value)`: AES-256-GCM field encryption.
  - `decryptField(ciphertext)`: AES-256-GCM field decryption.
  - `getKeyStatus()`: Key version status query.
  - `rotateMasterKey()`: Zero-downtime HKDF master key rotation.
- Intrusion Detection & Logs API:
  - `getLogs(params)`: Security event audit log query.
  - `getAlerts(params)`: Real-time IDS alert stream query.
  - `acknowledgeAlert(alertId)`: Analyst acknowledgment.
  - `resolveAlert(alertId)`: Incident resolution.
- Policy Management API:
  - `getPolicies()`, `getPolicy(id)`, `updatePolicy(id, updates)`.
