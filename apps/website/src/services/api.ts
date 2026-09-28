import type {
  IUserProfile,
  IAuthResponse,
  IBillingPlan,
  ISubscription,
  IInvoice,
  ICheckoutSessionResponse,
  IVerifyPaymentResponse,
  ApiResponse,
  IClientDomain,
  IRegisterDomainRequest,
  IDomainProbeResult,
} from '@sentinelkey/shared-types';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('sentinelkey_hub_refresh_token');
}

export function setStoredRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem('sentinelkey_hub_refresh_token', token);
  } else {
    localStorage.removeItem('sentinelkey_hub_refresh_token');
  }
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  return err instanceof Error ? err.message : fallback;
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
      const refreshRes = await fetch('/auth/refresh', {
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

  async getInvoices(): Promise<IInvoice[]> {
    return request<IInvoice[]>('/billing/invoices');
  },

  // Client Domains & Application Registration
  async listDomains(): Promise<IClientDomain[]> {
    return request<IClientDomain[]>('/domains');
  },

  async registerDomain(data: IRegisterDomainRequest): Promise<IClientDomain> {
    return request<IClientDomain>('/domains', {
      method: 'POST',
      body: JSON.stringify(data),
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
