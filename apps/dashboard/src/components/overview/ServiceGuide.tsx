import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Lock,
  Activity,
  Shield,
  ShieldAlert,
  Zap,
  FileText,
  CheckCircle2,
  Terminal,
  Loader2,
} from 'lucide-react';
import type { IBillingPlan, BillingPlanId } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import { useIsMobile } from '../../hooks/useMediaQuery';

const PLAN_RANK: Record<BillingPlanId, number> = { free: 0, pro: 1, enterprise: 2 };

interface ServiceEntry {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  howTo: string;
  /** Dashboard tab to open (renders a CTA button). */
  tab?: string;
  tabLabel?: string;
  /** CTA only renders for admins. */
  adminOnly?: boolean;
  /** Minimum plan required to unlock. */
  minPlan: BillingPlanId;
}

const SERVICES: ServiceEntry[] = [
  {
    key: 'auth',
    name: 'Authentication & RBAC',
    icon: <Users size={18} />,
    description:
      'Hand-built JWT (access + refresh) with role-based access control. Admin, analyst, and viewer roles are seeded on first boot.',
    howTo: 'The first account to register becomes admin. Manage users & roles in Access Control.',
    tab: 'admin',
    tabLabel: 'Manage Access',
    adminOnly: true,
    minPlan: 'free',
  },
  {
    key: 'mfa',
    name: 'Multi-Factor Authentication (TOTP)',
    icon: <Lock size={18} />,
    description:
      'Time-based one-time passwords with attempt limiting and lockout on repeated failures.',
    howTo: 'Enable 2FA from the MFA panel — scan the QR code with any authenticator app.',
    tab: 'mfa',
    tabLabel: 'Set Up MFA',
    minPlan: 'free',
  },
  {
    key: 'ids',
    name: 'Security Logging & IDS',
    icon: <Activity size={18} />,
    description:
      'Every security-relevant action emits a SecurityEvent; rule-based heuristics raise deduplicated, throttled alerts.',
    howTo: 'Inspect the event stream in Security Logs and triage open alerts in IDS Alerts.',
    tab: 'logs',
    tabLabel: 'Open Logs',
    minPlan: 'free',
  },
  {
    key: 'dashboard',
    name: 'Security Operations Dashboard',
    icon: <Shield size={18} />,
    description:
      'RBAC-aware console over auth, logs, alerts, and settings — the surface you are using now.',
    howTo: 'Metrics auto-refresh every 10 s. Click any stat card to jump to its detail view.',
    minPlan: 'free',
  },
  {
    key: 'encryption',
    name: 'Field & File Encryption',
    icon: <ShieldAlert size={18} />,
    description:
      'AES-256-GCM field and file encryption with master-key rotation and version tagging.',
    howTo: 'SDK: encryptField() / uploadFile(). API: POST /files/encrypt-field, POST /files/upload.',
    minPlan: 'pro',
  },
  {
    key: 'ml',
    name: 'ML Anomaly Detection',
    icon: <Zap size={18} />,
    description:
      'Isolation-forest anomaly scoring over the event stream, with heuristic fallback when the ML service is offline.',
    howTo: 'ml-service (:5001) POST /score. The API falls back to heuristics automatically.',
    minPlan: 'pro',
  },
  {
    key: 'classify',
    name: 'Compliance Classification',
    icon: <FileText size={18} />,
    description:
      'Deterministic event / file / email classification against a shared rules engine — no LLM.',
    howTo: 'SDK: classifyEvent() / classifyFile() / classifyEmail(). API: POST /classify/*.',
    minPlan: 'free',
  },
  {
    key: 'compliance-packs',
    name: 'Custom Compliance Packs',
    icon: <CheckCircle2 size={18} />,
    description: 'GDPR, HIPAA, and PCI classification baselines tuned to regulated workloads.',
    howTo: 'Included with the Enterprise plan.',
    minPlan: 'enterprise',
  },
  {
    key: 'sdk',
    name: 'SDK & Browser Extension',
    icon: <Terminal size={18} />,
    description:
      'Typed Node SDK (@sentinelkey/security-stack-sdk) and a fail-closed Manifest V3 browser extension.',
    howTo: 'SDK: createSentinelKeyClient({ baseUrl }). Extension: load unpacked from /extension.',
    minPlan: 'free',
  },
];

const PLAN_COLORS: Record<BillingPlanId, { bg: string; color: string; border: string }> = {
  free: { bg: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-secondary)', border: 'rgba(148, 163, 184, 0.3)' },
  pro: { bg: 'rgba(0, 240, 255, 0.1)', color: 'var(--color-cyan)', border: 'rgba(0, 240, 255, 0.3)' },
  enterprise: { bg: 'rgba(168, 85, 247, 0.12)', color: 'var(--color-purple)', border: 'rgba(168, 85, 247, 0.35)' },
};

export const ServiceGuide: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile(768);
  const [plan, setPlan] = useState<IBillingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sub, plans] = await Promise.all([api.fetchSubscription(), api.fetchPlans()]);
        if (cancelled) return;
        const current =
          plans.find((p) => p.id === sub.planId) ?? plans.find((p) => p.id === 'free') ?? null;
        setPlan(current);
      } catch {
        // Fall back to showing the guide against the free plan if billing is unreachable.
        if (!cancelled) setPlan(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planId: BillingPlanId = plan?.id ?? 'free';
  const isUnlocked = (min: BillingPlanId) => PLAN_RANK[planId] >= PLAN_RANK[min];
  const planBadge = PLAN_COLORS[planId] ?? PLAN_COLORS.free;

  return (
    <div className="glass-panel" style={{ height: isMobile ? 320 : 280, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Shield size={18} style={{ color: 'var(--color-cyan)' }} />
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Service Guide</h3>
        {!loading && (
          <span
            className="badge"
            style={{
              marginLeft: 'auto',
              background: planBadge.bg,
              color: planBadge.color,
              border: `1px solid ${planBadge.border}`,
            }}
          >
            {plan?.name ?? 'Community Free'}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
        What each service does, how to reach it, and what your plan unlocks.
      </p>

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Loader2 size={14} className="animate-spin" />
            Loading your plan…
          </div>
        ) : (
          SERVICES.map((s) => {
            const unlocked = isUnlocked(s.minPlan);
            const showCta = unlocked && s.tab && (!s.adminOnly || isAdmin);
            return (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(11, 17, 32, 0.4)',
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: unlocked ? 'rgba(0, 240, 255, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                    color: unlocked ? 'var(--color-cyan)' : 'var(--text-muted)',
                  }}
                >
                  {s.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{s.name}</span>
                    {!unlocked && (
                      <span className="badge badge-high" style={{ padding: '1px 6px', fontSize: '0.62rem' }}>
                        {s.minPlan === 'pro' ? 'PRO' : 'ENTERPRISE'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{s.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {unlocked ? s.howTo : `Requires the ${s.minPlan === 'pro' ? 'Pro' : 'Enterprise'} plan`}
                  </div>
                </div>

                {showCta && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab(s.tab!)} style={{ flexShrink: 0 }}>
                    {s.tabLabel}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
