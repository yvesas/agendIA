import { ConfigService } from '@nestjs/config';

import type { EnvVars } from '../config/env.schema';

import { PasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  function buildHasher(saltRounds = 4): PasswordHasher {
    const config = {
      get: jest.fn(() => saltRounds),
    } as unknown as ConfigService<EnvVars, true>;
    return new PasswordHasher(config);
  }

  it('produces a hash that is different from the plaintext', async () => {
    const hasher = buildHasher();
    const hash = await hasher.hash('Agendia@123');

    expect(hash).not.toBe('Agendia@123');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('produces different hashes for the same input across calls (unique salt)', async () => {
    const hasher = buildHasher();

    const a = await hasher.hash('Agendia@123');
    const b = await hasher.hash('Agendia@123');

    expect(a).not.toBe(b);
  });

  it('compare returns true when the plaintext matches the stored hash', async () => {
    const hasher = buildHasher();
    const hash = await hasher.hash('Agendia@123');

    await expect(hasher.compare('Agendia@123', hash)).resolves.toBe(true);
  });

  it('compare returns false when the plaintext does not match', async () => {
    const hasher = buildHasher();
    const hash = await hasher.hash('Agendia@123');

    await expect(hasher.compare('wrong-password', hash)).resolves.toBe(false);
  });
});
