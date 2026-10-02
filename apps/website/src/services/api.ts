import type {
  IUserProfile,
  IAuthResponse,
  IBillingPlan,
  ISubscription,
  IInvoice,
  ICheckoutSessionResponse,
  IVerifyPaymentResponse,
  ApiResponse,
  IDomain,
  ICreateDomainRequest,
  ICreateDomainResponse,
  IRotateKeyResponse,
  IAccruedOverageEstimate,
  IUsageSummaryResponse,
  IDomainProbeResult,
} from '@sentinelkey/shared-types';

const ACCESS_TOKEN_STORAGE_KEY = 'sentinelkey_hub_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'sentinelkey_hub_refresh_token';

let accessToken: string | null = (typeof sessionStorage !== 'undefined'
  ? sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  : null);

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof sessionStorage !== 'undefined') {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  return err instanceof Error ? err.message : fallback;
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getFullUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalized}` : normalized;
}

// Single-flight refresh: concurrent 401s and the auth bootstrap must share ONE
// refresh request. Sending the same refresh token twice in parallel triggers the
// server's reuse detection, which invalidates ALL sessions for the user.
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;
    try {
      const refreshRes = await fetch(getFullUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshRes.ok) return false;
      const refreshData = (await refreshRes.json()) as ApiResponse<IAuthResponse>;
      if (!refreshData.data?.accessToken) return false;
      setAccessToken(refreshData.data.accessToken);
      if (refreshData.data.refreshToken) {
        setStoredRefreshToken(refreshData.data.refreshToken);
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const currentToken = accessToken;
  const headers = new Headers(options.headers || {});

  if (currentToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(getFullUrl(url), { ...options, headers });

  // Handle automatic silent refresh on 401
  if (response.status === 401 && !isRetry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    // If the token changed while our request was in flight, retry with new token immediately
    if (accessToken && accessToken !== currentToken) {
      return request<T>(url, options, true);
    }
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(url, options, true);
    }
    setAccessToken(null);
    setStoredRefreshToken(null);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `HTTP error ${response.status}`);
  }

  return (data as ApiResponse<T>).data;
}

export const api = {
  // Auth endpoints
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async login(email: string, password: string): Promise<IAuthResponse> {
    const res = await request<IAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
      if (res.refreshToken) setStoredRefreshToken(res.refreshToken);
    }
    return res;
  },

  async register(email: string, password: string): Promise<IAuthResponse> {
    const res = await request<IAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
      if (res.refreshToken) setStoredRefreshToken(res.refreshToken);
    }
    return res;
  },

  async logout(): Promise<void> {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        await request<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      setAccessToken(null);
      setStoredRefreshToken(null);
    }
  },

  async getMe(): Promise<IUserProfile> {
    return request<IUserProfile>('/auth/me');
  },

  // Billing endpoints
  async getBillingPlans(): Promise<IBillingPlan[]> {
    return request<IBillingPlan[]>('/billing/plans');
  },

  async getSubscription(): Promise<ISubscription> {
    return request<ISubscription>('/billing/subscription');
  },

  async checkout(
    planId: string,
    details?: { phone?: string; customerName?: string },
  ): Promise<ICheckoutSessionResponse> {
    return request<ICheckoutSessionResponse>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId, ...details }),
    });
  },

  async verifyPayment(pidx: string): Promise<IVerifyPaymentResponse> {
    return request<IVerifyPaymentResponse>(`/billing/verify?pidx=${encodeURIComponent(pidx)}`);
  },

  async cancelSubscription(): Promise<ISubscription> {
    return request<ISubscription>('/billing/cancel', {
      method: 'POST',
    });
  },

  async getInvoices(params?: { type?: 'subscription' | 'usage'; domainId?: string }): Promise<IInvoice[]> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.domainId) query.set('domainId', params.domainId);
    const qs = query.toString();
    return request<IInvoice[]>(`/billing/invoices${qs ? `?${qs}` : ''}`);
  },

  async getUsageEstimate(): Promise<IAccruedOverageEstimate[]> {
    return request<IAccruedOverageEstimate[]>('/billing/usage/estimate');
  },

  async getUsageSummary(): Promise<IUsageSummaryResponse> {
    return request<IUsageSummaryResponse>('/billing/usage');
  },

  async checkoutUsageInvoice(
    invoiceId: string,
    details?: { phone?: string; customerName?: string },
  ): Promise<ICheckoutSessionResponse> {
    return request<ICheckoutSessionResponse>(`/billing/invoices/${invoiceId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(details || {}),
    });
  },

  // Client Domains & Application Registration (Phase 10)
  async listDomains(): Promise<IDomain[]> {
    return request<IDomain[]>('/domains');
  },

  async registerDomain(data: ICreateDomainRequest): Promise<ICreateDomainResponse> {
    return request<ICreateDomainResponse>('/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async rotateDomainKey(id: string): Promise<IRotateKeyResponse> {
    return request<IRotateKeyResponse>(`/domains/${id}/rotate-key`, {
      method: 'POST',
    });
  },

  async suspendDomain(id: string): Promise<IDomain> {
    return request<IDomain>(`/domains/${id}/suspend`, {
      method: 'POST',
    });
  },

  async reactivateDomain(id: string): Promise<IDomain> {
    return request<IDomain>(`/domains/${id}/reactivate`, {
      method: 'POST',
    });
  },

  async updateDomain(id: string, label: string): Promise<IDomain> {
    return request<IDomain>(`/domains/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ label }),
    });
  },

  async deleteDomain(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/domains/${id}`, {
      method: 'DELETE',
    });
  },

  async probeDomain(id: string): Promise<IDomainProbeResult> {
    return request<IDomainProbeResult>(`/domains/${id}/ping`, {
      method: 'POST',
    });
  },

  async simulateDomainTraffic(
    id: string,
    isThreat = false,
  ): Promise<{ success: boolean; domainName: string; domainUrl: string }> {
    return request<{ success: boolean; domainName: string; domainUrl: string }>(`/domains/${id}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ isThreat }),
    });
  },
};
