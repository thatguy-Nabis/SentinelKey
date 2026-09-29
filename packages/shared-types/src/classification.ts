/**
 * Classification & Compliance Engine Types (Phase 7)
 */
import type { AlertSeverity } from './alerts.js';

export type ClassifierType = 'event' | 'file' | 'email';

export type ClassificationVerdict = 'safe' | 'flagged' | 'quarantined' | 'blocked';

export interface IMatchedRule {
  ruleId: string;
  name: string;
  score: number;
  description: string;
  details?: Record<string, unknown>;
}

export interface IClassificationResult {
  id?: string;
  subjectType: ClassifierType;
  subjectId: string;
  verdict: ClassificationVerdict;
  severity: AlertSeverity;
  score: number;
  matchedRules: IMatchedRule[];
  policyVersion: number;
  policyId?: string;
  domainId?: string;
  timestamp: string | Date;
  metadata?: Record<string, unknown>;
}

export interface IPolicyRule {
  id: string;
  name: string;
  description: string;
  score: number;
  enabled: boolean;
  params?: Record<string, unknown>;
}

export interface IPolicyThresholds {
  flag: number;       // default 30
  quarantine: number; // default 60
  block: number;      // default 80
}

export interface IPolicy {
  _id: string;
  classifierType: ClassifierType;
  version: number;
  name: string;
  description: string;
  rules: IPolicyRule[];
  thresholds: IPolicyThresholds;
  isCurrent: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IClassifyEventRequest {
  event: Record<string, unknown>;
  history?: Array<Record<string, unknown>>;
  policyVersion?: number;
}

export interface IClassifyFileRequest {
  filename: string;
  mimeType?: string;
  contentBase64?: string;
  sha256?: string;
  sizeBytes?: number;
  policyVersion?: number;
}

export interface IEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  headers?: Record<string, string>;
  replyTo?: string;
}

export interface IClassifyEmailRequest {
  email: IEmailPayload;
  policyVersion?: number;
}
