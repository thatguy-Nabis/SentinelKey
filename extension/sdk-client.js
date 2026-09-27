/**
 * SentinelKey SDK Client for MV3 Browser Extension
 * Wraps classification, threat evaluation, and fail-safe defense.
 */

export class ExtensionSentinelKeyClient {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:4000').replace(/\/+$/, '');
    this.token = config.token || null;
    this.failSafe = config.failSafe !== false; // Default: true (fail closed)
    this.timeoutMs = config.timeoutMs || 4000;
  }

  setBaseUrl(url) {
    this.baseUrl = (url || 'http://localhost:4000').replace(/\/+$/, '');
  }

  setToken(token) {
    this.token = token || null;
  }

  setFailSafe(failSafe) {
    this.failSafe = Boolean(failSafe);
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async classifyUrl(url, anchorText = '') {
    // Treat the scanned URL's hostname as the "sender" domain so the server's
    // lookalike-domain rule (EML-001) compares the actual domain, not ours.
    let host = 'unknown.invalid';
    try {
      host = new URL(url.includes('://') ? url : 'http://' + url).hostname;
    } catch (_) {}

    const payload = {
      email: {
        to: 'scanner@sentinelkey.local',
        from: `noreply@${host}`,
        subject: `Browser URL Inspection: ${url}`,
        bodyText: `Inspecting URL ${url}`,
        bodyHtml: `<a href="${url}">${anchorText || url}</a>`,
      },
    };

    return this.executeClassification('/classify/email', payload, 'email', url);
  }

  async classifyFile({ filename, mimeType, contentBase64, sha256, sizeBytes }) {
    const payload = {
      filename,
      mimeType: mimeType || 'application/octet-stream',
      contentBase64,
      sha256,
      sizeBytes,
    };

    return this.executeClassification('/classify/file', payload, 'file', filename);
  }

  async executeClassification(endpoint, payload, subjectType, subjectIdentifier) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || `HTTP ${res.status}`);
      }

      return json.data;
    } catch (err) {
      if (!this.failSafe) {
        throw err;
      }

      // FAIL-SAFE DEFENSE: Fail closed, block potential threat
      return {
        subjectType,
        subjectId: subjectIdentifier,
        score: 100,
        verdict: 'blocked',
        severity: 'critical',
        matchedRules: [
          {
            ruleId: 'FAIL-SAFE-001',
            name: 'Backend Unreachable (Fail-Safe Defense)',
            score: 100,
            description: `SentinelKey security backend was unreachable (${err.message}). Fail-safe policy active: blocking potential threat to prevent compromise.`,
          },
        ],
        policyVersion: 1,
        timestamp: new Date().toISOString(),
        metadata: {
          failSafeActive: true,
          backendUnreachable: true,
          error: err.message,
        },
      };
    }
  }
}
