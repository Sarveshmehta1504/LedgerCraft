"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pager, usePagination } from "@/components/shared/Pagination";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
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
  const fetchData = useCallback(() => ContactsApi.list(), []);
  const { data, loading, error, retry } = useAsyncData<Contact[]>(
    fetchData,
    "The contacts service did not respond.",
  );
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
        trailing={<ViewSwitcher value={view} onChange={setView} />}
      />

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
          emptyTitle={filtered ? "No contacts match" : "No contacts yet"}
          emptyDescription={
            filtered
              ? "Adjust the search term or type filter to see more records."
              : "Add the customers and vendors you trade with to start recording transactions."
          }
          emptyAction={
            filtered ? undefined : (
              <Link href="/contacts/new">
                <Button variant="primary" size="sm">
                  New contact
                </Button>
              </Link>
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
        <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="bg-white p-4 transition-colors duration-150 hover:bg-[var(--surface-sunken)]"
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
