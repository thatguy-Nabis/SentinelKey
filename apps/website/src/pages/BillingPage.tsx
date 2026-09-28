import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CreditCard,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  Shield,
  Phone,
  X,
} from 'lucide-react';

import { HubHeader } from '../components/hub/HubHeader.js';
import { HubSidebar } from '../components/hub/HubSidebar.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import type { IBillingPlan, ISubscription, IInvoice } from '@sentinelkey/shared-types';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<IBillingPlan[]>([]);
  const [subscription, setSubscription] = useState<ISubscription | null>(null);
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal for Khalti phone & confirmation
  const [checkoutModalPlan, setCheckoutModalPlan] = useState<IBillingPlan | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');

  const pidxParam = searchParams.get('pidx');

  const fetchData = async () => {
    // Plans are public — load them independently so the upgrade cards always render,
    // even when the subscription / invoice calls fail (e.g. signed out or expired session).
    const [plansRes, subRes, invRes] = await Promise.allSettled([
      api.getBillingPlans(),
      api.getSubscription(),
      api.getInvoices(),
    ]);

    if (plansRes.status === 'fulfilled') {
      setPlans(plansRes.value);
    } else {
      const reason = plansRes.reason as Error | undefined;
      setMessage({ text: reason?.message || 'Failed to load available plans', type: 'error' });
    }

    if (subRes.status === 'fulfilled') setSubscription(subRes.value);
    if (invRes.status === 'fulfilled') setInvoices(invRes.value);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Khalti redirect return verification if ?pidx=... is in query
  useEffect(() => {
    if (pidxParam) {
      const verify = async () => {
        setActionLoading('verifying');
        try {
          const res = await api.verifyPayment(pidxParam);

          // Clean up the ?pidx=... query parameter from URL so browser refreshes do not re-verify
          window.history.replaceState({}, document.title, window.location.pathname);

          if (res.success && res.status === 'Completed') {
            const planName = res.subscription.planId.toUpperCase();
            const txInfo = res.transactionId ? ` (Ref: ${res.transactionId})` : '';
            setMessage({
              text: `Payment successful! Your SentinelKey ${planName} subscription is now active.${txInfo}`,
              type: 'success',
            });
          } else {
            setMessage({
              text: `Payment status: ${res.status}. ${res.message || 'If you completed the payment on Khalti, it may take a few moments to sync.'}`,
              type: 'info',
            });
          }
          await fetchData();
        } catch (err: any) {
          window.history.replaceState({}, document.title, window.location.pathname);
          setMessage({ text: err.message || 'Payment verification failed', type: 'error' });
        } finally {
          setActionLoading(null);
        }
      };
      verify();
    }
  }, [pidxParam]);

  const handleOpenCheckout = (plan: IBillingPlan) => {
    if (plan.priceNpr === 0 || plan.id === 'free') {
      // Free plan requires no payment gateway
      executeCheckout(plan.id);
      return;
    }
    setCheckoutModalPlan(plan);
  };

  const executeCheckout = async (planId: string, phone?: string, name?: string) => {
    setActionLoading(planId);
    setMessage(null);
    try {
      const res = await api.checkout(planId, {
        phone: phone?.trim() || undefined,
        customerName: name?.trim() || undefined,
      });
      if (res.url) {
        // Redirect to Khalti hosted checkout page (or mock in dev)
        window.location.href = res.url;
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to initiate checkout', type: 'error' });
      setActionLoading(null);
      setCheckoutModalPlan(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to schedule cancellation at the end of your billing cycle?')) {
      return;
    }
    setActionLoading('cancel');
    try {
      await api.cancelSubscription();
      setMessage({ text: 'Subscription set to cancel at end of current period.', type: 'info' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to cancel subscription', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--hub-bg-app)', color: 'var(--hub-text-primary)' }}>
      <HubHeader />
      <div style={{ display: 'flex' }}>
        <HubSidebar />

        <main style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                Workspace / Settings
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Billing & Subscription
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Manage your license plans, payment details, and Khalti ePayment invoices.
                  </p>
                </div>

                {/* Khalti badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    backgroundColor: '#1E1435',
                    border: '1px solid #4C1D95',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                >
                  <Shield size={16} color="#A78BFA" />
                  <span style={{ color: '#E2E8F0', fontWeight: 600 }}>Khalti ePayment API v2</span>
                  <span style={{ color: '#A78BFA', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>NPR</span>
                </div>
              </div>
            </div>

            {/* Notification alert */}
            {message && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '8px',
                  marginBottom: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.9rem',
                  backgroundColor:
                    message.type === 'success'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : message.type === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(96, 165, 250, 0.15)',
                  border: `1px solid ${
                    message.type === 'success'
                      ? '#10B981'
                      : message.type === 'error'
                      ? '#EF4444'
                      : '#3B82F6'
                  }`,
                  color:
                    message.type === 'success'
                      ? '#34D399'
                      : message.type === 'error'
                      ? '#F87171'
                      : '#60A5FA',
                }}
              >
                {message.type === 'success' ? (
                  <Check size={18} />
                ) : message.type === 'error' ? (
                  <AlertCircle size={18} />
                ) : (
                  <Clock size={18} />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', color: '#8B5CF6' }}>
                <Loader2 size={32} className="pulse-emerald" />
              </div>
            ) : (
              <>
                {/* Current Subscription Card */}
                <div
                  className="hub-card"
                  style={{
                    padding: '1.75rem 2rem',
                    marginBottom: '3rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                  }}
                >
                  {!user ? (
                    <>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          CURRENT ACTIVE PLAN
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
                          Sign in to manage your subscription
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                          Upgrade to Pro or Enterprise to unlock encryption, ML anomaly detection, and compliance packs.
                        </p>
                      </div>
                      <div>
                        <Link
                          to="/login"
                          style={{
                            backgroundColor: 'var(--hub-purple-primary)',
                            color: '#FFFFFF',
                            padding: '0.55rem 1.25rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          Sign In
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          CURRENT ACTIVE PLAN
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
                            {subscription?.planId === 'pro'
                              ? 'SentinelKey Pro'
                              : subscription?.planId === 'enterprise'
                              ? 'Enterprise Sentinel'
                              : 'Community Free'}
                          </h2>
                          {subscription && (
                            <span
                              style={{
                                backgroundColor:
                                  subscription.status === 'active'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color: subscription.status === 'active' ? '#10B981' : '#F59E0B',
                                border: `1px solid ${subscription.status === 'active' ? '#10B981' : '#F59E0B'}`,
                                padding: '0.2rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {subscription.status}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                          {!subscription
                            ? 'Loading subscription…'
                            : subscription.cancelAtPeriodEnd
                            ? 'Cancellation pending at cycle end.'
                            : subscription.planId !== 'free'
                            ? `Renews on: ${new Date(subscription.currentPeriodEnd || Date.now()).toLocaleDateString()}`
                            : 'Free tier has no recurring charges.'}
                        </p>
                      </div>

                      <div>
                        {subscription && subscription.planId !== 'free' && !subscription.cancelAtPeriodEnd && (
                          <button
                            onClick={handleCancel}
                            disabled={actionLoading === 'cancel'}
                            style={{
                              backgroundColor: '#261C3D',
                              color: '#F87171',
                              border: '1px solid #452D5A',
                              padding: '0.55rem 1.25rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Plan Selection Cards */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>
                  Available Plans (Paid via Khalti)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '4rem',
                  }}
                >
                  {plans.map((p) => {
                    const isCurrent = subscription?.planId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="hub-card"
                        style={{
                          padding: '2rem',
                          border: p.highlighted ? '2px solid #8B5CF6' : '1px solid var(--hub-card-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                        }}
                      >
                        {p.highlighted && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-12px',
                              right: '20px',
                              backgroundColor: '#8B5CF6',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 10px',
                              borderRadius: '999px',
                            }}
                          >
                            RECOMMENDED
                          </span>
                        )}

                        <div>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                            {p.name}
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#94A3B8', minHeight: '44px', marginBottom: '1.25rem' }}>
                            {p.description}
                          </p>

                          <div style={{ marginBottom: '1.75rem' }}>
                            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                              NPR {p.priceNpr.toLocaleString()}
                            </span>
                            <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}> / {p.interval}</span>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                              ({(p.priceNpr * 100).toLocaleString()} Paisa)
                            </div>
                          </div>

                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
                            {p.features.map((f, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#CBD5E1' }}>
                                <Check size={15} color="#10B981" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          {isCurrent ? (
                            <button
                              disabled
                              style={{
                                width: '100%',
                                backgroundColor: '#1C1830',
                                color: '#94A3B8',
                                border: '1px solid #2F2450',
                                padding: '0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                              }}
                            >
                              Current Plan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenCheckout(p)}
                              disabled={actionLoading === p.id}
                              style={{
                                width: '100%',
                                backgroundColor: p.highlighted ? 'var(--hub-purple-primary)' : '#261C49',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s',
                              }}
                            >
                              {actionLoading === p.id ? (
                                <Loader2 size={16} className="pulse-emerald" />
                              ) : (
                                <>
                                  <CreditCard size={15} />
                                  <span>{p.priceNpr === 0 ? 'Downgrade to Free' : 'Upgrade via Khalti'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Invoices Table */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>
                  Invoice History
                </h3>
                <div
                  className="hub-card"
                  style={{
                    overflowX: 'auto',
                    borderRadius: '10px',
                    padding: '0.5rem 0',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #231B3E', color: '#64748B', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        <th style={{ padding: '0.85rem 1.5rem' }}>INVOICE ID</th>
                        <th style={{ padding: '0.85rem 1.5rem' }}>DATE</th>
                        <th style={{ padding: '0.85rem 1.5rem' }}>PLAN</th>
                        <th style={{ padding: '0.85rem 1.5rem' }}>AMOUNT</th>
                        <th style={{ padding: '0.85rem 1.5rem' }}>TRANSACTION REF</th>
                        <th style={{ padding: '0.85rem 1.5rem' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
                            No invoice records found yet.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv) => (
                          <tr key={inv.id || (inv as any)._id} style={{ borderBottom: '1px solid #1C1635' }}>
                            <td style={{ padding: '0.85rem 1.5rem', fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>
                              {(inv.id || (inv as any)._id).substring(0, 12)}...
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem', color: '#94A3B8' }}>
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem', color: '#F8FAFC', fontWeight: 600 }}>
                              {inv.planId.toUpperCase()}
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem', fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
                              NPR {inv.amountNpr.toLocaleString()}
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem', fontFamily: 'var(--font-mono)', color: '#94A3B8', fontSize: '0.8rem' }}>
                              {inv.transactionId || (inv.khaltiPidx ? `${inv.khaltiPidx.substring(0, 10)}...` : '—')}
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem' }}>
                              <span
                                style={{
                                  backgroundColor:
                                    inv.status === 'Completed'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                  color: inv.status === 'Completed' ? '#10B981' : '#F59E0B',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Khalti Checkout Modal */}
      {checkoutModalPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 3, 15, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #4C1D95',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Shield size={18} color="#8B5CF6" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase' }}>
                    Khalti ePayment Checkout
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {checkoutModalPlan.name}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutModalPlan(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#1E1438',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                border: '1px solid #3B2063',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Plan Amount</span>
                <span style={{ color: '#F8FAFC', fontWeight: 600 }}>NPR {checkoutModalPlan.priceNpr.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Khalti Unit</span>
                <span style={{ color: '#A78BFA', fontFamily: 'var(--font-mono)' }}>{(checkoutModalPlan.priceNpr * 100).toLocaleString()} Paisa</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid #331D58' }}>
                <span style={{ color: '#CBD5E1', fontWeight: 600 }}>Total Due</span>
                <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1.1rem' }}>NPR {checkoutModalPlan.priceNpr.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                Customer Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#140E26',
                  border: '1px solid #3B2D60',
                  color: '#FFFFFF',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="#A78BFA" />
                  Khalti Registered Phone
                </span>
              </label>
              <input
                type="tel"
                placeholder="98XXXXXXXX (required in live environment)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#140E26',
                  border: '1px solid #3B2D60',
                  color: '#FFFFFF',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                Khalti ePayment API v2 requires mobile number for verification and SMS OTP.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCheckoutModalPlan(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#1C1830',
                  color: '#CBD5E1',
                  border: '1px solid #3B2D60',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeCheckout(checkoutModalPlan.id, customerPhone, customerName)}
                disabled={actionLoading === checkoutModalPlan.id}
                style={{
                  flex: 2,
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                {actionLoading === checkoutModalPlan.id ? (
                  <Loader2 size={16} className="pulse-emerald" />
                ) : (
                  <>
                    <span>Proceed to Khalti</span>
                    <ExternalLink size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
