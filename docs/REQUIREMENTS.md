# Requirements

## Official Problem Statement

Urban Furniture needs an accounting system that enables entry of core master data
(Contacts, Products, Chart of Accounts, Budget, Journals); smooth recording of sales,
purchases, and payments using that master data; and automated generation of financial
and stock reports (Balance Sheet, P&L, Budget Report). Three actors: Admin (Business
Owner), Invoicing User (Accountant), Contact (views/pays own invoices/bills). The system
validates data, computes taxes, updates ledgers, and generates reports.

---

# P0 — Must Have (build this first, this is what gets you a passing demo)

* [ ] Auth: register/login via Sanctum, role assignment via Spatie (Admin, Invoicing User, Contact)
* [ ] Contact Master CRUD (Customer/Vendor/Both, email, mobile, address, profile image)
* [ ] Product Master CRUD (Goods/Service/Combo, sales price, cost, category)
* [ ] Chart of Accounts CRUD (Asset/Liability/Income/Expense/Capital)
* [ ] Journal CRUD (Sales/Purchase/Bank/Cash, default accounts)
* [ ] Journal Entry engine: every posted transaction creates balanced double-entry lines (sum(debit) = sum(credit)), enforced server-side
* [ ] Purchase Order → Vendor Bill (convert) → Payment (Cash/Bank) flow, posting correct journal entries at each step
* [ ] Sales Order → Customer Invoice (generate) → Payment (Cash/Bank) flow, posting correct journal entries at each step
* [ ] Balance Sheet report — live, computed from posted journal entries
* [ ] Profit & Loss report — live, computed from posted journal entries
* [ ] RBAC enforcement: Admin full access; Invoicing User create/record/view (no user management); Contact sees only their own invoices/bills and can register a payment against them

# P1 — High Value (do these once P0 is fully working end-to-end)

* [ ] Analytic Accounts + Budget module (planned amount vs. actual, linked to analytic account) + Budget Report
* [ ] Accounts Receivable / Accounts Payable Aging report (0-30/31-60/61-90/90+ buckets) — cheap to build off existing invoice/bill data, high judge visibility
* [ ] Dashboard with live KPI cards (cash position, total receivables, total payables, top 5 customers by revenue, overdue invoice count) with a chart or two
* [ ] Invoice/Bill PDF generation
* [ ] Search/filter on all master data and transaction lists (contact, date range, status)

# P2 — Nice to Have (only if P0+P1 finished with time to spare)

* [ ] Bank reconciliation screen: match bank statement lines against journal entries
* [ ] Email invoice/bill PDF to the contact
* [ ] Multi-currency support on contacts/transactions
* [ ] Recurring journal entries (e.g. monthly rent)
* [ ] Stock/inventory quantity tracking on Product (basic on-hand count, decremented on sale)

# P3 — Cut (explicitly out of scope, do not attempt)

* [ ] Multi-company / multi-branch accounting
* [ ] Tax filing / statutory compliance reports
* [ ] Approval workflows on transactions (out of scope for this problem statement)
* [ ] Real payment gateway integration (Payment records are manual/simulated only)

---

# Judging Opportunities

## Innovation

Live-computed reports (not cached/stored snapshots) prove the ledger is real, not
faked. AR/AP aging and a KPI dashboard turn a bookkeeping form into something that
looks like a product a real business owner would use.

## Odoo Relevance

Same core model as Odoo Accounting: Contacts, Chart of Accounts, Journals, Journal
Entries, Analytic Accounts, Budgets, and the Purchase/Sales → Invoice/Bill → Payment →
Ledger pipeline — not a generic CRUD app with "accounting" branding.

## Business Impact

Urban Furniture gets accurate real-time financial position (Balance Sheet, P&L) instead
of manual spreadsheet reconciliation, plus early visibility into overdue receivables
via aging and the dashboard.

## Demo Impact

Judges should see: create a sale → invoice → payment, then immediately flip to the
Balance Sheet/P&L and watch the numbers change live, with zero manual recalculation.
That single moment is the whole pitch.
