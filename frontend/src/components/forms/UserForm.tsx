"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { SelectField, TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { PASSWORD_HINT, validatePassword } from "@/lib/password";
import { ContactsApi, UsersApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, Role } from "@/types";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full access, including user management." },
  { value: "accountant", label: "Accountant", hint: "Day-to-day books; cannot manage users." },
  { value: "user", label: "Portal user", hint: "Sees only their own contact's documents." },
];

/**
 * Creating an internal account. Self-signup always produces a portal `user`, so
 * this form is the only way an admin or accountant account comes into existence.
 */
export function UserForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    login_id: "",
    email: "",
    password: "",
    role: "accountant" as Role,
    contact_id: null as number | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Only the portal role needs a contact, but the list is cheap and loading it
  // up front keeps the picker instant when the role is switched.
  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contacts } = useAsyncData<Contact[]>(
    fetchContacts,
    "The contacts service did not respond.",
  );

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.login_id.length < 6 || form.login_id.length > 12)
      next.login_id = "Login ID must be 6–12 characters.";
    if (!/^[A-Za-z0-9_-]+$/.test(form.login_id))
      next.login_id = "Use letters, numbers, dashes and underscores only.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email address.";
    const passwordError = validatePassword(form.password);
    if (passwordError) next.password = passwordError;
    // Mirrors the backend rule: contact_id is required only for the portal role.
    if (form.role === "user" && !form.contact_id)
      next.contact_id = "A portal user must be linked to a contact.";

    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await UsersApi.create({
        name: form.name,
        login_id: form.login_id,
        email: form.email,
        password: form.password,
        role: form.role,
        contact_id: form.role === "user" ? form.contact_id : null,
      });
      router.push("/users");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) fieldErrors[field] = messages[0];
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Could not create this user.");
      }
      setSaving(false);
    }
  }

  const roleHint = ROLES.find((role) => role.value === form.role)?.hint;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
    >
      <PageHeader
        title="New user"
        subtitle="Create an internal or portal account"
        actions={
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Creating…" : "Create user"}
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => router.push("/users")}>
            Back
          </Button>
        }
      />

      {formError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={formError} />
        </div>
      )}

      <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-5">
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
            hint="6–12 characters, must be unique. This is what they sign in with."
            required
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            error={errors.email}
            required
          />
        </div>

        <div className="flex flex-col gap-5">
          <TextField
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            error={errors.password}
            hint={PASSWORD_HINT}
            required
          />
          <SelectField
            label="Role"
            value={form.role}
            onChange={(event) => update("role", event.target.value as Role)}
            options={ROLES.map((role) => ({ value: role.value, label: role.label }))}
            hint={roleHint}
            required
          />
          {form.role === "user" && (
            <Combobox
              label="Linked contact"
              value={form.contact_id}
              onChange={(value) => update("contact_id", value)}
              options={(contacts ?? []).map((contact) => ({
                value: contact.id,
                label: contact.name,
              }))}
              placeholder="Search contacts…"
              error={errors.contact_id}
              hint="The portal account can only see this contact's documents."
              required
            />
          )}
        </div>
      </div>
    </form>
  );
}
