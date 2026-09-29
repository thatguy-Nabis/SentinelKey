export type BillingPlanId = 'free' | 'pro' | 'enterprise';

export type PaymentStatus =
  | 'Initiated'
  | 'Pending'
  | 'Completed'
  | 'Expired'
  | 'User canceled'
  | 'Refunded'
  | 'Partially Refunded';

export type SubscriptionStatus = 'active' | 'pending' | 'canceled' | 'expired';

export interface IBillingPlan {
  id: BillingPlanId;
  name: string;
  priceNpr: number;
  currency: 'NPR';
  interval: 'month' | 'year' | 'custom';
  description: string;
  features: string[];
  highlighted?: boolean;
  domainLimit?: number;
}

export interface ISubscription {
  id?: string;
  userId: string;
  planId: BillingPlanId;
  status: SubscriptionStatus;
  khaltiPidx?: string;
  currentPeriodStart?: string | Date;
  currentPeriodEnd?: string | Date;
  cancelAtPeriodEnd?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type InvoiceType = 'subscription' | 'usage';

export interface IUsageInvoiceLineItem {
  tier?: string;
  units?: number;
  ratePaisa?: number;
  amountPaisa: number;
  description: string;
}

export interface IInvoice {
  id: string;
  _id?: string;
  userId: string;
  type?: InvoiceType;
  domainId?: string;
  domainOrigin?: string;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  lineItems?: IUsageInvoiceLineItem[];
  dueDate?: string | Date;
  amountPaisa: number;
  amountNpr: number;
  currency: string;
  status: PaymentStatus;
  planId: BillingPlanId;
  khaltiPidx?: string;
  transactionId?: string;
  paidAt?: string | Date;
  createdAt: string | Date;
}

export interface ICheckoutSessionRequest {
  planId: BillingPlanId;
  phone?: string;
  customerName?: string;
}

export interface ICheckoutSessionResponse {
  pidx: string;
  url: string;
  orderId: string;
  expiresAt?: string;
  expiresIn?: number;
}

export interface IVerifyPaymentResponse {
  success: boolean;
  status: PaymentStatus;
  subscription: ISubscription;
  transactionId?: string;
  amountPaisa?: number;
  message?: string;
}
