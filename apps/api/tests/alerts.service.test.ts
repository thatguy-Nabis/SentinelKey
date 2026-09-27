import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Alert } from '../src/models/alert.model.js';
import {
  createAlert,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  registerAlertHook,
} from '../src/services/alert.service.js';
import type { IAlertCandidate } from '../src/services/heuristics.service.js';

describe('Alert Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleCandidate: IAlertCandidate = {
    title: 'Brute-force login burst detected',
    description: '10 failed attempts from IP 192.168.1.1',
    rule: 'FAILED_LOGIN_BURST',
    severity: 'critical',
    ip: '192.168.1.1',
    userId: 'user-sample-1',
    triggerEventIds: ['evt-1', 'evt-2'],
    metadata: { attemptCount: 10 },
  };

  describe('createAlert()', () => {
    it('creates and saves an alert and invokes registered hooks', async () => {
      const mockDoc = {
        _id: 'alert-123',
        ...sampleCandidate,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: function () {
          return { id: 'alert-123', ...sampleCandidate, status: 'open' };
        },
      };

      vi.spyOn(Alert, 'create').mockResolvedValue(mockDoc as any);

      let hookCalledWith: any = null;
      const unregister = registerAlertHook(alert => {
        hookCalledWith = alert;
      });

      const result = await createAlert(sampleCandidate);

      expect(Alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rule: 'FAILED_LOGIN_BURST',
          severity: 'critical',
          status: 'open',
        }),
      );
      expect(hookCalledWith).not.toBeNull();
      expect(hookCalledWith.id).toBe('alert-123');

      unregister();
    });
  });

  describe('getAlerts()', () => {
    it('returns paginated alerts with metadata', async () => {
      const mockAlerts = [
        {
          _id: 'a1',
          title: 'Alert 1',
          rule: 'FAILED_LOGIN_BURST',
          severity: 'high',
          status: 'open',
          toJSON: () => ({ id: 'a1', title: 'Alert 1' }),
        },
        {
          _id: 'a2',
          title: 'Alert 2',
          rule: 'GEO_VELOCITY_IMPOSSIBLE_TRAVEL',
          severity: 'critical',
          status: 'open',
          toJSON: () => ({ id: 'a2', title: 'Alert 2' }),
        },
      ];

      vi.spyOn(Alert, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockAlerts),
      } as any);

      vi.spyOn(Alert, 'countDocuments').mockResolvedValue(2);

      const res = await getAlerts({ page: 1, limit: 10, status: 'open' });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(res.pagination.total).toBe(2);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.totalPages).toBe(1);
    });
  });

  describe('acknowledgeAlert()', () => {
    it('acknowledges an alert and sets acknowledgedBy / acknowledgedAt', async () => {
      const mockAlert = {
        _id: 'alert-ack-1',
        status: 'open',
        acknowledgedBy: undefined,
        acknowledgedAt: undefined,
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return {
            id: 'alert-ack-1',
            status: this.status,
            acknowledgedBy: this.acknowledgedBy,
            acknowledgedAt: this.acknowledgedAt,
          };
        },
      };

      vi.spyOn(Alert, 'findById').mockResolvedValue(mockAlert as any);

      const res = await acknowledgeAlert('alert-ack-1', 'admin-user-456');

      expect(res.status).toBe('acknowledged');
      expect(res.acknowledgedBy).toBe('admin-user-456');
      expect(res.acknowledgedAt).toBeDefined();
      expect(mockAlert.save).toHaveBeenCalled();
    });

    it('throws 404 if alert is not found', async () => {
      vi.spyOn(Alert, 'findById').mockResolvedValue(null);

      await expect(acknowledgeAlert('nonexistent', 'user-1')).rejects.toThrow(
        /Alert not found/,
      );
    });
  });

  describe('resolveAlert()', () => {
    it('resolves an alert and sets resolvedAt', async () => {
      const mockAlert = {
        _id: 'alert-res-1',
        status: 'open',
        acknowledgedBy: undefined,
        resolvedAt: undefined,
        save: vi.fn().mockResolvedValue(true),
        toJSON: function () {
          return {
            id: 'alert-res-1',
            status: this.status,
            resolvedAt: this.resolvedAt,
          };
        },
      };

      vi.spyOn(Alert, 'findById').mockResolvedValue(mockAlert as any);

      const res = await resolveAlert('alert-res-1', 'analyst-1');

      expect(res.status).toBe('resolved');
      expect(res.resolvedAt).toBeDefined();
      expect(mockAlert.save).toHaveBeenCalled();
    });
  });
});
