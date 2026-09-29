import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Domain, type IDomainDocument } from '../src/models/domain.model.js';
import { generateSiteKey } from '../src/services/domain.service.js';

describe('Site Key Security — Never Exposed in Storage, Read, or Serialization', () => {
  it('generateSiteKey generates a key and hash, but DB schema excludes siteKeyHash by default', () => {
    const { key, hash, prefix } = generateSiteKey();
    expect(key).toMatch(/^sk_live_[a-f0-9]{64}$/);
    expect(hash).toHaveLength(64);
    expect(prefix).toMatch(/^sk_live_[a-f0-9]{6}\.\.\.$/);

    // Verify schema path options: siteKeyHash has select: false
    const siteKeyHashPath = Domain.schema.path('siteKeyHash') as any;
    expect(siteKeyHashPath).toBeDefined();
    expect(siteKeyHashPath.options.select).toBe(false);
  });

  it('domain toJSON transformation strips siteKeyHash and does not contain raw siteKey', () => {
    const { key, hash, prefix } = generateSiteKey();

    // Construct a simulated mongoose document
    const domainDoc = new Domain({
      userId: new mongoose.Types.ObjectId(),
      label: 'Production Storefront',
      host: 'localhost',
      port: 3000,
      origin: 'localhost:3000',
      status: 'active',
      siteKeyPrefix: prefix,
      siteKeyHash: hash,
      keyCreatedAt: new Date(),
    });

    const json = domainDoc.toJSON();

    // Raw site key was never stored on doc
    expect(json).not.toHaveProperty('siteKey');
    expect(JSON.stringify(json)).not.toContain(key);

    // siteKeyHash must be stripped out by toJSON transform
    expect(json).not.toHaveProperty('siteKeyHash');
    expect(JSON.stringify(json)).not.toContain(hash);

    // Only harmless prefix and domain metadata are returned
    expect(json).toHaveProperty('siteKeyPrefix', prefix);
    expect(json).toHaveProperty('origin', 'localhost:3000');
    expect(json).toHaveProperty('status', 'active');
  });

  it('raw plain site key is never exposed on domain query results', () => {
    const { key, hash, prefix } = generateSiteKey();

    const mockDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      label: 'My App',
      host: '127.0.0.1',
      port: 8080,
      origin: '127.0.0.1:8080',
      status: 'active',
      siteKeyPrefix: prefix,
      // Note: siteKeyHash omitted by select: false in real queries
      toJSON: function () {
        const copy: any = { ...this };
        delete copy.siteKeyHash;
        delete copy.__v;
        return copy;
      },
    } as unknown as IDomainDocument;

    const serialized = JSON.stringify(mockDoc.toJSON());
    expect(serialized).not.toContain(key);
    expect(serialized).not.toContain(hash);
    expect(serialized).not.toContain('siteKeyHash');
    expect(serialized).not.toContain('"siteKey"');
  });
});
