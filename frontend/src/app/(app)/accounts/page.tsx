"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { titleCase } from "@/lib/format";
import { MOCK_ACCOUNTS, mockRequest } from "@/lib/mock-data";
import type { AccountType, ChartOfAccount } from "@/types";

/** All eight types, in report order — this list doubles as a reference screen. */
const TYPE_ORDER: AccountType[] = [
  "asset",
  "bank",
  "cash",
  "liability",
  "capital",
  "income",
  "expense",
  "other_expense",
];

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: replace with real API once backend/accounts is ready (GET /api/accounts).
      setAccounts(await mockRequest(MOCK_ACCOUNTS));
    } catch {
      setError("The chart of accounts service did not respond.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts.filter((account) => account.type === type),
  })).filter((group) => group.accounts.length > 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Grouped by account type"
        actions={
          <Link href="/accounts/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} columns={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts configured"
          description="Accounts are normally seeded before the first transaction is recorded."
        />
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {grouped.map((group) => (
            <section key={group.type}>
              <div className="flex items-baseline justify-between bg-[var(--surface-sunken)] px-5 py-1.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {titleCase(group.type)}
                </h2>
                <span className="tnum font-mono text-[11px] text-[var(--text-subtle)]">
                  {group.accounts.length}
                </span>
              </div>
              <ul className="divide-y divide-[var(--line)]">
                {group.accounts.map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                      className="flex w-full cursor-pointer items-center gap-4 px-5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus:bg-[var(--surface-sunken)] focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--accent)]"
                    >
                      <span className="tnum w-16 shrink-0 font-mono text-[13px] text-[var(--text-subtle)]">
                        {account.code}
                      </span>
                      <span className="text-sm text-[var(--text)]">{account.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
