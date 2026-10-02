import mongoose from 'mongoose';
import { Policy, IPolicyDocument } from '../../models/policy.model.js';
import { ClassificationRecord } from '../../models/classification-record.model.js';
import { createAlert } from '../alert.service.js';
import type {
  ClassifierType,
  ClassificationVerdict,
  IClassificationResult,
  IPolicyThresholds,
  AlertSeverity,
  HeuristicRule,
} from '@sentinelkey/shared-types';

export function evaluateVerdict(
  score: number,
  thresholds: IPolicyThresholds
): { verdict: ClassificationVerdict; severity: AlertSeverity } {
  if (score >= thresholds.block) {
    return { verdict: 'blocked', severity: 'critical' };
  }
  if (score >= thresholds.quarantine) {
    return { verdict: 'quarantined', severity: 'high' };
  }
  if (score >= thresholds.flag) {
    return { verdict: 'flagged', severity: 'medium' };
  }
  return { verdict: 'safe', severity: 'low' };
}

export async function getActivePolicy(
  classifierType: ClassifierType,
  requestedVersion?: number
): Promise<IPolicyDocument | null> {
  // If disconnected or testing without MongoDB, fall back immediately to default policy
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const query: Record<string, unknown> = { classifierType };
    if (requestedVersion) {
      query.version = requestedVersion;
    } else {
      query.isCurrent = true;
    }

    const policy = await Policy.findOne(query).sort({ version: -1 });
    return policy;
  } catch {
    return null;
  }
}

export async function recordAndAlert(
  result: IClassificationResult,
  options?: { ip?: string; userId?: string; domainId?: string }
): Promise<void> {
  const ip = options?.ip || '127.0.0.1';
  const userId = options?.userId;
  const domainId = result.domainId || options?.domainId;

  // 1. Audit trail: persist record (failsafe, only if DB connected)
  if (mongoose.connection.readyState === 1) {
    try {
      await ClassificationRecord.create({
        subjectType: result.subjectType,
        subjectId: result.subjectId,
        verdict: result.verdict,
        severity: result.severity,
        score: result.score,
        matchedRules: result.matchedRules,
        policyVersion: result.policyVersion,
        policyId: result.policyId,
        domainId,
        metadata: result.metadata ?? {},
        timestamp: result.timestamp,
      });
    } catch (err) {
      console.error('[CLASSIFICATION_AUDIT_ERROR] Failed to record classification:', err);
    }
  }

  // 2. Alert integration: if not safe, trigger IDS Alert
  if (result.verdict !== 'safe') {
    let alertRule: HeuristicRule = 'EVENT_CLASSIFICATION_ALERT';
    if (result.subjectType === 'file') {
      alertRule = 'FILE_CLASSIFICATION_BLOCKED';
    } else if (result.subjectType === 'email') {
      alertRule = 'EMAIL_CLASSIFICATION_PHISHING';
    }

    const ruleNames = result.matchedRules.map((r: any) => r.name).join(', ');

    try {
      await createAlert({
        title: `${result.subjectType.toUpperCase()} Compliance Alert: ${result.verdict.toUpperCase()} (Score: ${result.score})`,
        description: `Compliance classification engine rendered verdict "${result.verdict}" based on rules: ${ruleNames}`,
        rule: alertRule,
        severity: result.severity,
        userId,
        domainId,
        ip,
        triggerEventIds: [result.subjectId],
        metadata: {
          subjectType: result.subjectType,
          subjectId: result.subjectId,
          score: result.score,
          verdict: result.verdict,
          policyVersion: result.policyVersion,
          matchedRules: result.matchedRules,
        },
      });
    } catch (err) {
      console.error('[CLASSIFICATION_ALERT_ERROR] Failed to dispatch alert:', err);
    }
  }
}
