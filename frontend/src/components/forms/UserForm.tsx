"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { SelectField, TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
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
 *
 * Only an admin picks the role. An accountant creates portal customers and
 * nothing else, so for them the role is fixed to `user` and the picker is gone
 * rather than shown with a single option.
 */
export function UserForm() {
  const router = useRouter();
  // Safe to read during render: this form only ever mounts inside RequireAuth,
  // which has already resolved the session client-side.
  const [canChooseRole] = useState(() => getCurrentUser()?.role === "admin");

  const [form, setForm] = useState({
    name: "",
    login_id: "",
    email: "",
    password: "",
    role: (canChooseRole ? "accountant" : "user") as Role,
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

  // What this form last wrote into the email box. A picked contact may replace
  // its own earlier suggestion, but never an address that was typed by hand.
  const [prefilledEmail, setPrefilledEmail] = useState<string | null>(null);

  function onContactChange(value: number | null) {
    update("contact_id", value);

    const email = contacts?.find((contact) => contact.id === value)?.email;
    if (!email) return;
    if (form.email !== "" && form.email !== prefilledEmail) return;
    update("email", email);
    setPrefilledEmail(email);
  }

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    // Clear this field's error as soon as it is edited. Leaving it up until the
    // next submit makes a corrected field still look rejected.
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setFormError(null);
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
      router.push(canChooseRole ? "/users" : "/dashboard");
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
  const selectedContact = contacts?.find((contact) => contact.id === form.contact_id);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-lg border border-[var(--line)] bg-white [&>header:first-child]:rounded-t-lg"
    >
      <PageHeader
        title="New user"
        subtitle={canChooseRole ? "Create an internal or portal account" : "Create a portal account for a customer"}
        actions={
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Creating…" : "Create user"}
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => router.push(canChooseRole ? "/users" : "/dashboard")}>
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
          {canChooseRole && (
            <SelectField
              label="Role"
              value={form.role}
              onChange={(event) => update("role", event.target.value as Role)}
              options={ROLES.map((role) => ({ value: role.value, label: role.label }))}
              hint={roleHint}
              required
            />
          )}
          {form.role === "user" && (
            <Combobox
              label="Linked contact"
              value={form.contact_id}
              onChange={onContactChange}
              options={(contacts ?? []).map((contact) => ({
                value: contact.id,
                label: contact.name,
              }))}
              placeholder="Search contacts…"
              error={errors.contact_id}
              hint={
                selectedContact && !selectedContact.email
                  ? "This contact has no email on file, so their invoices cannot be emailed. Add one on the contact record."
                  : "The portal account can only see this contact's documents."
              }
              required
            />
          )}
        </div>
      </div>
    </form>
  );
}
