# Team Tasks

Timeline compressed from the AGENTS.md 24h template to **12-15h total**. Hour
markers below are elapsed-time targets, not clock times — start your own clock
at kickoff. Four branches: `team/member-1`..`team/member-4` (rename to actual
names once assigned).

## Status

```text
[ ] Not Started
[-] In Progress
[x] Complete
[!] Blocked
```

---

# Hour 0-1 — Setup (whole team together)

* [x] SETUP-001 Create GitHub repo, push initial scaffold to `main` (see README "Initial Repository Setup")
* [x] SETUP-002 Laravel 12 install in `backend/`, Sanctum + Spatie installed and configured
* [x] SETUP-003 Next.js install in `frontend/`, Tailwind + shadcn/ui configured
* [x] SETUP-004 `GET /api/health` working, displayed by the frontend at `/health`
* [x] SETUP-005 MySQL DB created, `.env` configured, `migrate` runs clean — 11 migrations, verified reversible (rollback + re-run)
* [x] SETUP-006 Create 4 team branches from `main`, everyone rebases onto latest `main` before starting

---

# P0 — MVP (target: hour 1 → hour 8)

## Backend — owner: member-1 (Master Data + Ledger core)

* [x] BE-001 Migrations: users(+contact_id), contacts, products, chart_of_accounts, journals
* [x] BE-002 Migrations: journal_entries, journal_entry_lines, analytic_accounts, budgets
* [x] BE-003 RoleSeeder (admin/accountant/user) + CoA seeder using the 8 account types — Cash (`cash`), Bank (`bank`), Debtors (`asset`), Creditors (`liability`), Sale Income (`income`), Purchase Expense (`expense`), Capital (`capital`), plus at least one `other_expense` account so P&L has all three expense rows + Journal seeder (Sales/Purchase/Bank/Cash)
* [x] BE-004 Contacts CRUD API + Products CRUD API + policies + archive/unarchive actions (`archived_at`, `active()` scope)
* [x] BE-005 Chart of Accounts CRUD API + Journals CRUD API
* [x] BE-006 JournalEntryService: create balanced entry in a DB transaction, reject if debit != credit — this is the single most important class in the codebase, write it once and reuse it everywhere below

**Lane complete.** All six delivered on the `parv` working tree, plus BE-019/020/024
(auth). 14 tests pass (`php artisan test`), Pint clean. Notes for whoever picks up
the next lane:

* Post every ledger write through `App\Services\JournalEntryService` — never
  insert into `journal_entries`/`journal_entry_lines` directly. It enforces the
  balance invariant inside the transaction and throws
  `UnbalancedJournalEntryException`, which renders itself as a 422.
* Money is compared in integer paise, not floats. Keep it that way.
* Master data uses `archived_at` + the `active()` scope, not soft deletes.
* Seeded logins (login is by `login_id`, **not** email):

  | login_id      | password       | role       | email                                |
  | ------------- | -------------- | ---------- | ------------------------------------ |
  | `adminuser`   | `Admin@123`    | admin      | admin_ledgercraft@yopmail.com        |
  | `accountant1` | `Account@123`  | accountant | accountant_ledgercraft@yopmail.com   |
  | `nimeshp`     | `Nimesh@123`   | user       | linked to the *Nimesh Patel* contact |

  The portal account is seeded with one fully outstanding and one part-paid
  invoice, so the portal's Pay action has something to act on.

  Addresses are real yopmail.com inboxes (read them at yopmail.com, no login
  needed) so password reset and Send-by-mail can be shown working in the demo.
  `example.com` / `.test` addresses are rejected outright by Resend.
* `php artisan migrate:fresh --seed` rebuilds everything; all seeders are idempotent.

## Backend — owner: member-2 (Transaction Flow + Reports)

