import type { User } from "@/types";

/**
 * Single owner of everything the browser holds about the signed-in user.
 *
 * Token and user live in localStorage because the backend issues a bearer token
 * (Sanctum) rather than a session cookie — nothing here is readable by
 * middleware, so every guard in the app is client-side and reads through this
 * module. Keeping both keys in one place is what makes "clear the session"
 * a single call that can't half-succeed.
 */
const TOKEN_KEY = "ledgercraft.token";
const USER_KEY = "ledgercraft.user";

/** Where an unauthenticated visitor is sent. */
export const LOGIN_PATH = "/login";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  // An empty string is not a session — treat it the same as a missing key so a
  // half-written value can never satisfy a guard.
  return token && token.trim() ? token : null;
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    // A corrupted user blob shouldn't strand the app in a broken session.
    return null;
  }
}

export function setSession(token: string, user: User): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Wipes every trace of the session. Safe to call when already signed out. */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/**
 * Hard redirect to the login screen after the session is gone.
 *
 * Deliberately `location.replace` rather than the router: it drops the dead page
 * from history (so Back can't return to it) and guarantees every module-level
 * cache from the signed-in session is thrown away.
 */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === LOGIN_PATH) return;
  window.location.replace(LOGIN_PATH);
}

/** Clear the session and bounce to login — the single "you are signed out" path. */
export function endSession(): void {
  clearSession();
  redirectToLogin();
}

/**
 * Fires when another tab changes the session, so signing out (or in) once
 * applies everywhere instead of leaving a stale dashboard open next door.
 * Returns an unsubscribe function.
 */
export function onSessionChangeInOtherTab(handler: () => void): () => void {
  function onStorage(event: StorageEvent) {
    if (event.key === TOKEN_KEY || event.key === null) handler();
  }
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
