"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

/** Anything the archive routes accept back. */
export interface Archivable {
  id: number;
  archived_at: string | null;
}

interface ArchiveApi<T extends Archivable> {
  archive: (id: number) => Promise<T>;
  unarchive: (id: number) => Promise<T>;
}

/**
 * Archive / restore for a master-data list.
 *
 * Master data is archived rather than deleted because posted documents still
 * reference it — a product on a paid invoice cannot disappear without breaking
 * the ledger. The backend makes these routes admin-only across contacts,
 * products, categories, journals and the chart of accounts, so the control is
 * hidden for other roles rather than shown and refused.
 */
export function useArchive<T extends Archivable>(api: ArchiveApi<T>, refresh: () => void) {
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read once per render rather than in state: the signed-in role cannot change
  // without a reload, and an effect here would flash the control on and off.
  const isAdmin = typeof window !== "undefined" && getCurrentUser()?.role === "admin";

  async function toggle(row: T) {
    setError(null);
    setBusyId(row.id);
    try {
      if (row.archived_at) await api.unarchive(row.id);
      else await api.archive(row.id);
      refresh();
    } catch (err) {
      // The backend refuses to archive something still in active use — surface
      // that reason rather than a generic failure.
      setError(err instanceof ApiError ? err.message : "Could not change this record's status.");
    } finally {
      setBusyId(null);
    }
  }

  /** What the list endpoint should be asked for. */
  const listParam = showArchived ? ("only" as const) : undefined;

  return { isAdmin, showArchived, setShowArchived, busyId, error, toggle, listParam };
}

/** Header control: flips the list between active and archived records. */
export function ShowArchivedToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Button
      size="sm"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={value ? "bg-[var(--surface-raised)]" : undefined}
    >
      {value ? "Showing archived" : "Show archived"}
    </Button>
  );
}

/** Row action. Stops propagation because these rows navigate on click. */
export function ArchiveAction<T extends Archivable>({
  row,
  busy,
  onToggle,
}: {
  row: T;
  busy: boolean;
  onToggle: (row: T) => void;
}) {
  return (
    <div className="flex justify-end">
      <Button
        size="sm"
        variant={row.archived_at ? "secondary" : "danger"}
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(row);
        }}
      >
        {busy ? "Working…" : row.archived_at ? "Restore" : "Archive"}
      </Button>
    </div>
  );
}
