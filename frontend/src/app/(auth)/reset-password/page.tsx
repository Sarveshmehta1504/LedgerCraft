"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { PASSWORD_HINT, validatePassword } from "@/lib/password";
import { apiFetch, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // A link without both a token and the resolved email can't be honoured — the
  // backend requires both, and there's no account context to guess email from.
  if (!token || !email) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Link expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          This reset link is invalid or has already been used. Request a new one and it will arrive
          within a few minutes.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/forgot-password">
            <Button variant="primary">Request a new link</Button>
          </Link>
          <Link href="/login">
            <Button>Back to sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const next: Record<string, string> = {};
    const policyError = validatePassword(password);
    if (policyError) next.password = policyError;
    if (password !== confirmation) next.confirmation = "Passwords do not match.";

    setErrors(next);
    setFormError(undefined);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          token,
          password,
          password_confirmation: confirmation,
        }),
      });
      router.push("/login?reset=1");
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "That reset link is invalid or has expired. Request a new one.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Set a new password</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {email ? `Resetting the password for ${email}.` : "Choose a password you don't use elsewhere."}
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        {formError && <InlineAlert title={formError} />}

        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint={PASSWORD_HINT}
          required
        />
        <TextField
          label="Re-enter password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={errors.confirmation}
          required
        />

        <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Saving…" : "Reset password"}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-[var(--text-muted)]">
        <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
