"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, InlineAlert } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { UsersApi } from "@/lib/resources";
import { getCurrentUser } from "@/lib/session";
import { useAsyncData } from "@/lib/use-async-data";
import type { ManagedUser, Role } from "@/types";

const ROLE_FILTERS: { value: "" | Role; label: string }[] = [
  { value: "", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "user", label: "Portal" },
];

const ROLE_TONE: Record<Role, string> = {
  admin: "bg-[var(--danger-wash)] text-[var(--danger)]",
  accountant: "bg-[var(--accent-wash,#eef2ff)] text-[var(--accent)]",
  user: "bg-[var(--surface-raised)] text-[var(--text-muted)]",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${ROLE_TONE[role]}`}
    >
      {role === "user" ? "Portal" : titleCase(role)}
    </span>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // The signed-in user is read once for the self-deactivation guard below.
  const currentUser = typeof window === "undefined" ? null : getCurrentUser();

  const fetchUsers = useCallback(
    () => UsersApi.list(showDeactivated ? { deactivated: "only" } : undefined),
    [showDeactivated],
  );
  const { data, loading, error, retry } = useAsyncData<ManagedUser[]>(
    fetchUsers,
    "The users service did not respond.",
  );
  const users = data ?? [];

  const visible = users.filter((user) => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      user.name.toLowerCase().includes(term) ||
      user.login_id.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term);
    return matchesRole && matchesSearch;
  });

  const filtered = Boolean(search.trim() || roleFilter);

  async function toggleActive(user: ManagedUser) {
    setActionError(null);
    setBusyId(user.id);
    try {
      if (user.deactivated_at) await UsersApi.reactivate(user.id);
      else await UsersApi.deactivate(user.id);
      retry();
    } catch (err) {
      // The backend refuses to deactivate the last admin — surface that verbatim.
      setActionError(
        err instanceof ApiError ? err.message : "Could not update this user's status.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<ManagedUser>[] = [
    {
      key: "name",
      header: "Name",
      render: (user) => <span className="font-medium">{user.name}</span>,
    },
    {
      key: "login_id",
      header: "Login ID",
      render: (user) => (
        <span className="tnum font-mono text-[13px] text-[var(--text-muted)]">{user.login_id}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (user) => <span className="text-[var(--text-muted)]">{user.email}</span>,
    },
    { key: "role", header: "Role", render: (user) => <RoleBadge role={user.role} /> },
    {
      key: "contact",
      header: "Linked contact",
      render: (user) => (
        <span className="text-[var(--text-muted)]">{user.contact?.name ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user) => {
        // An admin deactivating themselves would lock the session they are using.
        const isSelf = currentUser?.id === user.id;
        return (
          <Button
            size="sm"
            variant={user.deactivated_at ? "secondary" : "danger"}
            disabled={busyId === user.id || isSelf}
            onClick={() => toggleActive(user)}
          >
            {busyId === user.id
              ? "Working…"
              : user.deactivated_at
                ? "Reactivate"
                : isSelf
                  ? "You"
                  : "Deactivate"}
          </Button>
        );
      },
    },
  ];

  // User management is admin-only on the backend; showing the screen to anyone
  // else would just render a wall of 403s.
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader title="Users" subtitle="Manage who can sign in" />
        <EmptyState
          title="Admins only"
          description="Your account does not have permission to manage users. Ask an administrator if you need access."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Users"
        subtitle="Manage who can sign in"
        actions={
          <Link href="/users/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-2.5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, login ID or email"
          aria-label="Search users"
          className="h-8 w-72 rounded-md border border-[var(--line-strong)] px-2.5 text-sm transition-colors duration-150 placeholder:text-[var(--text-subtle)] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]"
        />
        <div className="flex items-center gap-1">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => setRoleFilter(filter.value)}
              aria-pressed={roleFilter === filter.value}
              className={`h-8 cursor-pointer rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 ${
                roleFilter === filter.value
                  ? "bg-[var(--surface-raised)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowDeactivated((value) => !value)}
          aria-pressed={showDeactivated}
          className={`ml-auto h-8 cursor-pointer rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 ${
            showDeactivated
              ? "bg-[var(--surface-raised)] text-[var(--text)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
          }`}
        >
          {showDeactivated ? "Showing deactivated" : "Show deactivated"}
        </button>
      </div>

      {actionError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={actionError} />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(user) => user.id}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={
          showDeactivated
            ? "No deactivated users"
            : filtered
              ? "No users match"
              : "No users yet"
        }
        emptyDescription={
          showDeactivated
            ? "Every account is currently active."
            : filtered
              ? "Adjust the search term or role filter to see more accounts."
              : "Create the admin and accountant accounts your team signs in with."
        }
        emptyAction={
          filtered || showDeactivated ? undefined : (
            <Link href="/users/new">
              <Button variant="primary" size="sm">
                New user
              </Button>
            </Link>
          )
        }
      />
    </div>
  );
}
