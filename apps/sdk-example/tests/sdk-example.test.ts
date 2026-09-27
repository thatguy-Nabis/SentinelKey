import { describe, it, expect, vi } from 'vitest';
import { runSdkExample } from '../src/index.js';
import { SentinelKeyClient } from '@sentinelkey/security-stack-sdk';

describe('SDK Example App Round-Trip Acceptance Test', () => {
  it('completes a full login + classify + encrypt round-trip using only SDK calls', async () => {
    const mockFetch = vi.fn();

    // Mock client configured with mockFetch
    const client = new SentinelKeyClient({
      baseUrl: 'http://api.sentinelkey.test',
      fetch: mockFetch as unknown as typeof fetch,
      failSafe: true,
    });

    // Mock responses:
    // 1. health
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: { status: 'ok', service: 'api' } }),
    });

    // 2. login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            user: { id: 'u-1', email: 'admin@sentinelkey.local' },
            accessToken: 'mock-access-token-jwt',
            refreshToken: 'mock-refresh-token-jwt',
          },
        }),
    });

    // 3. classifyUrl (POST /classify/email)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            subjectType: 'email',
            subjectId: 'email-inspection',
            score: 90,
            verdict: 'blocked',
            severity: 'critical',
            matchedRules: [
              { ruleId: 'EML-001', name: 'Typosquatting Lookalike', score: 80, description: 'Lookalike domain' },
              { ruleId: 'EML-003', name: 'Suspicious TLD', score: 30, description: 'TLD .xyz' },
            ],
            policyVersion: 1,
            timestamp: new Date().toISOString(),
          },
        }),
    });

    // 4. encryptField (POST /files/encrypt-field)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            ciphertext: 'enc:v1:iv123:tag456:encryptedblob789',
            version: 1,
          },
        }),
    });

    // 5. decryptField (POST /files/decrypt-field)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            plaintext: 'PII-SSN-987-65-4321-CREDIT-CARD-EXP-2029',
            version: 1,
          },
        }),
    });

    const result = await runSdkExample(client);

    expect(result.authSuccess).toBe(true);
    expect(result.classificationVerdict).toBe('blocked');
    expect(result.encryptRoundTripMatches).toBe(true);
    expect(result.failSafeDefenseActive).toBe(true);

    // Verify all mock calls went through proper endpoints
    const calledUrls = mockFetch.mock.calls.map((call) => call[0]);
    expect(calledUrls).toContain('http://api.sentinelkey.test/health');
    expect(calledUrls).toContain('http://api.sentinelkey.test/auth/login');
    expect(calledUrls).toContain('http://api.sentinelkey.test/classify/email');
    expect(calledUrls).toContain('http://api.sentinelkey.test/files/encrypt-field');
    expect(calledUrls).toContain('http://api.sentinelkey.test/files/decrypt-field');
  });
});
