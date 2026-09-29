import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { Domain } from '../src/models/domain.model.js';
import { Subscription } from '../src/models/subscription.model.js';
import { Invoice } from '../src/models/invoice.model.js';
import { UsageRollup } from '../src/models/usage-rollup.model.js';
import { SecurityEvent } from '../src/models/security-event.model.js';
import { usageInvoicingService } from '../src/services/usage-invoicing.service.js';
import { billingService } from '../src/services/billing.service.js';
import { authenticateOrSiteKey } from '../src/middleware/authenticate-site-key.js';
import { setPaymentProviderForTest, MockPaymentProvider } from '../src/services/payment-provider.js';

let mongoServer: MongoMemoryServer;

function mockRes() {
  const headers: Record<string, string> = {};
  const finishCallbacks: Array<() => void> = [];
  const res: Partial<Response> & { statusCode?: number; body?: any; finishCallbacks: Array<() => void> } = {
    statusCode: 200,
    body: null,
    finishCallbacks,
    set(key: string, val: string) {
      headers[key.toLowerCase()] = val;
      return this as Response;
    },
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json(data: any) {
      this.body = data;
      return this as Response;
    },
    on(event: string, cb: () => void) {
      if (event === 'finish') finishCallbacks.push(cb);
      return this as Response;
    },
  };
  return res as Response & { statusCode?: number; body?: any; finishCallbacks: Array<() => void> };
}

