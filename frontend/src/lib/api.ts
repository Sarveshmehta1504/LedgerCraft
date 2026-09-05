import type { ApiEnvelope } from "@/types";

/**
 * Single entry point for backend calls. Every response the backend sends is the
 * { code, message, data } envelope from docs/API_DOCUMENTATION.md, so unwrap it
 * here once rather than in every screen.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "ledgercraft.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  /** Laravel 422 field errors, keyed by field name. */
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  let body: Partial<ApiEnvelope<T>> & { errors?: Record<string, string[]> } = {};
  try {
    body = await res.json();
  } catch {
    // A non-JSON body (502 page, connection reset) still has to produce a usable error.
  }

  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`, body.errors);
  }

  return body.data as T;
}
