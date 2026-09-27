import type {
  SentinelKeyConfig,
  RequestOptions,
  FileUploadPayload,
  SdkFileFilterQuery,
  FieldEncryptionResult,
  FieldDecryptionResult,
  IAuthResponse,
  ILoginRequest,
  IRegisterRequest,
  IMfaSetupResponse,
  IMfaVerifyRequest,
  IUserProfile,
  IClassifyEventRequest,
  IClassifyFileRequest,
  IClassifyEmailRequest,
  IClassificationResult,
  IPolicy,
  IEncryptedFile,
  IKeyRotationResult,
  ISecurityEvent,
  IAlert,
} from './types.js';
import { SentinelKeyError } from './types.js';
import type { ClassifierType, PaginatedResponse } from '@sentinelkey/shared-types';

export class SentinelKeyClient {
  private config: Required<Pick<SentinelKeyConfig, 'baseUrl' | 'failSafe' | 'timeoutMs'>> &
    Omit<SentinelKeyConfig, 'baseUrl' | 'failSafe' | 'timeoutMs'>;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private fetchFn: typeof fetch;

  constructor(config: SentinelKeyConfig = {}) {
    this.config = {
      baseUrl: (config.baseUrl || 'http://localhost:4000').replace(/\/+$/, ''),
      failSafe: config.failSafe ?? true,
      timeoutMs: config.timeoutMs ?? 5000,
      token: config.token,
      refreshToken: config.refreshToken,
      onTokenRefresh: config.onTokenRefresh,
      fetch: config.fetch,
    };

    this.accessToken = config.token || null;
    this.refreshToken = config.refreshToken || null;
    this.fetchFn = config.fetch || globalThis.fetch.bind(globalThis);
  }

  // ==========================================
  // Token & State Management
  // ==========================================

  public setToken(token: string | null): void {
    this.accessToken = token;
  }

  public getToken(): string | null {
    return this.accessToken;
  }

  public setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  // ==========================================
  // Core HTTP Transport
  // ==========================================