describe('Sub-Phase 10c: Usage Invoicing, Khalti Payment and Suspension', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Domain.deleteMany({});
    await Subscription.deleteMany({});
    await Invoice.deleteMany({});
    await UsageRollup.deleteMany({});
    await SecurityEvent.deleteMany({});
    setPaymentProviderForTest(new MockPaymentProvider());
  });

  it('Worked example test: Pro domain with 40,000 units and 25,000 included at 4 paisa/unit produces an invoice of 60,000 paisa (NPR 600)', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const periodStart = new Date(Date.UTC(2026, 8, 1));
    const periodEnd = new Date(Date.UTC(2026, 8, 30));

    // Active Pro subscription
    await Subscription.create({
      userId: proUserId,
      planId: 'pro',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const proKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const proKeyHash = crypto.createHash('sha256').update(proKey).digest('hex');

    const domain = await Domain.create({
      userId: proUserId,
      label: 'Main Service',
      host: 'localhost',
      port: 3000,
      origin: 'localhost:3000',
      siteKeyPrefix: proKey.slice(0, 12),
      siteKeyHash: proKeyHash,
      keyCreatedAt: new Date(),
      status: 'active',
    });

    // Seed 40,000 units in the period:
    // e.g. 10,000 light (10,000 units), 5,000 standard (15,000 units), 1,500 heavy (15,000 units)
    await UsageRollup.create({
      domainId: domain._id,
      userId: proUserId,
      date: '2026-09-15',
      requestsTotal: 16500,
      requests2xx: 16500,
      requests4xx: 0,
      requests5xx: 0,
      unitsTotal: 40000,
      unitsByTier: {
        light: 10000,
        standard: 15000,
        heavy: 15000,
      },
    });

    const invoices = await usageInvoicingService.closeBillingPeriodForUser(
      proUserId.toString(),
      periodStart,
      periodEnd,
    );

    expect(invoices).toHaveLength(1);
    const inv = invoices[0];

    expect(inv.type).toBe('usage');
    expect(inv.domainId?.toString()).toBe(domain._id.toString());
    expect(inv.domainOrigin).toBe('localhost:3000');
    expect(inv.planId).toBe('pro');
    expect(inv.amountPaisa).toBe(60000); // (40,000 - 25,000) * 4 paisa = 60,000 paisa
    expect(inv.amountNpr).toBe(600); // 60,000 / 100 = NPR 600
    expect(inv.status).toBe('Pending');
    expect(inv.lineItems).toHaveLength(4);

    const totalLine = inv.lineItems?.find((l) => l.tier === 'total');
    expect(totalLine?.units).toBe(15000);
    expect(totalLine?.ratePaisa).toBe(4);
    expect(totalLine?.amountPaisa).toBe(60000);

    // Verify USAGE_INVOICE_CREATED event was emitted
    const events = await SecurityEvent.find({ type: 'USAGE_INVOICE_CREATED' });
    expect(events).toHaveLength(1);
    expect(events[0].metadata?.amountPaisa).toBe(60000);
    expect(events[0].metadata?.overageUnits).toBe(15000);
  });

  it('Period close run twice yields exactly one invoice per domain (idempotency)', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const periodStart = new Date(Date.UTC(2026, 8, 1));
    const periodEnd = new Date(Date.UTC(2026, 8, 30));

    await Subscription.create({
      userId: proUserId,
      planId: 'pro',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const domain = await Domain.create({
      userId: proUserId,
      label: 'API Service',
      host: 'localhost',
      port: 4000,
      origin: 'localhost:4000',
      siteKeyPrefix: 'sk_live_1234',
      siteKeyHash: crypto.randomBytes(32).toString('hex'),
      keyCreatedAt: new Date(),
      status: 'active',
    });

    await UsageRollup.create({
      domainId: domain._id,
      userId: proUserId,
      date: '2026-09-10',
      unitsTotal: 30000, // 5,000 overage units * 4 paisa = 20,000 paisa
      unitsByTier: { light: 30000, standard: 0, heavy: 0 },
    });

    // Run 1
    const run1 = await usageInvoicingService.closeBillingPeriodForUser(
      proUserId.toString(),
      periodStart,
      periodEnd,
    );
    expect(run1).toHaveLength(1);

    // Run 2 (duplicate close invocation)
    const run2 = await usageInvoicingService.closeBillingPeriodForUser(
      proUserId.toString(),
      periodStart,
      periodEnd,
    );
    expect(run2).toHaveLength(0);

    const totalInvoices = await Invoice.find({ domainId: domain._id, type: 'usage' });
    expect(totalInvoices).toHaveLength(1);
  });

  it('Invoice below the minimum payable amount (< 1000 paisa) is rolled forward, not created', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const periodStart = new Date(Date.UTC(2026, 8, 1));
    const periodEnd = new Date(Date.UTC(2026, 8, 30));

    await Subscription.create({
      userId: proUserId,
      planId: 'pro',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const domain = await Domain.create({
      userId: proUserId,
      label: 'Sub-Minimum Service',
      host: 'localhost',
      port: 4001,
      origin: 'localhost:4001',
      siteKeyPrefix: 'sk_live_1234',
      siteKeyHash: crypto.randomBytes(32).toString('hex'),
      keyCreatedAt: new Date(),
      status: 'active',
    });

    // 25,100 total units -> 100 overage units * 4 paisa = 400 paisa (< 1000 MINIMUM_PAYABLE_PAISA)
    await UsageRollup.create({
      domainId: domain._id,
      userId: proUserId,
      date: '2026-09-10',
      unitsTotal: 25100,
      unitsByTier: { light: 25100, standard: 0, heavy: 0 },
    });

    const invoices = await usageInvoicingService.closeBillingPeriodForUser(
      proUserId.toString(),
      periodStart,
      periodEnd,
    );

    expect(invoices).toHaveLength(0);
    const existing = await Invoice.find({ domainId: domain._id });
    expect(existing).toHaveLength(0);
  });

  it('Free plan never produces usage invoices', async () => {
    const freeUserId = new mongoose.Types.ObjectId();
    const periodStart = new Date(Date.UTC(2026, 8, 1));
    const periodEnd = new Date(Date.UTC(2026, 8, 30));

    await Subscription.create({
      userId: freeUserId,
      planId: 'free',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const domain = await Domain.create({
      userId: freeUserId,
      label: 'Free Service',
      host: 'localhost',
      port: 5000,
      origin: 'localhost:5000',
      siteKeyPrefix: 'sk_live_1234',
      siteKeyHash: crypto.randomBytes(32).toString('hex'),
      keyCreatedAt: new Date(),
      status: 'active',
    });

    await UsageRollup.create({
      domainId: domain._id,
      userId: freeUserId,
      date: '2026-09-10',
      unitsTotal: 15000,
      unitsByTier: { light: 15000, standard: 0, heavy: 0 },
    });

    const invoices = await usageInvoicingService.closeBillingPeriodForUser(
      freeUserId.toString(),
      periodStart,
      periodEnd,
    );

    expect(invoices).toHaveLength(0);
  });

  it('Usage invoice checkout & verification flow with MockPaymentProvider', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const domain = await Domain.create({
      userId: proUserId,
      label: 'Checkout Service',
      host: 'localhost',
      port: 6000,
      origin: 'localhost:6000',
      siteKeyPrefix: 'sk_live_1234',
      siteKeyHash: crypto.randomBytes(32).toString('hex'),
      keyCreatedAt: new Date(),
      status: 'active',
    });

    const invoice = await Invoice.create({
      userId: proUserId,
      type: 'usage',
      domainId: domain._id,
      domainOrigin: domain.origin,
      amountPaisa: 50000,
      amountNpr: 500,
      currency: 'NPR',
      status: 'Pending',
      planId: 'pro',
    });

    // 1. Checkout usage invoice
    const checkoutResult = await billingService.checkoutUsageInvoice(
      proUserId.toString(),
      invoice._id.toString(),
      'pro-user@sentinelkey.io',
    );

    expect(checkoutResult.pidx).toBeDefined();
    const updatedInvoice = await Invoice.findById(invoice._id);
    expect(updatedInvoice?.status).toBe('Initiated');
    expect(updatedInvoice?.khaltiPidx).toBe(checkoutResult.pidx);

    // 2. Verify payment
    const verifyResult = await billingService.verifyPayment(
      proUserId.toString(),
      checkoutResult.pidx,
    );

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.status).toBe('Completed');

    const paidInvoice = await Invoice.findById(invoice._id);
    expect(paidInvoice?.status).toBe('Completed');
    expect(paidInvoice?.transactionId).toBeDefined();
    expect(paidInvoice?.paidAt).toBeDefined();

    // 3. Repeated verification is idempotent
    const repeatVerify = await billingService.verifyPayment(
      proUserId.toString(),
      checkoutResult.pidx,
    );
    expect(repeatVerify.success).toBe(true);
    expect(repeatVerify.status).toBe('Completed');
    expect(repeatVerify.message).toContain('already verified');
  });

  it('Amount tampering at verify time is rejected for usage invoices', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const invoice = await Invoice.create({
      userId: proUserId,
      type: 'usage',
      amountPaisa: 80000,
      amountNpr: 800,
      currency: 'NPR',
      status: 'Initiated',
      planId: 'pro',
      khaltiPidx: 'pidx_tampered_test',
    });

    // Mock provider returning a tampered amount (e.g. 50000 instead of 80000)
    const mockProvider = new MockPaymentProvider();
    mockProvider.verifyPayment = async () => ({
      pidx: 'pidx_tampered_test',
      status: 'Completed',
      transactionId: 'txn_fake',
      amountPaisa: 50000, // mismatch!
    });
    setPaymentProviderForTest(mockProvider);

    const result = await billingService.verifyPayment(proUserId.toString(), 'pidx_tampered_test');
    expect(result.success).toBe(false);
    expect(result.status).toBe('Pending');
    expect(result.message).toContain('Payment amount mismatch');

    const invoiceInDb = await Invoice.findById(invoice._id);
    expect(invoiceInDb?.status).toBe('Pending');
  });

  it('Unpaid past grace -> domain suspended and calls return 402; payment -> reactivated', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const domain = await Domain.create({
      userId: proUserId,
      label: 'Delinquent Domain',
      host: 'localhost',
      port: 7000,
      origin: 'localhost:7000',
      siteKeyPrefix: rawKey.slice(0, 12),
      siteKeyHash: keyHash,
      keyCreatedAt: new Date(),
      status: 'active',
    });

    // Create overdue unpaid usage invoice (dueDate in the past)
    const overdueInvoice = await Invoice.create({
      userId: proUserId,
      type: 'usage',
      domainId: domain._id,
      domainOrigin: domain.origin,
      amountPaisa: 75000,
      amountNpr: 750,
      currency: 'NPR',
      status: 'Pending',
      dueDate: new Date(Date.now() - 24 * 3600 * 1000), // 1 day overdue
      planId: 'pro',
    });

    // 1. Run delinquency check
    const delinquencyResult = await usageInvoicingService.checkDelinquency(proUserId.toString());
    expect(delinquencyResult.suspendedDomainIds).toContain(domain._id.toString());

    // Domain should now be suspended with reason 'unpaid'
    const suspendedDomain = await Domain.findById(domain._id);
    expect(suspendedDomain?.status).toBe('suspended');
    expect(suspendedDomain?.suspensionReason).toBe('unpaid');

    // Verify DOMAIN_SUSPENDED_UNPAID event was emitted
    const suspendEvents = await SecurityEvent.find({ type: 'DOMAIN_SUSPENDED_UNPAID' });
    expect(suspendEvents).toHaveLength(1);
    expect(suspendEvents[0].metadata?.domainId).toBe(domain._id.toString());

    // 2. Call authenticateOrSiteKey with this site key -> should return 402 DOMAIN_UNPAID
    const req = {
      headers: { 'x-site-key': rawKey, origin: 'http://localhost:7000' },
      ip: '127.0.0.1',
    } as unknown as Request;
    const res = mockRes();
    let nextCalled = false;

    await authenticateOrSiteKey(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(402);
    expect(res.body?.error?.code).toBe('DOMAIN_UNPAID');

    // 3. User pays the overdue invoice
    setPaymentProviderForTest(new MockPaymentProvider());
    const checkout = await billingService.checkoutUsageInvoice(
      proUserId.toString(),
      overdueInvoice._id.toString(),
      'pro-user@sentinelkey.io',
    );
    const verifyResult = await billingService.verifyPayment(proUserId.toString(), checkout.pidx);
    expect(verifyResult.success).toBe(true);

    // 4. Domain should be automatically reactivated
    const reactivatedDomain = await Domain.findById(domain._id);
    expect(reactivatedDomain?.status).toBe('active');
    expect(reactivatedDomain?.suspensionReason).toBeUndefined();

    // Verify DOMAIN_REACTIVATED_PAYMENT event was emitted
    const reactivateEvents = await SecurityEvent.find({ type: 'DOMAIN_REACTIVATED_PAYMENT' });
    expect(reactivateEvents).toHaveLength(1);

    // 5. Subsequent site-key calls should succeed (next() called)
    const req2 = {
      headers: { 'x-site-key': rawKey, origin: 'http://localhost:7000' },
      ip: '127.0.0.1',
    } as unknown as Request;
    const res2 = mockRes();
    let nextCalled2 = false;

    await authenticateOrSiteKey(req2, res2, () => {
      nextCalled2 = true;
    });

    expect(nextCalled2).toBe(true);
    expect(res2.statusCode).toBe(200);
  });

  it('GET /billing/usage/estimate returns accurate accrued overage and isPayable flag', async () => {
    const proUserId = new mongoose.Types.ObjectId();
    const periodStart = new Date(Date.UTC(2026, 8, 1));
    const periodEnd = new Date(Date.UTC(2026, 8, 30));

    await Subscription.create({
      userId: proUserId,
      planId: 'pro',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    const domain1 = await Domain.create({
      userId: proUserId,
      label: 'Payable Domain',
      host: 'localhost',
      port: 8001,
      origin: 'localhost:8001',
      siteKeyPrefix: 'sk_live_1234',
      siteKeyHash: crypto.randomBytes(32).toString('hex'),
      keyCreatedAt: new Date(),
      status: 'active',
    });

    const domain2 = await Domain.create({
      userId: proUserId,
      label: 'Sub-threshold Domain',
      host: 'localhost',
      port: 8002,
      origin: 'localhost:8002',
      siteKeyPrefix: 'sk_live_1234',
      siteKeyHash: crypto.randomBytes(32).toString('hex'),
      keyCreatedAt: new Date(),
      status: 'active',
    });

    // domain1: 30,000 units -> 5,000 overage units * 4 paisa = 20,000 paisa (isPayable: true)
    await UsageRollup.create({
      domainId: domain1._id,
      userId: proUserId,
      date: '2026-09-12',
      unitsTotal: 30000,
      unitsByTier: { light: 30000, standard: 0, heavy: 0 },
    });

    // domain2: 25,100 units -> 100 overage units * 4 paisa = 400 paisa (isPayable: false, < 1000 paisa)
    await UsageRollup.create({
      domainId: domain2._id,
      userId: proUserId,
      date: '2026-09-12',
      unitsTotal: 25100,
      unitsByTier: { light: 25100, standard: 0, heavy: 0 },
    });

    const estimates = await usageInvoicingService.getAccruedOverageEstimate(proUserId.toString());
    expect(estimates).toHaveLength(2);

    const est1 = estimates.find((e) => e.domainId === domain1._id.toString());
    expect(est1?.totalUnits).toBe(30000);
    expect(est1?.overageUnits).toBe(5000);
    expect(est1?.accruedOveragePaisa).toBe(20000);
    expect(est1?.isPayable).toBe(true);

    const est2 = estimates.find((e) => e.domainId === domain2._id.toString());
    expect(est2?.totalUnits).toBe(25100);
    expect(est2?.overageUnits).toBe(100);
    expect(est2?.accruedOveragePaisa).toBe(400);
    expect(est2?.isPayable).toBe(false);
  });
});
