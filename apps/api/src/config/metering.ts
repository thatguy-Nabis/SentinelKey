import type { UnitTier } from '@sentinelkey/shared-types';

export const TIER_UNITS: Record<UnitTier, number> = {
  light: 1,
  standard: 3,
  heavy: 10,
};

/**
 * Money values in integer paisa (1 NPR = 100 paisa)
 */
export const METERING_RATES = {
  listRatePaisa: 5, // 5 paisa / unit (Pay-as-you-go list rate)
  proOverageRatePaisa: 4, // 4 paisa / unit
  enterpriseOverageRatePaisa: 3, // 3 paisa / unit
} as const;

export const MINIMUM_PAYABLE_PAISA = 1000; // NPR 10 minimum payable amount
export const USAGE_INVOICE_GRACE_PERIOD_DAYS = 7; // 7 days grace period before unpaid suspension

export interface PlanQuotaConfig {
  type: 'user_hard_cap' | 'per_domain_allowance';
  includedUnits: number;
  overageRatePaisa: number;
  hardCap: boolean;
}

export const PLAN_QUOTAS: Record<string, PlanQuotaConfig> = {
  free: {
    type: 'user_hard_cap',
    includedUnits: 10_000, // 10,000 units per user across single domain
    overageRatePaisa: 0,
    hardCap: true, // Over cap returns 429
  },
  pro: {
    type: 'per_domain_allowance',
    includedUnits: 25_000, // 25,000 units per domain
    overageRatePaisa: METERING_RATES.proOverageRatePaisa,
    hardCap: false, // Accrues overage
  },
  enterprise: {
    type: 'per_domain_allowance',
    includedUnits: 100_000, // 100,000 units per domain
    overageRatePaisa: METERING_RATES.enterpriseOverageRatePaisa,
    hardCap: false,
  },
};

export interface RouteTierDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';
  pattern: RegExp;
  routeId: string;
  tier: UnitTier;
  description: string;
}

/**
 * Canonical mapping of all SDK-facing routes to their respective billing tiers.
 * Verified by tests to ensure no SDK-facing endpoint lacks a designated tier.
 */
export const SDK_ROUTE_TIERS: RouteTierDefinition[] = [
  // Classification
  {
    method: 'POST',
    pattern: /^\/classify\/event(?:\/.*)?$/,
    routeId: 'POST /classify/event',
    tier: 'standard',
    description: 'Classify security event telemetry',
  },
  {
    method: 'POST',
    pattern: /^\/classify\/email(?:\/.*)?$/,
    routeId: 'POST /classify/email',
    tier: 'standard',
    description: 'Classify email phishing and threat signals',
  },
  {
    method: 'POST',
    pattern: /^\/classify\/url(?:\/.*)?$/,
    routeId: 'POST /classify/url',
    tier: 'standard',
    description: 'Classify URL domain typosquatting and threats',
  },
  {
    method: 'POST',
    pattern: /^\/classify\/product(?:\/.*)?$/,
    routeId: 'POST /classify/product',
    tier: 'standard',
    description: 'Classify product reviews and content integrity',
  },
  {
    method: 'GET',
    pattern: /^\/classify\/history(?:\/.*)?$/,
    routeId: 'GET /classify/history',
    tier: 'light',
    description: 'Read classification audit log history',
  },
  {
    method: 'POST',
    pattern: /^\/classify\/file(?:\/.*)?$/,
    routeId: 'POST /classify/file',
    tier: 'heavy',
    description: 'Deep file classification (entropy & magic bytes)',
  },

  // Encryption & Files
  {
    method: 'POST',
    pattern: /^\/files\/encrypt(?:-field)?(?:\/.*)?$/,
    routeId: 'POST /files/encrypt',
    tier: 'light',
    description: 'Field encryption (AES-256-GCM)',
  },
  {
    method: 'POST',
    pattern: /^\/files\/decrypt(?:-field)?(?:\/.*)?$/,
    routeId: 'POST /files/decrypt',
    tier: 'light',
    description: 'Field decryption (AES-256-GCM)',
  },
  {
    method: 'GET',
    pattern: /^\/files\/keys?\/status(?:\/.*)?$/,
    routeId: 'GET /files/key/status',
    tier: 'light',
    description: 'Read encryption master key status & version',
  },
  {
    method: 'GET',
    pattern: /^\/files$/,
    routeId: 'GET /files',
    tier: 'light',
    description: 'List encrypted file records',
  },
  {
    method: 'POST',
    pattern: /^\/files\/upload(?:\/.*)?$/,
    routeId: 'POST /files/upload',
    tier: 'heavy',
    description: 'File upload and envelope encryption',
  },
  {
    method: 'GET',
    pattern: /^\/files\/[a-zA-Z0-9_-]+\/download(?:\/.*)?$/,
    routeId: 'GET /files/:id/download',
    tier: 'heavy',
    description: 'File download and envelope decryption',
  },

  // Telemetry, Logs, and Alerts
  {
    method: 'GET',
    pattern: /^\/logs(?:\/.*)?$/,
    routeId: 'GET /logs',
    tier: 'light',
    description: 'Read security event logs',
  },
  {
    method: 'GET',
    pattern: /^\/alerts(?:\/.*)?$/,
    routeId: 'GET /alerts',
    tier: 'light',
    description: 'Read intrusion detection alerts',
  },
  {
    method: 'POST',
    pattern: /^\/domains\/telemetry(?:\/.*)?$/,
    routeId: 'POST /domains/telemetry',
    tier: 'light',
    description: 'Ingest client telemetry record',
  },
];

/**
 * Resolves the unit tier for a given method and path.
 * Returns null if the path is unmetered (e.g. /health, /domains management, /billing).
 */
export function getTierForRoute(method: string, path: string): UnitTier | null {
  const cleanPath = path.split('?')[0];
  const upperMethod = method.toUpperCase();

  for (const def of SDK_ROUTE_TIERS) {
    if (def.method === '*' || def.method === upperMethod) {
      if (def.pattern.test(cleanPath)) {
        return def.tier;
      }
    }
  }

  return null;
}

/**
 * Returns units consumed for a given tier.
 */
export function getUnitsForTier(tier: UnitTier): number {
  return TIER_UNITS[tier] ?? 1;
}

/**
 * Returns quota config for a plan id.
 */
export function getPlanQuota(planId: string): PlanQuotaConfig {
  const normalized = (planId || 'free').toLowerCase();
  return PLAN_QUOTAS[normalized] ?? PLAN_QUOTAS.free;
}