* [x] BE-007 Migrations: purchase_orders(+lines), vendor_bills(+lines), sales_orders(+lines), customer_invoices(+lines), payments — 9 tables, all reversible; line tables cascade, everything else restrict; `tax_percent` on sales lines only; every line carries `account_id` + `analytic_account_id`
* [x] BE-008 PO create/confirm/convert-to-bill endpoints — `DocumentNumberService` (P00001 / Bill/2026/0001, row-locked), `PurchaseOrderService` owns line maths + state machine; draft-only editing, no double-confirm, no double-convert, archived products not selectable
* [x] BE-009 Vendor bill post (→ JournalEntryService) + payment endpoints — post writes Dr Purchase Expense / Cr Creditors; payments write Dr Creditors / Cr Cash|Bank, flip status to `paid` when fully settled; overpayment blocked; footer totals (paid via cash/bank, amount due) derived, never stored
* [x] BE-010 SO create/confirm/convert-to-invoice endpoints — mirrors the PO flow with `tax_percent` on lines (sales side only) and Sale Income as the default line account; `subtotal` excludes tax, header `total` is tax-inclusive
* [x] BE-011 Customer invoice post (→ JournalEntryService) + payment endpoints — post writes Dr Debtors / Cr Sale Income for the tax-inclusive total; payments write Dr Cash|Bank / Cr Debtors with `payment_type=receive`; same overpayment and status guards as vendor bills
* [x] BE-012 `/my/invoices`, `/my/bills`, `/my/invoices/{id}/pay` — scope derived from the authenticated user's `contact_id`, never from the request; drafts invisible; another contact's document returns 404 (not 403, which would confirm it exists); portal payments go through the same service, so the ledger entry is identical
* [x] BE-013 Balance Sheet + P&L report endpoints (computed live from journal_entry_lines) — plus a trial balance; net income is carried into equity as retained earnings, which is what makes the sheet balance; 7 tests lock the invariants

## Frontend — owner: member-3 (Auth + Master Data + Portal)

* [x] FE-001 Login page wired to `POST /api/auth/login`, real token stored (`src/lib/auth.ts`). Role-based redirect still sends everyone to `/dashboard` since `/portal` doesn't exist. Protected-route wrapper not built yet
* [x] FE-002 `DataTable`, `StatusBadge`, `Combobox` (searchable + create-on-the-fly), `LineItemTable`, `ViewSwitcher`, `PageHeader`, loading/empty/error states, form inputs, `formatMoney`/`formatDate` in `src/lib/format.ts`
* [x] FE-003 Contacts List + Kanban + Form wired to `/api/contacts` (`src/app/(app)/contacts/`, `ContactForm.tsx`)
* [x] FE-004 Products List + Kanban + Form wired to `/api/products`; category combobox creates real `/api/product-categories` rows on the fly
* [x] FE-005 Chart of Accounts wired to `/api/accounts`, still grouped by all 8 types
* [x] FE-006 Journals wired to `/api/journals`
* [ ] FE-007 Contact Portal — not started

## Frontend — owner: member-4 (Transactions + Reports UI)

* [x] FE-008 PO list/form wired to `/api/purchase-orders` incl. confirm + convert-to-bill; blocks Confirm on a zero/negative total
* [x] FE-009 Vendor Bill detail wired to `/api/vendor-bills` — Post shows the real generated journal entry, Register Payment hits the real endpoint with real overpayment rejection. Print/Send/Budget remain placeholders; Reset to Draft was dropped, no matching route
* [x] FE-010 SO list/form wired to `/api/sales-orders` incl. confirm + convert-to-invoice
* [x] FE-011 Customer Invoice detail wired to `/api/customer-invoices`, same `BillForm` as FE-009
* [x] FE-012 Balance Sheet wired to `GET /api/reports/balance-sheet`; the pass/fail check reads the API's own `balanced` flag
* [x] FE-013 P&L wired to `GET /api/reports/profit-and-loss`, Income / Expenses / Other Expenses as separate totals

## Integration (whole team, ongoing — do not batch this to the end)

