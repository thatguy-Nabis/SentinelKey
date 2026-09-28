import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, validateEnv } from './config/env.js';
import { connectDatabase } from './db/connection.js';
import { startMemoryMongo, stopMemoryMongo } from './db/memory-mongo.js';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './routes/auth.routes.js';
import logsRoutes from './routes/logs.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import filesRoutes from './routes/files.routes.js';
import classificationRoutes from './routes/classification.routes.js';
import policiesRoutes from './routes/policies.routes.js';
import billingRoutes from './routes/billing.routes.js';
import clientDomainRoutes from './routes/client-domain.routes.js';

// Validate env vars (throws in production if secrets are missing)
validateEnv();

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check (from Phase 0)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'api' });
});

// Phase 1 + 2 — Auth + RBAC + MFA routes
app.use('/auth', authRoutes);

// Phase 3 — Logging + Intrusion Detection routes
app.use('/logs', logsRoutes);
app.use('/alerts', alertsRoutes);

// Phase 5 — Encryption + Files routes
app.use('/files', filesRoutes);

// Phase 7 — Compliance & Classification routes
app.use('/classify', classificationRoutes);
app.use('/policies', policiesRoutes);

// Billing & Subscription routes (Khalti & Mock)
app.use('/billing', billingRoutes);

// Client Application & Domain routes
app.use('/domains', clientDomainRoutes);

// Global error handler (must be last)
app.use(errorHandler);


/**
 * Resolve the MongoDB connection URI for this run:
 * - An explicit MONGODB_URI env var always wins (real local/remote Mongo).
 * - Otherwise, in development, start an ephemeral in-memory MongoDB so the
 *   stack runs with zero external services (no Docker, no local install).
 * - Set USE_MEMORY_MONGO=false to force the default localhost URI instead.
 */
async function resolveMongoUri(): Promise<{ uri: string; ephemeral: boolean }> {
  if (process.env.MONGODB_URI) {
    return { uri: env.MONGODB_URI, ephemeral: false };
  }
  if (env.NODE_ENV !== 'production' && process.env.USE_MEMORY_MONGO !== 'false') {
    const memoryUri = await startMemoryMongo();
    if (memoryUri) return { uri: memoryUri, ephemeral: true };
  }
  return { uri: env.MONGODB_URI, ephemeral: false };
}

// Start server
async function start(): Promise<void> {
  const { uri, ephemeral } = await resolveMongoUri();
  if (ephemeral) {
    console.log('[DB] Using ephemeral in-memory MongoDB (data is lost on restart).');
  }

  await connectDatabase(uri);

  const server = app.listen(env.PORT, () => {
    console.log(`SentinelKey API listening on port ${env.PORT}`);
  });

  // Graceful shutdown: stop the in-memory Mongo alongside the HTTP server
  const shutdown = async () => {
    server.close();
    await stopMemoryMongo();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[FATAL] Failed to start:', err);
  process.exit(1);
});

export { app };
