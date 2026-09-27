import { getActivePolicy, evaluateVerdict, recordAndAlert } from './rules-engine.js';
import type {
  IClassificationResult,
  IMatchedRule,
} from '@sentinelkey/shared-types';

export class EventClassifierService {
  /**
   * Classify a security event against multi-step attack chain patterns
   */
  public async classifyEvent(params: {
    event: Record<string, unknown>;
    history?: Array<Record<string, unknown>>;
    policyVersion?: number;
  }): Promise<IClassificationResult> {
    const { event, history = [], policyVersion } = params;
    const policy = await getActivePolicy('event', policyVersion);

    const version = policy ? policy.version : 1;
    const policyId = policy ? policy._id.toString() : undefined;
    const thresholds = policy ? policy.thresholds : { flag: 30, quarantine: 60, block: 80 };
    const rules = policy ? policy.rules : [];

    const matchedRules: IMatchedRule[] = [];
    let totalScore = 0;

    const eventType = String(event.type || '');
    const eventIp = String(event.ip || '127.0.0.1');
    const eventUser = event.userId ? String(event.userId) : undefined;
    const eventTime = new Date((event.timestamp as string | Date) || Date.now()).getTime();

    // Helper to check if rule is enabled
    const isRuleActive = (ruleId: string) => {
      const r = rules.find(x => x.id === ruleId);
      return r ? r.enabled : true;
    };

    const getRuleScore = (ruleId: string, defaultScore: number) => {
      const r = rules.find(x => x.id === ruleId);
      return r ? r.score : defaultScore;
    };

    // --- RULE EVT-001: Credential Stuffing Sequence ---
    if (isRuleActive('EVT-001')) {
      // Look for rapid failed logins within 60s
      const windowSec = 60;
      const recentFailures = history.filter(h => {
        const hTime = new Date((h.timestamp as string | Date) || Date.now()).getTime();
        const delta = (eventTime - hTime) / 1000;
        return delta >= 0 && delta <= windowSec && String(h.type || '').includes('LOGIN_FAILED');
      });

      const currentIsFailure = eventType.includes('LOGIN_FAILED');
      const failCount = recentFailures.length + (currentIsFailure ? 1 : 0);

      if (failCount >= 3) {
        const score = getRuleScore('EVT-001', 45);
        totalScore += score;
        matchedRules.push({
          ruleId: 'EVT-001',
          name: 'Credential Stuffing Sequence',
          score,
          description: `Observed ${failCount} failed login attempts within ${windowSec} seconds`,
          details: { failCount, windowSec },
        });
      }
    }

    // --- RULE EVT-002: Session Hijack Pattern ---
    if (isRuleActive('EVT-002')) {
      const meta = (event.metadata as Record<string, unknown>) || {};
      const currentUa = String(meta.userAgent || '');

      // Check if any recent event for same userId has different IP or UserAgent within 5 minutes
      if (eventUser) {
        const suspiciousJump = history.find(h => {
          if (String(h.userId || '') !== eventUser) return false;
          const hTime = new Date((h.timestamp as string | Date) || Date.now()).getTime();
          const delta = (eventTime - hTime) / 1000;
          if (delta < 0 || delta > 300) return false;

          const hIp = String(h.ip || '');
          const hMeta = (h.metadata as Record<string, unknown>) || {};
          const hUa = String(hMeta.userAgent || '');

          return (hIp && hIp !== eventIp) || (hUa && currentUa && hUa !== currentUa);
        });

        if (suspiciousJump) {
          const score = getRuleScore('EVT-002', 75);
          totalScore += score;
          matchedRules.push({
            ruleId: 'EVT-002',
            name: 'Session Hijack Signature',
            score,
            description: `Session client context changed abruptly within 5m from IP ${suspiciousJump.ip} to ${eventIp}`,
            details: { previousIp: suspiciousJump.ip, currentIp: eventIp },
          });
        }
      }
    }

    // --- RULE EVT-003: Privilege Escalation Chain ---
    if (isRuleActive('EVT-003')) {
      // Multiple permission denials (403) followed by write action
      const recentDenials = history.filter(h => {
        const hTime = new Date((h.timestamp as string | Date) || Date.now()).getTime();
        const delta = (eventTime - hTime) / 1000;
        return delta >= 0 && delta <= 300 && String(h.type || '') === 'PERMISSION_DENIED';
      });

      if (recentDenials.length >= 2 || (recentDenials.length >= 1 && eventType === 'PERMISSION_DENIED')) {
        const score = getRuleScore('EVT-003', 85);
        totalScore += score;
        matchedRules.push({
          ruleId: 'EVT-003',
          name: 'Privilege Escalation Chain',
          score,
          description: `Detected sequential permission denials (${recentDenials.length} recent) indicating active brute-force privilege probing`,
          details: { denialCount: recentDenials.length },
        });
      }
    }

    // --- RULE EVT-004: Token Tampering & Reuse Sequence ---
    if (isRuleActive('EVT-004')) {
      if (eventType === 'AUTH_TOKEN_REUSE') {
        const score = getRuleScore('EVT-004', 90);
        totalScore += score;
        matchedRules.push({
          ruleId: 'EVT-004',
          name: 'Token Tampering & Reuse Sequence',
          score,
          description: 'Consumed refresh token was reused; credentials compromised or replay attack underway',
        });
      }
    }

    const { verdict, severity } = evaluateVerdict(totalScore, thresholds);
    const subjectId = String(event._id || `event-${Date.now()}`);

    const result: IClassificationResult = {
      subjectType: 'event',
      subjectId,
      verdict,
      severity,
      score: totalScore,
      matchedRules,
      policyVersion: version,
      policyId,
      timestamp: new Date(),
      metadata: { eventType, eventIp, eventUser },
    };

    // Audit log & trigger IDS alert if not safe
    await recordAndAlert(result, { ip: eventIp, userId: eventUser });

    return result;
  }
}

export const eventClassifierService = new EventClassifierService();