  public async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (!options.skipAuth && this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized with automatic refresh token rotation
      if (response.status === 401 && !options.skipAutoRefresh && this.refreshToken) {
        try {
          await this.refreshTokens();
          // Retry request with fresh access token
          return await this.request<T>(path, {
            ...options,
            skipAutoRefresh: true,
          });
        } catch {
          // If refresh failed, fall through to normal error handling
        }
      }

      // Handle non-JSON or download responses
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (!response.ok) {
          throw new SentinelKeyError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            'HTTP_ERROR'
          );
        }
        return (await response.arrayBuffer()) as unknown as T;
      }

      const json = await response.json();

      if (!response.ok || json.success === false) {
        const errorMsg = json.error?.message || json.message || `Request failed with status ${response.status}`;
        const errorCode = json.error?.code || 'API_ERROR';
        const details = json.error?.details || json.details;
        throw new SentinelKeyError(errorMsg, response.status, errorCode, details);
      }

      // SentinelKey API returns standardized envelope { success: true, data: ... }
      return (json.data !== undefined ? json.data : json) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof SentinelKeyError) {
        throw err;
      }

      const isTimeout = (err as Error).name === 'AbortError';
      const message = isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : (err as Error).message || 'Network request failed';

      throw new SentinelKeyError(
        message,
        isTimeout ? 408 : 503,
        isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        err
      );
    }
  }

  // ==========================================
  // Health Check
  // ==========================================

  public async health(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>('/health', { skipAuth: true });
  }

  // ==========================================
  // Auth & Session Management
  // ==========================================

  public async register(payload: IRegisterRequest): Promise<IAuthResponse> {
    const data = await this.request<IAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });

    if (data.accessToken) {
      this.accessToken = data.accessToken;
    }
    if (data.refreshToken) {
      this.refreshToken = data.refreshToken;
    }

    return data;
  }

  public async login(credentials: ILoginRequest): Promise<IAuthResponse> {
    const data = await this.request<IAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    });

    if (data.accessToken) {
      this.accessToken = data.accessToken;
    }
    if (data.refreshToken) {
      this.refreshToken = data.refreshToken;
    }

    return data;
  }

  public async refreshTokens(refreshTokenOverride?: string): Promise<IAuthResponse> {
    const tokenToUse = refreshTokenOverride || this.refreshToken;
    if (!tokenToUse) {
      throw new SentinelKeyError('No refresh token available', 400, 'MISSING_REFRESH_TOKEN');
    }

    const data = await this.request<IAuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokenToUse }),
      skipAuth: true,
      skipAutoRefresh: true,
    });

    if (data.accessToken) {
      this.accessToken = data.accessToken;
      this.config.onTokenRefresh?.(data.accessToken);
    }
    if (data.refreshToken) {
      this.refreshToken = data.refreshToken;
    }

    return data;
  }

  public async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          skipAutoRefresh: true,
        });
      } finally {
        this.accessToken = null;
        this.refreshToken = null;
      }
    } else {
      this.accessToken = null;
    }
  }

  public async getMe(): Promise<IUserProfile> {
    return this.request<IUserProfile>('/auth/me');
  }

  // ==========================================
  // MFA (Multi-Factor Authentication)
  // ==========================================

  public async setupMfa(): Promise<IMfaSetupResponse> {
    return this.request<IMfaSetupResponse>('/auth/mfa/setup', {
      method: 'POST',
    });
  }

  public async verifyMfa(totpCode: string, mfaToken?: string): Promise<IAuthResponse> {
    const body: IMfaVerifyRequest = { code: totpCode };
    if (mfaToken) {
      body.mfaToken = mfaToken;
    }

    const data = await this.request<IAuthResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: !mfaToken && !this.accessToken,
    });

    if (data.accessToken) {
      this.accessToken = data.accessToken;
    }
    if (data.refreshToken) {
      this.refreshToken = data.refreshToken;
    }

    return data;
  }

  public async disableMfa(password: string, code?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    });
  }

  // ==========================================
  // Classification & Compliance Engine
  // ==========================================

  public async classifyEvent(request: IClassifyEventRequest): Promise<IClassificationResult> {
    return this.request<IClassificationResult>('/classify/event', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  public async classifyFile(request: IClassifyFileRequest): Promise<IClassificationResult> {
    return this.request<IClassificationResult>('/classify/file', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  public async classifyEmail(request: IClassifyEmailRequest): Promise<IClassificationResult> {
    return this.request<IClassificationResult>('/classify/email', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Convenience classifier for URLs (checks domain spoofing, link mismatch, and suspicious TLDs)
   */
  public async classifyUrl(url: string, options?: { anchorText?: string }): Promise<IClassificationResult> {
    const anchorText = options?.anchorText || url;
    // Treat the scanned URL's hostname as the "sender" domain so the EML-001
    // lookalike rule compares the actual domain (not the scanner's own address).
    let host = 'unknown.invalid';
    try {
      host = new URL(url.includes('://') ? url : 'http://' + url).hostname;
    } catch { /* keep fallback host */ }
    return this.classifyEmail({
      email: {
        to: 'scanner@sentinelkey.local',
        from: `noreply@${host}`,
        subject: `URL Security Scan: ${url}`,
        bodyText: `Inspecting URL ${url}`,
        bodyHtml: `<a href="${url}">${anchorText}</a>`,
      },
    });
  }

  /**
   * Convenience product / threat description classifier
   */
  public async checkProduct(description: string): Promise<IClassificationResult> {
    return this.classifyEmail({
      email: {
        to: 'scanner@sentinelkey.local',
        from: 'submission@sentinelkey.local',
        subject: 'Product / Description Inspection',
        bodyText: description,
        bodyHtml: `<p>${description}</p>`,
      },
    });
  }

  /**
   * Fail-Safe Classification Wrapper
   * If the SentinelKey backend is down or unreachable, returns a blocked verdict
   * when failSafe is enabled, preventing security bypasses.
   */
  public async failSafeClassify(
    type: 'event' | 'file' | 'email' | 'url',
    payload:
      | IClassifyEventRequest
      | IClassifyFileRequest
      | IClassifyEmailRequest
      | string
      | { url: string; options?: { anchorText?: string } },
  ): Promise<IClassificationResult> {
    try {
      if (type === 'event') return await this.classifyEvent(payload as IClassifyEventRequest);
      if (type === 'file') return await this.classifyFile(payload as IClassifyFileRequest);
      if (type === 'email') return await this.classifyEmail(payload as IClassifyEmailRequest);
      if (type === 'url') {
        const urlPayload = payload as { url?: string; options?: { anchorText?: string } };
        return await this.classifyUrl(urlPayload.url || String(payload), urlPayload.options);
      }
      throw new Error(`Unsupported classifier type: ${type}`);
    } catch (err: unknown) {
      if (!this.config.failSafe) {
        throw err;
      }

      // FAIL-SAFE DEFENSE: Fail closed, block potential threat
      const errorMessage = (err as Error).message || 'SentinelKey backend unreachable';
      return {
        subjectType: (type === 'url' ? 'email' : type) as ClassifierType,
        subjectId: 'fail-safe-target',
        score: 100,
        verdict: 'blocked',
        severity: 'critical',
        matchedRules: [
          {
            ruleId: 'FAIL-SAFE-001',
            name: 'Backend Unreachable (Fail-Safe Defense)',
            score: 100,
            description: `SentinelKey backend was unreachable (${errorMessage}). Fail-safe policy active: blocking potential threat to prevent compromise.`,
          },
        ],
        policyVersion: 1,
        timestamp: new Date().toISOString(),
        metadata: {
          failSafeActive: true,
          backendUnreachable: true,
          error: errorMessage,
        },
      };
    }
  }

  public async getClassificationHistory(limit: number = 50): Promise<IClassificationResult[]> {
    return this.request<IClassificationResult[]>(`/classify/history?limit=${limit}`);
  }

  // ==========================================
  // Policies
  // ==========================================

  public async getPolicies(): Promise<IPolicy[]> {
    return this.request<IPolicy[]>('/policies');
  }

  public async getPolicy(id: string): Promise<IPolicy> {
    return this.request<IPolicy>(`/policies/${id}`);
  }

  public async updatePolicy(id: string, updates: Partial<IPolicy>): Promise<IPolicy> {
    return this.request<IPolicy>(`/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ==========================================
  // Encryption & Files
  // ==========================================

  public async uploadFile(file: FileUploadPayload): Promise<IEncryptedFile> {
    let contentBase64 = file.contentBase64;

    if (!contentBase64 && file.buffer) {
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file.buffer)) {
        contentBase64 = file.buffer.toString('base64');
      } else {
        const uint8 = new Uint8Array(file.buffer);
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        contentBase64 = btoa(binary);
      }
    }

    if (!contentBase64) {
      throw new SentinelKeyError('No file content provided for upload', 400, 'BAD_REQUEST');
    }

    return this.request<IEncryptedFile>('/files/upload', {
      method: 'POST',
      body: JSON.stringify({
        originalName: file.originalName,
        mimeType: file.mimeType || 'application/octet-stream',
        contentBase64,
      }),
    });
  }

  public async downloadFile(fileId: string): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(`/files/${fileId}/download`);
  }

  public async listFiles(query: SdkFileFilterQuery = {}): Promise<{ files: IEncryptedFile[]; pagination: PaginatedResponse<IEncryptedFile>['pagination'] }> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.mimeType) params.set('mimeType', query.mimeType);
    if (query.keyVersion) params.set('keyVersion', String(query.keyVersion));
    if (query.search) params.set('search', query.search);

    const qs = params.toString();
    return this.request<{ files: IEncryptedFile[]; pagination: PaginatedResponse<IEncryptedFile>['pagination'] }>(`/files${qs ? `?${qs}` : ''}`);
  }

  public async rotateFileKey(fileId: string): Promise<IKeyRotationResult> {
    return this.request<IKeyRotationResult>(`/files/${fileId}/rotate`, {
      method: 'POST',
    });
  }

  public async encryptField(value: string): Promise<FieldEncryptionResult> {
    return this.request<FieldEncryptionResult>('/files/encrypt-field', {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  public async decryptField(ciphertext: string): Promise<FieldDecryptionResult> {
    return this.request<FieldDecryptionResult>('/files/decrypt-field', {
      method: 'POST',
      body: JSON.stringify({ ciphertext }),
    });
  }

  public async getKeyStatus(): Promise<{ activeVersion: number; keys: Array<{ version: number; status: string; createdAt: Date }> }> {
    return this.request<{ activeVersion: number; keys: Array<{ version: number; status: string; createdAt: Date }> }>('/files/keys/status');
  }

  public async rotateMasterKey(): Promise<{ message: string; oldVersion: number; newVersion: number }> {
    return this.request<{ message: string; oldVersion: number; newVersion: number }>('/files/keys/rotate', {
      method: 'POST',
    });
  }

  // ==========================================
  // Logs & Intrusion Detection (Alerts)
  // ==========================================

  public async getLogs(params: Record<string, string | number | undefined> = {}): Promise<ISecurityEvent[]> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    return this.request<ISecurityEvent[]>(`/logs${qs ? `?${qs}` : ''}`);
  }

  public async getAlerts(params: Record<string, string | number | undefined> = {}): Promise<IAlert[]> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    return this.request<IAlert[]>(`/alerts${qs ? `?${qs}` : ''}`);
  }

  public async acknowledgeAlert(alertId: string): Promise<IAlert> {
    return this.request<IAlert>(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  public async resolveAlert(alertId: string): Promise<IAlert> {
    return this.request<IAlert>(`/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  }
}

/**
 * Factory helper to instantiate a configured SentinelKeyClient
 */
export function createSentinelKeyClient(config?: SentinelKeyConfig): SentinelKeyClient {
  return new SentinelKeyClient(config);
}
