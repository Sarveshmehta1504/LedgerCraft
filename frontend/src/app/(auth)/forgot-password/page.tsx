"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setFieldError(undefined);
    setFormError(undefined);
    setSubmitting(true);

    try {
      // TODO: replace with real API once backend/auth reset endpoints exist
      // (POST /api/auth/forgot-password — always 200, never reveals whether the account exists).
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSent(true);
    } catch {
      setFormError("Could not send the reset link. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          If an account exists for <span className="text-[var(--text)]">{email}</span>, a password
          reset link is on its way. The link expires in 60 minutes.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link href="/login">
            <Button variant="primary">Back to sign in</Button>
          </Link>
          <Button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Use another email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Forgot password</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        We&apos;ll email you a link to set a new one.
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        {formError && <InlineAlert title={formError} />}

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