> **Integration phase — branch state.** The backend transaction layer (BE-007
> → BE-013) lives on `parv` and is **not yet merged to `main`**: 9 migrations,
> 9 models, 6 services, 6 controllers and the report endpoints. `main` currently
> has only the master-data half plus `JournalEntryService`. Anyone writing
> transaction seeders or wiring transaction screens must rebase onto `parv`
> first, or build against tables that do not exist on their branch.
>
> Seeder rules: [`docs/SEEDING.md`](SEEDING.md). Never insert journal entries by
> hand — it breaks the Balance Sheet silently.

* [ ] INT-001 Auth token flow end-to-end (login → stored token → authenticated request)
* [ ] INT-002 Contacts/Products/CoA/Journals screens wired to real API (not mocks) by hour 5
* [-] INT-003 Full PO→Bill→Payment flow wired end-to-end by hour 7 — backend verified end-to-end (P00001 → Bill/2026/0001 → part-pay bank → settle cash → `paid`, ledger balanced); awaiting frontend wiring
* [-] INT-004 Full SO→Invoice→Payment flow wired end-to-end by hour 7 — backend verified end-to-end (S00001 with 18% tax → INV/2026/0001 → part-pay → settle → `paid`); awaiting frontend wiring
* [-] INT-005 Balance Sheet numbers verified by hand against seed data (assets == liabilities+capital) — verified against a full PO→Bill→Payment and SO→Invoice→Payment cycle: assets 7,250 = retained earnings 7,250, trial balance 54,200/54,200. Re-verify once the frontend drives the flow.
* [-] INT-006 Contact portal login + pay-own-invoice flow verified with a real contact-role user — backend verified: portal user paid their own invoice, another contact's invoice returns 404, drafts hidden; awaiting frontend portal

**Checkpoint at hour 8: if INT-003, INT-004, INT-005 aren't done, stop starting new P0 work and finish these three before touching anything in P1.**

---

# P1 — High Value (target: hour 8 → hour 11, only after P0 checkpoint passes)

* [x] BE-017 Analytic Accounts CRUD (`/analytic-accounts`) — delete blocked while used by a budget or posted journal line
* [x] BE-018 Journal Entries read-only (`GET /journal-entries`, `/journal-entries/{id}`) — no write routes exist, so an unbalanced entry cannot be hand-written; filters by journal, source_type, date range, reference
* [x] BE-014 Budget CRUD + `/reports/budget` (live actual computation) — draft/confirm/revise/cancel; revise creates a replacement and supersedes the original; achieved summed live from posted invoice/bill lines carrying the analytic account inside the period; report totals exclude superseded and cancelled budgets
* [x] BE-015 `/reports/aging` (AR/AP buckets) — current / 1-30 / 31-60 / 61-90 / 90+ by days past due, unpaid balance not document total, drafts and settled documents excluded, undated documents stay `current`
* [x] BE-016 `/reports/dashboard` (KPI aggregates) — cash/bank from the ledger, receivable/payable and overdue from unsettled documents, net income, document counts, top 5 customers by revenue
* [-] FE-014 Budgets with Draft/Confirm/Revise/Cancel stages + Budget Report (recharts pie + planned-vs-achieved bars) — still on mock data
* [ ] FE-015 Aging report page
* [-] FE-016 Dashboard panel counts and Recent Transactions now come from the real order/bill/invoice lists (no dedicated dashboard endpoint used). Budget panel stays hardcoded — no budgets route
* [-] INT-007 Invoice/Bill PDF generation wired (barryvdh/laravel-dompdf) — backend done and verified; frontend Print/Send buttons still call placeholders (FE-021)
* [x] BE-019 Auth endpoints: `POST /auth/login` (by `login_id`), `POST /auth/logout`, `GET /auth/me` — Sanctum tokens, single error message `Invalid Login Id or Password`, throttled
* [x] BE-020 Forgot/Reset password endpoints + reset-link Mailable + password policy rule — reset link points at `FRONTEND_URL/reset-password`, token 60-min single-use, reset revokes all tokens, no account enumeration
* [x] BE-024 Public signup endpoint — role `user` hardcoded server-side, `role` in payload ignored; creates + links a `customer` Contact in the same transaction (reuse an existing contact with the same email)
* [x] BE-025 Admin Users CRUD + role assignment (`PUT /users/{id}/role`) behind UserPolicy (admin-only). Guards: cannot demote/delete yourself, cannot demote or delete the last admin, a role-`user` account must always keep a linked contact, password change revokes tokens
* [-] FE-022 Signup page done, no role selector (`src/app/(auth)/signup/page.tsx`). Admin Users screen not started — backend `UserController` now exists on `main`, so it is unblocked
* [x] BE-021 Mail configured — Resend via `resend/resend-laravel` (`MAIL_MAILER=resend`, `RESEND_API_KEY`), domain verified, live send verified. Sent synchronously: no `ShouldQueue`, no queue worker needed
* [x] BE-022 Invoice/Bill PDF + `POST .../send` Mailable with the PDF attached — `GET /customer-invoices/{id}/pdf` and `/vendor-bills/{id}/pdf`; send falls back to the contact's email, `422` (not 500) when the contact has none; real delivery verified once each
* [x] BE-023 Report PDF (`GET /reports/{report}/pdf`) + `POST /reports/{report}/send` — balance-sheet, profit-and-loss, budget; unknown report is `404`; `to` is required for reports since there is no contact to fall back on
* [x] FE-020 Forgot Password + Reset Password wired to `/api/auth/forgot-password` and `/reset-password`, full round trip tested including a real emailed-link token
* [-] FE-021 Print/Send present on bills, invoices and all three reports (`ReportShell.tsx`, `BillForm.tsx`) — buttons call placeholders, PDF/mail endpoints not wired
* [ ] INT-008 Search/filter added to all master data + transaction list screens

