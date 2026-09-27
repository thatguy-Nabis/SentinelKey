import { PaymentStatus } from '@sentinelkey/shared-types';
import { env } from '../config/env.js';

export interface InitiateCheckoutOptions {
  planId: string;
  amountPaisa: number;
  orderName: string;
  customer: {
    name?: string;
    email: string;
  };
  returnUrl: string;
  websiteUrl: string;
}

export interface PaymentProvider {
  initiateCheckout(opts: InitiateCheckoutOptions): Promise<{ pidx: string; url: string; orderId: string }>;
  verifyPayment(pidx: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    amountPaisa?: number;
    feePaisa?: number;
  }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export class KhaltiProvider implements PaymentProvider {
  private secretKey: string;
  private baseUrl: string;

  constructor(secretKey: string, baseUrl: string = 'https://a.khalti.com/api/v2') {
    this.secretKey = secretKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async initiateCheckout(opts: InitiateCheckoutOptions): Promise<{ pidx: string; url: string; orderId: string }> {
    const purchaseOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const response = await fetch(`${this.baseUrl}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: opts.returnUrl,
        website_url: opts.websiteUrl,
        amount: opts.amountPaisa,
        purchase_order_id: purchaseOrderId,
        purchase_order_name: opts.orderName,
        customer_info: {
          name: opts.customer.name || opts.customer.email.split('@')[0],
          email: opts.customer.email,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Khalti initiate failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { pidx: string; payment_url: string };
    return {
      pidx: data.pidx,
      url: data.payment_url,
      orderId: purchaseOrderId,
    };
  }

  async verifyPayment(pidx: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    amountPaisa?: number;
    feePaisa?: number;
  }> {
    const response = await fetch(`${this.baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Khalti lookup failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      status: string;
      transaction_id?: string;
      total_amount?: number;
      fee?: number;
    };

    let mappedStatus: PaymentStatus = 'Pending';
    if (data.status === 'Completed') mappedStatus = 'Completed';
    else if (data.status === 'Initiated') mappedStatus = 'Initiated';
    else if (data.status === 'User canceled') mappedStatus = 'User canceled';
    else if (data.status === 'Expired') mappedStatus = 'Expired';
    else if (data.status === 'Refunded') mappedStatus = 'Refunded';
    else if (data.status === 'Partially Refunded') mappedStatus = 'Partially Refunded';

    return {
      status: mappedStatus,
      transactionId: data.transaction_id,
      amountPaisa: data.total_amount,
      feePaisa: data.fee,
    };
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // Khalti epayment v2 does not enforce recurring recurring auto-debit; cancellation marks local status.
  }
}

export class MockPaymentProvider implements PaymentProvider {
  private mockStore = new Map<string, { status: PaymentStatus; amountPaisa: number }>();

  async initiateCheckout(opts: InitiateCheckoutOptions): Promise<{ pidx: string; url: string; orderId: string }> {
    const pidx = `mock_pidx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const orderId = `mock_order_${Date.now()}`;

    this.mockStore.set(pidx, {
      status: 'Completed',
      amountPaisa: opts.amountPaisa,
    });

    // Provide redirect URL that returns back to the return_url with pidx
    const url = opts.returnUrl.includes('?')
      ? `${opts.returnUrl}&pidx=${pidx}&mock=true`
      : `${opts.returnUrl}?pidx=${pidx}&mock=true`;

    return {
      pidx,
      url,
      orderId,
    };
  }

  async verifyPayment(pidx: string): Promise<{
    status: PaymentStatus;
    transactionId?: string;
    amountPaisa?: number;
  }> {
    const mock = this.mockStore.get(pidx);
    if (!mock) {
      // If not found in memory (e.g. server restart), still treat valid mock_pidx as Completed for dev convenience
      if (pidx.startsWith('mock_pidx_')) {
        return {
          status: 'Completed',
          transactionId: `mock_tx_${Date.now()}`,
          amountPaisa: 249900,
        };
      }
      return { status: 'Pending' };
    }

    return {
      status: mock.status,
      transactionId: `mock_tx_${Date.now()}`,
      amountPaisa: mock.amountPaisa,
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
