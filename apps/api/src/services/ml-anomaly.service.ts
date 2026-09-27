import { env } from '../config/env.js';
import type { ISecurityEvent, AlertSeverity } from '@sentinelkey/shared-types';
import { SecurityEvent } from '../models/security-event.model.js';
import { createAlert } from './alert.service.js';

export interface IMlScoreResponse {
  is_anomaly: boolean;
  anomaly_score: number;
  severity: AlertSeverity;
  confidence: number;
  model_version: string;
  contributing_features: string[];
  timestamp: string;
  features?: number[];
  feature_names?: string[];
}

export interface IMlEvaluationResult {
  available: boolean;
  score?: IMlScoreResponse;
  alertId?: string;
  error?: string;
}

export class MlAnomalyService {
  private serviceUrl: string;
  private timeoutMs: number = 2000;
  private enabled: boolean;

  constructor() {
    this.serviceUrl = env.ML_SERVICE_URL;
    this.enabled = env.ML_ANOMALY_ENABLED;
  }

  /**
   * Check if ML service is reachable and responsive
   */
  public async checkHealth(): Promise<{ available: boolean; modelVersion?: string; fpr?: number }> {
    if (!this.enabled) {
      return { available: false };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.serviceUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { available: false };
      }

      const data = (await res.json()) as { model_version?: string; false_positive_rate?: number };
      return {
        available: true,
        modelVersion: data.model_version,
        fpr: data.false_positive_rate,
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Evaluate a security event using the Python ML microservice.
   * Fetches trailing event history for context and creates an alert if an anomaly is flagged.
   * Fails safe: errors never disrupt the main application.
   */
  public async evaluateEvent(event: ISecurityEvent): Promise<IMlEvaluationResult> {
    if (!this.enabled) {
      return { available: false };
    }

    try {
      // 1. Fetch trailing event history for context (up to 20 past events from same user/ip)
      let history: ISecurityEvent[] = [];
      try {
        const query: Record<string, unknown> = {
          _id: { $ne: event._id },
        };
        if (event.userId) {
          query.userId = event.userId;
        } else {
          query.ip = event.ip;
        }

        history = (await SecurityEvent.find(query)
          .sort({ timestamp: -1 })
          .limit(20)
          .lean()) as unknown as ISecurityEvent[];
      } catch {
        // Fallback: pass empty history if DB query fails
        history = [];
      }

      // 2. Call ML microservice /score
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.serviceUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          history,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          available: false,
          error: `ML service returned status ${res.status}`,
        };
      }

      const score = (await res.json()) as IMlScoreResponse;

      // 3. If anomaly detected, dispatch an IDS alert
      let alertId: string | undefined;
      if (score.is_anomaly && score.anomaly_score >= env.ML_ANOMALY_THRESHOLD) {
        const featuresDesc = score.contributing_features && score.contributing_features.length > 0
          ? ` (Significant feature deviations: ${score.contributing_features.join(', ')})`
          : '';

        const alert = await createAlert({
          title: `Statistical ML Anomaly Detected: Score ${(score.anomaly_score * 100).toFixed(1)}%`,
          description: `Machine learning isolation forest scored this event as an anomaly with confidence ${(score.confidence * 100).toFixed(0)}%${featuresDesc}.`,
          rule: 'ML_ANOMALY_DETECTION',
          severity: score.severity,
          userId: event.userId,
          ip: event.ip,
          triggerEventIds: [event._id ? event._id.toString() : 'event-id'],
          metadata: {
            anomalyScore: score.anomaly_score,
            confidence: score.confidence,
            modelVersion: score.model_version,
            contributingFeatures: score.contributing_features,
            features: score.features,
          },
        });

        alertId = alert._id.toString();
      }

      return {
        available: true,
        score,
        alertId,
      };
    } catch (err: unknown) {
      // Graceful degradation: log warning only, never throw or block
      return {
        available: false,
        error: err instanceof Error ? err.message : 'ML service unreachable or request timed out',
      };
    }
  }
}

export const mlAnomalyService = new MlAnomalyService();
