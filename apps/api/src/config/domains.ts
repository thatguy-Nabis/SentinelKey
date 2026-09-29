export const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const;

export type AllowedHost = (typeof ALLOWED_HOSTS)[number];

/**
 * Reserved ports used by SentinelKey's internal services:
 * - 4000: API
 * - 5001: ML Service
 * - 5173: Dashboard
 * - 5174: Website / Hub
 */
export function getReservedPorts(): number[] {
  if (process.env.RESERVED_PORTS) {
    return process.env.RESERVED_PORTS.split(',')
      .map((p) => Number(p.trim()))
      .filter((p) => !isNaN(p) && p > 0);
  }
  return [4000, 5001, 5173, 5174];
}

/**
 * Normalizes host and port into a standard origin string: e.g. "localhost:3000"
 */
export function normalizeOrigin(host: string, port: number): string {
  const cleanHost = host.trim().toLowerCase();
  return `${cleanHost}:${port}`;
}

export interface DomainValidationResult {
  valid: boolean;
  error?: string;
  normalizedHost?: string;
  normalizedPort?: number;
  normalizedLabel?: string;
  normalizedOrigin?: string;
}

/**
 * Validates domain registration input per Phase 10 specifications.
 */
export function validateDomainRegistration(input: {
  label?: string;
  name?: string;
  host?: string;
  port?: number;
  domainUrl?: string;
}): DomainValidationResult {
  const rawLabel = (input.label ?? input.name ?? '').trim();
  if (!rawLabel) {
    return { valid: false, error: 'Domain label is required' };
  }
  if (rawLabel.length > 100) {
    return { valid: false, error: 'Domain label must not exceed 100 characters' };
  }

  let rawHost = (input.host ?? '').trim();
  let rawPort = input.port;

  // Fallback: parse domainUrl (e.g. "http://localhost:3000" or "localhost:3000")
  if ((!rawHost || !rawPort) && input.domainUrl) {
    try {
      const urlStr = input.domainUrl.includes('://') ? input.domainUrl : `http://${input.domainUrl}`;
      const parsed = new URL(urlStr);
      rawHost = parsed.hostname;
      rawPort = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
    } catch {
      return { valid: false, error: 'Invalid domain URL format' };
    }
  }

  if (!rawHost) {
    return { valid: false, error: 'Host is required (e.g. localhost, 127.0.0.1, [::1])' };
  }

  const cleanHost = rawHost.toLowerCase();
  if (!ALLOWED_HOSTS.includes(cleanHost as AllowedHost)) {
    return {
      valid: false,
      error: `Invalid host '${rawHost}'. Allowed hosts are: ${ALLOWED_HOSTS.join(', ')}`,
    };
  }

  if (rawPort === undefined || rawPort === null || isNaN(rawPort) || !Number.isInteger(rawPort)) {
    return { valid: false, error: 'Port must be a valid integer' };
  }

  if (rawPort < 1 || rawPort > 65535) {
    return { valid: false, error: 'Port must be an integer between 1 and 65535' };
  }

  const reserved = getReservedPorts();
  if (reserved.includes(rawPort)) {
    return {
      valid: false,
      error: `Port ${rawPort} is reserved by SentinelKey system services and cannot be used`,
    };
  }

  const origin = normalizeOrigin(cleanHost, rawPort);

  return {
    valid: true,
    normalizedHost: cleanHost,
    normalizedPort: rawPort,
    normalizedLabel: rawLabel,
    normalizedOrigin: origin,
  };
}
