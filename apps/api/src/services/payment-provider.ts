import { PaymentStatus } from '@sentinelkey/shared-types';
import { env } from '../config/env.js';

export interface InitiateCheckoutOptions {
  planId: string;
  amountPaisa: number;
  orderName: string;
  customer: {
    name?: string;
    email: string;
    phone?: string;
  };
  returnUrl: string;
  websiteUrl: string;
}

export interface PaymentProvider {
  initiateCheckout(opts: InitiateCheckoutOptions): Promise<{
    pidx: string;
    url: string;
    orderId: string;
    expiresAt?: string;
    expiresIn?: number;
  }>;
  verifyPayment(pidx: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    amountPaisa?: number;
    feePaisa?: number;
    refunded?: boolean;
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export class KhaltiProvider implements PaymentProvider {
  private secretKey: string;
  private cleanKey: string;
  private baseUrl: string;

  constructor(secretKey: string, baseUrl?: string) {
    this.secretKey = secretKey.trim();
    // Normalize secret key: strip any duplicate 'Key ' or 'key ' prefix
    this.cleanKey = this.secretKey.replace(/^key\s+/i, '').trim();

    if (baseUrl && baseUrl.trim() !== '') {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
    } else {
      // Auto-detect environment according to Khalti guide §2:
      // Sandbox/dev keys start with 'test_secret_key_' or 'test_'
      // Production keys start with 'live_secret_key_'
      this.baseUrl = this.cleanKey.startsWith('test_')
        ? 'https://dev.khalti.com/api/v2'
        : 'https://a.khalti.com/api/v2';
    }
  }

  public getCleanKey(): string {
    return this.cleanKey;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  async initiateCheckout(opts: InitiateCheckoutOptions): Promise<{
    pidx: string;
    url: string;
    orderId: string;
    expiresAt?: string;
    expiresIn?: number;
  }> {
    const purchaseOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const customerName = opts.customer.name?.trim() || opts.customer.email.split('@')[0];
    const customerPhone = opts.customer.phone?.trim() || '9800000000'; // Default phone for sandbox/live if omitted

    const payload = {
      return_url: opts.returnUrl,
      website_url: opts.websiteUrl,
      amount: Math.round(opts.amountPaisa),
      purchase_order_id: purchaseOrderId,
      purchase_order_name: opts.orderName,
      customer_info: {
        name: customerName,
        email: opts.customer.email.trim(),
        phone: customerPhone,
      },
    };

    const response = await fetch(`${this.baseUrl}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Khalti initiate failed (${response.status})`;
      try {
        const errJson = (await response.json()) as Record<string, unknown>;
        if (errJson.detail) {
          errorMessage += `: ${typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)}`;
        } else if (errJson.error) {
          errorMessage += `: ${errJson.error}`;
        } else {
          errorMessage += `: ${JSON.stringify(errJson)}`;
        }
      } catch {
        const errorText = await response.text().catch(() => '');
        if (errorText) errorMessage += `: ${errorText.slice(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as {
      pidx: string;
      payment_url: string;
      expires_at?: string;
      expires_in?: number;
    };

    return {
      pidx: data.pidx,
      url: data.payment_url,
      orderId: purchaseOrderId,
      expiresAt: data.expires_at,
      expiresIn: data.expires_in,
    };
  }

  async verifyPayment(pidx: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    amountPaisa?: number;
    feePaisa?: number;
    refunded?: boolean;
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx: pidx.trim() }),
    });

    if (!response.ok) {
      let errorMessage = `Khalti lookup failed (${response.status})`;
      try {
        const errJson = (await response.json()) as Record<string, unknown>;
        if (errJson.detail) {
          errorMessage += `: ${typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)}`;
        } else if (errJson.error) {
          errorMessage += `: ${errJson.error}`;
        } else {
          errorMessage += `: ${JSON.stringify(errJson)}`;
        }
      } catch {
        const errorText = await response.text().catch(() => '');
        if (errorText) errorMessage += `: ${errorText.slice(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as {
      pidx?: string;
      status: string;
      transaction_id?: string;
      total_amount?: number;
      fee?: number;
      refunded?: boolean;
      customer_info?: {
        name?: string;
        email?: string;
        phone?: string;
      };
    };

    let mappedStatus: PaymentStatus = 'Pending';
    if (data.refunded === true) {
      mappedStatus = 'Refunded';
    } else if (data.status === 'Completed') {
      mappedStatus = 'Completed';
    } else if (data.status === 'Initiated') {
      mappedStatus = 'Initiated';
    } else if (data.status === 'User canceled') {
      mappedStatus = 'User canceled';
    } else if (data.status === 'Expired') {
      mappedStatus = 'Expired';
    } else if (data.status === 'Refunded') {
      mappedStatus = 'Refunded';
    } else if (data.status === 'Partially Refunded') {
      mappedStatus = 'Partially Refunded';
    }

    return {
      status: mappedStatus,
      transactionId: data.transaction_id,
      amountPaisa: data.total_amount,
      feePaisa: data.fee,
      refunded: Boolean(data.refunded),
      customerInfo: data.customer_info,
    };
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // Khalti epayment v2 does not enforce recurring auto-debit; cancellation marks local status.
  }
}

export class MockPaymentProvider implements PaymentProvider {
  private mockStore = new Map<
    string,
    {
      status: PaymentStatus;
      amountPaisa: number;
      transactionId: string;
      refunded?: boolean;
    }
  >();

  async initiateCheckout(opts: InitiateCheckoutOptions): Promise<{
    pidx: string;
    url: string;
    orderId: string;
    expiresAt?: string;
    expiresIn?: number;
  }> {
    const pidx = `mock_pidx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const orderId = `mock_order_${Date.now()}`;
    const transactionId = `mock_tx_${Date.now()}`;

    this.mockStore.set(pidx, {
      status: 'Completed',
      amountPaisa: opts.amountPaisa,
      transactionId,
      refunded: false,
    });

    // Point the customer at the local simulated Khalti wallet (dummy mobile
    // number + PIN) instead of Khalti's real hosted checkout. The wallet
    // redirects back to returnUrl with the pidx appended; verifyPayment()
    // then fulfills the order against this store entry.
    const walletUrl = new URL(`${env.WEBSITE_URL}/mock-khalti`);
    walletUrl.searchParams.set('pidx', pidx);
    walletUrl.searchParams.set('amountNpr', String(opts.amountPaisa / 100));
    walletUrl.searchParams.set('order', opts.orderName);
    walletUrl.searchParams.set('returnUrl', opts.returnUrl);

    return {
      pidx,
      url: walletUrl.toString(),
      orderId,
      expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
      expiresIn: 1800,
    };
  }

  async verifyPayment(pidx: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    amountPaisa?: number;
    feePaisa?: number;
    refunded?: boolean;
  }> {
    const mock = this.mockStore.get(pidx);
    if (!mock) {
      if (pidx.startsWith('mock_canceled_')) {
        return { status: 'User canceled', feePaisa: 0, refunded: false };
      }
      if (pidx.startsWith('mock_expired_')) {
        return { status: 'Expired', feePaisa: 0, refunded: false };
      }
      if (pidx.startsWith('mock_refunded_')) {
        return { status: 'Refunded', feePaisa: 0, refunded: true };
      }
      if (pidx.startsWith('mock_pidx_')) {
        return {
          status: 'Completed',
          transactionId: `mock_tx_${Date.now()}`,
          amountPaisa: 249900,
          feePaisa: 0,
          refunded: false,
        };
      }
      return { status: 'Pending' };
    }

    return {
      status: mock.status,
      transactionId: mock.transactionId,
      amountPaisa: mock.amountPaisa,
      feePaisa: 0,
      refunded: Boolean(mock.refunded),
    };
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // mock no-op
  }
}

let activeProvider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (activeProvider) {
    return activeProvider;
  }

  if (env.KHALTI_SECRET_KEY && env.KHALTI_SECRET_KEY.trim() !== '') {
    activeProvider = new KhaltiProvider(env.KHALTI_SECRET_KEY, env.KHALTI_BASE_URL);
  } else {
    activeProvider = new MockPaymentProvider();
  }

  return activeProvider;
}

export function setPaymentProviderForTest(provider: PaymentProvider | null): void {
  activeProvider = provider;
}
