import type { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service.js';
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
    const { planId } = req.body as { planId?: BillingPlanId };
    if (!planId) {
      sendError(res, 400, 'INVALID_REQUEST', 'planId is required');
      return;
    }

    const session = await billingService.checkout(req.user.sub, planId, req.user.email);
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
    if (!pidx) {
      sendError(res, 400, 'INVALID_REQUEST', 'pidx query parameter is required');
      return;
    }

    const result = await billingService.verifyPayment(req.user.sub, pidx);
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

export async function listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }
    const invoices = await billingService.listInvoices(req.user.sub);
    sendSuccess(res, invoices, 200);
  } catch (err) {
    next(err);
  }
}

