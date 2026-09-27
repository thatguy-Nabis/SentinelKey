import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { BillingService } from '../src/services/billing.service.js';
import { Subscription } from '../src/models/subscription.model.js';
import { Invoice } from '../src/models/invoice.model.js';
import { setPaymentProviderForTest, PaymentProvider } from '../src/services/payment-provider.js';

describe('Billing Service', () => {
  let billingService: BillingService;
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();
    billingService = new BillingService();
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

      const result = await billingService.checkout(mockUserId, 'pro', 'alexchen@sentinelkey.io');

      expect(mockProvider.initiateCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'pro',
          amountPaisa: 249900,
          customer: { email: 'alexchen@sentinelkey.io' },
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
