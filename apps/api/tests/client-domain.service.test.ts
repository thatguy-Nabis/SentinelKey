import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ClientDomain } from '../src/models/client-domain.model.js';
import { Subscription } from '../src/models/subscription.model.js';
import { clientDomainService } from '../src/services/client-domain.service.js';
import * as eventLogger from '../src/services/event-logger.service.js';

describe('ClientDomainService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleUserId = new mongoose.Types.ObjectId().toString();

  describe('normalizeUrl()', () => {
    it('normalizes localhost port string without protocol to http://localhost:PORT', () => {
      expect(clientDomainService.normalizeUrl('localhost:3000')).toBe('http://localhost:3000');
      expect(clientDomainService.normalizeUrl('127.0.0.1:8080/')).toBe('http://127.0.0.1:8080');
    });

    it('preserves existing protocols and trims trailing slashes', () => {
      expect(clientDomainService.normalizeUrl('https://api.myclient.io/v1/')).toBe('https://api.myclient.io');
      expect(clientDomainService.normalizeUrl('http://localhost:5173/')).toBe('http://localhost:5173');
    });
  });

  describe('registerDomain()', () => {
    it('successfully registers a client domain under free plan limit', async () => {
      vi.spyOn(Subscription, 'findOne').mockResolvedValue(null as any); // Defaults to free (limit 1)
      vi.spyOn(ClientDomain, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(ClientDomain, 'findOne').mockResolvedValue(null);

      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(sampleUserId),
        name: 'My Storefront',
        domainUrl: 'http://localhost:3000',
        environment: 'development',
        apiKey: 'sk_live_1234567890abcdef',
        status: 'active',
        healthStatus: 'unverified',
        stats: { requestsTotal: 0, threatsBlocked: 0 },
      };

      vi.spyOn(ClientDomain, 'create').mockResolvedValue(mockDomainDoc as any);
      vi.spyOn(clientDomainService, 'probeDomain').mockResolvedValue({
        reachable: true,
        statusCode: 200,
        latencyMs: 15,
        message: 'Endpoint responded with HTTP 200',
      });

      const result = await clientDomainService.registerDomain(sampleUserId, {
        name: 'My Storefront',
        domainUrl: 'http://localhost:3000',
        environment: 'development',
      });

      expect(ClientDomain.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Storefront',
          domainUrl: 'http://localhost:3000',
          environment: 'development',
        }),
      );
      expect(result.apiKey).toBe('sk_live_1234567890abcdef');
    });

    it('rejects registration when plan limit is reached', async () => {
      vi.spyOn(Subscription, 'findOne').mockResolvedValue({ planId: 'free' } as any);
      vi.spyOn(ClientDomain, 'countDocuments').mockResolvedValue(1); // Free plan allows 1

      await expect(
        clientDomainService.registerDomain(sampleUserId, {
          name: 'Second Site',
          domainUrl: 'http://localhost:8080',
        }),
      ).rejects.toThrow(/Domain registration limit reached \(1 domain on FREE plan\)/);
    });

    it('rejects registration when domain is already registered for that environment', async () => {
      vi.spyOn(Subscription, 'findOne').mockResolvedValue({ planId: 'pro' } as any); // Pro allows 5
      vi.spyOn(ClientDomain, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(ClientDomain, 'findOne').mockResolvedValue({ _id: 'existing-id' } as any);

      await expect(
        clientDomainService.registerDomain(sampleUserId, {
          name: 'Duplicate Site',
          domainUrl: 'http://localhost:3000',
          environment: 'development',
        }),
      ).rejects.toThrow(/already registered for development environment/);
    });
  });

  describe('ingestTelemetry()', () => {
    it('ingests telemetry, updates domain stats, and emits security events', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Production Portal',
        domainUrl: 'http://localhost:3000',
        apiKey: 'sk_live_test_key',
        environment: 'development',
        status: 'active',
        stats: { requestsTotal: 5, threatsBlocked: 1 },
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(ClientDomain, 'findOne').mockResolvedValue(mockDomainDoc as any);
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const result = await clientDomainService.ingestTelemetry({
        apiKey: 'sk_live_test_key',
        eventType: 'AUTH_LOGIN_SUCCESS',
        path: '/api/v1/user/profile',
        method: 'GET',
        ip: '127.0.0.1',
      });

      expect(result.success).toBe(true);
      expect(mockDomainDoc.stats.requestsTotal).toBe(6);
      expect(mockDomainDoc.save).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AUTH_LOGIN_SUCCESS',
          severity: 'info',
          metadata: expect.objectContaining({
            domainUrl: 'http://localhost:3000',
          }),
        }),
      );
    });

    it('increments threatsBlocked and marks severity high if telemetry flags a threat', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Production Portal',
        domainUrl: 'http://localhost:3000',
        apiKey: 'sk_live_test_key',
        environment: 'development',
        status: 'active',
        stats: { requestsTotal: 10, threatsBlocked: 0 },
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(ClientDomain, 'findOne').mockResolvedValue(mockDomainDoc as any);
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const result = await clientDomainService.ingestTelemetry({
        apiKey: 'sk_live_test_key',
        isThreat: true,
        threatDetails: 'SQL Injection detected in body param',
        path: '/api/v1/search',
        ip: '203.0.113.45',
      });

      expect(result.success).toBe(true);
      expect(mockDomainDoc.stats.threatsBlocked).toBe(1);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'high',
          type: 'RATE_LIMIT_EXCEEDED',
        }),
      );
    });
  });
});
