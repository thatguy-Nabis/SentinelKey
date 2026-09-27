import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityEvent } from '../src/models/security-event.model.js';
import { emitSecurityEvent, getSecurityEvents } from '../src/services/event-logger.service.js';

describe('Event Logger Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('emitSecurityEvent()', () => {
    it('creates security event with inferred severity and timestamp', async () => {
      const mockDoc = {
        _id: 'evt-100',
        type: 'AUTH_TOKEN_REUSE',
        ip: '10.0.0.1',
        userId: 'u-123',
        severity: 'critical',
        timestamp: new Date(),
        metadata: { email: 'victim@sentinelkey.local' },
        toJSON: function () {
          return {
            _id: 'evt-100',
            type: 'AUTH_TOKEN_REUSE',
            ip: '10.0.0.1',
            userId: 'u-123',
            severity: 'critical',
            timestamp: this.timestamp,
            metadata: this.metadata,
          };
        },
      };

      vi.spyOn(SecurityEvent, 'create').mockResolvedValue(mockDoc as any);
      vi.spyOn(SecurityEvent, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      } as any);

      const doc = await emitSecurityEvent({
        type: 'AUTH_TOKEN_REUSE',
        ip: '10.0.0.1',
        userId: 'u-123',
        metadata: { email: 'victim@sentinelkey.local' },
      });

      expect(SecurityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AUTH_TOKEN_REUSE',
          ip: '10.0.0.1',
          severity: 'critical', // automatically inferred
        }),
      );
      expect(doc).toBeDefined();
    });

    it('does not throw when database creation fails (failsafe design)', async () => {
      vi.spyOn(SecurityEvent, 'create').mockRejectedValue(new Error('DB connection failure'));

      const result = await emitSecurityEvent({
        type: 'AUTH_LOGIN_FAILED',
        ip: '10.0.0.2',
      });

      expect(result).toBeNull();
    });
  });

  describe('getSecurityEvents()', () => {
    it('returns paginated security events with applied filters', async () => {
      const mockDocs = [
        {
          _id: 'evt-1',
          type: 'AUTH_LOGIN_SUCCESS',
          ip: '192.168.1.10',
          severity: 'info',
          timestamp: new Date(),
          toJSON: () => ({ id: 'evt-1', type: 'AUTH_LOGIN_SUCCESS' }),
        },
      ];

      vi.spyOn(SecurityEvent, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockDocs),
      } as any);

      vi.spyOn(SecurityEvent, 'countDocuments').mockResolvedValue(1);

      const res = await getSecurityEvents({
        type: 'AUTH_LOGIN_SUCCESS',
        page: 1,
        limit: 25,
      });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
      expect(res.pagination.totalPages).toBe(1);
    });
  });
});
