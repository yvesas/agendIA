import { clearStoredToken, getStoredToken } from '../auth/token-storage';

import { ApiClient } from './api-client';

const DEFAULT_BASE_URL = 'http://localhost:3001';

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE_URL,
  getToken: getStoredToken,
  onUnauthorized: clearStoredToken,
});

export { ApiClient } from './api-client';
export { ApiError } from './api-error';
export type { QueryParams, RequestOptions } from './api-client';
