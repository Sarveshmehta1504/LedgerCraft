"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InlineAlert } from "@/components/ui/States";
import { formatMoney, today } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { AnalyticAccountsApi, BudgetsApi, ContactsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount, Budget, Contact } from "@/types";

const EMPTY: Omit<Budget, "id"> = {
  name: "",
  analytic_account_id: 0,
  period_start: today(),
  period_end: today(),
  committed_amount: 0,
  actual_amount: 0,
  responsible_id: 0,
  status: "draft",
  revision_of_id: null,
};

export function BudgetForm({ budget }: { budget?: Budget }) {
  const router = useRouter();
  const [form, setForm] = useState<Omit<Budget, "id">>(budget ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The two pickers are driven by live master data, not a snapshot.
  const fetchOptions = useCallback(
    () => Promise.all([AnalyticAccountsApi.list(), ContactsApi.list()]),
    [],
  );
  const { data: options } = useAsyncData<[AnalyticAccount[], Contact[]]>(
    fetchOptions,
    "Could not load analytic accounts and contacts.",
  );
  const analyticAccounts = options?.[0] ?? [];
  const contacts = options?.[1] ?? [];

  // Achieved figures only become visible once the budget is confirmed.
  const isConfirmed = form.status === "confirmed";
  /** Draft is the only freely editable stage; revised and cancelled budgets are archives. */
  const isEditable = form.status === "draft";
  const remaining = form.committed_amount - form.actual_amount;
  const achievedPercent =
    form.committed_amount > 0 ? (form.actual_amount / form.committed_amount) * 100 : 0;

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    // Clear this field's error as soon as it is edited, so a corrected field
    // stops looking rejected before the next submit.
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  async function save(nextStatus?: Budget["status"]) {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Budget name is required.";
    if (!form.analytic_account_id) next.analytic_account_id = "Select an analytic account.";
    if (!form.responsible_id) next.responsible_id = "Select a responsible contact.";
    if (form.period_end < form.period_start) next.period_end = "End date must follow the start date.";
    if (form.committed_amount <= 0) next.committed_amount = "Enter a budgeted amount.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name,
      analytic_account_id: form.analytic_account_id,
      period_start: form.period_start,
      period_end: form.period_end,
      committed_amount: form.committed_amount,
      responsible_id: form.responsible_id,
    };
    try {
      // Confirming is a separate endpoint, so an unsaved draft is written first
      // and only then transitioned — the status is never set client-side.
      const saved = budget ? await BudgetsApi.update(budget.id, payload) : await BudgetsApi.create(payload);
      if (nextStatus === "confirmed") {
        const confirmed = await BudgetsApi.confirm(saved.id);
        setForm({ ...confirmed });
        setSaving(false);
        return;
      }
      router.push("/budgets");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) fieldErrors[field] = messages[0];
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Could not save this budget.");
      }
      setSaving(false);
    }
  }

  /**
   * Revising a confirmed budget moves the original to `revised` and opens a fresh
   * draft carrying the original's name plus the word "Revised", linked both ways.
   */
  async function revise() {
    if (!budget) return;
    setSaving(true);
    setFormError(null);
    try {
      const revision = await BudgetsApi.revise(budget.id, {
        name: form.name.endsWith("Revised") ? form.name : `${form.name} Revised`,
      });
      // The revision is a new record, so continue editing that one.
      router.push(`/budgets/${revision.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not revise this budget.");
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={budget ? budget.name : "New budget"}
        subtitle="Analytic budget"
        actions={
          <div className="flex items-center gap-2">
            {isEditable && (
              <Button variant="primary" size="sm" onClick={() => save()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
            {form.status === "draft" && (
              <Button size="sm" onClick={() => save("confirmed")} disabled={saving}>
                Confirm
              </Button>
            )}
            {/* Revise is reachable only from Confirmed, per the board's stage mapping. */}
            {isConfirmed && (
              <Button variant="primary" size="sm" onClick={revise} disabled={saving}>
                {saving ? "Revising…" : "Revise"}
              </Button>
            )}
            {isEditable && (
              <Button size="sm" onClick={() => save("cancelled")} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        }
        trailing={
          <>
            <StatusBadge status={form.status} />
            <Button size="sm" onClick={() => router.push("/budgets")}>
              Back
            </Button>
          </>
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
            label="Budget name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            disabled={!isEditable}
            required
          />
          <Combobox
            label="Analytic account"
            value={form.analytic_account_id || null}
            onChange={(value) => update("analytic_account_id", value ?? 0)}
            options={analyticAccounts.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            placeholder="Search analytic accounts…"
            error={errors.analytic_account_id}
            disabled={!isEditable}
            required
          />
          <SelectField
            label="Responsible"
            value={form.responsible_id || ""}
            onChange={(event) => update("responsible_id", Number(event.target.value))}
            options={contacts.map((contact) => ({ value: contact.id, label: contact.name }))}
            placeholder="Select a contact"
            error={errors.responsible_id}
            disabled={!isEditable}
            required
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Period start"
              type="date"
              value={form.period_start}
              onChange={(event) => update("period_start", event.target.value)}
              disabled={!isEditable}
              required
            />
            <TextField
              label="Period end"
              type="date"
              value={form.period_end}
              onChange={(event) => update("period_end", event.target.value)}
              error={errors.period_end}
              disabled={!isEditable}
              required
            />
          </div>
          <TextField
            label="Budgeted amount"
            type="number"
            min={0}
            step="0.01"
            value={form.committed_amount}
            onChange={(event) => update("committed_amount", Number(event.target.value))}
            error={errors.committed_amount}
            className="tnum font-mono"
            disabled={!isEditable}
            required
          />
        </div>
      </div>

      {isConfirmed ? (
        <div className="border-t border-[var(--line)]">
          <dl className="grid grid-cols-2 gap-px bg-[var(--line)] lg:grid-cols-4">
            {[
              { label: "Budgeted", value: formatMoney(form.committed_amount) },
              { label: "Achieved", value: formatMoney(form.actual_amount) },
              {
                label: remaining >= 0 ? "Amount to achieve" : "Exceeded by",
                value: formatMoney(Math.abs(remaining)),
              },
              { label: "Achieved %", value: `${achievedPercent.toFixed(1)}%` },
            ].map((cell) => (
              <div key={cell.label} className="bg-white px-5 py-3">
                <dt className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                  {cell.label}
                </dt>
                <dd className="tnum mt-0.5 font-mono text-[15px] text-[var(--text)]">{cell.value}</dd>
              </div>
            ))}
          </dl>

          <div className="px-5 py-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                style={{ width: `${Math.min(achievedPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--line)] p-5">
          <InlineAlert tone="info" title="Confirm to track achievement">
            Achieved, Achieved % and Amount-to-Achieve appear once this budget is confirmed.
          </InlineAlert>
        </div>
      )}
    </div>
  );
}
