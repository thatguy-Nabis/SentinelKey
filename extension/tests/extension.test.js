import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtensionSentinelKeyClient } from '../sdk-client.js';

describe('SentinelKey Browser Extension Client & Logic (Phase 8b)', () => {
  let client;

  beforeEach(() => {
    client = new ExtensionSentinelKeyClient({
      baseUrl: 'http://api.sentinelkey.test',
      failSafe: true,
      timeoutMs: 1000,
    });
  });

  describe('1. Threat URL Interception', () => {
    it('correctly blocks a known-flagged phishing / lookalike URL', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              subjectType: 'email',
              subjectId: 'https://micros0ft-login.xyz',
              score: 95,
              verdict: 'blocked',
              severity: 'critical',
              matchedRules: [
                { ruleId: 'EML-001', name: 'Lookalike Domain Typosquatting', score: 80 },
                { ruleId: 'EML-003', name: 'High-Abuse TLD (.xyz)', score: 30 },
              ],
            },
          }),
      });

      globalThis.fetch = mockFetch;

      const result = await client.classifyUrl('https://micros0ft-login.xyz', 'Microsoft Login');

      expect(result.verdict).toBe('blocked');
      expect(result.score).toBe(95);
      expect(result.matchedRules).toHaveLength(2);
      expect(result.matchedRules[0].ruleId).toBe('EML-001');

      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.email.subject).toContain('https://micros0ft-login.xyz');
      expect(calledBody.email.bodyHtml).toContain('Microsoft Login');
    });

    it('permits a safe legitimate domain with safe verdict', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              subjectType: 'email',
              subjectId: 'https://github.com',
              score: 0,
              verdict: 'safe',
              severity: 'low',
              matchedRules: [],
            },
          }),
      });

      globalThis.fetch = mockFetch;

      const result = await client.classifyUrl('https://github.com');
      expect(result.verdict).toBe('safe');
      expect(result.score).toBe(0);
      expect(result.matchedRules).toHaveLength(0);
    });
  });

  describe('2. File Upload Threat Interception', () => {
    it('correctly blocks a disguised executable file upload', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              subjectType: 'file',
              subjectId: 'invoice.pdf.exe',
              score: 90,
              verdict: 'blocked',
              severity: 'critical',
              matchedRules: [
                { ruleId: 'FILE-001', name: 'Magic Byte Signature Disguise', score: 90 },
                { ruleId: 'FILE-003', name: 'Dangerous Extension Detected', score: 60 },
              ],
            },
          }),
      });

      globalThis.fetch = mockFetch;

      const result = await client.classifyFile({
        filename: 'invoice.pdf.exe',
        mimeType: 'application/pdf',
        sizeBytes: 10240,
        contentBase64: 'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA...',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });

      expect(result.verdict).toBe('blocked');
      expect(result.score).toBe(90);
      expect(result.matchedRules.some((r) => r.ruleId === 'FILE-001')).toBe(true);
    });
  });

  describe('3. Fail-Safe Defense Verification (Backend Unreachable)', () => {
    it('fails closed (verdict: blocked, score: 100) when backend is offline and failSafe is true', async () => {
      // Simulate backend server offline / connection refused
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new TypeError('Failed to fetch (net::ERR_CONNECTION_REFUSED)')
      );

      globalThis.fetch = mockFetch;

      const result = await client.classifyUrl('https://any-url.com');

      // MUST NOT SILENTLY ALLOW THROUGH
      expect(result.verdict).toBe('blocked');
      expect(result.score).toBe(100);
      expect(result.severity).toBe('critical');
      expect(result.matchedRules[0].ruleId).toBe('FAIL-SAFE-001');
      expect(result.metadata.failSafeActive).toBe(true);
      expect(result.metadata.backendUnreachable).toBe(true);
    });

    it('fails closed for file uploads when backend connection times out', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      );

      globalThis.fetch = mockFetch;

      const result = await client.classifyFile({
        filename: 'document.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      expect(result.verdict).toBe('blocked');
      expect(result.matchedRules[0].ruleId).toBe('FAIL-SAFE-001');
      expect(result.metadata.failSafeActive).toBe(true);
    });

    it('re-throws error if failSafe is explicitly turned off by user setting', async () => {
      client.setFailSafe(false);

      const mockFetch = vi.fn().mockRejectedValueOnce(new TypeError('Network offline'));
      globalThis.fetch = mockFetch;

      await expect(client.classifyUrl('https://test.com')).rejects.toThrow('Network offline');
    });
  });

  describe('4. Health Check', () => {
    it('returns ok: true when backend is reachable', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'api' }),
      });

      const res = await client.health();
      expect(res.ok).toBe(true);
      expect(res.data.status).toBe('ok');
    });

    it('returns ok: false when backend is down', async () => {
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection refused'));

      const res = await client.health();
      expect(res.ok).toBe(false);
      expect(res.error).toBe('Connection refused');
    });
  });
});
