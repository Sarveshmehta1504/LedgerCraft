import { endSession, getToken } from "@/lib/session";
import type { ApiEnvelope } from "@/types";

/**
 * Single entry point for backend calls. Every response the backend sends is the
 * { code, message, data } envelope from docs/API_DOCUMENTATION.md, so unwrap it
 * here once rather than in every screen.
 */
/**
 * The API base has no hardcoded fallback on purpose: a missing variable should
 * surface immediately rather than silently pointing the app at someone's laptop.
 * Copy .env.example to .env.local to set it.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

if (typeof window !== "undefined" && !API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set — copy .env.example to .env.local.");
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
    // A 401 on a request we authenticated means the token is expired, revoked or
    // forged: the stored session is worthless, so drop it and send the user to
    // login rather than leaving every screen showing "could not load".
    // Only when a token was actually sent — a failed sign-in also returns 401 and
    // must surface its message on the form instead of triggering a redirect.
    if (res.status === 401 && token) {
      endSession();
    }
    throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`, body.errors);
  }

  return body.data as T;
}

/**
 * Downloads a generated file and hands the browser a save dialog.
 *
 * The PDF routes stream the document itself rather than the { code, message,
 * data } envelope, so they cannot go through apiFetch — the token still has to
 * be attached by hand, which rules out pointing a plain link at the URL.
 * A failure still comes back as JSON, so the error message is read from there.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && token) endSession();
    let message = `Could not generate the file (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // A non-JSON error body leaves the status-based message above.
    }
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
