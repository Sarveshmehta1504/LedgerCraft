"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getToken } from "@/lib/api";
import { POST_LOGIN_PATH } from "@/lib/auth";

/** Inverse of RequireAuth — an already-signed-in user shouldn't see the auth forms again. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // See RequireAuth: localStorage is only readable client-side, so this can't be
    // computed during render — it must resolve after mount.
    if (getToken()) {
      router.replace(POST_LOGIN_PATH);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
