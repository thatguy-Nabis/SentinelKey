import type { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service.js';
import { meteringService } from '../services/metering.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import type { BillingPlanId } from '@sentinelkey/shared-types';

export async function getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plans = billingService.getPlans();
    sendSuccess(res, plans, 200);
  } catch (err) {
    next(err);
  }
}

export async function getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const sub = await billingService.getSubscription(req.user.sub);
    sendSuccess(res, sub, 200);
  } catch (err) {
    next(err);
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const { planId, phone, customerName } = req.body as {
      planId?: BillingPlanId;
      phone?: string;
      customerName?: string;
    };
    if (!planId) {
      sendError(res, 400, 'INVALID_REQUEST', 'planId is required');
      return;
    }

    const session = await billingService.checkout(req.user.sub, planId, req.user.email, {
      phone,
      customerName,
    });
    sendSuccess(res, session, 200, 'Checkout session initiated');
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const pidx = req.query.pidx as string;
    if (!pidx || typeof pidx !== 'string' || pidx.trim() === '') {
      sendError(res, 400, 'INVALID_REQUEST', 'pidx query parameter is required');
      return;
    }

    const result = await billingService.verifyPayment(req.user.sub, pidx.trim());
    sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const sub = await billingService.cancelSubscription(req.user.sub);
    sendSuccess(res, sub, 200, 'Subscription cancellation scheduled at period end');
  } catch (err) {
    next(err);
  }
}

import { usageInvoicingService } from '../services/usage-invoicing.service.js';

export async function listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    // Lazy delinquency check for caller
    usageInvoicingService.checkDelinquency(req.user.sub).catch(() => {});

    const type = req.query.type as 'subscription' | 'usage' | undefined;
    const domainId = req.query.domainId as string | undefined;

    const invoices = await billingService.listInvoices(req.user.sub, { type, domainId });
    sendSuccess(res, invoices, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /billing/invoices/:id/checkout
 * Initiates checkout session specifically for a usage invoice.
 */
export async function checkoutUsageInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const invoiceId = req.params.id;
    const { phone, customerName } = req.body as { phone?: string; customerName?: string };

    const session = await billingService.checkoutUsageInvoice(req.user.sub, invoiceId, req.user.email, {
      phone,
      customerName,
    });
    sendSuccess(res, session, 200, 'Usage invoice checkout initiated');
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message?.includes('not found')) {
      sendError(res, 404, 'NOT_FOUND', error.message);
      return;
    }
    if (error.message?.includes('already paid')) {
      sendError(res, 400, 'ALREADY_PAID', error.message);
      return;
    }
    next(err);
  }
}

/**
 * GET /billing/usage/estimate
 * Returns accrued open-period overage estimates per domain.
 */
export async function getAccruedOverageEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    usageInvoicingService.checkDelinquency(req.user.sub).catch(() => {});
    const estimates = await usageInvoicingService.getAccruedOverageEstimate(req.user.sub);
    sendSuccess(res, estimates, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /billing/usage/close
 * Closes the billing period for the user and creates usage invoices.
 */
export async function closeBillingPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const { periodStart, periodEnd } = req.body as { periodStart?: string; periodEnd?: string };
    const invoices = await usageInvoicingService.closeBillingPeriodForUser(
      req.user.sub,
      periodStart ? new Date(periodStart) : undefined,
      periodEnd ? new Date(periodEnd) : undefined,
    );
    sendSuccess(res, invoices, 200, `Billing period closed. Created ${invoices.length} usage invoice(s).`);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /billing/usage
 * Returns current-period aggregated usage across all caller domains.
 */
export async function getUsageSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    usageInvoicingService.checkDelinquency(req.user.sub).catch(() => {});
    const summary = await meteringService.getUsageSummary(req.user.sub);
    sendSuccess(res, summary, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /billing/usage/domains/:id
 * Returns daily breakdown of usage for a specific domain.
 */
export async function getDomainDailyUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const domainId = req.params.id;
    const isAdmin =
      req.user.roles?.includes('admin') ||
      req.user.permissions?.includes('domains:manage') ||
      false;

    const breakdown = await meteringService.getDomainDailyUsage(domainId, req.user.sub, isAdmin);
    sendSuccess(res, breakdown, 200);
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 400) {
      sendError(res, 400, 'INVALID_DOMAIN_ID', error.message || 'Invalid domain ID');
      return;
    }
    if (error.status === 404) {
      sendError(res, 404, 'NOT_FOUND', error.message || 'Domain not found');
      return;
    }
    if (error.status === 403) {
      sendError(res, 403, 'FORBIDDEN', error.message || 'Access denied: You do not own this domain');
      return;
    }
    next(err);
  }
}

