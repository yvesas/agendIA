export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get displayMessage(): string {
    const message = this.extractPayloadMessage();
    return message ?? this.message;
  }

  private extractPayloadMessage(): string | undefined {
    if (!this.payload || typeof this.payload !== 'object') {
      return undefined;
    }

    const raw = (this.payload as { message?: unknown }).message;

    if (typeof raw === 'string') {
      return raw;
    }

    if (Array.isArray(raw) && raw.every((item): item is string => typeof item === 'string')) {
      return raw.join('. ');
    }

    return undefined;
  }
}
