"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  FileText,
  Layers,
  LogOut,
  Notebook,
  Package,
  PieChart,
  Receipt,
  ScrollText,
  Scale,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  /** One line of what the screen is for — the menu is a map, not just a list. */
  hint: string;
  icon: LucideIcon;
  /** Omitted = visible to every signed-in role. */
  roles?: Role[];
}

const NAV: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "sales",
    label: "Sales",
    items: [
      { label: "Sales Order", href: "/sales", hint: "Quote to confirmed order", icon: ShoppingCart },
      {
        label: "Customer Invoice",
        href: "/invoices",
        hint: "Bill a customer, post to the ledger",
        icon: Receipt,
      },
      { label: "Receipt", href: "/receipts", hint: "Money in, matched to invoices", icon: Wallet },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    items: [
      { label: "Purchase Order", href: "/purchases", hint: "What you ordered from vendors", icon: Truck },
      { label: "Vendor Bill", href: "/bills", hint: "What a vendor has charged you", icon: FileText },
      { label: "Payment", href: "/payments", hint: "Money out, matched to bills", icon: Wallet },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { label: "Contact", href: "/contacts", hint: "Customers and vendors", icon: Users },
      { label: "Product", href: "/products", hint: "Goods and services you trade", icon: Package },
      {
        label: "Analytic Accounts",
        href: "/analytic-accounts",
        hint: "Cost and revenue centres",
        icon: Layers,
      },
      { label: "Analytic Budget", href: "/budgets", hint: "Commit and track spend", icon: Target },
      {
        label: "Chart of Accounts",
        href: "/accounts",
        hint: "The account tree behind every entry",
        icon: BookOpen,
      },
      { label: "Journals", href: "/journals", hint: "Sales, purchase, bank, cash", icon: Notebook },
      {
        label: "Journal Entries",
        href: "/journal-entries",
        hint: "The ledger itself, posted automatically",
        icon: ScrollText,
      },
      // User management is admin-only in UserPolicy; showing it to anyone else
      // just leads to a 403 screen.
      {
        label: "Users",
        href: "/users",
        hint: "Who can sign in, and as what",
        icon: Users,
        roles: ["admin"],
      },
    ],
  },
  {
    id: "report",
    label: "Report",
    items: [
      {
        label: "Balance Sheet",
        href: "/reports/balance-sheet",
        hint: "Assets against liabilities",
        icon: Scale,
      },
      {
        label: "Profit and Loss",
        href: "/reports/profit-and-loss",
        hint: "Income against expense",
        icon: TrendingUp,
      },
      {
        label: "Budget Report",
        href: "/reports/budget",
        hint: "Planned against achieved",
        icon: PieChart,
      },
    ],
  },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [openTab, setOpenTab] = useState<string | null>(null);
  // Where the open panel sits. Measured from the tab and clamped to the
  // viewport: anchoring a fixed-width panel to a tab near the right edge ran it
  // off the screen on a phone, where the tabs wrap and the last one sits wide.
  const [menuAt, setMenuAt] = useState<{ top: number; left: number; width: number } | null>(null);
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

  function placeMenu(trigger: HTMLElement) {
    const box = trigger.getBoundingClientRect();
    const gutter = 12;
    const width = Math.min(320, window.innerWidth - gutter * 2);
    const left = Math.min(Math.max(gutter, box.left), window.innerWidth - width - gutter);
    setMenuAt({ top: box.bottom + 8, left, width });
  }

  function openMenu(id: string, trigger: HTMLElement) {
    placeMenu(trigger);
    setOpenTab(id);
  }

  // A fixed panel has to follow its tab when the page moves under it.
  useEffect(() => {
    if (openTab === null) return;
    function close() {
      setOpenTab(null);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openTab]);

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
    <div ref={navRef} className="no-print relative z-40 border-b border-[var(--line)] bg-white">
      {/* Below sm the logo sits on its own row and the tabs wrap under it —
          shrinking four labels to fit 375px makes them unreadable. */}
      <div className="flex flex-col px-4 sm:flex-row sm:items-center sm:gap-1 sm:px-5">
        <Link
          href={landingPathFor(user)}
          onClick={() => setOpenTab(null)}
          className="flex items-center py-2.5 sm:mr-4"
        >
          <Logo size={20} />
        </Link>

        {/* Wraps rather than scrolls: an overflow container would clip the
            dropdown panels, and four short labels fit a phone row anyway. */}
        <div className="flex flex-wrap items-center gap-1 pb-1.5 sm:pb-0">
        {visibleNav.map((tab) => {
          const isOpen = openTab === tab.id;
          const isActive = tab.items.some((item) => pathname.startsWith(item.href));
          return (
            <div key={tab.id} className="relative shrink-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={(event) => {
                  if (isOpen) setOpenTab(null);
                  else openMenu(tab.id, event.currentTarget);
                }}
                // Once one menu is open, sliding across the bar switches between
                // them — the behaviour every desktop app menu bar has.
                onMouseEnter={(event) => {
                  if (openTab !== null && !isOpen) openMenu(tab.id, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    openMenu(tab.id, event.currentTarget);
                  }
                }}
                className={`relative flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  isOpen || isActive
                    ? "bg-[var(--surface-raised)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                }`}
              >
                {tab.label}
                <ChevronDown
                  size={13}
                  aria-hidden="true"
                  className={`text-[var(--text-subtle)] transition-transform duration-150 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
                {/* Only the section actually being viewed is underlined. An open
                    menu is already obvious from the panel below it, and marking
                    both put two bars on the bar at once. */}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </button>

              {isOpen && menuAt && (
                <div
                  role="menu"
                  aria-label={tab.label}
                  style={{ top: menuAt.top, left: menuAt.left, width: menuAt.width }}
                  className="menu-panel fixed z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_16px_32px_-12px_rgba(24,24,27,0.22)]"
                >
                  {tab.items.map((item) => {
                    const current = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpenTab(null)}
                        className={`flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] ${
                          current
                            ? "bg-[var(--accent-wash)]"
                            : "hover:bg-[var(--surface-sunken)]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                            current
                              ? "border-transparent bg-[var(--accent)] text-white"
                              : "border-[var(--line)] bg-[var(--surface-sunken)] text-[var(--text-muted)]"
                          }`}
                        >
                          <Icon size={14} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-[13px] font-medium ${
                              current ? "text-[var(--accent)]" : "text-[var(--text)]"
                            }`}
                          >
                            {item.label}
                          </span>
                          <span className="block text-[12px] leading-snug text-[var(--text-subtle)]">
                            {item.hint}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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

    </div>
  );
}
