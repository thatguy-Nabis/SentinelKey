import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { FileClassifierService } from '../src/services/classification/file-classifier.service.js';
import * as alertService from '../src/services/alert.service.js';

describe('FileClassifierService', () => {
  let service: FileClassifierService;

  beforeEach(() => {
    service = new FileClassifierService();
    vi.restoreAllMocks();
    vi.spyOn(alertService, 'createAlert').mockResolvedValue({ _id: 'alert-mock' } as any);
  });

  it('classifies a benign text file as safe (score: 0)', async () => {
    const textBuffer = Buffer.from('Standard business project update notes.', 'utf-8');
    const result = await service.classifyFile({
      filename: 'meeting_notes.txt',
      buffer: textBuffer,
      mimeType: 'text/plain',
    });

    expect(result.subjectType).toBe('file');
    expect(result.verdict).toBe('safe');
    expect(result.score).toBe(0);
    expect(result.matchedRules).toHaveLength(0);
  });

  it('detects disguised executable masquerading as a PDF (FILE-001) and renders blocked verdict', async () => {
    // Windows PE header starts with 'MZ' (0x4D, 0x5A)
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const disguisedPayload = Buffer.concat([peHeader, Buffer.alloc(128, 0xaa)]);

    const result = await service.classifyFile({
      filename: 'quarterly_financial_report.pdf', // Claims to be safe PDF
      buffer: disguisedPayload,
      mimeType: 'application/pdf',
    });

    expect(result.verdict).toBe('blocked');
    expect(result.score).toBe(95);
    expect(result.matchedRules[0].ruleId).toBe('FILE-001');
    expect(result.matchedRules[0].name).toBe('Disguised Executable Signature');
  });

  it('detects dangerous executable script extension (FILE-003) and renders blocked verdict', async () => {
    const scriptBuffer = Buffer.from('Write-Host "Compromising system..."', 'utf-8');

    const result = await service.classifyFile({
      filename: 'invoice_updater.ps1',
      buffer: scriptBuffer,
    });

    expect(result.verdict).toBe('blocked');
    expect(result.score).toBe(85);
    expect(result.matchedRules.some(r => r.ruleId === 'FILE-003')).toBe(true);
  });

  it('detects double-extension executable disguise (e.g. invoice.pdf.exe)', async () => {
    const buffer = Buffer.from('echo hello', 'utf-8');

    const result = await service.classifyFile({
      filename: 'urgent_invoice.pdf.exe',
      buffer,
    });

    expect(result.verdict).toBe('blocked');
    expect(result.matchedRules.some(r => r.ruleId === 'FILE-003')).toBe(true);
  });

  it('detects known malware hash match (FILE-004) and renders blocked verdict (score: 100)', async () => {
    // EICAR standard antivirus test file
    const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const eicarBuffer = Buffer.from(eicarString, 'utf-8');
    const eicarHash = crypto.createHash('sha256').update(eicarBuffer).digest('hex');

    const result = await service.classifyFile({
      filename: 'eicar.com',
      buffer: eicarBuffer,
      sha256: eicarHash,
    });

    expect(result.verdict).toBe('blocked');
    expect(result.score).toBeGreaterThanOrEqual(100);
    expect(result.matchedRules.some(r => r.ruleId === 'FILE-004')).toBe(true);
  });

  it('detects high Shannon entropy anomaly in text/script (FILE-002)', async () => {
    // Generate 4096 bytes of pure pseudo-random noise (entropy ~ 7.9+ bits/byte)
    const highEntropyBytes = crypto.randomBytes(4096);

    const result = await service.classifyFile({
      filename: 'obfuscated_data.txt',
      buffer: highEntropyBytes,
    });

    expect(result.verdict).toBe('quarantined');
    expect(result.score).toBe(65);
    expect(result.matchedRules.some(r => r.ruleId === 'FILE-002')).toBe(true);
  });

  it('is fully deterministic across multiple runs on identical files', async () => {
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const file = { filename: 'test.pdf', buffer: peHeader };

    const r1 = await service.classifyFile(file);
    const r2 = await service.classifyFile(file);

    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.score).toBe(r2.score);
    expect(r1.matchedRules).toEqual(r2.matchedRules);
  });
});
