"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!loginId.trim()) errors.login_id = "Login ID is required.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    // TODO: replace with real API once backend/auth is ready (POST /api/auth/login,
    // store the returned token, then redirect by role per FRONTEND_REQUIREMENTS.md).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    router.push("/dashboard");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Sign in</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Use the login ID issued by your administrator.
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        {formError && <InlineAlert title={formError} />}

        <TextField
          label="Login ID"
          name="login_id"
          autoComplete="username"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          error={fieldErrors.login_id}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />

        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-[13px] text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-[var(--text-muted)]">
        No account?{" "}
        <Link href="/signup" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
