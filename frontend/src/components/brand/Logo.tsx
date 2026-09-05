/**
 * LedgerCraft mark.
 *
 * Two stacked bars of unequal length sitting on a baseline, with a third bar
 * mirrored beneath it — debit above the line, credit below, meeting at the rule.
 * It reads as a ledger balancing rather than a book, and stays legible at 16px
 * where any drawn book would turn to mush.
 *
 * Colours come from the app palette: the rule and the upper bars are ink, the
 * balancing bar is the accent. No separate brand colour.
 */

export function LogoMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5.5" fill="var(--logo-ground, #18181b)" />
      {/* debit side — two bars above the rule */}
      <rect x="5.5" y="6" width="9" height="2.4" rx="1.2" fill="var(--logo-ink, #ffffff)" />
      <rect x="5.5" y="9.6" width="5.5" height="2.4" rx="1.2" fill="var(--logo-ink, #ffffff)" opacity="0.55" />
      {/* the rule they balance on */}
      <rect x="4" y="13.4" width="16" height="1.2" rx="0.6" fill="var(--logo-ink, #ffffff)" opacity="0.35" />
      {/* credit side — the accent bar closing the balance */}
      <rect x="5.5" y="15.8" width="13" height="2.4" rx="1.2" fill="var(--logo-accent, #2dd4bf)" />
    </svg>
  );
}

export function Logo({
  size = 20,
  className = "",
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text)]">
          Ledger<span className="text-[var(--text-muted)]">Craft</span>
        </span>
      )}
    </span>
  );
}
