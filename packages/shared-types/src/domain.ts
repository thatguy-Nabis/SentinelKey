export type DomainEnvironment = 'development' | 'staging' | 'production';
export type DomainHealthStatus = 'healthy' | 'degraded' | 'offline' | 'unverified';

export interface IClientDomain {
  _id: string;
  userId: string;
  name: string;
  domainUrl: string;
  environment: DomainEnvironment;
  apiKey: string;
  status: 'active' | 'paused' | 'revoked';
  healthStatus: DomainHealthStatus;
  lastPingAt?: string | Date;
  stats: {
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
