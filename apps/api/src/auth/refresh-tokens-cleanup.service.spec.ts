import { ConfigService } from '@nestjs/config';

import type { EnvVars } from '../config/env.schema';

import { RefreshTokensCleanupService } from './refresh-tokens-cleanup.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';

describe('RefreshTokensCleanupService', () => {
  let repository: jest.Mocked<RefreshTokensRepository>;
  let config: jest.Mocked<ConfigService<EnvVars, true>>;
  let service: RefreshTokensCleanupService;

  beforeEach(() => {
    repository = {
      deleteStale: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokensRepository>;

    config = {
      get: jest.fn(() => 30),
    } as unknown as jest.Mocked<ConfigService<EnvVars, true>>;

    service = new RefreshTokensCleanupService(repository, config);
  });

  it('calcula cutoff como agora - retentionDays e chama deleteStale', async () => {
    repository.deleteStale.mockResolvedValue(0);
    const before = Date.now();

    await service.cleanup();

    expect(repository.deleteStale).toHaveBeenCalledTimes(1);
    const cutoff = repository.deleteStale.mock.calls[0]?.[0] as Date;
    const cutoffMs = cutoff.getTime();
    const expected = before - 30 * 24 * 60 * 60 * 1000;
    // tolerância de 5s para o delta entre `before` e o cálculo interno
    expect(cutoffMs).toBeGreaterThanOrEqual(expected - 5000);
    expect(cutoffMs).toBeLessThanOrEqual(expected + 5000);
  });

  it('devolve a contagem removida pelo repository', async () => {
    repository.deleteStale.mockResolvedValue(7);

    const count = await service.cleanup();

    expect(count).toBe(7);
  });

  it('usa REFRESH_TOKENS_RETENTION_DAYS do config', async () => {
    (config.get as jest.Mock).mockReturnValue(90);
    repository.deleteStale.mockResolvedValue(0);
    const before = Date.now();

    await service.cleanup();

    const cutoff = repository.deleteStale.mock.calls[0]?.[0] as Date;
    const expected = before - 90 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expected - 5000);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expected + 5000);
  });
});
