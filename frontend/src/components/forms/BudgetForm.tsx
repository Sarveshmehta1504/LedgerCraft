"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InlineAlert } from "@/components/ui/States";
import { formatMoney, today } from "@/lib/format";
import { MOCK_ANALYTIC_ACCOUNTS, MOCK_CONTACTS } from "@/lib/mock-data";
import type { Budget } from "@/types";

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
  const [saving, setSaving] = useState(false);

  // Achieved figures only become visible once the budget is confirmed.
  const isConfirmed = form.status === "confirmed";
  const remaining = form.committed_amount - form.actual_amount;
  const achievedPercent =
    form.committed_amount > 0 ? (form.actual_amount / form.committed_amount) * 100 : 0;

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
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
    if (nextStatus) update("status", nextStatus);
    // TODO: replace with real API once backend/budgets is ready (POST /api/budgets).
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSaving(false);
    if (!nextStatus) router.push("/budgets");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={budget ? budget.name : "New budget"}
        subtitle="Analytic budget"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {form.status === "draft" && (
              <Button size="sm" onClick={() => save("confirmed")} disabled={saving}>
                Confirm
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

      <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <TextField
            label="Budget name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            required
          />
          <SelectField
            label="Analytic account"
            value={form.analytic_account_id || ""}
            onChange={(event) => update("analytic_account_id", Number(event.target.value))}
            options={MOCK_ANALYTIC_ACCOUNTS.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            placeholder="Select an analytic account"
            error={errors.analytic_account_id}
            required
          />
          <SelectField
            label="Responsible"
            value={form.responsible_id || ""}
            onChange={(event) => update("responsible_id", Number(event.target.value))}
            options={MOCK_CONTACTS.map((contact) => ({ value: contact.id, label: contact.name }))}
            placeholder="Select a contact"
            error={errors.responsible_id}
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
              required
            />
            <TextField
              label="Period end"
              type="date"
              value={form.period_end}
              onChange={(event) => update("period_end", event.target.value)}
              error={errors.period_end}
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
