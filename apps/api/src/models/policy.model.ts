import mongoose, { Document, Schema } from 'mongoose';
import type { IPolicy, ClassifierType } from '@sentinelkey/shared-types';

export interface IPolicyDocument extends Omit<IPolicy, '_id'>, Document {}

const PolicyRuleSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    score: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    params: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const PolicyThresholdsSchema = new Schema(
  {
    flag: { type: Number, required: true, default: 30 },
    quarantine: { type: Number, required: true, default: 60 },
    block: { type: Number, required: true, default: 80 },
  },
  { _id: false }
);

const PolicySchema = new Schema<IPolicyDocument>(
  {
    classifierType: {
      type: String,
      enum: ['event', 'file', 'email'],
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    rules: [PolicyRuleSchema],
    thresholds: {
      type: PolicyThresholdsSchema,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PolicySchema.index({ classifierType: 1, version: 1 }, { unique: true });

export const Policy = mongoose.model<IPolicyDocument>('Policy', PolicySchema);

/**
 * Seed initial baseline policies for Event, File, and Email classification.
 */
export async function seedDefaultPolicies(): Promise<void> {
  const defaultEventPolicy = {
    classifierType: 'event' as ClassifierType,
    version: 1,
    name: 'Standard Event Attack Chain Policy v1',
    description: 'Detects multi-step attack patterns, credential stuffing, and privilege escalation sequences',
    rules: [
      {
        id: 'EVT-001',
        name: 'Credential Stuffing Sequence',
        description: 'Sequence of failed login attempts followed by rapid success or target change within 60 seconds',
        score: 45,
        enabled: true,
        params: { minFailures: 3, windowSec: 60 },
      },
      {
        id: 'EVT-002',
        name: 'Session Hijack Signature',
        description: 'Sudden change in client IP and User-Agent during an active authenticated session',
        score: 75,
        enabled: true,
        params: { windowSec: 300 },
      },
      {
        id: 'EVT-003',
        name: 'Privilege Escalation Chain',
        description: 'Multiple 403 authorization denials immediately followed by sensitive administrative writes',
        score: 85,
        enabled: true,
        params: { minDenials: 2, windowSec: 300 },
      },
      {
        id: 'EVT-004',
        name: 'Token Tampering & Reuse Sequence',
        description: 'Repeated refresh failures or consumed token reuse detected on active session',
        score: 90,
        enabled: true,
      },
    ],
    thresholds: { flag: 30, quarantine: 60, block: 80 },
    isCurrent: true,
  };

  const defaultFilePolicy = {
    classifierType: 'file' as ClassifierType,
    version: 1,
    name: 'Standard File Content & Signature Policy v1',
    description: 'Enforces magic-byte signature validation, entropy analysis, and blocklist matching',
    rules: [
      {
        id: 'FILE-001',
        name: 'Disguised Executable Signature',
        description: 'File claims non-executable extension (pdf, png, txt) but contains Windows PE or Linux ELF header',
        score: 95,
        enabled: true,
      },
      {
        id: 'FILE-002',
        name: 'High Shannon Entropy Anomaly',
        description: 'File exhibits unusually high entropy (> 7.7 bits/byte), suggesting packed or encrypted malware',
        score: 65,
        enabled: true,
        params: { entropyThreshold: 7.7 },
      },
      {
        id: 'FILE-003',
        name: 'Dangerous Executable Extension',
        description: 'File has executable or script extension (.exe, .bat, .cmd, .ps1, .vbs, .sh, .scr, .dll)',
        score: 85,
        enabled: true,
      },
      {
        id: 'FILE-004',
        name: 'Known Malware Hash Match',
        description: 'File SHA-256 hash matches repository threat blocklist',
        score: 100,
        enabled: true,
        params: {
          blockedHashes: [
            // EICAR standard anti-virus test file SHA-256
            '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
            // Example simulated known-bad test malware hash
            '44d88612fea8a8f36de82e1278abb02fdd832e8c07e056973e86c072e70e4e5e',
          ],
        },
      },
    ],
    thresholds: { flag: 30, quarantine: 60, block: 80 },
    isCurrent: true,
  };

  const defaultEmailPolicy = {
    classifierType: 'email' as ClassifierType,
    version: 1,
    name: 'Standard Inbound Email Security Policy v1',
    description: 'Inspects email headers, lookalike typosquatting domains, link mismatch, and phishing cues',
    rules: [
      {
        id: 'EML-001',
        name: 'Lookalike Typosquatting Domain',
        description: 'Sender domain has edit distance <= 2 from a monitored legitimate organization domain',
        score: 75,
        enabled: true,
        params: {
          protectedDomains: [
            'sentinelkey.com',
            'sentinelkey.local',
            'microsoft.com',
            'google.com',
            'paypal.com',
            'bankofamerica.com',
          ],
          maxEditDistance: 2,
        },
      },
      {
        id: 'EML-002',
        name: 'Display Text vs Href Link Mismatch',
        description: 'Anchor tag display text looks like trusted URL but href destination points to external domain',
        score: 80,
        enabled: true,
      },
      {
        id: 'EML-003',
        name: 'Suspicious TLD or URL Shortener',
        description: 'Contains high-risk TLDs (.top, .xyz, .click, .buzz, .cc, .ru) or URL shorteners (bit.ly, tinyurl)',
        score: 50,
        enabled: true,
        params: {
          suspiciousTlds: ['.top', '.xyz', '.click', '.buzz', '.cc', '.ru', '.tk', '.fit'],
          shorteners: ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'ow.ly', 'buff.ly'],
        },
      },
      {
        id: 'EML-004',
        name: 'Phishing Urgency Keywords',
        description: 'Body contains urgent financial, credential verification, or account suspension triggers',
        score: 40,
        enabled: true,
        params: {
          keywords: [
            'urgent wire transfer',
            'verify your account immediately',
            'password expired reset now',
            'suspend your account',
            'unauthorized transaction detected',
            'action required within 24 hours',
            'security alert confirm password',
          ],
        },
      },
      {
        id: 'EML-005',
        name: 'Sender Reply-To Spoofing Mismatch',
        description: 'From address domain contradicts Reply-To or Return-Path header domain',
        score: 70,
        enabled: true,
      },
    ],
    thresholds: { flag: 30, quarantine: 60, block: 80 },
    isCurrent: true,
  };

  const policies = [defaultEventPolicy, defaultFilePolicy, defaultEmailPolicy];

  for (const pol of policies) {
    const exists = await Policy.findOne({
      classifierType: pol.classifierType,
      version: pol.version,
    });
    if (!exists) {
      await Policy.create(pol);
      console.log(`[SEED] Created default policy: ${pol.name}`);
    }
  }
}
