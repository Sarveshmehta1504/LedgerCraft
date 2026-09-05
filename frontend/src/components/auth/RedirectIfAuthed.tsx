"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { POST_LOGIN_PATH } from "@/lib/auth";
import { getToken, onSessionChangeInOtherTab } from "@/lib/session";

/**
 * Inverse of RequireAuth, wrapping the whole (auth) route group: login, signup,
 * forgot-password and reset-password. A signed-in visitor who types any of those
 * URLs is sent to the dashboard instead of being shown a sign-in form again.
 * The forms only become reachable once the session is actually gone.
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Same constraint as RequireAuth: localStorage only exists after mount.
    if (getToken()) {
      router.replace(POST_LOGIN_PATH);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [router]);

  // Signing in from another tab should move this one off the auth form too.
  useEffect(() => {
    return onSessionChangeInOtherTab(() => {
      if (getToken()) router.replace(POST_LOGIN_PATH);
    });
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
