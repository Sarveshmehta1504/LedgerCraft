"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ArchiveAction, ShowArchivedToggle, useArchive } from "@/components/shared/Archive";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from "@/components/ui/States";
import { titleCase } from "@/lib/format";
import { AccountsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
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
  // useAsyncData's retry is defined below the hook that needs it, so the
  // hook refreshes through a ref rather than reordering the file.
  const retryRef = useRef<() => void>(() => {});
  const {
    isAdmin,
    showArchived,
    setShowArchived,
    busyId,
    error: archiveError,
    toggle: toggleArchived,
    listParam: archiveListParam,
  } = useArchive(AccountsApi, () => retryRef.current());

  const fetchData = useCallback(() => AccountsApi.list(archiveListParam), [archiveListParam]);
  const { data, loading, error, retry } = useAsyncData<ChartOfAccount[]>(
    fetchData,
    "The chart of accounts service did not respond.",
  );
  useEffect(() => {
    retryRef.current = retry;
  });
  const accounts = data ?? [];

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
        trailing={
          isAdmin ? (
            <ShowArchivedToggle value={showArchived} onChange={setShowArchived} />
          ) : undefined
        }
      />

      {archiveError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={archiveError} />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} columns={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : accounts.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived accounts" : "No accounts configured"}
          description={
            showArchived
              ? "Every account in the chart is currently active."
              : "Accounts are normally seeded before the first transaction is recorded."
          }
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
                  <li key={account.id} className="flex items-center gap-2 pr-5">
                    <button
                      type="button"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                      className="flex flex-1 cursor-pointer items-center gap-4 px-5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus:bg-[var(--surface-sunken)] focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--accent)]"
                    >
                      <span className="tnum w-16 shrink-0 font-mono text-[13px] text-[var(--text-subtle)]">
                        {account.code}
                      </span>
                      <span className="text-sm text-[var(--text)]">{account.name}</span>
                    </button>
                    {isAdmin && (
                      <ArchiveAction
                        row={account}
                        busy={busyId === account.id}
                        onToggle={toggleArchived}
                      />
                    )}
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
