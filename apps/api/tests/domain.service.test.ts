import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Domain } from '../src/models/domain.model.js';
import { DomainService, generateSiteKey } from '../src/services/domain.service.js';
import { validateDomainRegistration, normalizeOrigin } from '../src/config/domains.js';
import * as eventLogger from '../src/services/event-logger.service.js';

describe('DomainService & Domain Config (Phase 10a)', () => {
  let service: DomainService;
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new DomainService();
  });

  describe('Validation & Origin Normalization', () => {
    it('accepts localhost, 127.0.0.1, and [::1]', () => {
      const v1 = validateDomainRegistration({ label: 'Site 1', host: 'localhost', port: 3000 });
      expect(v1.valid).toBe(true);
      expect(v1.normalizedOrigin).toBe('localhost:3000');

      const v2 = validateDomainRegistration({ label: 'Site 2', host: '127.0.0.1', port: 8080 });
      expect(v2.valid).toBe(true);
      expect(v2.normalizedOrigin).toBe('127.0.0.1:8080');

      const v3 = validateDomainRegistration({ label: 'Site 3', host: '[::1]', port: 9000 });
      expect(v3.valid).toBe(true);
      expect(v3.normalizedOrigin).toBe('[::1]:9000');
    });

    it('rejects external or unapproved hosts like example.com or 192.168.1.5', () => {
      const v1 = validateDomainRegistration({ label: 'Ext', host: 'example.com', port: 3000 });
      expect(v1.valid).toBe(false);
      expect(v1.error).toContain('Allowed hosts are');

      const v2 = validateDomainRegistration({ label: 'LAN', host: '192.168.1.5', port: 3000 });
      expect(v2.valid).toBe(false);
      expect(v2.error).toContain('Allowed hosts are');
    });

    it('rejects reserved ports (4000, 5001, 5173, 5174)', () => {
      const reserved = [4000, 5001, 5173, 5174];
      for (const port of reserved) {
        const v = validateDomainRegistration({ label: 'App', host: 'localhost', port });
        expect(v.valid).toBe(false);
        expect(v.error).toContain('reserved by SentinelKey');
      }
    });

    it('rejects invalid port numbers (< 1 or > 65535 or not integer)', () => {
      expect(validateDomainRegistration({ label: 'App', host: 'localhost', port: 0 }).valid).toBe(false);
      expect(validateDomainRegistration({ label: 'App', host: 'localhost', port: 70000 }).valid).toBe(false);
      expect(validateDomainRegistration({ label: 'App', host: 'localhost', port: 3000.5 }).valid).toBe(false);
    });

    it('normalizes origin correctly to lowercase host:port', () => {
      expect(normalizeOrigin('LOCALHOST', 8080)).toBe('localhost:8080');
      expect(normalizeOrigin(' 127.0.0.1 ', 9000)).toBe('127.0.0.1:9000');
    });
  });

  describe('generateSiteKey()', () => {
    it('generates high entropy keys with sk_live_ prefix and matching sha256 hash', () => {
      const { key, hash, prefix } = generateSiteKey();
      expect(key.startsWith('sk_live_')).toBe(true);
      expect(key.length).toBeGreaterThan(40);
      expect(prefix.startsWith('sk_live_')).toBe(true);
      expect(prefix.endsWith('...')).toBe(true);
      expect(hash).toHaveLength(64); // SHA-256 hex is 64 characters
    });
  });

  describe('createDomain()', () => {
    it('successfully registers domain for free user under limit', async () => {
      vi.spyOn(service['billingService'], 'getSubscription').mockResolvedValue({
        planId: 'free',
      } as any);
      vi.spyOn(Domain, 'findOne').mockResolvedValue(null);
      vi.spyOn(Domain, 'countDocuments').mockResolvedValue(0);

      const fakeDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        label: 'My Local Test App',
        host: 'localhost',
        port: 3000,
        origin: 'localhost:3000',
        status: 'active',
        siteKeyPrefix: 'sk_live_1234...',
        toJSON: () => ({
          id: 'fake-id',
          label: 'My Local Test App',
          origin: 'localhost:3000',
          status: 'active',
          siteKeyPrefix: 'sk_live_1234...',
        }),
      };
      vi.spyOn(Domain, 'create').mockResolvedValue(fakeDoc as any);
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const result = await service.createDomain(mockUserId, {
        label: 'My Local Test App',
        host: 'localhost',
        port: 3000,
      });

      expect(result.domain).toBeDefined();
      expect(result.siteKey).toMatch(/^sk_live_[a-f0-9]{64}$/);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOMAIN_REGISTERED',
          userId: mockUserId,
        }),
      );
    });

    it('rejects duplicate origin if non-deleted domain exists with same origin', async () => {
      vi.spyOn(Domain, 'findOne').mockResolvedValue({ _id: 'existing-id' } as any);

      await expect(
        service.createDomain(mockUserId, {
          label: 'Duplicate',
          host: 'localhost',
          port: 3000,
        }),
      ).rejects.toThrow(/already registered/);
    });

    it('rejects 2nd domain for Free plan (max 1)', async () => {
      vi.spyOn(service['billingService'], 'getSubscription').mockResolvedValue({
        planId: 'free',
      } as any);
      vi.spyOn(Domain, 'findOne').mockResolvedValue(null);
      vi.spyOn(Domain, 'countDocuments').mockResolvedValue(1); // Already has 1

      await expect(
        service.createDomain(mockUserId, {
          label: 'Second App',
          host: 'localhost',
          port: 3001,
        }),
      ).rejects.toThrow(/Active domain limit of 1 reached for .* plan/);
    });

    it('rejects 6th domain for Pro plan (max 5)', async () => {
      vi.spyOn(service['billingService'], 'getSubscription').mockResolvedValue({
        planId: 'pro',
      } as any);
      vi.spyOn(Domain, 'findOne').mockResolvedValue(null);
      vi.spyOn(Domain, 'countDocuments').mockResolvedValue(5); // Already has 5

      await expect(
        service.createDomain(mockUserId, {
          label: 'Sixth App',
          host: 'localhost',
          port: 3006,
        }),
      ).rejects.toThrow(/Active domain limit of 5 reached for .* plan/);
    });
  });

  describe('rotateKey()', () => {
    it('generates new key and updates hash and keyRotatedAt', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        origin: 'localhost:3000',
        siteKeyPrefix: 'old_prefix',
        siteKeyHash: 'old_hash',
        keyRotatedAt: undefined,
        status: 'active',
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return {
            id: this._id.toString(),
            origin: this.origin,
            siteKeyPrefix: this.siteKeyPrefix,
            status: this.status,
          };
        },
      };

      vi.spyOn(Domain, 'findById').mockResolvedValue(mockDomainDoc as any);
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const result = await service.rotateKey(mockDomainDoc._id.toString(), mockUserId);

      expect(result.siteKey).toMatch(/^sk_live_[a-f0-9]{64}$/);
      expect(mockDomainDoc.save).toHaveBeenCalled();
      expect(mockDomainDoc.siteKeyHash).not.toBe('old_hash');
      expect(mockDomainDoc.keyRotatedAt).toBeInstanceOf(Date);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOMAIN_KEY_ROTATED',
          userId: mockUserId,
        }),
      );
    });
  });

  describe('suspendDomain() and reactivateDomain()', () => {
    it('suspends an active domain with specified reason and logs event', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        origin: 'localhost:3000',
        status: 'active',
        suspensionReason: undefined,
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return { id: this._id.toString(), status: this.status, suspensionReason: this.suspensionReason };
        },
      };

      vi.spyOn(Domain, 'findById').mockResolvedValue(mockDomainDoc as any);
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const suspended = await service.suspendDomain(mockDomainDoc._id.toString(), mockUserId, 'quota_exceeded');

      expect(suspended.status).toBe('suspended');
      expect(suspended.suspensionReason).toBe('quota_exceeded');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOMAIN_SUSPENDED',
          userId: mockUserId,
        }),
      );
    });

    it('reactivates a suspended domain if within plan limits', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        origin: 'localhost:3000',
        status: 'suspended',
        suspensionReason: 'manual',
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return { id: this._id.toString(), status: this.status, suspensionReason: this.suspensionReason };
        },
      };

      vi.spyOn(Domain, 'findById').mockResolvedValue(mockDomainDoc as any);
      vi.spyOn(service['billingService'], 'getSubscription').mockResolvedValue({ planId: 'free' } as any);
      vi.spyOn(Domain, 'countDocuments').mockResolvedValue(0); // 0 other active domains
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const reactivated = await service.reactivateDomain(mockDomainDoc._id.toString(), mockUserId);

      expect(reactivated.status).toBe('active');
      expect(reactivated.suspensionReason).toBeUndefined();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOMAIN_REACTIVATED',
          userId: mockUserId,
        }),
      );
    });

    it('rejects reactivation if active domain limit is reached', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        origin: 'localhost:3000',
        status: 'suspended',
      };

      vi.spyOn(Domain, 'findById').mockResolvedValue(mockDomainDoc as any);
      vi.spyOn(service['billingService'], 'getSubscription').mockResolvedValue({ planId: 'free' } as any);
      vi.spyOn(Domain, 'countDocuments').mockResolvedValue(1); // Already 1 active domain on free plan

      await expect(
        service.reactivateDomain(mockDomainDoc._id.toString(), mockUserId),
      ).rejects.toThrow(/Plan limit of 1 active domains reached/);
    });
  });

  describe('deleteDomain()', () => {
    it('soft deletes domain (status -> deleted) and logs event', async () => {
      const mockDomainDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        origin: 'localhost:3000',
        status: 'active',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Domain, 'findById').mockResolvedValue(mockDomainDoc as any);
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      const result = await service.deleteDomain(mockDomainDoc._id.toString(), mockUserId);

      expect(result.success).toBe(true);
      expect(mockDomainDoc.status).toBe('deleted');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOMAIN_DELETED',
          userId: mockUserId,
        }),
      );
    });
  });

  describe('keepDomainsOnDowngrade()', () => {
    it('keeps selected domain active and suspends remainder with plan_limit reason', async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();

      const doc1 = {
        _id: id1,
        origin: 'localhost:3001',
        status: 'active',
        suspensionReason: undefined,
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({ id: id1.toString(), status: 'active' }),
      };

      const doc2 = {
        _id: id2,
        origin: 'localhost:3002',
        status: 'active',
        suspensionReason: undefined,
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({ id: id2.toString(), status: 'suspended', suspensionReason: 'plan_limit' }),
      };

      vi.spyOn(Domain, 'find').mockResolvedValue([doc1, doc2] as any);

      const updated = await service.keepDomainsOnDowngrade(mockUserId, [id1.toString()], 'free');

      expect(doc1.status).toBe('active');
      expect(doc2.status).toBe('suspended');
      expect(doc2.suspensionReason).toBe('plan_limit');
      expect(updated).toHaveLength(2);
    });

    it('rejects if user tries to keep more domains than allowed on target plan', async () => {
      await expect(
        service.keepDomainsOnDowngrade(mockUserId, ['id1', 'id2'], 'free'),
      ).rejects.toThrow(/You can only keep up to 1 active domains on the free plan/);
    });
  });
});
