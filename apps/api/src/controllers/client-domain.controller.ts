import type { Request, Response, NextFunction } from 'express';
import { clientDomainService } from '../services/client-domain.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import type { IRegisterDomainRequest, IDomainTelemetryPayload } from '@sentinelkey/shared-types';

export async function registerDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { name, domainUrl, environment } = req.body as IRegisterDomainRequest;
    if (!name || !domainUrl) {
      sendError(res, 400, 'INVALID_REQUEST', 'Both "name" and "domainUrl" are required.');
      return;
    }

    const domain = await clientDomainService.registerDomain(req.user.sub, {
      name,
      domainUrl,
      environment,
    });

    sendSuccess(res, domain, 201, 'Client domain successfully registered and monitored');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('limit reached')) {
      sendError(res, 403, 'LIMIT_EXCEEDED', err.message);
      return;
    }
    if (err instanceof Error && err.message.includes('already registered')) {
      sendError(res, 409, 'CONFLICT', err.message);
      return;
    }
    next(err);
  }
}

export async function listDomains(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const domains = await clientDomainService.listDomains(req.user.sub);
    sendSuccess(res, domains, 200);
  } catch (err) {
    next(err);
  }
}

export async function getDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const domain = await clientDomainService.getDomain(req.user.sub, req.params.id);
    if (!domain) {
      sendError(res, 404, 'NOT_FOUND', 'Domain not found');
      return;
    }

    sendSuccess(res, domain, 200);
  } catch (err) {
    next(err);
  }
}

export async function deleteDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const deleted = await clientDomainService.deleteDomain(req.user.sub, req.params.id);
    if (!deleted) {
      sendError(res, 404, 'NOT_FOUND', 'Domain not found or already deleted');
      return;
    }

    sendSuccess(res, { deleted: true }, 200, 'Domain registration deleted');
  } catch (err) {
    next(err);
  }
}

export async function probeDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const domain = await clientDomainService.getDomain(req.user.sub, req.params.id);
    if (!domain) {
      sendError(res, 404, 'NOT_FOUND', 'Domain not found');
      return;
    }

    const result = await clientDomainService.probeDomain(domain._id.toString());
    sendSuccess(res, result, 200, 'Health probe completed');
  } catch (err) {
    next(err);
  }
}

export async function simulateDomainTraffic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.sub) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const domain = await clientDomainService.getDomain(req.user.sub, req.params.id);
    if (!domain) {
      sendError(res, 404, 'NOT_FOUND', 'Domain not found');
      return;
    }

    const { isThreat } = req.body as { isThreat?: boolean };

    const result = await clientDomainService.ingestTelemetry({
      apiKey: domain.apiKey,
      eventType: isThreat ? 'RATE_LIMIT_EXCEEDED' : 'AUTH_LOGIN_SUCCESS',
      isThreat: !!isThreat,
      threatDetails: isThreat ? 'Simulated Brute-Force Burst / Rate Limit Exceeded' : undefined,
      path: isThreat ? '/api/v1/auth/login' : '/api/v1/data',
      method: isThreat ? 'POST' : 'GET',
      ip: isThreat ? '198.51.100.88' : '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Client-Simulator)',
    });

    sendSuccess(res, result, 200, 'Simulation telemetry ingested and recorded');
  } catch (err) {
    next(err);
  }
}

export async function ingestTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let apiKey = req.body.apiKey as string | undefined;
    if (!apiKey && req.headers.authorization?.startsWith('Bearer ')) {
      apiKey = req.headers.authorization.substring(7);
    }

    if (!apiKey) {
      sendError(res, 401, 'UNAUTHORIZED', 'API key required in Authorization header or body');
      return;
    }

    const payload: IDomainTelemetryPayload = {
      apiKey,
      eventType: req.body.eventType || 'AUTH_LOGIN_SUCCESS',
      path: req.body.path,
      method: req.body.method,
      ip: req.ip || req.body.ip,
      userAgent: req.headers['user-agent'] || req.body.userAgent,
      status: req.body.status,
      isThreat: !!req.body.isThreat,
      threatDetails: req.body.threatDetails,
    };

    const result = await clientDomainService.ingestTelemetry(payload);
    sendSuccess(res, result, 200, 'Telemetry ingested');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Invalid or inactive')) {
      sendError(res, 401, 'INVALID_API_KEY', err.message);
      return;
    }
    next(err);
  }
}
