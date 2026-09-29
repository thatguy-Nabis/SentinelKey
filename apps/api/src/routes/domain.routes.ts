import { Router } from 'express';
import {
  registerDomain,
  listDomains,
  getDomain,
  updateDomain,
  rotateKey,
  suspendDomain,
  reactivateDomain,
  deleteDomain,
  keepDomainsOnDowngrade,
  probeDomain,
  simulateDomainTraffic,
} from '../controllers/domain.controller.js';
import { ingestTelemetry } from '../controllers/client-domain.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Ingestion endpoint (called by client app with API key or Bearer)
router.post('/telemetry', ingestTelemetry);

// Domain downgrade selection route (registered before /:id)
router.post('/keep', authenticate, authorize('domains:write'), keepDomainsOnDowngrade);

// Standard Domain Management Endpoints
router.post('/', authenticate, authorize('domains:write'), registerDomain);
router.get('/', authenticate, authorize('domains:read'), listDomains);
router.get('/:id', authenticate, authorize('domains:read'), getDomain);
router.patch('/:id', authenticate, authorize('domains:write'), updateDomain);
router.delete('/:id', authenticate, authorize('domains:write'), deleteDomain);

// Domain Actions
router.post('/:id/rotate-key', authenticate, authorize('domains:write'), rotateKey);
router.post('/:id/suspend', authenticate, authorize('domains:write'), suspendDomain);
router.post('/:id/reactivate', authenticate, authorize('domains:write'), reactivateDomain);

// Backwards compatibility simulation & probe endpoints
router.post('/:id/ping', authenticate, probeDomain);
router.post('/:id/simulate', authenticate, simulateDomainTraffic);

export default router;
