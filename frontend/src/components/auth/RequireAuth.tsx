"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getToken } from "@/lib/api";

/**
 * Token lives in localStorage only (no cookie), so middleware can't see it —
 * enforcement has to happen client-side, before children ever mount.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // localStorage isn't readable during SSR, so this can only resolve after mount —
    // that's exactly the "external system unavailable at render time" case, not a
    // derivable value we could compute during render instead.
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;
  return <>{children}</>;
}
