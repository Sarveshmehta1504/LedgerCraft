"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { useEffect, useRef, useState } from "react";

/**
 * Nav structure is taken verbatim from the design board: four tabs, each opening
 * a mega menu on click.
 */
const NAV: { id: string; label: string; items: { label: string; href: string }[] }[] = [
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
  const [openTab, setOpenTab] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

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
        <Link href="/dashboard" className="flex items-center py-2.5 sm:mr-4">
          <Logo size={20} />
        </Link>

        <div className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:overflow-x-visible sm:px-0">
        {NAV.map((tab) => {
          const isOpen = openTab === tab.id;
          const isActive = tab.items.some((item) => pathname.startsWith(item.href));
          return (
            <button
              key={tab.id}
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="true"
              onClick={() => setOpenTab(isOpen ? null : tab.id)}
              className={`relative shrink-0 cursor-pointer px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
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
      </div>

      {openTab && (
        <div className="absolute inset-x-0 top-full border-b border-[var(--line)] bg-white shadow-[0_12px_24px_-16px_rgba(24,24,27,0.25)]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
            {NAV.find((tab) => tab.id === openTab)?.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenTab(null)}
                className="rounded px-2 py-1.5 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
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
