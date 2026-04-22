const USER_STORAGE_KEY = 'agendia:user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
}

function isStoredUser(value: unknown): value is StoredUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.email === 'string' &&
    typeof record.name === 'string'
  );
}
