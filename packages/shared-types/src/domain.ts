export type DomainEnvironment = 'development' | 'staging' | 'production';
export type DomainHealthStatus = 'healthy' | 'degraded' | 'offline' | 'unverified';
export type DomainStatus = 'pending' | 'active' | 'suspended' | 'deleted';
export type DomainSuspensionReason = 'plan_limit' | 'unpaid' | 'manual';

export interface IDomain {
  _id: string;
  id?: string;
  userId: string;
  label: string;
  name?: string; // backwards compatibility alias for label
  host: string;
  port: number;
  origin: string; // normalized e.g. "localhost:3000"
  domainUrl?: string; // backwards compatibility alias for origin
  status: DomainStatus;
  suspensionReason?: DomainSuspensionReason;
  siteKeyPrefix: string;
  keyCreatedAt: string | Date;
  keyRotatedAt?: string | Date;
  lastSeenAt?: string | Date;
  environment?: DomainEnvironment;
  deletedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICreateDomainRequest {
  label?: string;
  name?: string;
  host?: string;
  port?: number;
  domainUrl?: string;
  environment?: DomainEnvironment;
}

export interface ICreateDomainResponse {
  domain: IDomain;
  siteKey: string;
}

export interface IRotateKeyResponse {
  domain: IDomain;
  siteKey: string;
}

export interface IUpdateDomainRequest {
  label: string;
}

export interface IKeepDomainsRequest {
  domainIds: string[];
}

/** Legacy interface kept for backward compatibility */
export interface IClientDomain {
  _id: string;
  userId: string;
  name: string;
  domainUrl: string;
  environment?: DomainEnvironment;
  apiKey?: string;
  siteKeyPrefix?: string;
  status: 'active' | 'paused' | 'revoked' | 'pending' | 'suspended' | 'deleted';
  healthStatus?: DomainHealthStatus;
  lastPingAt?: string | Date;
  lastSeenAt?: string | Date;
  stats?: {
    requestsTotal: number;
    threatsBlocked: number;
    lastEventAt?: string | Date;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IRegisterDomainRequest {
  name: string;
  domainUrl: string;
  environment?: DomainEnvironment;
}

export interface IDomainProbeResult {
  reachable: boolean;
  statusCode?: number;
  latencyMs?: number;
  message: string;
}

export interface IDomainTelemetryPayload {
  apiKey: string;
  eventType: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  isThreat?: boolean;
  threatDetails?: string;
}
