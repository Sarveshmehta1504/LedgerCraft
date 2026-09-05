"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
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
    },
    { key: "type", header: "Type", render: (contact) => titleCase(contact.type) },
    {
      key: "email",
      header: "Email",
      render: (contact) => (
        <span className="text-[var(--text-muted)]">{contact.email ?? "—"}</span>
      ),
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (contact) => (
        <span className="tnum font-mono text-[13px] text-[var(--text-muted)]">
          {contact.mobile ?? "—"}
        </span>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (contact) => (
        <span className="text-[var(--text-muted)]">{contact.address_city ?? "—"}</span>
      ),
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

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-2.5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search contacts"
          className="h-8 w-64 rounded-md border border-[var(--line-strong)] px-2.5 text-sm transition-colors duration-150 placeholder:text-[var(--text-subtle)] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]"
        />
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              aria-pressed={typeFilter === filter.value}
              className={`h-8 cursor-pointer rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 ${
                typeFilter === filter.value
                  ? "bg-[var(--surface-raised)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

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
        <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((contact) => (
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
      )}
    </div>
  );
}
