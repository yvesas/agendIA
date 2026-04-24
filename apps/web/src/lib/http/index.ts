import { emitSessionExpired } from '../auth/session-events';
import { clearStoredUser, getStoredUser } from '../auth/user-storage';

import { ApiClient } from './api-client';
import { createRefreshStrategy } from './refresh-strategy';

const DEFAULT_BASE_URL = 'http://localhost:3001';
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

function handleSessionExpired(): void {
  clearStoredUser();
  emitSessionExpired();
}

export const apiClient = new ApiClient({
  baseUrl,
  hasSession: () => getStoredUser() !== null,
  refresh: createRefreshStrategy(baseUrl),
  onSessionExpired: handleSessionExpired,
});

export { onSessionExpired } from '../auth/session-events';
export { ApiClient } from './api-client';
export { ApiError } from './api-error';
export type { QueryParams, RequestOptions } from './api-client';
