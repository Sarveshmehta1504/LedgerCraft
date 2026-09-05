"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import { MOCK_ACCOUNTS } from "@/lib/mock-data";
import type { Journal, JournalType } from "@/types";

const TYPES: JournalType[] = ["sales", "purchase", "bank", "cash"];

const accountOptions = MOCK_ACCOUNTS.map((account) => ({
  value: account.id,
  label: `${account.code} · ${account.name}`,
}));

export function JournalForm({ journal }: { journal?: Journal }) {
  const router = useRouter();
  const [form, setForm] = useState<Omit<Journal, "id">>(
    journal ?? {
      name: "",
      type: "sales",
      default_debit_account: null,
      default_credit_account: null,
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Journal name is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    // TODO: replace with real API once backend/journals is ready (POST/PUT /api/journals).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSaving(false);
    router.push("/journals");
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
    >
      <PageHeader
        title={journal ? journal.name : "New journal"}
        subtitle="Journal configuration"
        actions={
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => router.push("/journals")}>
            Back
          </Button>
        }
      />

      <div className="grid max-w-2xl gap-5 p-5 md:grid-cols-2">
        <TextField
          label="Journal name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          error={errors.name}
          required
        />
        <SelectField
          label="Journal type"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value as JournalType })}
          options={TYPES.map((type) => ({ value: type, label: titleCase(type) }))}
          required
        />
        <SelectField
          label="Default debit account"
          value={form.default_debit_account ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              default_debit_account: event.target.value ? Number(event.target.value) : null,
            })
          }
          options={accountOptions}
          placeholder="None"
        />
        <SelectField
          label="Default credit account"
          value={form.default_credit_account ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              default_credit_account: event.target.value ? Number(event.target.value) : null,
            })
          }
          options={accountOptions}
          placeholder="None"
        />
      </div>
    </form>
  );
}
