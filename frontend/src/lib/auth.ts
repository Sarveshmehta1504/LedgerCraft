import { apiFetch } from "@/lib/api";
import { clearSession, getCurrentUser as readCurrentUser, setSession } from "@/lib/session";
import type { User } from "@/types";

interface LoginResponse {
  user: User;
  token: string;
  /** ISO timestamp; the API issues tokens with a fixed lifetime. */
  expires_at?: string | null;
}

export { getCurrentUser } from "@/lib/session";

/**
 * Asks the backend whether the stored token is still good. Presence of a token
 * string proves nothing — it can be expired, revoked from another device, or
 * simply typed into localStorage by hand — so the guard confirms it server-side
 * before rendering anything behind the login wall.
 */
export async function fetchAuthenticatedUser(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function login(loginId: string, password: string): Promise<User> {
  const { user, token, expires_at } = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, password }),
  });
  setSession(token, user, expires_at);
  return user;
}

export async function signup(input: {
  name: string;
  login_id: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<User> {
  const { user, token, expires_at } = await apiFetch<LoginResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setSession(token, user, expires_at);
  return user;
}

/**
 * Swaps the live token for a fresh one and revokes the old.
 *
 * The API issues tokens with a fixed lifetime, so without this a session simply
 * dies mid-use — typically while someone is halfway through a document. The
 * replacement is written before anything else happens, so a failure here leaves
 * the existing token untouched rather than stranding the caller.
 */
export async function refreshSession(): Promise<void> {
  const { user, token, expires_at } = await apiFetch<LoginResponse>("/auth/refresh", {
    method: "POST",
  });
  // The refresh payload carries the user too, but a stored one that is newer
  // (a role changed in this tab) should not be thrown away silently.
  setSession(token, user ?? readCurrentUser(), expires_at);
}

/**
 * Revokes the token server-side, then clears it locally regardless of whether
 * that call succeeded — a network failure must never leave a signed-out user
 * holding a live token in this browser.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // Already-invalid tokens (and offline logouts) still have to clear locally.
  } finally {
    clearSession();
  }
}

export const PORTAL_PATH = "/portal";
export const BACK_OFFICE_PATH = "/dashboard";

/**
 * A `user` account is scoped to its own contact and gets 403 from every
 * back-office route, so it lands on the portal instead of an empty dashboard.
 */
export function landingPathFor(user: Pick<User, "role"> | null): string {
  return user?.role === "user" ? PORTAL_PATH : BACK_OFFICE_PATH;
}

/** Default landing when the role isn't known yet (e.g. a guard redirect). */
export const POST_LOGIN_PATH = BACK_OFFICE_PATH;
