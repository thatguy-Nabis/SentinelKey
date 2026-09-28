import { IBillingPlan } from '@sentinelkey/shared-types';

export const BILLING_PLANS: Record<string, IBillingPlan> = {
  free: {
    id: 'free',
    name: 'Community Free',
    priceNpr: 0,
    currency: 'NPR',
    interval: 'month',
    description: 'Essential local enclave execution and core cryptographic verification for individual developers.',
    features: [
      '1 Developer seat',
      '1 Protected client domain / localhost port',
      'Local cryptographic enclaves',
      'Community threat signatures',
      'Standard rate limiting & RBAC',
      'Community forum support',
    ],
    domainLimit: 1,
  },
  pro: {
    id: 'pro',
    name: 'SentinelKey Pro',
    priceNpr: 2499,
    currency: 'NPR',
    interval: 'month',
    description: 'Full autonomous security with ML anomaly detection, remote attestation, and priority alerts.',
    features: [
      'Up to 10 Team seats',
      'Up to 5 Protected client domains / localhost ports',
      'ML Anomaly Detection (isolation forest)',
      'Field & File AES-256-GCM Encryption',
      'Automated remote attestation cache',
      'Priority security alert routing',
      '99.9% uptime SLA & email support',
    ],
    highlighted: true,
    domainLimit: 5,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Sentinel',
    priceNpr: 14999,
    currency: 'NPR',
    interval: 'month',
    description: 'Custom enclaves, FIPS 140-3 compliance baselines, dedicated clusters, and 24/7 incident response.',
    features: [
      'Unlimited seats & workload clusters',
      'Unlimited Protected client domains',
      'Hardware Enclave (SGX/Nitro) integration',
      'Custom compliance classifiers (GDPR, HIPAA, PCI)',
      'Single Sign-On (SAML / OIDC / SCIM)',
      'Dedicated security architect',
      '1-hour SLA 24/7 critical incident response',
    ],
    domainLimit: 50,
  },
};

export function getPlanById(id: string): IBillingPlan | undefined {
  return BILLING_PLANS[id];
}

export function getAllPlans(): IBillingPlan[] {
  return Object.values(BILLING_PLANS);
}

export function getMaxDomainsForPlan(planId: string): number {
  const plan = BILLING_PLANS[planId];
  return plan?.domainLimit ?? 1;
}
