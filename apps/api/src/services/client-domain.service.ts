import mongoose from 'mongoose';
import crypto from 'node:crypto';
import {
  DomainEnvironment,
  IRegisterDomainRequest,
  IDomainProbeResult,
  IDomainTelemetryPayload,
  SecurityEventType,
  EventSeverity,
} from '@sentinelkey/shared-types';
import { ClientDomain, IClientDomainDocument } from '../models/client-domain.model.js';
import { Subscription } from '../models/subscription.model.js';
import { getMaxDomainsForPlan } from '../config/plans.js';
import { emitSecurityEvent } from './event-logger.service.js';

export class ClientDomainService {
  /**
   * Normalize input URL: trims spaces, trailing slashes, ensures valid http/https protocol.
   */
  public normalizeUrl(url: string): string {
    let trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      // Default to http for localhost/IPs, https otherwise
      if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
        trimmed = `http://${trimmed}`;
      } else {
        trimmed = `https://${trimmed}`;
      }
    }
    const parsed = new URL(trimmed);
    // Remove trailing slash for root paths
    return `${parsed.protocol}//${parsed.host}`;
  }

  /**
   * Register a new client application/website domain or localhost port.
   * Enforces billing plan limits.
   */
  async registerDomain(
    userId: string,
    data: IRegisterDomainRequest,
  ): Promise<IClientDomainDocument> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const domainUrl = this.normalizeUrl(data.domainUrl);
    const environment: DomainEnvironment = data.environment || 'development';

    // 1. Check user billing subscription limits
    const sub = await Subscription.findOne({ userId: userObjectId });
    const planId = sub?.planId || 'free';
    const maxAllowed = getMaxDomainsForPlan(planId);

    const existingCount = await ClientDomain.countDocuments({
      userId: userObjectId,
      status: { $ne: 'revoked' },
    });

    if (existingCount >= maxAllowed) {
      throw new Error(
        `Domain registration limit reached (${maxAllowed} domain${maxAllowed === 1 ? '' : 's'} on ${planId.toUpperCase()} plan). Upgrade your plan in Billing to protect more websites/ports.`,
      );
    }

    // 2. Check duplicate domain in same environment
    const duplicate = await ClientDomain.findOne({
      userId: userObjectId,
      domainUrl,
      environment,
      status: { $ne: 'revoked' },
    });

    if (duplicate) {
      throw new Error(`Domain "${domainUrl}" is already registered for ${environment} environment.`);
    }

    // 3. Generate client API key (sk_live_...)
    const apiKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;

    // 4. Create record
    const clientDomain = await ClientDomain.create({
      userId: userObjectId,
      name: data.name.trim(),
      domainUrl,
      environment,
      apiKey,
      status: 'active',
      healthStatus: 'unverified',
      stats: {
        requestsTotal: 0,
        threatsBlocked: 0,
      },
    });

    // 5. Asynchronously probe domain health
    this.probeDomain(clientDomain._id.toString()).catch(() => {
      // Non-blocking initial probe
    });

    return clientDomain;
  }

  /**
   * List all domains registered by a user.
   */
  async listDomains(userId: string): Promise<IClientDomainDocument[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return ClientDomain.find({ userId: userObjectId, status: { $ne: 'revoked' } }).sort({
      createdAt: -1,
    });
  }

  /**
   * Get domain by ID.
   */
  async getDomain(userId: string, domainId: string): Promise<IClientDomainDocument | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return ClientDomain.findOne({ _id: domainId, userId: userObjectId });
  }

  /**
   * Delete / revoke domain.
   */
  async deleteDomain(userId: string, domainId: string): Promise<boolean> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const result = await ClientDomain.findOneAndDelete({ _id: domainId, userId: userObjectId });
    return !!result;
  }

  /**
   * Probe domain health (HTTP ping to localhost or remote URL).
   */
  async probeDomain(domainId: string): Promise<IDomainProbeResult> {
    const domain = await ClientDomain.findById(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    const startTime = Date.now();
    try {
      // Attempt HTTP request with 3-second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(domain.domainUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SentinelKey-HealthProbe/1.0',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const latencyMs = Date.now() - startTime;
      domain.healthStatus = response.ok || response.status < 500 ? 'healthy' : 'degraded';
      domain.lastPingAt = new Date();
      await domain.save();

      return {
        reachable: true,
        statusCode: response.status,
        latencyMs,
        message: `Endpoint responded with HTTP ${response.status} in ${latencyMs}ms`,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      domain.healthStatus = 'offline';
      domain.lastPingAt = new Date();
      await domain.save();

      return {
        reachable: false,
        latencyMs,
        message: `Connection failed to ${domain.domainUrl}: ${errorMsg}`,
      };
    }
  }

  /**
   * Ingest real telemetry from client website/localhost application.
   */
  async ingestTelemetry(payload: IDomainTelemetryPayload): Promise<{
    success: boolean;
    domainName: string;
    domainUrl: string;
    eventSeverity: EventSeverity;
  }> {
    if (!payload.apiKey) {
      throw new Error('Missing apiKey in telemetry payload');
    }

    const domain = await ClientDomain.findOne({ apiKey: payload.apiKey, status: 'active' });
    if (!domain) {
      throw new Error('Invalid or inactive domain API key');
    }

    domain.stats.requestsTotal += 1;
    if (payload.isThreat) {
      domain.stats.threatsBlocked += 1;
    }
    domain.stats.lastEventAt = new Date();
    domain.healthStatus = 'healthy';
    domain.lastPingAt = new Date();
    await domain.save();

    // Emit live security event into SentinelKey
    const eventType: SecurityEventType = payload.isThreat
      ? 'RATE_LIMIT_EXCEEDED'
      : (payload.eventType as SecurityEventType) || 'AUTH_LOGIN_SUCCESS';

    const severity: EventSeverity = payload.isThreat ? 'high' : 'info';

    await emitSecurityEvent({
      type: eventType,
      ip: payload.ip || '127.0.0.1',
      severity,
      metadata: {
        domainId: domain._id.toString(),
        domainUrl: domain.domainUrl,
        domainName: domain.name,
        environment: domain.environment,
        path: payload.path || '/',
        method: payload.method || 'GET',
        userAgent: payload.userAgent || 'Client-Application',
        status: payload.status || 200,
        threatDetails: payload.threatDetails,
      },
    });

    return {
      success: true,
      domainName: domain.name,
      domainUrl: domain.domainUrl,
      eventSeverity: severity,
    };
  }
}

export const clientDomainService = new ClientDomainService();
