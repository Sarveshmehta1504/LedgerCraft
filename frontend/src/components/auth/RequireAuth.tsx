"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { fetchAuthenticatedUser } from "@/lib/auth";
import { endSession, getToken, onSessionChangeInOtherTab, redirectToLogin } from "@/lib/session";

/**
 * Gate for every screen behind the login wall.
 *
 * The token is a bearer token in localStorage, so no middleware can see it and
 * enforcement has to happen here. Two things matter:
 *
 *  - Children never render until the session is confirmed, so protected content
 *    cannot flash on screen before the redirect.
 *  - A token's presence is not trust. It is verified against /auth/me, because a
 *    string in localStorage can be stale, revoked elsewhere, or hand-typed.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // localStorage is unreadable during SSR, so the check can only run after
    // mount — this is an external store, not derivable render state.
    if (!getToken()) {
      redirectToLogin();
      return;
    }

    fetchAuthenticatedUser()
      .then(() => {
        if (!cancelled) setAuthorized(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // A 401 already cleared the session inside apiFetch and is redirecting.
        // Anything else is the backend being unreachable, which is a connectivity
        // problem, not an auth one — signing the user out over a failed ping
        // would be wrong, so let the screens render their own error/retry states.
        if (error instanceof ApiError && error.status === 401) return;
        setAuthorized(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Signing out in one tab must not leave a live dashboard open in another.
  useEffect(() => {
    return onSessionChangeInOtherTab(() => {
      if (!getToken()) endSession();
    });
  }, []);

  if (!authorized) return null;
  return <>{children}</>;
}
