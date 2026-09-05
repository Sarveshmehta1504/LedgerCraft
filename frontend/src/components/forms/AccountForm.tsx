"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import type { AccountType, ChartOfAccount } from "@/types";

const TYPES: AccountType[] = [
  "asset",
  "liability",
  "bank",
  "capital",
  "cash",
  "income",
  "expense",
  "other_expense",
];

export function AccountForm({ account }: { account?: ChartOfAccount }) {
  const router = useRouter();
  const [form, setForm] = useState<Omit<ChartOfAccount, "id">>(
    account ?? { code: "", name: "", type: "asset" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.code.trim()) next.code = "Code is required.";
    if (!form.name.trim()) next.name = "Name is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    // TODO: replace with real API once backend/accounts is ready (POST/PUT /api/accounts).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSaving(false);
    router.push("/accounts");
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
    >
      <PageHeader
        title={account ? account.name : "New account"}
        subtitle="Chart of Accounts"
        actions={
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => router.push("/accounts")}>
            Back
          </Button>
        }
      />

      <div className="grid max-w-2xl gap-5 p-5 md:grid-cols-2">
        <TextField
          label="Account code"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
          error={errors.code}
          hint="Short unique code, for example 1000."
          className="tnum font-mono"
          required
        />
        <SelectField
          label="Account type"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value as AccountType })}
          options={TYPES.map((type) => ({ value: type, label: titleCase(type) }))}
          required
        />
        <div className="md:col-span-2">
          <TextField
            label="Account name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
            required
          />
        </div>
      </div>
    </form>
  );
}
