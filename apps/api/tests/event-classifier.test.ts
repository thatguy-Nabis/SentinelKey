import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventClassifierService } from '../src/services/classification/event-classifier.service.js';
import * as alertService from '../src/services/alert.service.js';

describe('EventClassifierService', () => {
  let service: EventClassifierService;

  beforeEach(() => {
    service = new EventClassifierService();
    vi.restoreAllMocks();
    vi.spyOn(alertService, 'createAlert').mockResolvedValue({ _id: 'alert-mock' } as any);
  });

  it('classifies a benign single login event as safe (score: 0)', async () => {
    const event = {
      _id: 'evt-1',
      type: 'AUTH_LOGIN_SUCCESS',
      ip: '198.51.100.10',
      userId: 'user-alice',
      timestamp: new Date().toISOString(),
    };

    const result = await service.classifyEvent({ event, history: [] });

    expect(result.subjectType).toBe('event');
    expect(result.verdict).toBe('safe');
    expect(result.score).toBe(0);
    expect(result.matchedRules).toHaveLength(0);
  });

  it('detects credential stuffing sequence (EVT-001) and renders flagged verdict', async () => {
    const now = Date.now();
    const event = {
      _id: 'evt-target',
      type: 'AUTH_LOGIN_FAILED',
      ip: '203.0.113.55',
      userId: 'user-bob',
      timestamp: new Date(now).toISOString(),
    };

    const history = [
      {
        _id: 'evt-past-1',
        type: 'AUTH_LOGIN_FAILED',
        ip: '203.0.113.55',
        userId: 'user-bob',
        timestamp: new Date(now - 15000).toISOString(),
      },
      {
        _id: 'evt-past-2',
        type: 'AUTH_LOGIN_FAILED',
        ip: '203.0.113.55',
        userId: 'user-bob',
        timestamp: new Date(now - 30000).toISOString(),
      },
    ];

    const result = await service.classifyEvent({ event, history });

    expect(result.verdict).toBe('flagged');
    expect(result.score).toBe(45);
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].ruleId).toBe('EVT-001');
    expect(result.matchedRules[0].name).toBe('Credential Stuffing Sequence');
  });

  it('detects session hijack pattern (EVT-002) and renders quarantined verdict', async () => {
    const now = Date.now();
    const event = {
      _id: 'evt-hijack',
      type: 'AUTH_TOKEN_REFRESH',
      ip: '198.51.100.99', // New IP
      userId: 'user-alice',
      timestamp: new Date(now).toISOString(),
      metadata: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    };

    const history = [
      {
        _id: 'evt-legit',
        type: 'AUTH_LOGIN_SUCCESS',
        ip: '192.168.1.15', // Original IP
        userId: 'user-alice',
        timestamp: new Date(now - 60000).toISOString(),
        metadata: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      },
    ];

    const result = await service.classifyEvent({ event, history });

    expect(result.verdict).toBe('quarantined');
    expect(result.score).toBe(75);
    expect(result.matchedRules[0].ruleId).toBe('EVT-002');
    expect(result.matchedRules[0].name).toBe('Session Hijack Signature');
  });

  it('detects privilege escalation chain (EVT-003) and renders blocked verdict', async () => {
    const now = Date.now();
    const event = {
      _id: 'evt-escalate',
      type: 'PERMISSION_DENIED',
      ip: '198.51.100.12',
      userId: 'user-malicious',
      timestamp: new Date(now).toISOString(),
    };

    const history = [
      {
        _id: 'evt-denial-1',
        type: 'PERMISSION_DENIED',
        ip: '198.51.100.12',
        userId: 'user-malicious',
        timestamp: new Date(now - 10000).toISOString(),
      },
    ];

    const result = await service.classifyEvent({ event, history });

    expect(result.verdict).toBe('blocked');
    expect(result.score).toBe(85);
    expect(result.matchedRules[0].ruleId).toBe('EVT-003');
    expect(result.matchedRules[0].name).toBe('Privilege Escalation Chain');
  });

  it('detects consumed token reuse sequence (EVT-004) and renders blocked verdict', async () => {
    const event = {
      _id: 'evt-reuse',
      type: 'AUTH_TOKEN_REUSE',
      ip: '203.0.113.88',
      userId: 'user-victim',
      timestamp: new Date().toISOString(),
    };

    const result = await service.classifyEvent({ event, history: [] });

    expect(result.verdict).toBe('blocked');
    expect(result.score).toBe(90);
    expect(result.matchedRules[0].ruleId).toBe('EVT-004');
  });

  it('is fully deterministic: same input always produces identical verdict and score', async () => {
    const event = {
      _id: 'evt-det',
      type: 'AUTH_TOKEN_REUSE',
      ip: '198.51.100.5',
      timestamp: '2026-09-27T12:00:00Z',
    };

    const r1 = await service.classifyEvent({ event });
    const r2 = await service.classifyEvent({ event });
    const r3 = await service.classifyEvent({ event });

    expect(r1.score).toBe(r2.score);
    expect(r2.score).toBe(r3.score);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r2.verdict).toBe(r3.verdict);
    expect(r1.matchedRules).toEqual(r2.matchedRules);
  });
});
