"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiError } from "@/lib/api";
import { ContactsApi } from "@/lib/resources";
import type { Contact, ContactType } from "@/types";

const EMPTY: Omit<Contact, "id"> = {
  name: "",
  type: "customer",
  email: "",
  mobile: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_country: "India",
  address_pin: "",
  profile_image: null,
};

export function ContactForm({ contact }: { contact?: Contact }) {
  const router = useRouter();
  const [form, setForm] = useState<Omit<Contact, "id">>(contact ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      next.email = "Enter a valid email address.";
    if (form.address_pin && !/^\d{6}$/.test(form.address_pin))
      next.address_pin = "Pincode must be 6 digits.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      if (contact) await ContactsApi.update(contact.id, form);
      else await ContactsApi.create(form);
      router.push("/contacts");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) fieldErrors[field] = messages[0];
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Could not save this contact.");
      }
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
    >
      <PageHeader
        title={contact ? contact.name : "New contact"}
        subtitle={contact ? "Edit contact" : "Create a customer or vendor"}
        actions={
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => router.push("/contacts")}>
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
            label="Name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            required
          />
          <SelectField
            label="Type"
            value={form.type}
            onChange={(event) => update("type", event.target.value as ContactType)}
            options={[
              { value: "customer", label: "Customer" },
              { value: "vendor", label: "Vendor" },
              { value: "both", label: "Both" },
            ]}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(event) => update("email", event.target.value)}
            error={errors.email}
          />
          <TextField
            label="Mobile"
            value={form.mobile ?? ""}
            onChange={(event) => update("mobile", event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-5">
          <TextField
            label="Street"
            value={form.address_street ?? ""}
            onChange={(event) => update("address_street", event.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="City"
              value={form.address_city ?? ""}
              onChange={(event) => update("address_city", event.target.value)}
            />
            <TextField
              label="State"
              value={form.address_state ?? ""}
              onChange={(event) => update("address_state", event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Country"
              value={form.address_country ?? ""}
              onChange={(event) => update("address_country", event.target.value)}
            />
            <TextField
              label="Pincode"
              inputMode="numeric"
              value={form.address_pin ?? ""}
              onChange={(event) => update("address_pin", event.target.value)}
              error={errors.address_pin}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
