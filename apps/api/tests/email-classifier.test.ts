import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailClassifierService } from '../src/services/classification/email-classifier.service.js';
import * as alertService from '../src/services/alert.service.js';

describe('EmailClassifierService', () => {
  let service: EmailClassifierService;

  beforeEach(() => {
    service = new EmailClassifierService();
    vi.restoreAllMocks();
    vi.spyOn(alertService, 'createAlert').mockResolvedValue({ _id: 'alert-mock' } as any);
  });

  it('classifies a benign internal corporate email as safe (score: 0)', async () => {
    const email = {
      from: 'sarah.connor@sentinelkey.com',
      to: 'team@sentinelkey.com',
      subject: 'Weekly Sprint Planning Agenda',
      bodyText: 'Hi team, let us meet tomorrow at 10 AM to review the release roadmap.',
    };

    const result = await service.classifyEmail({ email });

    expect(result.subjectType).toBe('email');
    expect(result.verdict).toBe('safe');
    expect(result.score).toBe(0);
    expect(result.matchedRules).toHaveLength(0);
  });

  it('detects typosquatting lookalike domain impersonation (EML-001) and renders quarantined verdict', async () => {
    // sentine1key.com is edit distance 1 from sentinelkey.com ('l' -> '1')
    const email = {
      from: 'security-alert@sentine1key.com',
      to: 'victim@company.com',
      subject: 'Urgent System Maintenance Notice',
      bodyText: 'Please review your active credentials.',
    };

    const result = await service.classifyEmail({ email });

    expect(result.verdict).toBe('quarantined');
    expect(result.score).toBe(75);
    expect(result.matchedRules[0].ruleId).toBe('EML-001');
    expect(result.matchedRules[0].name).toBe('Lookalike Typosquatting Domain');
    expect(result.matchedRules[0].details?.distance).toBe(1);
  });

  it('detects deceptive display text vs href link mismatch (EML-002) and renders blocked verdict', async () => {
    const email = {
      from: 'billing@service.com',
      to: 'user@company.com',
      subject: 'Invoice confirmation',
      bodyText: 'Please verify your billing portal.',
      bodyHtml: `
        <p>Please log in here:</p>
        <a href="http://evil-credential-harvester.com/login">https://microsoft.com/portal</a>
      `,
    };

    const result = await service.classifyEmail({ email });

    expect(result.verdict).toBe('blocked');
    expect(result.score).toBe(80);
    expect(result.matchedRules.some(r => r.ruleId === 'EML-002')).toBe(true);
    expect(result.matchedRules[0].name).toBe('Display Text vs Href Link Mismatch');
  });

  it('detects phishing urgency triggers combined with masked link (EML-003 + EML-004) and renders blocked verdict', async () => {
    const email = {
      from: 'accounts@external.net',
      to: 'finance@company.com',
      subject: 'ACTION REQUIRED: Urgent wire transfer confirmation',
      bodyText: 'Urgent wire transfer pending. Please verify your account immediately at bit.ly/secure-auth to prevent suspension.',
    };

    const result = await service.classifyEmail({ email });

    expect(result.verdict).toBe('blocked');
    // EML-003 (50) + EML-004 (40) = 90
    expect(result.score).toBe(90);
    const ruleIds = result.matchedRules.map(r => r.ruleId);
    expect(ruleIds).toContain('EML-003');
    expect(ruleIds).toContain('EML-004');
  });

  it('detects From vs Reply-To header domain mismatch spoofing (EML-005)', async () => {
    const email = {
      from: 'ceo@sentinelkey.com',
      to: 'employee@sentinelkey.com',
      replyTo: 'ceo.personal@gmail.com',
      subject: 'Quick question regarding wire details',
      bodyText: 'Are you available to process a transaction right now?',
    };

    const result = await service.classifyEmail({ email });

    expect(result.verdict).toBe('quarantined');
    expect(result.score).toBe(70);
    expect(result.matchedRules.some(r => r.ruleId === 'EML-005')).toBe(true);
  });

  it('is fully deterministic across multiple runs on identical emails', async () => {
    const email = {
      from: 'service@paypa1.com',
      to: 'user@bank.com',
      subject: 'Security Alert: Password expired reset now',
      bodyText: 'Password expired reset now at bit.ly/reset.',
    };

    const r1 = await service.classifyEmail({ email });
    const r2 = await service.classifyEmail({ email });

    expect(r1.score).toBe(r2.score);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.matchedRules).toEqual(r2.matchedRules);
  });
});
