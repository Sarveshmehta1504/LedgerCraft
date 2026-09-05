"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { apiFetch, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [loginId, setLoginId] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!loginId.trim()) {
      setFieldError("Enter your login ID.");
      return;
    }
    setFieldError(undefined);
    setFormError(undefined);
    setSubmitting(true);

    try {
      // Always 200 — the backend never reveals whether the account exists.
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ login_id: loginId }),
      });
      setSent(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not send the reset link. Try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          If <span className="text-[var(--text)]">{loginId}</span> matches an account, a password
          reset link is on its way. The link expires in 60 minutes.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link href="/login">
            <Button variant="primary">Back to sign in</Button>
          </Link>
          <Button
            onClick={() => {
              setSent(false);
              setLoginId("");
            }}
          >
            Try another login ID
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Forgot password</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        We&apos;ll email a reset link to the address on file.
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        {formError && <InlineAlert title={formError} />}

        <TextField
          label="Login ID"
          name="login_id"
          autoComplete="username"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          error={fieldError}
          required
        />

        <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-[var(--text-muted)]">
        <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Back to sign in
        </Link>
        <span className="mx-2 text-[var(--text-subtle)]">|</span>
        <Link href="/signup" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
