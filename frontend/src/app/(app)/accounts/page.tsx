"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArchiveAction, ShowArchivedToggle, useArchive } from "@/components/shared/Archive";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { InlineAlert } from "@/components/ui/States";
import { formatMoney, titleCase } from "@/lib/format";
import { AccountsApi, ReportsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { AccountType, ChartOfAccount, TrialBalance } from "@/types";

/** All eight types, in report order — assets first, expenses last. */
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

const TYPE_FILTERS: { value: "" | AccountType; label: string }[] = [
  { value: "", label: "All" },
  ...TYPE_ORDER.map((type) => ({ value: type, label: titleCase(type) })),
];

/** Report order, so sorting by type reads asset → expense rather than alphabetically. */
const TYPE_RANK = new Map(TYPE_ORDER.map((type, index) => [type, index]));

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | AccountType>("");

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

  // The chart itself carries no figures, so what each account has actually taken
  // comes from the trial balance and is joined on id. A missing row means the
  // account has never been posted to, which is a zero, not a failure.
  const fetchBalances = useCallback(() => ReportsApi.trialBalance(), []);
  const { data: trial } = useAsyncData<TrialBalance>(
    fetchBalances,
    "Could not load account balances.",
  );

  const balanceOf = useMemo(() => {
    const index = new Map((trial?.accounts ?? []).map((row) => [row.id, row]));
    return (id: number) => index.get(id) ?? { debit: 0, credit: 0, balance: 0 };
  }, [trial]);

  const term = search.trim().toLowerCase();
  const visible = accounts.filter((account) => {
    const matchesSearch =
      !term ||
      account.name.toLowerCase().includes(term) ||
      account.code.toLowerCase().includes(term);
    return matchesSearch && (!typeFilter || account.type === typeFilter);
  });

  const filtered = Boolean(term || typeFilter);

  const columns: Column<ChartOfAccount>[] = [
    {
      key: "code",
      header: "Code",
      width: "6rem",
      render: (account) => (
        <span className="tnum font-mono text-[13px] text-[var(--text-muted)]">{account.code}</span>
      ),
      sortValue: (account) => account.code,
    },
    {
      key: "name",
      header: "Account",
      render: (account) => <span className="font-medium">{account.name}</span>,
      sortValue: (account) => account.name,
    },
    {
      key: "type",
      header: "Type",
      render: (account) => (
        <span className="text-[var(--text-muted)]">{titleCase(account.type)}</span>
      ),
      // Ranked, not alphabetical: a chart of accounts is read in report order.
      sortValue: (account) => TYPE_RANK.get(account.type) ?? TYPE_ORDER.length,
    },
    {
      key: "debit",
      header: "Debit",
      numeric: true,
      render: (account) => {
        const debit = balanceOf(account.id).debit;
        return debit > 0 ? formatMoney(debit) : "";
      },
      sortValue: (account) => balanceOf(account.id).debit,
    },
    {
      key: "credit",
      header: "Credit",
      numeric: true,
      render: (account) => {
        const credit = balanceOf(account.id).credit;
        return credit > 0 ? formatMoney(credit) : "";
      },
      sortValue: (account) => balanceOf(account.id).credit,
    },
    {
      key: "balance",
      header: "Balance",
      numeric: true,
      render: (account) => {
        const figures = balanceOf(account.id);
        // Never posted to, so a formatted zero would read as a real balance.
        if (figures.debit === 0 && figures.credit === 0) {
          return <span className="text-[var(--text-subtle)]">Unused</span>;
        }
        return <span className="font-medium">{formatMoney(figures.balance)}</span>;
      },
      sortValue: (account) => balanceOf(account.id).balance,
    },
    ...(isAdmin
      ? [
          {
            key: "archive",
            header: "",
            render: (row: ChartOfAccount) => (
              <ArchiveAction row={row} busy={busyId === row.id} onToggle={toggleArchived} />
            ),
          } satisfies Column<ChartOfAccount>,
        ]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Every account the ledger posts to"
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

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search code or account"
          label="Search the chart of accounts"
        />
        <SegmentedFilter
          value={typeFilter}
          options={TYPE_FILTERS}
          onChange={setTypeFilter}
          label="Filter by account type"
        />
      </FilterBar>

      {archiveError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={archiveError} />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(account) => account.id}
        onRowClick={(account) => router.push(`/accounts/${account.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={
          showArchived
            ? "No archived accounts"
            : filtered
              ? "No accounts match"
              : "No accounts configured"
        }
        emptyDescription={
          showArchived
            ? "Every account in the chart is currently active."
            : filtered
              ? "Try a different code, name or account type."
              : "Accounts are normally seeded before the first transaction is recorded."
        }
      />

      {/* The ledger's own proof, under the list it describes. */}
      {trial && !showArchived && (
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-2.5 text-[13px]">
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--text-muted)]">Total debit</dt>
            <dd className="tnum font-mono font-medium">{formatMoney(trial.total_debit)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-[var(--text-muted)]">Total credit</dt>
            <dd className="tnum font-mono font-medium">{formatMoney(trial.total_credit)}</dd>
          </div>
          <p
            className={`ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium ${
              trial.balanced ? "text-[var(--status-paid)]" : "text-[var(--danger)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                trial.balanced ? "bg-[var(--status-paid)]" : "bg-[var(--danger)]"
              }`}
            />
            {trial.balanced ? "Ledger balanced" : "Out of balance"}
          </p>
        </dl>
      )}
    </div>
  );
}
