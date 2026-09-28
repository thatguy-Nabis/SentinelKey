import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/sentinelkey',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000), // 15 min
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 10),
  MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY ?? 'dev-mfa-encryption-key-32chars!!',
  MFA_MAX_FAILED_ATTEMPTS: Number(process.env.MFA_MAX_FAILED_ATTEMPTS ?? 5),
  MFA_LOCKOUT_DURATION_MS: Number(process.env.MFA_LOCKOUT_DURATION_MS ?? 300_000), // 5 min
  MFA_TOKEN_EXPIRES_IN: process.env.MFA_TOKEN_EXPIRES_IN ?? '5m',
  ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY ?? 'dev-encryption-master-key-32ch!!',
  FILE_STORAGE_DIR: process.env.FILE_STORAGE_DIR ?? 'data/encrypted-files',
  ACTIVE_KEY_VERSION: Number(process.env.ACTIVE_KEY_VERSION ?? 1),
  ENCRYPTION_MASTER_KEYS: process.env.ENCRYPTION_MASTER_KEYS ?? '',
  KEY_REGISTRY_PATH: process.env.KEY_REGISTRY_PATH ?? '',
  BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL ?? '',
  BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL ?? 'http://localhost:5001',
  ML_ANOMALY_THRESHOLD: Number(process.env.ML_ANOMALY_THRESHOLD ?? 0.65),
  ML_ANOMALY_ENABLED: process.env.ML_ANOMALY_ENABLED !== 'false',
  KHALTI_SECRET_KEY: process.env.KHALTI_SECRET_KEY ?? '',
  KHALTI_BASE_URL:
    process.env.KHALTI_BASE_URL ??
    (process.env.KHALTI_SECRET_KEY?.trim().replace(/^key\s+/i, '').startsWith('test_')
      ? 'https://dev.khalti.com/api/v2'
      : 'https://a.khalti.com/api/v2'),
  WEBSITE_URL: process.env.WEBSITE_URL ?? 'http://localhost:5174',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;


/** Validate that critical env vars are set in production */
export function validateEnv(): void {
  if (env.NODE_ENV === 'production') {
    const required = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'MONGODB_URI',
      'MFA_ENCRYPTION_KEY',
      'ENCRYPTION_MASTER_KEY',
    ] as const;
    for (const key of required) {
      if (!process.env[key] || process.env[key]?.startsWith('dev-')) {
        throw new Error(`Environment variable ${key} must be set in production`);
      }
    }
  }
}

