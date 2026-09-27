import type {
  IUserProfile,
  IAuthResponse,
  IMfaSetupResponse,
  ISecurityEvent,
  IAlert,
  PaginatedResponse,
} from '@sentinelkey/shared-types';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('sentinelkey_refresh_token');
}

export function setStoredRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem('sentinelkey_refresh_token', token);
  } else {
    localStorage.removeItem('sentinelkey_refresh_token');
  }
}

/** Extract a human-readable message from a thrown value. */
export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Standard fetch wrapper with automatic bearer token attachment and refresh retry.
 */
async function request<T>(
  url: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  // Handle automatic silent refresh on 401
  if (response.status === 401 && !isRetry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.data?.accessToken) {
            setAccessToken(refreshData.data.accessToken);
            setStoredRefreshToken(refreshData.data.refreshToken);
            return request<T>(url, options, true);
          }
        }
      } catch {
        // Refresh failed: clear storage
        setAccessToken(null);
        setStoredRefreshToken(null);
      }
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || response.statusText || 'API request failed';
    const err = new Error(message) as Error & { statusCode: number; errorData: unknown };
    err.statusCode = response.status;
    err.errorData = data.error;
    throw err;
  }

  return data as T;
}

// ================= AUTH ENDPOINTS =================

export async function login(email: string, password: string, location?: { latitude: number; longitude: number; city?: string }) {
  const res = await request<{ data: IAuthResponse }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, location }),
  });

  if (res.data.accessToken) {
    setAccessToken(res.data.accessToken);
    setStoredRefreshToken(res.data.refreshToken ?? null);
  }

  return res.data;
}

export async function register(email: string, password: string) {
  const res = await request<{ data: IAuthResponse }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res.data.accessToken) {
    setAccessToken(res.data.accessToken);
    setStoredRefreshToken(res.data.refreshToken ?? null);
  }

  return res.data;
}

export async function getMe(): Promise<IUserProfile> {
  const res = await request<{ data: IUserProfile }>('/auth/me');
  return res.data;
}

export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  setAccessToken(null);
  setStoredRefreshToken(null);
}

// ================= MFA ENDPOINTS =================

export async function verifyMfaLogin(mfaToken: string, code: string, location?: { latitude: number; longitude: number; city?: string }) {
  const res = await request<{ data: IAuthResponse }>('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ mfaToken, code, location }),
  });

  if (res.data.accessToken) {
    setAccessToken(res.data.accessToken);
    setStoredRefreshToken(res.data.refreshToken ?? null);
  }

  return res.data;
}

export async function setupMfa(): Promise<IMfaSetupResponse> {
  const res = await request<{ data: IMfaSetupResponse }>('/auth/mfa/setup', {
    method: 'POST',
  });
  return res.data;
}

export async function confirmMfaSetup(code: string): Promise<{ message: string }> {
  const res = await request<{ data: { message: string } }>('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return res.data;
}

export async function disableMfa(password: string, code?: string): Promise<{ message: string }> {
  const res = await request<{ data: { message: string } }>('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
  return res.data;
}

// ================= LOGS & ALERTS ENDPOINTS =================

export async function fetchLogs(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<ISecurityEvent>> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') query.set(k, String(v));
  }
  return request<PaginatedResponse<ISecurityEvent>>(`/logs?${query.toString()}`);
}

export async function fetchAlerts(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<IAlert>> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') query.set(k, String(v));
  }
  return request<PaginatedResponse<IAlert>>(`/alerts?${query.toString()}`);
}

export async function acknowledgeAlert(alertId: string): Promise<IAlert> {
  const res = await request<{ data: IAlert }>(`/alerts/${alertId}/acknowledge`, {
    method: 'POST',
  });
  return res.data;
}

export async function resolveAlert(alertId: string): Promise<IAlert> {
  const res = await request<{ data: IAlert }>(`/alerts/${alertId}/resolve`, {
    method: 'POST',
  });
  return res.data;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch('/health');
    return res.ok;
  } catch {
    return false;
  }
}
