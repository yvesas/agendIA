import { ApiError } from './api-error';

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
}

interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  refreshToken?: () => Promise<string | null>;
  onSessionExpired?: () => void;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const NO_CONTENT_STATUS = 204;
const UNAUTHORIZED_STATUS = 401;

export class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  constructor(private readonly options: ApiClientOptions) {}

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options?: RequestOptions,
    isRetry = false,
  ): Promise<T> {
    const hadToken = this.options.getToken() !== null;
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method,
      headers: this.buildHeaders(body),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options?.signal,
      credentials: 'omit',
    });

    if (
      response.status === UNAUTHORIZED_STATUS &&
      !isRetry &&
      this.options.refreshToken
    ) {
      const newToken = await this.attemptRefresh();
      if (newToken) {
        return this.request<T>(method, path, body, options, true);
      }
      if (hadToken) {
        this.options.onSessionExpired?.();
      }
    }

    if (!response.ok) {
      const payload = await this.safeParseJson(response);
      throw new ApiError(response.status, payload);
    }

    if (response.status === NO_CONTENT_STATUS) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async attemptRefresh(): Promise<string | null> {
    if (!this.options.refreshToken) {
      return null;
    }
    if (!this.refreshPromise) {
      this.refreshPromise = Promise.resolve(this.options.refreshToken())
        .catch(() => null)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private buildUrl(path: string, params: QueryParams | undefined): string {
    const url = new URL(path, this.options.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private buildHeaders(body: unknown): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.options.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async safeParseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
}
