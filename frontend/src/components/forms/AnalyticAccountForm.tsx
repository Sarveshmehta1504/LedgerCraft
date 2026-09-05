"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { AnalyticAccountsApi, BudgetsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import { InlineAlert } from "@/components/ui/States";
import type { AnalyticAccount, Budget } from "@/types";

export function AnalyticAccountForm({ account }: { account?: AnalyticAccount }) {
  const router = useRouter();
  // Only the editable fields — `archived_at` is set by the archive routes, never here.
  const [form, setForm] = useState<Pick<AnalyticAccount, "name" | "type">>(
    account ?? { name: "", type: "expense" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The board's analytic form lists every budget that references this account.
  const fetchBudgets = useCallback(() => BudgetsApi.list(), []);
  const { data: allBudgets } = useAsyncData<Budget[]>(
    fetchBudgets,
    "The budgets service did not respond.",
  );
  const relatedBudgets = account
    ? (allBudgets ?? []).filter((budget) => budget.analytic_account_id === account.id)
    : [];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Analytic account name is required.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = { name: form.name, type: form.type };
      if (account) await AnalyticAccountsApi.update(account.id, payload);
      else await AnalyticAccountsApi.create(payload);
      router.push("/analytic-accounts");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) fieldErrors[field] = messages[0];
        setErrors(fieldErrors);
      } else {
        setFormError(
          err instanceof ApiError ? err.message : "Could not save this analytic account.",
        );
      }
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={onSubmit}
        noValidate
        className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
      >
        <PageHeader
          title={account ? account.name : "New analytic account"}
          subtitle="Analytic account"
          actions={
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Confirm"}
            </Button>
          }
          trailing={
            <Button size="sm" onClick={() => router.push("/analytic-accounts")}>
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
            label="Analytic Account"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
            required
          />
          <SelectField
            label="Type"
            value={form.type}
            onChange={(event) =>
              setForm({ ...form, type: event.target.value as AnalyticAccount["type"] })
            }
            options={[
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
            required
          />
        </div>
      </form>

      {account && (
        <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
          <PageHeader title="Budgets" subtitle="Every budget where this analytic account is used" />
          {relatedBudgets.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[var(--text-subtle)]">
              No budget references this analytic account yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {relatedBudgets.map((budget) => (
                <li key={budget.id}>
                  <Link
                    href={`/budgets/${budget.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-2.5 transition-colors duration-150 hover:bg-[var(--surface-sunken)]"
                  >
                    <span className="text-sm text-[var(--text)]">{budget.name}</span>
                    <span className="flex items-center gap-4 text-[13px]">
                      <span className="text-[var(--text-subtle)]">
                        {formatDate(budget.period_start)} — {formatDate(budget.period_end)}
                      </span>
                      <span className="tnum font-mono text-[var(--text)]">
                        {formatMoney(budget.committed_amount)}
                      </span>
                      <StatusBadge status={budget.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
