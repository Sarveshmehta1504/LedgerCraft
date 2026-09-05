import type { ReactNode } from "react";
import { TopNav } from "@/components/layout/TopNav";

/**
 * Shell for every authenticated back-office screen. Auth screens sit outside this
 * group so they render without the nav.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
