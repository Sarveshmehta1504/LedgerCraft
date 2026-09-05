"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { SelectField, TextField } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiError } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { AccountsApi, JournalsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { ChartOfAccount, Journal, JournalType } from "@/types";

const TYPES: JournalType[] = ["sales", "purchase", "bank", "cash"];

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
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(() => AccountsApi.list(), []);
  const { data: accountsData } = useAsyncData<ChartOfAccount[]>(fetchAccounts, "Could not load accounts.");
  const accountOptions = (accountsData ?? []).map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Journal name is required.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      if (journal) await JournalsApi.update(journal.id, form);
      else await JournalsApi.create(form);
      router.push("/journals");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) fieldErrors[field] = messages[0];
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Could not save this journal.");
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

      {formError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={formError} />
        </div>
      )}

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
        <Combobox
          label="Default debit account"
          value={form.default_debit_account}
          onChange={(value) => setForm({ ...form, default_debit_account: value })}
          options={accountOptions}
          placeholder="Search accounts…"
          clearLabel="None"
        />
        <Combobox
          label="Default credit account"
          value={form.default_credit_account}
          onChange={(value) => setForm({ ...form, default_credit_account: value })}
          options={accountOptions}
          placeholder="Search accounts…"
          clearLabel="None"
        />
      </div>
    </form>
  );
}
