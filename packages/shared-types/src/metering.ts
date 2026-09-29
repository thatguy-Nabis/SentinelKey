/**
 * Unit tiers for API metering.
 * - light (1 unit): field encrypt/decrypt, key status, log/alert reads
 * - standard (3 units): classify event / email / URL / product
 * - heavy (10 units): file classify, file upload/download encryption, ML-scored events
 */
export type UnitTier = 'light' | 'standard' | 'heavy';

export interface IUsageUnitsByTier {
  light: number;
  standard: number;
  heavy: number;
}

export interface IUsageRollup {
  id: string;
  domainId: string;
  userId: string;
  date: string; // YYYY-MM-DD UTC
  unitsByTier: IUsageUnitsByTier;
  unitsTotal: number;
  requestsTotal: number;
  requestsSuccess: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDomainUsageSummary {
  domainId: string;
  label: string;
  origin: string;
  status: string;
  unitsByTier: IUsageUnitsByTier;
  unitsTotal: number;
  includedUnits: number;
  overageUnits: number;
  projectedOveragePaisa: number;
}

export interface IUsageSummaryResponse {
  periodStart: string;
  periodEnd: string;
  planId: string;
  totalUnits: number;
  includedUnits: number;
  remainingUnits: number;
  overageUnits: number;
  overageRatePaisa: number;
  projectedOveragePaisa: number;
  domains: IDomainUsageSummary[];
}

export interface IDailyUsageBreakdown {
  date: string;
  unitsByTier: IUsageUnitsByTier;
  unitsTotal: number;
  requestsTotal: number;
  requestsSuccess: number;
}

export interface IDomainDailyUsageResponse {
  domainId: string;
  label: string;
  origin: string;
  periodStart: string;
  periodEnd: string;
  totalUnits: number;
  daily: IDailyUsageBreakdown[];
}

export interface IAccruedOverageEstimate {
  domainId: string;
  label: string;
  origin: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalUnits: number;
  includedUnits: number;
  overageUnits: number;
  overageRatePaisa: number;
  accruedOveragePaisa: number;
  isPayable: boolean;
}
