import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../src/models/user.model.js';
import { changePassword } from '../src/services/auth.service.js';

describe('Auth Service — changePassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully updates user password when current password matches', async () => {
    const originalHash = await bcrypt.hash('OldPassword123!', 4);
    const mockUserDoc = {
      _id: new mongoose.Types.ObjectId(),
      email: 'user@example.com',
      passwordHash: originalHash,
      refreshTokens: [{ tokenHash: 'stolen-session-token' }],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUserDoc),
    } as any);

    const result = await changePassword(
      mockUserDoc._id.toString(),
      'OldPassword123!',
      'NewPassword123!',
    );

    expect(result.message).toBe('Password updated successfully');
    expect(mockUserDoc.save).toHaveBeenCalled();
    expect(mockUserDoc.refreshTokens).toEqual([]);
    const isNewMatch = await bcrypt.compare('NewPassword123!', mockUserDoc.passwordHash);
    expect(isNewMatch).toBe(true);
  });

  it('rejects password change if current password is incorrect', async () => {
    const originalHash = await bcrypt.hash('OldPassword123!', 4);
    const mockUserDoc = {
      _id: new mongoose.Types.ObjectId(),
      email: 'user@example.com',
      passwordHash: originalHash,
      save: vi.fn(),
    };

    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUserDoc),
    } as any);

    await expect(
      changePassword(mockUserDoc._id.toString(), 'WrongPassword!', 'NewPassword123!'),
    ).rejects.toThrow(/Current password is incorrect/);
    expect(mockUserDoc.save).not.toHaveBeenCalled();
  });

  it('rejects password change if new password is too short (< 8 chars)', async () => {
    const originalHash = await bcrypt.hash('OldPassword123!', 4);
    const mockUserDoc = {
      _id: new mongoose.Types.ObjectId(),
      email: 'user@example.com',
      passwordHash: originalHash,
      save: vi.fn(),
    };

    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUserDoc),
    } as any);

    await expect(
      changePassword(mockUserDoc._id.toString(), 'OldPassword123!', 'short'),
    ).rejects.toThrow(/New password must be at least 8 characters/);
  });
});
