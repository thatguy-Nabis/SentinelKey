import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SentinelKeyClient, createSentinelKeyClient, SentinelKeyError } from '../src/index.js';

describe('SentinelKeyClient SDK', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  function createClient(options = {}) {
    return new SentinelKeyClient({
      baseUrl: 'http://api.sentinelkey.test',
      fetch: mockFetch as unknown as typeof fetch,
      ...options,
    });
  }

  function mockJsonResponse(data: any, status = 200, ok = true) {
    return Promise.resolve({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(data),
    });
  }

  describe('Initialization & Configuration', () => {
    it('initializes with default options and factory function', () => {
      const client = createSentinelKeyClient({ baseUrl: 'http://localhost:4000/' });
      expect(client).toBeInstanceOf(SentinelKeyClient);
      expect(client.getToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
    });

    it('sets and gets tokens properly', () => {
      const client = createClient();
      client.setToken('test-access-token');
      client.setRefreshToken('test-refresh-token');
      expect(client.getToken()).toBe('test-access-token');
      expect(client.getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('Authentication Flow', () => {
    it('login stores access and refresh tokens and injects them in subsequent requests', async () => {
      const client = createClient();

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            user: { id: 'u1', email: 'test@example.com' },
            accessToken: 'access-jwt-123',
            refreshToken: 'refresh-jwt-456',
          },
        })
      );

      const res = await client.login({ email: 'test@example.com', password: 'password123' });
      expect(res.user?.email).toBe('test@example.com');
      expect(client.getToken()).toBe('access-jwt-123');
      expect(client.getRefreshToken()).toBe('refresh-jwt-456');

      // Subsequent call should have Authorization header
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: { id: 'u1', email: 'test@example.com' },
        })
      );

      await client.getMe();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const secondCallHeaders = mockFetch.mock.calls[1][1].headers;
      expect(secondCallHeaders.get('Authorization')).toBe('Bearer access-jwt-123');
    });

    it('logout sends revoke request and clears internal tokens', async () => {
      const client = createClient({
        token: 'active-token',
        refreshToken: 'active-refresh',
      });

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: { message: 'Logged out successfully' },
        })
      );

      await client.logout();
      expect(client.getToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.sentinelkey.test/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('automatically refreshes token and retries request on 401 response', async () => {
      let refreshCbCalled = false;
      const client = createClient({
        token: 'expired-access-token',
        refreshToken: 'valid-refresh-token',
        onTokenRefresh: (token) => {
          refreshCbCalled = true;
          expect(token).toBe('new-access-token');
        },
      });

      // 1st call: returns 401
      mockFetch.mockReturnValueOnce(
        mockJsonResponse(
          { success: false, error: { message: 'Token expired', code: 'UNAUTHORIZED' } },
          401,
          false
        )
      );

      // 2nd call: refresh endpoint returns new tokens
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        })
      );

      // 3rd call: retried original request succeeds with new token
      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: [{ id: 'evt-1', type: 'LOGIN_SUCCESS' }],
        })
      );

      const logs = await client.getLogs();
      expect(logs).toHaveLength(1);
      expect(client.getToken()).toBe('new-access-token');
      expect(refreshCbCalled).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Classification Engine APIs', () => {
    it('classifyEvent sends event payload and returns verdict', async () => {
      const client = createClient({ token: 'test-token' });

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            subjectType: 'event',
            subjectId: 'evt-test',
            score: 85,
            verdict: 'blocked',
            severity: 'critical',
            matchedRules: [
              { ruleId: 'EVT-001', name: 'Credential Stuffing Burst', score: 85, description: 'Multiple attempts' },
            ],
            policyVersion: 1,
            timestamp: new Date().toISOString(),
          },
        })
      );

      const result = await client.classifyEvent({
        event: {
          type: 'AUTH_FAILED',
          ip: '192.168.1.100',
        },
      });

      expect(result.verdict).toBe('blocked');
      expect(result.score).toBe(85);
      expect(result.matchedRules[0].ruleId).toBe('EVT-001');
    });

    it('classifyUrl conveniency formats into email link inspection', async () => {
      const client = createClient({ token: 'test-token' });

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            subjectType: 'email',
            subjectId: 'url-test',
            score: 75,
            verdict: 'flagged',
            severity: 'high',
            matchedRules: [
              { ruleId: 'EML-001', name: 'Lookalike Domain Typosquatting', score: 75, description: 'Typosquatting' },
            ],
            policyVersion: 1,
            timestamp: new Date().toISOString(),
          },
        })
      );

      const result = await client.classifyUrl('https://paypa1.com/login');
      expect(result.verdict).toBe('flagged');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.sentinelkey.test/classify/email',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Fail-Safe Defense (Phase 8 requirement)', () => {
    it('failSafeClassify fails closed and blocks if API is unreachable when failSafe is true', async () => {
      const client = createClient({
        failSafe: true,
      });

      // Simulate network / server crash
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch (Network connection refused)'));

      const result = await client.failSafeClassify('url', 'https://unknown-link.com');

      expect(result.verdict).toBe('blocked');
      expect(result.score).toBe(100);
      expect(result.matchedRules[0].ruleId).toBe('FAIL-SAFE-001');
      expect(result.metadata?.failSafeActive).toBe(true);
      expect(result.metadata?.backendUnreachable).toBe(true);
    });

    it('failSafeClassify re-throws error if failSafe is explicitly disabled', async () => {
      const client = createClient({
        failSafe: false,
      });

      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(client.failSafeClassify('url', 'https://test.com')).rejects.toThrow(
        SentinelKeyError
      );
    });
  });

  describe('Field & File Encryption APIs', () => {
    it('encryptField sends value and returns encrypted ciphertext with key version', async () => {
      const client = createClient({ token: 'test-token' });

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            ciphertext: 'enc:v1:a1b2c3d4:e5f6:g7h8',
            version: 1,
          },
        })
      );

      const result = await client.encryptField('ssn-secret-1234');
      expect(result.ciphertext).toContain('enc:v1');
      expect(result.version).toBe(1);
    });

    it('decryptField sends ciphertext and returns plaintext', async () => {
      const client = createClient({ token: 'test-token' });

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            plaintext: 'ssn-secret-1234',
            version: 1,
          },
        })
      );

      const result = await client.decryptField('enc:v1:a1b2c3d4:e5f6:g7h8');
      expect(result.plaintext).toBe('ssn-secret-1234');
    });

    it('uploadFile formats base64 and posts to file storage', async () => {
      const client = createClient({ token: 'test-token' });

      mockFetch.mockReturnValueOnce(
        mockJsonResponse({
          success: true,
          data: {
            fileId: 'file-xyz',
            originalName: 'document.pdf',
            size: 1024,
            keyVersion: 1,
          },
        })
      );

      const result = await client.uploadFile({
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        contentBase64: 'JVBERi0xLjQKJeLjz9MK...',
      });

      expect(result.originalName).toBe('document.pdf');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.sentinelkey.test/files/upload',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('throws SentinelKeyError with API status and code on error responses', async () => {
      const client = createClient();

      mockFetch.mockReturnValueOnce(
        mockJsonResponse(
          {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          },
          401,
          false
        )
      );

      await expect(
        client.login({ email: 'bad@example.com', password: 'wrong' })
      ).rejects.toMatchObject({
        name: 'SentinelKeyError',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });
  });
});
