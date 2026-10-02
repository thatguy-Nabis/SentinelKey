import crypto from 'crypto';
import path from 'path';
import { getActivePolicy, evaluateVerdict, recordAndAlert } from './rules-engine.js';
import type {
  IClassificationResult,
  IMatchedRule,
} from '@sentinelkey/shared-types';

export class FileClassifierService {
  /**
   * Compute Shannon entropy in bits per byte (0.0 to 8.0)
   */
  public calculateShannonEntropy(buffer: Buffer): number {
    if (buffer.length === 0) return 0.0;

    const byteCounts = new Uint32Array(256);
    for (let i = 0; i < buffer.length; i++) {
      byteCounts[buffer[i]]++;
    }

    let entropy = 0.0;
    const len = buffer.length;

    for (let i = 0; i < 256; i++) {
      if (byteCounts[i] > 0) {
        const p = byteCounts[i] / len;
        entropy -= p * Math.log2(p);
      }
    }

    return Math.round(entropy * 1000) / 1000;
  }

  /**
   * Check if buffer starts with executable magic bytes (Windows PE or Linux ELF)
   */
  public isExecutableHeader(buffer: Buffer): { isExecutable: boolean; type?: string } {
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { isExecutable: true, type: 'Windows PE (MZ header)' };
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      return { isExecutable: true, type: 'Linux ELF binary' };
    }
    return { isExecutable: false };
  }

  /**
   * Classify file buffer and metadata against security & compliance policies
   */
  public async classifyFile(params: {
    filename: string;
    buffer?: Buffer;
    contentBase64?: string;
    mimeType?: string;
    sha256?: string;
    userId?: string;
    domainId?: string;
    ip?: string;
    policyVersion?: number;
  }): Promise<IClassificationResult> {
    const { filename, mimeType, userId, domainId, ip = '127.0.0.1', policyVersion } = params;

    let buffer = params.buffer;
    if (!buffer && params.contentBase64) {
      buffer = Buffer.from(params.contentBase64, 'base64');
    }
    if (!buffer) {
      buffer = Buffer.alloc(0);
    }

    const sha256 =
      params.sha256 ||
      crypto.createHash('sha256').update(buffer).digest('hex');

    const policy = await getActivePolicy('file', policyVersion);
    const version = policy ? policy.version : 1;
    const policyId = policy ? policy._id.toString() : undefined;
    const thresholds = policy ? policy.thresholds : { flag: 30, quarantine: 60, block: 80 };
    const rules = policy ? policy.rules : [];

    const matchedRules: IMatchedRule[] = [];
    let totalScore = 0;

    const isRuleActive = (ruleId: string) => {
      const r = rules.find((x: any) => x.id === ruleId);
      return r ? r.enabled : true;
    };

    const getRuleScore = (ruleId: string, defaultScore: number) => {
      const r = rules.find((x: any) => x.id === ruleId);
      return r ? r.score : defaultScore;
    };

    const ext = path.extname(filename).toLowerCase();
    const lowerFilename = filename.toLowerCase();

    // --- RULE FILE-001: Disguised Executable Signature ---
    if (isRuleActive('FILE-001') && buffer.length > 0) {
      const nonExecExts = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.txt', '.csv', '.docx', '.xlsx'];
      const claimsSafe = nonExecExts.includes(ext);
      const execCheck = this.isExecutableHeader(buffer);

      if (claimsSafe && execCheck.isExecutable) {
        const score = getRuleScore('FILE-001', 95);
        totalScore += score;
        matchedRules.push({
          ruleId: 'FILE-001',
          name: 'Disguised Executable Signature',
          score,
          description: `File claims extension "${ext}" but binary header matches ${execCheck.type}`,
          details: { extension: ext, binaryType: execCheck.type },
        });
      }
    }

    // --- RULE FILE-002: Shannon Entropy Anomaly ---
    if (isRuleActive('FILE-002') && buffer.length >= 64) {
      const entropy = this.calculateShannonEntropy(buffer);
      const ruleDef = rules.find((x: any) => x.id === 'FILE-002');
      const entropyThreshold = (ruleDef?.params?.entropyThreshold as number) || 7.7;

      // Documents and scripts shouldn't have near-maximum entropy (which indicates packed payload or encrypted binary)
      const uncompressedExts = ['.txt', '.js', '.py', '.sh', '.html', '.css', '.json', '.xml', '.csv', '.rtf'];
      if (entropy >= entropyThreshold && (uncompressedExts.includes(ext) || ext === '')) {
        const score = getRuleScore('FILE-002', 65);
        totalScore += score;
        matchedRules.push({
          ruleId: 'FILE-002',
          name: 'High Shannon Entropy Anomaly',
          score,
          description: `Observed high Shannon entropy (${entropy} bits/byte >= ${entropyThreshold}), indicating packed, encrypted, or obfuscated content`,
          details: { entropy, threshold: entropyThreshold },
        });
      }
    }

    // --- RULE FILE-003: Dangerous Executable Extension ---
    if (isRuleActive('FILE-003')) {
      const dangerousExts = [
        '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.sh', '.scr', '.dll',
        '.hta', '.cpl', '.msi', '.jar', '.pif', '.reg',
      ];

      // Also detect double-extension masquerading like invoice.pdf.exe
      const isDangerous =
        dangerousExts.includes(ext) ||
        dangerousExts.some(dExt => lowerFilename.endsWith(dExt));

      if (isDangerous) {
        const score = getRuleScore('FILE-003', 85);
        totalScore += score;
        matchedRules.push({
          ruleId: 'FILE-003',
          name: 'Dangerous Executable Extension',
          score,
          description: `File extension "${ext}" matches restricted executable/script types`,
          details: { extension: ext, filename },
        });
      }
    }

    // --- RULE FILE-004: Known Malware Hash Match ---
    if (isRuleActive('FILE-004')) {
      const ruleDef = rules.find((x: any) => x.id === 'FILE-004');
      const defaultBlocked = [
        // Standard EICAR test string hash
        '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
        '44d88612fea8a8f36de82e1278abb02fdd832e8c07e056973e86c072e70e4e5e',
      ];
      const blockedHashes: string[] = (ruleDef?.params?.blockedHashes as string[]) || defaultBlocked;

      if (blockedHashes.includes(sha256.toLowerCase())) {
        const score = getRuleScore('FILE-004', 100);
        totalScore += score;
        matchedRules.push({
          ruleId: 'FILE-004',
          name: 'Known Malware Hash Match',
          score,
          description: `File SHA-256 hash (${sha256}) matches malware blocklist`,
          details: { sha256 },
        });
      }
    }

    const { verdict, severity } = evaluateVerdict(totalScore, thresholds);

    const result: IClassificationResult = {
      subjectType: 'file',
      subjectId: sha256,
      verdict,
      severity,
      score: totalScore,
      matchedRules,
      policyVersion: version,
      policyId,
      domainId,
      timestamp: new Date(),
      metadata: {
        filename,
        mimeType,
        sizeBytes: buffer.length,
        sha256,
      },
    };

    // Audit log & trigger IDS alert if not safe
    await recordAndAlert(result, { ip, userId, domainId });

    return result;
  }
}

export const fileClassifierService = new FileClassifierService();
