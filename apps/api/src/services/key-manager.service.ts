import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export interface KeyEntry {
  version: number;
  key: Buffer;
  status: 'active' | 'decrypt_only' | 'retired';
  createdAt: Date;
}

export class KeyManagerService {
  private keyRegistry: Map<number, KeyEntry> = new Map();
  private activeVersion: number = 1;

  constructor() {
    this.initializeDefaultKeys();
  }

  /**
   * Initialize the key registry:
   * 1. v1 from ENCRYPTION_MASTER_KEY (always).
   * 2. Any versions persisted by a previous runtime rotation (KEY_REGISTRY_PATH).
   * 3. Any versions explicitly provided via ENCRYPTION_MASTER_KEYS (JSON map).
   * Finally, mark the active version: explicit ACTIVE_KEY_VERSION wins over the
   * persisted file, otherwise the persisted version, otherwise 1.
   */
  private initializeDefaultKeys(): void {
    this.registerKey(1, this.normalizeKey(env.ENCRYPTION_MASTER_KEY), 'active');

    const persistedActive = this.loadRegistryFromFile();
    this.loadKeysFromEnv();

    const active = process.env.ACTIVE_KEY_VERSION
      ? Number(process.env.ACTIVE_KEY_VERSION)
      : persistedActive ?? 1;

    if (this.keyRegistry.has(active)) {
      this.setActiveVersion(active);
    }
  }

  /**
   * Load additional key versions from ENCRYPTION_MASTER_KEYS env var
   * (JSON map, e.g. '{"1":"<64 hex>","2":"<64 hex>"}').
   */
  private loadKeysFromEnv(): void {
    if (!env.ENCRYPTION_MASTER_KEYS) return;
    try {
      const parsed = JSON.parse(env.ENCRYPTION_MASTER_KEYS) as Record<string, string>;
      for (const [versionStr, keyStr] of Object.entries(parsed)) {
        const version = Number(versionStr);
        if (!Number.isInteger(version) || version < 1) continue;
        const key = this.normalizeKey(keyStr);
        const existing = this.keyRegistry.get(version);
        if (existing) {
          existing.key = key;
          existing.status = 'decrypt_only';
        } else {
          this.registerKey(version, key, 'decrypt_only');
        }
      }
    } catch (err) {
      console.warn('[KEY_MANAGER] Failed to parse ENCRYPTION_MASTER_KEYS:', err);
    }
  }

