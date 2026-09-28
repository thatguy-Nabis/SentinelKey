import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { BillingService } from '../src/services/billing.service.js';
import { Subscription } from '../src/models/subscription.model.js';
import { Invoice } from '../src/models/invoice.model.js';
import {
  setPaymentProviderForTest,
  PaymentProvider,
  KhaltiProvider,
  MockPaymentProvider,
} from '../src/services/payment-provider.js';

describe('Billing Service & Khalti Integration', () => {
  let billingService: BillingService;
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();
    billingService = new BillingService();
  });

  describe('KhaltiProvider Unit Tests', () => {
    it('normalizes secret key and auto-detects sandbox baseUrl for test keys', () => {
      const provider1 = new KhaltiProvider('test_secret_key_abc123');
      expect(provider1.getBaseUrl()).toBe('https://dev.khalti.com/api/v2');
      expect(provider1.getCleanKey()).toBe('test_secret_key_abc123');

      // Key prefix with "Key " or "key "
      const provider2 = new KhaltiProvider('Key live_secret_key_xyz987');
      expect(provider2.getBaseUrl()).toBe('https://a.khalti.com/api/v2');
      expect(provider2.getCleanKey()).toBe('live_secret_key_xyz987');

      // Explicit baseUrl override
      const provider3 = new KhaltiProvider('live_key', 'https://custom-khalti.dev/api/v2/');
      expect(provider3.getBaseUrl()).toBe('https://custom-khalti.dev/api/v2');
    });

    it('initiateCheckout sends correct payload in Paisa with phone and headers', async () => {
      const provider = new KhaltiProvider('test_secret_key_123');
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          pidx: 'HT6o6PEZRWFJ5ygavzHWd5',
          payment_url: 'https://test-pay.khalti.com/?pidx=HT6o6PEZRWFJ5ygavzHWd5',
          expires_at: '2026-09-27T10:45:00.000000Z',
          expires_in: 1800,
        }),
      });
      globalThis.fetch = fetchMock;

      const result = await provider.initiateCheckout({
        planId: 'pro',
        amountPaisa: 249900,
        orderName: 'SentinelKey Pro — Monthly',
        customer: {
          email: 'developer@sentinelkey.io',
          name: 'Alex Chen',
          phone: '9841000000',
        },
        returnUrl: 'http://localhost:5174/app/billing',
        websiteUrl: 'http://localhost:5174',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://dev.khalti.com/api/v2/epayment/initiate/',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Key test_secret_key_123',
            'Content-Type': 'application/json',
          },
        }),
      );

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.amount).toBe(249900);
      expect(requestBody.customer_info.phone).toBe('9841000000');
      expect(requestBody.customer_info.name).toBe('Alex Chen');
      expect(requestBody.customer_info.email).toBe('developer@sentinelkey.io');
      expect(requestBody.purchase_order_name).toBe('SentinelKey Pro — Monthly');
      expect(result.pidx).toBe('HT6o6PEZRWFJ5ygavzHWd5');
      expect(result.url).toBe('https://test-pay.khalti.com/?pidx=HT6o6PEZRWFJ5ygavzHWd5');
    });

    it('verifyPayment maps Khalti lookup status correctly', async () => {
      const provider = new KhaltiProvider('test_secret_key_123');

      // Completed payment
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          pidx: 'pidx_completed',
          total_amount: 249900,
          status: 'Completed',
          transaction_id: 'txn_khalti_111',
          fee: 0,
          refunded: false,
        }),
      });

      const resCompleted = await provider.verifyPayment('pidx_completed');
      expect(resCompleted.status).toBe('Completed');
      expect(resCompleted.amountPaisa).toBe(249900);
      expect(resCompleted.transactionId).toBe('txn_khalti_111');

      // Refunded payment
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          pidx: 'pidx_refunded',
          total_amount: 249900,
          status: 'Completed',
          refunded: true,
        }),
      });

      const resRefunded = await provider.verifyPayment('pidx_refunded');
      expect(resRefunded.status).toBe('Refunded');

      // User canceled
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          pidx: 'pidx_canceled',
          status: 'User canceled',
        }),
      });

      const resCanceled = await provider.verifyPayment('pidx_canceled');
      expect(resCanceled.status).toBe('User canceled');
    });

    it('handles Khalti non-200 error responses with informative messages', async () => {
      const provider = new KhaltiProvider('test_secret_key_123');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid purchase_order_id' }),
      });

      await expect(
        provider.initiateCheckout({
          planId: 'pro',
          amountPaisa: 249900,
          orderName: 'Pro Plan',
          customer: { email: 'user@example.com' },
          returnUrl: 'http://localhost:5174/app/billing',
          websiteUrl: 'http://localhost:5174',
        }),
      ).rejects.toThrow('Khalti initiate failed (400): Invalid purchase_order_id');
    });
  });

  describe('MockPaymentProvider Unit Tests', () => {
    it('initiates and verifies simulated checkout flow', async () => {
      const mockProvider = new MockPaymentProvider();
      const initiated = await mockProvider.initiateCheckout({
        planId: 'pro',
        amountPaisa: 249900,
        orderName: 'Pro',
        customer: { email: 'test@example.com' },
        returnUrl: 'http://localhost:5174/app/billing',
        websiteUrl: 'http://localhost:5174',
      });

      expect(initiated.pidx).toContain('mock_pidx_');
      expect(initiated.url).toContain('pidx=');

      const verified = await mockProvider.verifyPayment(initiated.pidx);
      expect(verified.status).toBe('Completed');
      expect(verified.amountPaisa).toBe(249900);
      expect(verified.transactionId).toBeDefined();
    });
  });

  describe('getPlans()', () => {
    it('returns all defined plans including free, pro, enterprise', () => {
      const plans = billingService.getPlans();
      expect(plans).toHaveLength(3);
      const planIds = plans.map(p => p.id);
      expect(planIds).toContain('free');
      expect(planIds).toContain('pro');
      expect(planIds).toContain('enterprise');

      const proPlan = plans.find(p => p.id === 'pro');
      expect(proPlan?.priceNpr).toBe(2499);
      expect(proPlan?.currency).toBe('NPR');
      expect(proPlan?.features.length).toBeGreaterThan(0);
    });
  });

  describe('getSubscription()', () => {
    it('returns existing subscription if found', async () => {
      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'pro',
        status: 'active',
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.getSubscription(mockUserId);
      expect(result.planId).toBe('pro');
      expect(result.status).toBe('active');
    });

    it('creates and returns default free subscription if none exists', async () => {
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(null);
      const createdSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'free',
        status: 'active',
        cancelAtPeriodEnd: false,
      };
      vi.spyOn(Subscription, 'create').mockResolvedValue(createdSub as any);

      const result = await billingService.getSubscription(mockUserId);
      expect(result.planId).toBe('free');
      expect(result.status).toBe('active');
      expect(Subscription.create).toHaveBeenCalled();
    });
  });

  describe('checkout()', () => {
    it('handles free plan upgrade without external provider', async () => {
      const mockSub = {
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'pro',
        status: 'active',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.checkout(mockUserId, 'free', 'test@sentinelkey.io');
      expect(result.pidx).toBe('free');
      expect(mockSub.planId).toBe('free');
      expect(mockSub.save).toHaveBeenCalled();
    });

    it('initiates paid plan checkout via provider and records invoice', async () => {
      const mockProvider: PaymentProvider = {
        initiateCheckout: vi.fn().mockResolvedValue({
          pidx: 'khalti_pidx_123',
          url: 'https://test-pay.khalti.com/?pidx=khalti_pidx_123',
          orderId: 'order_123',
        }),
        verifyPayment: vi.fn(),
        cancelSubscription: vi.fn(),
      };
      setPaymentProviderForTest(mockProvider);

      vi.spyOn(Invoice, 'create').mockResolvedValue({} as any);
      vi.spyOn(Subscription, 'findOneAndUpdate').mockResolvedValue({} as any);

      const result = await billingService.checkout(
        mockUserId,
        'pro',
        'alexchen@sentinelkey.io',
        { phone: '9841234567', customerName: 'Alex' },
      );

      expect(mockProvider.initiateCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'pro',
          amountPaisa: 249900,
          customer: {
            email: 'alexchen@sentinelkey.io',
            phone: '9841234567',
            name: 'Alex',
          },
        }),
      );
      expect(Invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'pro',
          amountNpr: 2499,
          amountPaisa: 249900,
          status: 'Initiated',
          khaltiPidx: 'khalti_pidx_123',
        }),
      );
      expect(result.pidx).toBe('khalti_pidx_123');
    });

    it('throws error for invalid planId', async () => {
      await expect(
        billingService.checkout(mockUserId, 'invalid_plan' as any, 'test@sentinelkey.io'),
      ).rejects.toThrow('Invalid plan ID');
    });
  });

  describe('verifyPayment()', () => {
    it('activates subscription and marks invoice Completed when payment succeeds', async () => {
      const mockProvider: PaymentProvider = {
        initiateCheckout: vi.fn(),
        verifyPayment: vi.fn().mockResolvedValue({
          status: 'Completed',
          transactionId: 'txn_98765',
          amountPaisa: 249900,
        }),
        cancelSubscription: vi.fn(),
      };
      setPaymentProviderForTest(mockProvider);

      const mockInvoice = {
        planId: 'pro',
        amountPaisa: 249900,
        status: 'Initiated',
        transactionId: undefined as string | undefined,
        paidAt: undefined as Date | undefined,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Invoice, 'findOne').mockResolvedValue(mockInvoice as any);

      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'free',
        status: 'active',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.verifyPayment(mockUserId, 'pidx_123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('Completed');
      expect(result.subscription.planId).toBe('pro');
      expect(mockInvoice.status).toBe('Completed');
      expect(mockInvoice.transactionId).toBe('txn_98765');
      expect(mockSub.save).toHaveBeenCalled();
      expect(mockInvoice.save).toHaveBeenCalled();
    });

    it('enforces idempotency when payment was already Completed', async () => {
      const mockProvider: PaymentProvider = {
        initiateCheckout: vi.fn(),
        verifyPayment: vi.fn(),
        cancelSubscription: vi.fn(),
      };
      setPaymentProviderForTest(mockProvider);

      const mockInvoice = {
        planId: 'pro',
        amountPaisa: 249900,
        status: 'Completed',
        transactionId: 'existing_txn_123',
        paidAt: new Date('2026-09-01'),
        save: vi.fn(),
      };
      vi.spyOn(Invoice, 'findOne').mockResolvedValue(mockInvoice as any);

      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'pro',
        status: 'active',
        save: vi.fn(),
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.verifyPayment(mockUserId, 'pidx_123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('Completed');
      expect(result.message).toContain('already verified');
      // Should NOT call provider or re-save
      expect(mockProvider.verifyPayment).not.toHaveBeenCalled();
      expect(mockInvoice.save).not.toHaveBeenCalled();
      expect(mockSub.save).not.toHaveBeenCalled();
    });

    it('rejects fulfillment when payment amount does not match invoice', async () => {
      const mockProvider: PaymentProvider = {
        initiateCheckout: vi.fn(),
        verifyPayment: vi.fn().mockResolvedValue({
          status: 'Completed',
          transactionId: 'txn_fake_amount',
          amountPaisa: 5000, // Returned 50 NPR instead of expected 2499 NPR
        }),
        cancelSubscription: vi.fn(),
      };
      setPaymentProviderForTest(mockProvider);

      const mockInvoice = {
        planId: 'pro',
        amountPaisa: 249900,
        status: 'Initiated',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Invoice, 'findOne').mockResolvedValue(mockInvoice as any);

      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'free',
        status: 'active',
        save: vi.fn(),
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.verifyPayment(mockUserId, 'pidx_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Payment amount mismatch');
      expect(mockSub.save).not.toHaveBeenCalled();
    });

    it('handles non-completed status properly', async () => {
      const mockProvider: PaymentProvider = {
        initiateCheckout: vi.fn(),
        verifyPayment: vi.fn().mockResolvedValue({
          status: 'User canceled',
        }),
        cancelSubscription: vi.fn(),
      };
      setPaymentProviderForTest(mockProvider);

      const mockInvoice = {
        status: 'Initiated',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Invoice, 'findOne').mockResolvedValue(mockInvoice as any);

      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'free',
        status: 'active',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.verifyPayment(mockUserId, 'pidx_123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('User canceled');
      expect(mockInvoice.status).toBe('User canceled');
    });
  });

  describe('cancelSubscription()', () => {
    it('schedules cancellation at period end', async () => {
      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        planId: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(mockSub as any);

      const result = await billingService.cancelSubscription(mockUserId);
      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(mockSub.save).toHaveBeenCalled();
    });
  });

  describe('listInvoices()', () => {
    it('queries and returns invoices for user sorted by createdAt descending', async () => {
      const mockInvoices = [
        { id: 'inv-1', amountNpr: 2499, status: 'Completed' },
      ];
      const sortFn = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(mockInvoices) });
      vi.spyOn(Invoice, 'find').mockReturnValue({ sort: sortFn } as any);

      const result = await billingService.listInvoices(mockUserId);
      expect(result).toEqual(mockInvoices);
      expect(Invoice.find).toHaveBeenCalledWith({ userId: expect.any(mongoose.Types.ObjectId) });
    });
  });
});
