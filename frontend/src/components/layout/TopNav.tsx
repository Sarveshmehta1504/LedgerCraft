"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";
import { landingPathFor, logout } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import type { Role, User } from "@/types";
import { useEffect, useRef, useState } from "react";

/**
 * Nav structure is taken verbatim from the design board: four tabs, each opening
 * a mega menu on click.
 */
interface NavItem {
  label: string;
  href: string;
  /** Omitted = visible to every signed-in role. */
  roles?: Role[];
}

const NAV: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "sales",
    label: "Sales",
    items: [
      { label: "Sales Order", href: "/sales" },
      { label: "Customer Invoice", href: "/invoices" },
      { label: "Receipt", href: "/receipts" },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    items: [
      { label: "Purchase Order", href: "/purchases" },
      { label: "Vendor Bill", href: "/bills" },
      { label: "Payment", href: "/payments" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { label: "Contact", href: "/contacts" },
      { label: "Product", href: "/products" },
      { label: "Analytic Accounts", href: "/analytic-accounts" },
      { label: "Analytic Budget", href: "/budgets" },
      { label: "Chart of Accounts", href: "/accounts" },
      { label: "Journals", href: "/journals" },
      { label: "Journal Entries", href: "/journal-entries" },
      // User management is admin-only in UserPolicy; showing it to anyone else
      // just leads to a 403 screen.
      { label: "Users", href: "/users", roles: ["admin"] },
    ],
  },
  {
    id: "report",
    label: "Report",
    items: [
      { label: "Balance Sheet", href: "/reports/balance-sheet" },
      { label: "Profit and Loss", href: "/reports/profit-and-loss" },
      { label: "Budget Report", href: "/reports/budget" },
    ],
  },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // localStorage is unreadable during SSR, so the signed-in user resolves after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());
  }, []);

  // Menus are filtered to what the signed-in role can actually reach. A portal
  // account gets 403 from every back-office route, so it sees no menus at all.
  const isPortal = user?.role === "user";
  const visibleNav = isPortal
    ? []
    : NAV.map((tab) => ({
        ...tab,
        items: tab.items.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
      })).filter((tab) => tab.items.length > 0);

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  // A mega menu that survives an outside click or Escape is a nuisance, not a feature.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenTab(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenTab(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={navRef} className="relative z-40 border-b border-[var(--line)] bg-white">
      {/* Below sm the logo sits on its own row and the tabs become a scrollable
          strip — shrinking four labels to fit 375px makes them unreadable. */}
      <div className="flex flex-col px-4 sm:flex-row sm:items-center sm:gap-1 sm:px-5">
        <Link
          href={landingPathFor(user)}
          onClick={() => setOpenTab(null)}
          className="flex items-center py-2.5 sm:mr-4"
        >
          <Logo size={20} />
        </Link>

        <div className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:overflow-x-visible sm:px-0">
        {visibleNav.map((tab) => {
          const isOpen = openTab === tab.id;
          const isActive = tab.items.some((item) => pathname.startsWith(item.href));
          return (
            <button
              key={tab.id}
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="true"
              // A pointer press should open the menu, not leave a focus ring
              // behind on the tab. Keyboard focus still lands here normally.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpenTab(isOpen ? null : tab.id)}
              className={`relative shrink-0 cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] ${
                isActive || isOpen
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
              {(isActive || isOpen) && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
        </div>

        <div className="mb-1.5 flex shrink-0 items-center gap-2.5 self-start sm:mb-0 sm:ml-auto sm:self-auto">
          {/* The portal is a separate surface with its own data scope, so it needs
              a labelled way in rather than only a redirect after sign-in. */}
          {isPortal ? (
            <Link
              href="/portal"
              onClick={() => setOpenTab(null)}
              title="Your invoices"
              className={`hidden rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 sm:inline-flex sm:items-center sm:gap-1.5 ${
                pathname.startsWith("/portal")
                  ? "bg-[var(--surface-raised)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              }`}
            >
              <FileText size={14} />
              My Invoices
            </Link>
          ) : (
            <Link
              href="/portal"
              onClick={() => setOpenTab(null)}
              title="Preview what a customer sees"
              className={`hidden rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 sm:inline-flex sm:items-center sm:gap-1.5 ${
                pathname.startsWith("/portal")
                  ? "bg-[var(--surface-raised)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              }`}
            >
              <FileText size={14} />
              Customer Portal
            </Link>
          )}
          {/* Who is signed in, and as what — the three roles see different menus,
              so the badge makes the active role obvious rather than inferred. */}
          {user && (
            <span className="hidden items-center gap-2 md:flex">
              <span className="text-[13px] font-medium text-[var(--text)]">{user.name}</span>
              <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {user.role === "user" ? "Portal" : user.role}
              </span>
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
          >
            <LogOut size={14} />
            {loggingOut ? "Signing out…" : "Log out"}
          </Button>
        </div>
      </div>

      {openTab && (
        <div className="absolute inset-x-0 top-full border-b border-[var(--line)] bg-white shadow-[0_12px_24px_-16px_rgba(24,24,27,0.25)]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleNav.find((tab) => tab.id === openTab)?.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenTab(null)}
                className="rounded px-2 py-1.5 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
