"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/portal", label: "Invoices" },
  { href: "/portal/bills", label: "Bills" },
];

/**
 * Switch between the two things a contact can see about itself.
 *
 * `/portal` is matched exactly — every portal route starts with it, so a
 * `startsWith` test would light up Invoices while Bills is open.
 */
export function PortalTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="flex items-center gap-1">
      {TABS.map((tab) => {
        const active = tab.href === "/portal" ? pathname === "/portal" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              active
                ? "bg-white text-[var(--text)] shadow-[0_0_0_1px_var(--line)]"
                : "text-[var(--text-muted)] hover:bg-white hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
