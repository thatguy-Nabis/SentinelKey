import type { MongoMemoryServer } from 'mongodb-memory-server';

let server: MongoMemoryServer | null = null;

/**
 * Start an ephemeral in-memory MongoDB for local development — no Docker, no
 * system install, no admin rights. The mongod binary is downloaded on first use
 * and cached under the user profile.
 *
 * ponytail: data is wiped on process exit. Fine for dev/CI; use a real MongoDB
 * (via MONGODB_URI) for anything you need to persist.
 *
 * Returns the connection URI, or null if the binary cannot be downloaded/started.
 */
export async function startMemoryMongo(): Promise<string | null> {
  if (server) return server.getUri();
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const path = await import('path');
    const fs = await import('fs');

    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const shouldPersist = !isTest && process.env.PERSIST_MEMORY_MONGO !== 'false';

    if (shouldPersist) {
      const dbPath = path.resolve(process.cwd(), 'data/mongo-dev');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      server = await MongoMemoryServer.create({
        instance: {
          dbName: 'sentinelkey',
          dbPath,
          storageEngine: 'wiredTiger',
        },
      });
      console.log(`[DB] Started local persistent MongoDB at ${dbPath}`);
    } else {
      server = await MongoMemoryServer.create({ instance: { dbName: 'sentinelkey' } });
      console.log('[DB] Started ephemeral in-memory MongoDB');
    }

    return server.getUri();
  } catch (err) {
    console.warn('[DB] Failed to start in-memory MongoDB:', err);
    return null;
  }
}

/** Stop the in-memory MongoDB (used on graceful shutdown). */
export async function stopMemoryMongo(): Promise<void> {
  if (server) {
    await server.stop();
    server = null;
  }
}
