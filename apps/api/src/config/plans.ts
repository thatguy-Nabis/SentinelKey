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
      'Local cryptographic enclaves',
      'Community threat signatures',
      'Standard rate limiting & RBAC',
      'Community forum support',
    ],
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
      'ML Anomaly Detection (isolation forest)',
      'Field & File AES-256-GCM Encryption',
      'Automated remote attestation cache',
      'Priority security alert routing',
      '99.9% uptime SLA & email support',
    ],
    highlighted: true,
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
      'Hardware Enclave (SGX/Nitro) integration',
      'Custom compliance classifiers (GDPR, HIPAA, PCI)',
      'Single Sign-On (SAML / OIDC / SCIM)',
      'Dedicated security architect',
      '1-hour SLA 24/7 critical incident response',
    ],
  },
};

export function getPlanById(id: string): IBillingPlan | undefined {
  return BILLING_PLANS[id];
}

export function getAllPlans(): IBillingPlan[] {
  return Object.values(BILLING_PLANS);
}
