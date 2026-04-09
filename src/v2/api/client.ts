/**
 * V2 API client — all requests to /api/v2.
 *
 * Features:
 * - Bearer token from SecureStore
 * - 15-second request timeout (AbortController)
 * - Retry on network failures (up to 2 retries, 800ms back-off)
 * - Distinguishes network errors from backend errors
 */
import * as SecureStore from 'expo-secure-store';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.tuch.ai') + '/api/v2';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

// ---------------------------------------------------------------------------
// Network error detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the error is a network/connectivity failure (not a 4xx/5xx HTTP error).
 * Use this to distinguish offline state from backend errors.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('connection refused') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('v2_auth_token');
  } catch {
    return null;
  }
}

async function buildHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestOnce<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = await buildHeaders();
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      // 4xx errors are NOT network errors — don't retry these
      throw Object.assign(
        new Error(`API ${method} ${path} failed (${response.status}): ${errorText}`),
        { statusCode: response.status, isHttpError: true },
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestOnce<T>(method, path, body);
    } catch (err: any) {
      lastError = err;
      // Don't retry client errors (4xx) — only network/server errors
      if (err?.isHttpError && err?.statusCode < 500) {
        throw err;
      }
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const apiClient = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T = unknown>(path: string) => request<T>('DELETE', path),
};
