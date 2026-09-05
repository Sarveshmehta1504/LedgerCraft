# Requirements

## Official Problem Statement

Urban Furniture needs an accounting system that enables entry of core master data
(Contacts, Products, Chart of Accounts, Budget, Journals); smooth recording of sales,
purchases, and payments using that master data; and automated generation of financial
and stock reports (Balance Sheet, P&L, Budget Report). Three actors: Admin (Business
Owner), Invoicing User (Accountant), Contact (views/pays own invoices/bills). The system
validates data, computes taxes, updates ledgers, and generates reports.

> **Role naming:** the PS's actor names map to these Spatie role slugs, which are
> what middleware and code use — Admin → `admin`, Invoicing User (Accountant) →
> `accountant`, Contact → `user`. Note `user` is the portal role; a *Contact* is
> the master-data record it links to via `users.contact_id`.

## Transaction Flow (verbatim from the PS, section 4)

| Process          | Fields/Details                                                                       |
| ---------------- | ------------------------------------------------------------------------------------ |
| Purchase Order   | Select Vendor, Product, Quantity, Unit Price                                          |
| Vendor Bill      | Convert PO to Bill, record invoice date, due date, and register payment (Cash/Bank)    |
| Sales Order      | Select Customer, Product, Quantity, Unit Price, **Tax**                               |
| Customer Invoice | Generate Invoice from SO and receive payment via Cash/Bank                            |
| Payment          | Register against bill/invoice — select bank or cash                                   |

> **Tax is required, on the sales side only.** The PS lists `Tax` as a Sales Order
> field and pointedly omits it from Purchase Order. The Excalidraw mockup shows no
> tax column on any line grid — that is a **gap in the mockup**, not a licence to
> skip tax. Build tax on Sales Order → Customer Invoice lines; do not build it on
> Purchase Order → Vendor Bill.

---

# P0 — Must Have (build this first, this is what gets you a passing demo)

* [ ] Auth: login by **Login Id** (unique, 6–12 chars) + password via Sanctum; signup validates unique login id, non-duplicate email, and password >8 chars with lower + upper + special char; failed login shows `Invalid Login Id or Password`; Forgot Password page; **public signup always creates a plain `user` (portal) account** — role assigned server-side, never from the request body
* [ ] Admin user management: create accounts and assign roles (`admin`/`accountant`/`user`) — the only way an admin or accountant account is created
* [ ] Role assignment via Spatie — role slugs are `admin`, `accountant`, `user`: Admin (all access), Accountant (master data, transactions, reports — the PS's "Invoicing User"), User (own invoices/bills, pay from portal — the PS's "Contact")
* [ ] Contact Master CRUD (Customer/Vendor/Both, email, mobile, address, profile image)
* [ ] Product Category Master CRUD (referenced by Product Master, supports nested categories)
* [ ] Product Master CRUD (Goods/Service/Combo, sales price, cost, required category reference)
* [ ] Chart of Accounts CRUD, **pre-seeded** (Asset/Liability/Bank/Capital/Cash/Income/Expense/Other Expense)
* [ ] Journal CRUD (Sales/Purchase/Bank/Cash, default accounts)
* [ ] Journal Entry engine: every posted transaction creates balanced double-entry lines (sum(debit) = sum(credit)), enforced server-side
* [ ] Purchase Order → Vendor Bill (convert) → Payment (Cash/Bank) flow, posting correct journal entries at each step
* [ ] Sales Order → Customer Invoice (generate) → Payment (Cash/Bank) flow, posting correct journal entries at each step
* [ ] List **and Kanban** views for Contact, Product and Analytics masters, with a toggle
* [ ] Transaction lines carry both a Chart of Account and a Budget Analytic (Purchase account defaults on bills, Sales account on invoices)
* [ ] Document sequences: `P00001`, `S00001`, `Bill/2026/0001`, `INV/2026/0001`
* [ ] Forgot Password flow — request form, emailed reset link (60-min single-use token), reset form enforcing the signup password policy; responses must not reveal whether an account exists
* [ ] Invoice/Bill **Print** (PDF download) and **Send** (email the PDF to the contact) buttons — both shown on the mockup as `1. Print  2. Send / (Allow user to send from Mail)`
* [ ] Report **Print** (PDF) and **Send** (email) buttons on Balance Sheet, P&L and Budget Report
* [ ] Balance Sheet report — live, computed from posted journal entries; Total Asset must equal Total Liability
* [ ] Profit & Loss report — live, computed from posted journal entries
* [ ] RBAC enforcement: Admin full access; Accountant create/record/view (no user management); User sees only their own invoices/bills and can register a payment against them

# P1 — High Value (do these once P0 is fully working end-to-end)

* [ ] Analytic Accounts + Budget module with Draft/Confirmed/Revised/Cancelled stages, revision linking (original ↔ revised, name suffixed "Revised"), derived Achieved Amount, Achieved % and Amount to Achieve + Budget Report (list + kanban with pie chart)
* [ ] Accounts Receivable / Accounts Payable Aging report (0-30/31-60/61-90/90+ buckets) — cheap to build off existing invoice/bill data, high judge visibility
* [ ] Dashboard with live KPI cards (cash position, total receivables, total payables, top 5 customers by revenue, overdue invoice count) with a chart or two
* [ ] Search/filter on all master data and transaction lists (contact, date range, status)

# P2 — Nice to Have (only if P0+P1 finished with time to spare)

* [ ] Bank reconciliation screen: match bank statement lines against journal entries
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
