"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PASSWORD_HINT, validatePassword } from "@/lib/password";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    login_id: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.login_id.length < 6 || form.login_id.length > 12)
      next.login_id = "Login ID must be 6–12 characters.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email address.";
    const passwordError = validatePassword(form.password);
    if (passwordError) next.password = passwordError;
    if (form.password !== form.password_confirmation)
      next.password_confirmation = "Passwords do not match.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    // TODO: replace with real API once backend/auth is ready (POST /api/auth/signup —
    // the backend always assigns role `user` and creates the linked customer contact).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    router.push("/login");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">Create account</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Self-registration creates a customer portal account.
      </p>

      <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
        <TextField
          label="Full name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          error={errors.name}
          required
        />
        <TextField
          label="Login ID"
          value={form.login_id}
          onChange={(event) => update("login_id", event.target.value)}
          error={errors.login_id}
          hint="6–12 characters, must be unique."
          required
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          error={errors.email}
          required
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          error={errors.password}
          hint={PASSWORD_HINT}
          required
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.password_confirmation}
          onChange={(event) => update("password_confirmation", event.target.value)}
          error={errors.password_confirmation}
          required
        />

        <Button type="submit" variant="primary" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-[var(--text-muted)]">
        Already registered?{" "}
        <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