---

# P2 — Nice to Have (target: hour 11 → hour 13, only if ahead of schedule)

* [x] CUT Reset to Draft on bills/invoices — board shows the button, deliberately not built. Un-posting needs a reversing journal entry to preserve the audit trail; decided against it. Posting is one-way.
* [ ] P2-001 Bank reconciliation screen
* [ ] P2-003 Basic stock quantity on Product, decremented on sale

**Do not start P2 items unless every P0 and P1 checkbox above is checked.**

---

# Testing (target: hour 13 → hour 14)

* [ ] Core workflow: Master Data → PO/SO → Bill/Invoice → Payment → Reports, run once fully by hand
* [ ] Authentication: all 3 roles log in and see the correct nav/screens
* [ ] Important validation: unbalanced entry rejected, overpayment rejected, contact can't see another contact's invoice
* [ ] API integration: no console errors, no stale/mocked data left anywhere
* [ ] Demo flow: run the exact `DEMO_FLOW.md` script twice, timed

---

# Demo (target: hour 14 → hour 14.5)

* [ ] Demo data: seed at least 2 contacts (1 vendor, 1 customer), 4 products, a full posted PO+bill+payment, a full posted SO+invoice+payment, a partially-paid invoice, an unpaid overdue invoice
* [ ] Demo flow rehearsed against `DEMO_FLOW.md`
* [ ] Differentiator (live-computed reports) called out explicitly in the script
* [ ] Odoo story ready (one sentence, from PROJECT_OVERVIEW.md)
* [ ] Backup plan: screen recording of a full successful run, in case live demo breaks

---

# Deployment (target: hour 14.5 → hour 15, optional — many hackathons demo from localhost)

* [ ] Backend deployed (or confirmed localhost is acceptable per hackathon rules)
* [ ] Frontend deployed / confirmed localhost
* [ ] Environment variables set correctly on whichever host is used
* [ ] Production/deployed smoke test: run the demo script once against the deployed URL before the actual judging slot

---

# Frontend status (updated after wiring auth, master data, transactions and reports to the live backend)

