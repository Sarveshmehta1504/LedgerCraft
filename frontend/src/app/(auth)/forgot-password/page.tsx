"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { apiFetch, ApiError } from "@/lib/api";

type Mode = "login_id" | "email";

/**
 * The endpoint takes either identifier but refuses both at once, so the form
 * has to pick one. An explicit toggle rather than sniffing the input for an
 * "@": the user knows which of the two they typed, and a wrong guess would send
 * the wrong field and come back as the same deliberately-vague "if it matches
 * an account" answer, with nothing on screen to explain it.
 */
const MODES: { value: Mode; label: string }[] = [
  { value: "login_id", label: "Login ID" },
  { value: "email", label: "Email" },
];

const COPY: Record<Mode, { label: string; placeholder: string; hint: string; missing: string }> = {
  login_id: {
    label: "Login ID",
    placeholder: "e.g. accountant1",
    hint: "The ID you sign in with, issued by your administrator.",
    missing: "Enter your login ID.",
  },
  email: {
    label: "Email address",
    placeholder: "name@company.com",
    hint: "The address on your account.",
    missing: "Enter your email address.",
  },
};

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>("login_id");
  const [identifier, setIdentifier] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[mode];

  function switchMode(next: Mode) {
    setMode(next);
    // The value rarely carries over meaningfully between the two, and a stale
    // error under a field that has just changed meaning reads as a bug.
    setIdentifier("");
    setFieldError(undefined);
    setFormError(undefined);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const value = identifier.trim();
    if (!value) {
      setFieldError(copy.missing);
      return;
    }
    // A login ID is alpha_dash on the server, so it can never contain an "@".
    // Catching it here saves a round trip that would answer "if it matches an
    // account" and leave the user none the wiser.
    if (mode === "login_id" && value.includes("@")) {
      setFieldError('That looks like an email address — switch to "Email" above.');
      return;
    }

    setFieldError(undefined);
    setFormError(undefined);
    setSubmitting(true);

    try {
      // Always 200 — the backend never reveals whether the account exists.
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ [mode]: value }),
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
          If <span className="text-[var(--text)]">{identifier.trim()}</span> matches an account, a
          password reset link is on its way. The link expires in 60 minutes.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link href="/login">
            <Button variant="primary">Back to sign in</Button>
          </Link>
          <Button
            onClick={() => {
              setSent(false);
              setIdentifier("");
            }}
          >
            Try another
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

        <div>
          <span className="text-[13px] font-medium text-[var(--text)]">Find my account by</span>
          <div
            role="radiogroup"
            aria-label="Find my account by"
            className="mt-1.5 flex gap-1 rounded-md border border-[var(--line-strong)] p-0.5"
          >
            {MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={mode === option.value}
                onClick={() => switchMode(option.value)}
                className={`h-8 flex-1 cursor-pointer rounded text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  mode === option.value
                    ? "bg-[var(--surface-raised)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <TextField
          // Remounts on switch, so the browser does not offer email
          // autocompletions in a field that now wants a login ID.
          key={mode}
          label={copy.label}
          name={mode}
          type={mode === "email" ? "email" : "text"}
          autoComplete={mode === "email" ? "email" : "username"}
          placeholder={copy.placeholder}
          hint={copy.hint}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
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
