import { Router } from 'express';
import {
  registerDomain,
  listDomains,
  getDomain,
  deleteDomain,
  probeDomain,
  simulateDomainTraffic,
  ingestTelemetry,
} from '../controllers/client-domain.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Ingestion endpoint (called by client app with API key)
router.post('/telemetry', ingestTelemetry);

// Protected routes (management console)
router.get('/', authenticate, listDomains);
router.post('/', authenticate, registerDomain);
router.get('/:id', authenticate, getDomain);
router.delete('/:id', authenticate, deleteDomain);
router.post('/:id/ping', authenticate, probeDomain);
router.post('/:id/simulate', authenticate, simulateDomainTraffic);

export default router;