  /**
   * Load a persisted key registry from disk (see persistRegistry).
   * Returns the persisted active version, if any.
   */
  private loadRegistryFromFile(): number | undefined {
    const filePath = this.registryPath();
    if (!filePath || !fs.existsSync(filePath)) return undefined;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
        versions: Array<{ version: number; keyHex: string }>;
        activeVersion: number;
      };
      for (const v of data.versions) {
        if (!this.keyRegistry.has(v.version)) {
          this.registerKey(v.version, Buffer.from(v.keyHex, 'hex'), 'decrypt_only');
        }
      }
      return data.activeVersion;
    } catch (err) {
      console.warn('[KEY_MANAGER] Failed to load key registry from disk:', err);
      return undefined;
    }
  }

  /**
   * Persist the current key registry so runtime rotations survive restarts.
   * ponytail: keys are stored in plaintext on disk — acceptable only for a
   * local/self-hosted deployment. Upgrade path: a KMS (AWS KMS / Azure Key Vault)
   * or DB-stored keys encrypted under a root KMS key.
   */
  private persistRegistry(): void {
    const filePath = this.registryPath();
    if (!filePath) return;
    const versions = Array.from(this.keyRegistry.values()).map(e => ({
      version: e.version,
      keyHex: e.key.toString('hex'),
    }));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ versions, activeVersion: this.activeVersion }, null, 2),
      { mode: 0o600 },
    );
  }

  private registryPath(): string | null {
    if (!env.KEY_REGISTRY_PATH) return null;
    return path.isAbsolute(env.KEY_REGISTRY_PATH)
      ? env.KEY_REGISTRY_PATH
      : path.join(process.cwd(), env.KEY_REGISTRY_PATH);
  }

  /**
   * Helper to normalize 32-byte key from string or Buffer
   */
  private normalizeKey(input: string | Buffer): Buffer {
    if (Buffer.isBuffer(input)) {
      if (input.length === 32) return input;
      // Derive 32 bytes using SHA-256 if not 32 bytes
      return crypto.createHash('sha256').update(input).digest();
    }

    // Check if input is hex-encoded 32-byte key (64 hex characters)
    if (/^[0-9a-fA-F]{64}$/.test(input)) {
      return Buffer.from(input, 'hex');
    }

    const buf = Buffer.from(input, 'utf-8');
    if (buf.length === 32) {
      return buf;
    }

    // Hash to exactly 32 bytes
    return crypto.createHash('sha256').update(buf).digest();
  }

  /**
   * Register a key version in the registry
   */
  public registerKey(
    version: number,
    keyInput: string | Buffer,
    status: 'active' | 'decrypt_only' | 'retired' = 'active'
  ): KeyEntry {
    const key = this.normalizeKey(keyInput);
    const entry: KeyEntry = {
      version,
      key,
      status,
      createdAt: new Date(),
    };

    this.keyRegistry.set(version, entry);
    if (status === 'active') {
      this.activeVersion = version;
    }
    return entry;
  }

  /**
   * Get active version number
   */
  public getActiveVersion(): number {
    return this.activeVersion;
  }

  /**
   * Set active version number
   */
  public setActiveVersion(version: number): void {
    if (!this.keyRegistry.has(version)) {
      throw new Error(`Key version ${version} not found in key registry`);
    }
    // Demote current active key to decrypt_only
    const currentActive = this.keyRegistry.get(this.activeVersion);
    if (currentActive && currentActive.version !== version) {
      currentActive.status = 'decrypt_only';
    }
    const newActive = this.keyRegistry.get(version)!;
    newActive.status = 'active';
    this.activeVersion = version;
  }

  /**
   * Retrieve a key by version (or active version by default)
   */
  public getKey(version?: number): Buffer {
    const v = version ?? this.activeVersion;
    const entry = this.keyRegistry.get(v);
    if (!entry) {
      throw new Error(`Key version ${v} not found in key registry (cannot decrypt or encrypt)`);
    }
    if (entry.status === 'retired') {
      throw new Error(`Key version ${v} is retired and cannot be used`);
    }
    return entry.key;
  }

  /**
   * Derive a domain-specific key using HKDF-SHA256 (RFC 5869)
   * Domain examples: 'field-encryption', 'file-storage', 'mfa-secrets'
   */
  public deriveDomainKey(domain: string, version?: number): Buffer {
    const masterKey = this.getKey(version);
    const v = version ?? this.activeVersion;
    const salt = Buffer.from(`sentinelkey:salt:v${v}`);
    const info = `sentinelkey:domain:${domain}:v${v}`;

    // HKDF-SHA256 32-byte key derivation
    const derived = crypto.hkdfSync('sha256', masterKey, salt, info, 32);
    return Buffer.from(derived);
  }

  /**
   * Rotate master key: registers newKey as version activeVersion + 1
   * Previous active key becomes 'decrypt_only'
   */
  public rotateKey(newKeyInput?: string | Buffer): { oldVersion: number; newVersion: number } {
    const oldVersion = this.activeVersion;
    const newVersion = oldVersion + 1;
    const key = newKeyInput ? this.normalizeKey(newKeyInput) : crypto.randomBytes(32);

    // Demote previous active key
    const prev = this.keyRegistry.get(oldVersion);
    if (prev) {
      prev.status = 'decrypt_only';
    }

    this.registerKey(newVersion, key, 'active');
    this.activeVersion = newVersion;

    this.persistRegistry();

    return { oldVersion, newVersion };
  }

  /**
   * List all registered key versions and their status
   */
  public listKeys(): Array<{ version: number; status: string; createdAt: Date }> {
    return Array.from(this.keyRegistry.values()).map(e => ({
      version: e.version,
      status: e.status,
      createdAt: e.createdAt,
    }));
  }
}

export const keyManager = new KeyManagerService();
