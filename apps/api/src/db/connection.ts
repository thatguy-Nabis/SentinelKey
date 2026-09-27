import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { Role } from '../models/role.model.js';
import { User } from '../models/user.model.js';
import { DEFAULT_ROLES } from '../config/roles.js';
import { seedDefaultPolicies } from '../models/policy.model.js';

/**
 * Seed default roles if they don't already exist.
 * Runs once on app startup after DB connection.
 */
export async function seedRoles(): Promise<void> {
  for (const roleSeed of DEFAULT_ROLES) {
    const exists = await Role.findOne({ name: roleSeed.name });
    if (!exists) {
      await Role.create(roleSeed);
      console.log(`[SEED] Created role: ${roleSeed.name}`);
    }
  }
}

/**
 * Create the bootstrap admin from env vars if configured and no account exists yet.
 * Prevents the "first self-registering user becomes admin" hole on fresh deployments.
 */
export async function seedBootstrapAdmin(): Promise<void> {
  if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) return;

  const existing = await User.findOne({ email: env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase() });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.BOOTSTRAP_ADMIN_PASSWORD, 12);
  await User.create({
    email: env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    roles: ['admin'],
  });
  console.log(`[SEED] Created bootstrap admin: ${env.BOOTSTRAP_ADMIN_EMAIL}`);
}

/**
 * Connect to MongoDB and run seeds.
 */
export async function connectDatabase(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
    await seedRoles();
    await seedDefaultPolicies();
    await seedBootstrapAdmin();
  } catch (err) {
    console.error('[DB] Connection failed:', err);
    process.exit(1);
  }
}
