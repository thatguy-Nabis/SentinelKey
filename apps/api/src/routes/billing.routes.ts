import { Router } from 'express';
import {
  getPlans,
  getSubscription,
  checkout,
  verifyPayment,
  cancelSubscription,
  listInvoices,
} from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Public: GET /billing/plans
router.get('/plans', getPlans);

// Protected routes (require valid JWT)
router.get('/subscription', authenticate, getSubscription);
router.post('/checkout', authenticate, checkout);
router.get('/verify', authenticate, verifyPayment);
router.post('/cancel', authenticate, cancelSubscription);
router.get('/invoices', authenticate, listInvoices);

export default router;