## Verified complete — real backend, not mocks

* **Auth: Login, Signup, Forgot Password, Reset Password** — all four call the real
  `/api/auth/*` endpoints. Tested end to end against the running backend: valid login
  stores a real Sanctum token, invalid login shows the real `"Invalid Login Id or
  Password"` 401, signup created a real user + linked contact (verified in the DB),
  forgot-password issued a real reset token and reset-password changed the real
  password (verified by logging in with it afterward).
* **Master data — Contacts, Products (+ create-on-the-fly categories), Chart of
  Accounts, Journals** — full CRUD against `/api/contacts`, `/api/products`,
  `/api/product-categories`, `/api/accounts`, `/api/journals`. A product and a
  category created through the UI were confirmed present in MySQL afterward.
* **Purchase flow — Purchase Order → Vendor Bill → Payment** — confirmed end to end
  through the browser against the real API: created a PO, confirmed it, converted to
  a bill, posted it (real journal entry: Debit Purchase Expense / Credit Creditors),
  registered a payment (real 422 on overpayment, tested with the exact outstanding
  balance in the message), paid it off, status flipped to Paid.
* **Sales flow — Sales Order → Customer Invoice** — same chain verified: SO created
  and confirmed, converted to invoice, posted (real journal entry: Debit Debtors /
  Credit Sale Income), balanced.
* **Reports — Balance Sheet, Profit & Loss** — both wired to
  `GET /api/reports/balance-sheet` and `/profit-and-loss`. The `balanced` flag is
  read directly from the API rather than recomputed client-side. Verified the
  balance sheet's retained earnings figure matches the P&L's net loss on the same
  data.
* **Dashboard** — Sales/Purchase panel counts and Recent Transactions now come from
  the real order/bill/invoice lists.
* **Payments / Receipts** — derived from the real vendor-bills/customer-invoices
  lists (no dedicated `/api/payments` endpoint exists yet, so this is real amounts
  without a real payments ledger).
* **46 routes build and render** — `npm run build` and `npm run lint` both clean,
  zero TypeScript errors, zero lint warnings.
* **Responsiveness: 45/45 routes pass at 375px, 768px and 1280px**, and **form
  validation: 16/16 cases pass** — both from the prior testing pass, re-verified
  clean after this wiring.

## One bug found and fixed during this pass

`registerPayment`'s response nests a partial bill/invoice object — missing the
`contact` and `journal_entry` relations that `show`/`post` include. Using it
directly made the Vendor name and the journal-entry panel disappear from screen
right after a successful payment. Fixed by re-fetching the full document
(`VendorBillsApi.get`/`CustomerInvoicesApi.get`) after a payment instead of trusting
that partial response — see `src/components/forms/BillForm.tsx`.

## Still on mock data — no backend route exists

* **Journal Entries** (manual entry/list) — no `/api/journal-entries` route.
* **Analytic Accounts** — no `/api/analytic-accounts` route.
* **Budgets / Budget Report** — no `/api/budgets` route.

Placeholders for these three live in `src/lib/mock-data.ts` (`MOCK_ACCOUNTS`,
`MOCK_CONTACTS`, `MOCK_JOURNALS`, `MOCK_ANALYTIC_ACCOUNTS`, `MOCK_BUDGETS`,
`MOCK_JOURNAL_ENTRIES`) and `src/lib/reports.ts` (`buildBudgetReport`), each with a
`// TODO: replace with real API once backend/<module> is ready` marker naming the
endpoint it's waiting on. Every other mock array and the old mock-shaped
Balance Sheet/P&L builders were deleted as part of this pass — they were fully
superseded.

## Not built at all

* Contact Portal (`/portal`).
* Admin Users screen — the backend `UserController` exists on `main` and is ready to
  wire; no frontend screen exists yet.
* PDF/email sending for bills, invoices and reports — Print/Send buttons exist in the
  UI but call a placeholder; no `/pdf` or `/send` route exists yet.
