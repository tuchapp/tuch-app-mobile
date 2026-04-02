import Constants from "expo-constants";
import { supabase } from "./supabase";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "";

if (!API_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_URL");
}

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiAuthError";
  }
}

interface RequestOptions {
  /** Skip auth header (e.g. for health check) */
  noAuth?: boolean;
}

/**
 * Authenticated request to the backend API.
 * Automatically injects the Supabase access token.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (!options?.noAuth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new ApiAuthError("No active session");
    }
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    throw new ApiAuthError("Session expired");
  }

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.detail ?? json.message ?? body;
    } catch {
      message = body;
    }
    throw new Error(`API ${response.status}: ${message}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ---------- Convenience helpers ----------

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}
