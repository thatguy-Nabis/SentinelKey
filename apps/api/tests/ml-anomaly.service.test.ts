import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MlAnomalyService } from '../src/services/ml-anomaly.service.js';
import * as alertService from '../src/services/alert.service.js';
import { SecurityEvent } from '../src/models/security-event.model.js';
import type { ISecurityEvent } from '@sentinelkey/shared-types';

describe('MlAnomalyService', () => {
  let service: MlAnomalyService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new MlAnomalyService();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockEvent: ISecurityEvent = {
    _id: 'event-ml-001',
    type: 'AUTH_LOGIN_FAILED',
    ip: '198.51.100.22',
    userId: 'user-victim',
    severity: 'medium',
    timestamp: new Date().toISOString(),
    metadata: {
      location: { latitude: 40.71, longitude: -74.00, city: 'New York' },
    },
  };

  describe('checkHealth()', () => {
    it('returns available: true and model metadata when ML service responds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          service: 'ml-service',
          model_version: 'v1.0.0',
          false_positive_rate: 0.002,
        }),
      } as any);

      const health = await service.checkHealth();
      expect(health.available).toBe(true);
      expect(health.modelVersion).toBe('v1.0.0');
      expect(health.fpr).toBe(0.002);
    });

    it('returns available: false when ML service is down or network fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const health = await service.checkHealth();
      expect(health.available).toBe(false);
    });
  });

  describe('evaluateEvent()', () => {
    it('dispatches an alert with rule ML_ANOMALY_DETECTION when anomaly is detected', async () => {
      vi.spyOn(SecurityEvent, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_anomaly: true,
          anomaly_score: 0.88,
          severity: 'high',
          confidence: 0.94,
          model_version: 'v1.0.0',
          contributing_features: ['failed_login_ratio_1h', 'event_burst_5m'],
          timestamp: new Date().toISOString(),
          features: [0.5, 0.0, 0.0, 0.9, 30.0, 0.0, 0.0, 1.0],
        }),
      } as any);

      const createAlertSpy = vi.spyOn(alertService, 'createAlert').mockResolvedValue({
        _id: 'alert-ml-123',
      } as any);

      const result = await service.evaluateEvent(mockEvent);

      expect(result.available).toBe(true);
      expect(result.alertId).toBe('alert-ml-123');
      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rule: 'ML_ANOMALY_DETECTION',
          severity: 'high',
          userId: 'user-victim',
          ip: '198.51.100.22',
          metadata: expect.objectContaining({
            anomalyScore: 0.88,
            modelVersion: 'v1.0.0',
            contributingFeatures: ['failed_login_ratio_1h', 'event_burst_5m'],
          }),
        })
      );
    });

    it('does NOT create an alert when event is scored as normal', async () => {
      vi.spyOn(SecurityEvent, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_anomaly: false,
          anomaly_score: 0.12,
          severity: 'low',
          confidence: 0.98,
          model_version: 'v1.0.0',
          contributing_features: [],
          timestamp: new Date().toISOString(),
        }),
      } as any);

      const createAlertSpy = vi.spyOn(alertService, 'createAlert');

      const result = await service.evaluateEvent(mockEvent);

      expect(result.available).toBe(true);
      expect(result.alertId).toBeUndefined();
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it('fails safe with graceful degradation when ML microservice is unreachable', async () => {
      vi.spyOn(SecurityEvent, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Simulate ML container being stopped / offline
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused: connect ECONNREFUSED 127.0.0.1:5001'));

      const createAlertSpy = vi.spyOn(alertService, 'createAlert');

      // Must NOT throw; returns available: false
      const result = await service.evaluateEvent(mockEvent);

      expect(result.available).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it('does not dispatch an alert if anomaly score is below threshold', async () => {
      vi.spyOn(SecurityEvent, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_anomaly: true, // Marked anomaly by tree, but score is under threshold
          anomaly_score: 0.52, // Threshold is 0.65
          severity: 'medium',
          confidence: 0.60,
          model_version: 'v1.0.0',
          contributing_features: [],
          timestamp: new Date().toISOString(),
        }),
      } as any);

      const createAlertSpy = vi.spyOn(alertService, 'createAlert');

      const result = await service.evaluateEvent(mockEvent);

      expect(result.available).toBe(true);
      expect(result.alertId).toBeUndefined();
      expect(createAlertSpy).not.toHaveBeenCalled();
    });
  });
});
