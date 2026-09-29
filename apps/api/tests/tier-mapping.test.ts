import { describe, it, expect } from 'vitest';
import {
  SDK_ROUTE_TIERS,
  getTierForRoute,
  getUnitsForTier,
  TIER_UNITS,
  getPlanQuota,
  PLAN_QUOTAS,
} from '../src/config/metering.js';

describe('Sub-Phase 10b: Tier Mapping Completeness & Weights', () => {
  it('should define unit weights matching the specification', () => {
    expect(TIER_UNITS.light).toBe(1);
    expect(TIER_UNITS.standard).toBe(3);
    expect(TIER_UNITS.heavy).toBe(10);

    expect(getUnitsForTier('light')).toBe(1);
    expect(getUnitsForTier('standard')).toBe(3);
    expect(getUnitsForTier('heavy')).toBe(10);
  });

  it('should define plan quotas matching specification', () => {
    const free = getPlanQuota('free');
    expect(free.type).toBe('user_hard_cap');
    expect(free.includedUnits).toBe(10_000);
    expect(free.hardCap).toBe(true);

    const pro = getPlanQuota('pro');
    expect(pro.type).toBe('per_domain_allowance');
    expect(pro.includedUnits).toBe(25_000);
    expect(pro.overageRatePaisa).toBe(4);
    expect(pro.hardCap).toBe(false);

    const enterprise = getPlanQuota('enterprise');
    expect(enterprise.includedUnits).toBe(100_000);
    expect(enterprise.overageRatePaisa).toBe(3);
    expect(enterprise.hardCap).toBe(false);
  });

  it('should ensure every registered route tier definition is valid', () => {
    expect(SDK_ROUTE_TIERS.length).toBeGreaterThanOrEqual(10);

    for (const route of SDK_ROUTE_TIERS) {
      expect(['light', 'standard', 'heavy']).toContain(route.tier);
      expect(route.routeId).toBeDefined();
      expect(route.pattern).toBeInstanceOf(RegExp);
      expect(route.description.length).toBeGreaterThan(0);
    }
  });

  it('should map classification routes to their specified tiers', () => {
    expect(getTierForRoute('POST', '/classify/event')).toBe('standard');
    expect(getTierForRoute('POST', '/classify/email')).toBe('standard');
    expect(getTierForRoute('POST', '/classify/url')).toBe('standard');
    expect(getTierForRoute('POST', '/classify/product')).toBe('standard');
    expect(getTierForRoute('POST', '/classify/file')).toBe('heavy');
    expect(getTierForRoute('GET', '/classify/history')).toBe('light');
  });

  it('should map file and encryption routes to their specified tiers', () => {
    expect(getTierForRoute('POST', '/files/encrypt')).toBe('light');
    expect(getTierForRoute('POST', '/files/encrypt-field')).toBe('light');
    expect(getTierForRoute('POST', '/files/decrypt')).toBe('light');
    expect(getTierForRoute('POST', '/files/decrypt-field')).toBe('light');
    expect(getTierForRoute('GET', '/files/keys/status')).toBe('light');
    expect(getTierForRoute('GET', '/files/key/status')).toBe('light');
    expect(getTierForRoute('GET', '/files')).toBe('light');
    expect(getTierForRoute('POST', '/files/upload')).toBe('heavy');
    expect(getTierForRoute('GET', '/files/file-12345/download')).toBe('heavy');
  });

  it('should map telemetry and log read routes to light tier', () => {
    expect(getTierForRoute('GET', '/logs')).toBe('light');
    expect(getTierForRoute('GET', '/logs?page=1&limit=10')).toBe('light');
    expect(getTierForRoute('GET', '/alerts')).toBe('light');
    expect(getTierForRoute('POST', '/domains/telemetry')).toBe('light');
  });

  it('should return null (unmetered) for administrative and unmetered routes', () => {
    expect(getTierForRoute('GET', '/health')).toBeNull();
    expect(getTierForRoute('GET', '/domains')).toBeNull();
    expect(getTierForRoute('POST', '/domains')).toBeNull();
    expect(getTierForRoute('GET', '/billing/subscription')).toBeNull();
    expect(getTierForRoute('GET', '/billing/usage')).toBeNull();
  });
});
