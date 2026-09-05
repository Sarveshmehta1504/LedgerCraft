"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { ArchiveAction, ShowArchivedToggle, useArchive } from "@/components/shared/Archive";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pager, usePagination } from "@/components/shared/Pagination";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from "@/components/ui/States";
import { titleCase } from "@/lib/format";
import { ContactsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, ContactType } from "@/types";

const TYPE_FILTERS: { value: "" | ContactType; label: string }[] = [
  { value: "", label: "All" },
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
  { value: "both", label: "Both" },
];

/** The uploaded photo when there is one; initials rather than a stock glyph when there isn't. */
function Avatar({ contact, size = 28 }: { contact: Contact; size?: number }) {
  const initials = contact.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  if (contact.profile_image) {
    return (
      // Uploaded at runtime, so it is not in the build manifest next/image reads.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.profile_image}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded object-cover"
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-muted)]"
    >
      {initials}
    </span>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ContactType>("");
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
  } = useArchive(ContactsApi, () => retryRef.current());

  const fetchData = useCallback(() => ContactsApi.list(archiveListParam), [archiveListParam]);
  const { data, loading, error, retry } = useAsyncData<Contact[]>(
    fetchData,
    "The contacts service did not respond.",
  );
  useEffect(() => {
    retryRef.current = retry;
  });
  const contacts = data ?? [];

  const visible = contacts.filter((contact) => {
    const matchesType = !typeFilter || contact.type === typeFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      contact.name.toLowerCase().includes(term) ||
      (contact.email ?? "").toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  const filtered = Boolean(search.trim() || typeFilter);

  // The card view needs its own pager: DataTable pages the list view itself,
  // and only one of the two is ever mounted.
  const { visible: cards, pager: cardPager } = usePagination(visible);

  const columns: Column<Contact>[] = [
    {
      key: "image",
      header: "Image",
      render: (contact) => <Avatar contact={contact} />,
    },
    {
      key: "name",
      header: "Name",
      render: (contact) => <span className="font-medium">{contact.name}</span>,
      sortValue: (contact) => contact.name,
    },
    {
      key: "type",
      header: "Type",
      render: (contact) => titleCase(contact.type),
      sortValue: (contact) => contact.type,
    },
    {
      key: "email",
      header: "Email",
      render: (contact) => (
        <span className="text-[var(--text-muted)]">{contact.email ?? "—"}</span>
      ),
      sortValue: (contact) => contact.email,
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (contact) => (
        <span className="tnum font-mono text-[13px] text-[var(--text-muted)]">
          {contact.mobile ?? "—"}
        </span>
      ),
      sortValue: (contact) => contact.mobile,
    },
    {
      key: "city",
      header: "City",
      render: (contact) => (
        <span className="text-[var(--text-muted)]">{contact.address_city ?? "—"}</span>
      ),
      sortValue: (contact) => contact.address_city,
    },
     ...(isAdmin
      ? [
          {
            key: "archive",
            header: "",
            render: (row: Contact) => (
              <ArchiveAction row={row} busy={busyId === row.id} onToggle={toggleArchived} />
            ),
          } satisfies Column<Contact>,
        ]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Contacts"
        subtitle="Customers and vendors"
        actions={
          <Link href="/contacts/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
        trailing={
          <>
            {isAdmin && (
              <ShowArchivedToggle value={showArchived} onChange={setShowArchived} />
            )}
            <ViewSwitcher value={view} onChange={setView} />
          </>
        }
      />

      {archiveError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={archiveError} />
        </div>
      )}

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or email"
          label="Search contacts"
        />
        <SegmentedFilter
          value={typeFilter}
          options={TYPE_FILTERS}
          onChange={setTypeFilter}
          label="Filter by contact type"
        />
      </FilterBar>

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(contact) => contact.id}
          onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle={

            showArchived

              ? "No archived contacts"

              : filtered

                ? "No contacts match"

                : "No contacts yet"

          }
          emptyDescription={

            showArchived

              ? "Every one of your contacts is currently active."

              : filtered

                              ? "Adjust the search term or type filter to see more records."

                              : "Add the customers and vendors you trade with to start recording transactions."

          }
          emptyAction={

            showArchived ? undefined : (
            filtered ? undefined : (
              <Link href="/contacts/new">
                <Button variant="primary" size="sm">
                  New contact
                </Button>
              </Link>
            )

            )

          }
        />
      ) : loading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No contacts match"
          description="Adjust the search term or type filter to see more records."
        />
      ) : (
        <>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="rounded-lg border border-[var(--line)] bg-white p-4 transition-colors duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <div className="flex items-start gap-3">
                <Avatar contact={contact} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{contact.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                    {titleCase(contact.type)}
                  </p>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-[13px] text-[var(--text-muted)]">
                <div className="truncate">{contact.email ?? "No email on file"}</div>
                <div className="tnum font-mono text-[12px]">{contact.mobile ?? "—"}</div>
                <div className="truncate text-xs text-[var(--text-subtle)]">
                  {[contact.address_city, contact.address_state].filter(Boolean).join(", ") || "—"}
                </div>
              </dl>
            </Link>
          ))}
        </div>
        <Pager state={cardPager} />
        </>
      )}
    </div>
  );
}
