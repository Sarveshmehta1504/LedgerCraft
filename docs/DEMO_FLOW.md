# Demo Flow

## 1. Problem

> Urban Furniture tracks sales, purchases, and finances by hand — no real-time
> view of what the business actually owns, owes, or earns.

---

## 2. User

> The business owner and accountant, who need to record transactions once and
> trust the books; and the business's own customers/vendors, who need to see
> and pay their own invoices without calling the office.

---

## 3. Solution

> LedgerCraft: master data drives sales/purchase/payment transactions, every
> transaction auto-posts a correct double-entry journal entry, and financial
> reports are computed live from that ledger — not typed in separately.

---

# Live Demo (~5 minutes)

## Step 1 — Log in as Admin, show master data

**User does:** Log in, open Chart of Accounts (grouped by type) and Contacts.

**Judge sees:** A real chart of accounts (Cash, Bank, Debtors, Creditors, Sale
Income, Purchase Expense, Capital) and existing seeded contacts/products — this
is a real accounting model, not a to-do list with a finance label on it.

## Step 2 — Record a sale end-to-end

**User does:** Create a Sales Order for the seeded customer, 5 Office Chairs.
Confirm it. Convert to Customer Invoice. Post the invoice.

**Judge sees:** The invoice detail screen reveals the generated journal entry:
Debit Debtors, Credit Sale Income — the exact double-entry line items, not a
hidden calculation.

## Step 3 — Register payment

**User does:** Register a payment against the invoice via Bank.

**Judge sees:** Invoice status flips Draft → Posted → Paid live, and a second
journal entry appears: Debit Bank, Credit Debtors.

## Step 4 — Flip to reports, live

**User does:** Open Balance Sheet and Profit & Loss immediately after.

**Judge sees:** The new sale is already reflected — Bank balance is up, Sale
Income is up, and Total Assets == Total Liabilities + Capital. Zero manual
recalculation. **This is the moment that sells the whole system.**

## Step 5 — Contact portal

**User does:** Log out, log in as the Contact-role user tied to a different
customer with an unpaid invoice. Show they see only their own invoice, pay it.

**Judge sees:** Role separation is real — the portal user cannot see the admin
screens, the other customer's invoice, or navigate anywhere else, but can pay
their own bill in two clicks.

## Step 6 (if time / P1 built) — Dashboard & Aging

**User does:** Return to Admin, open the Dashboard.

**Judge sees:** Live KPI cards and an AR aging table flagging the overdue
invoice seeded for this purpose.

---

# Differentiator

Every number in the reports is computed live from posted journal entries at
request time — there is no cached "report" table that could silently drift
from the real ledger. Combined with a genuine double-entry engine
(debit=credit enforced server-side on every post), this is the difference
between a CRUD app that talks about accounting and one that actually does it.

---

# Odoo Connection

The data model — Contacts, Chart of Accounts, Journals, Journal Entries,
Analytic Accounts, Budgets — and the Purchase/Sales → Invoice/Bill → Payment →
Ledger → Report pipeline is the same shape as Odoo Accounting's own core
modules, built independently to prove the team understands the domain, not
just the Odoo UI.

---

# Business Impact

* Real-time financial position instead of end-of-month manual reconciliation
* Customers/vendors can self-serve invoice viewing and payment, cutting back-
  and-forth with the office
* Early visibility into overdue receivables via aging, before it becomes a
  cash-flow problem

---

# Demo Backup

If live functionality fails:

1. Switch to the pre-recorded screen capture of a full successful run (record
   this during hour 14 testing, not the night before)
2. Have a second seeded browser tab already logged in and mid-flow as a
   fallback if one flow breaks but the rest of the app is fine
3. Local backup: a fresh `migrate:fresh --seed` restores known-good demo data
   in under a minute if the live DB gets into a bad state during rehearsal
