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
* [ ] SETUP-003 Next.js install in `frontend/`, Tailwind + shadcn/ui configured
* [-] SETUP-004 `GET /api/health` working, homepage displays it (the AGENTS.md integration test) — API side verified (`{"code":200,"status":"ok","message":"API is healthy"}`); homepage half blocked on SETUP-003
* [x] SETUP-005 MySQL DB created, `.env` configured, `migrate` runs clean — 11 migrations, verified reversible (rollback + re-run)
* [ ] SETUP-006 Create 4 team branches from `main`, everyone rebases onto latest `main` before starting

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

  No portal (`user`) account is seeded — create one via `POST /api/auth/signup`,
  which also creates its linked customer Contact.

  Addresses are real yopmail.com inboxes (read them at yopmail.com, no login
  needed) so password reset and Send-by-mail can be shown working in the demo.
  `example.com` / `.test` addresses are rejected outright by Resend.
* `php artisan migrate:fresh --seed` rebuilds everything; all seeders are idempotent.

## Backend — owner: member-2 (Transaction Flow + Reports)

* [x] BE-007 Migrations: purchase_orders(+lines), vendor_bills(+lines), sales_orders(+lines), customer_invoices(+lines), payments — 9 tables, all reversible; line tables cascade, everything else restrict; `tax_percent` on sales lines only; every line carries `account_id` + `analytic_account_id`
* [x] BE-008 PO create/confirm/convert-to-bill endpoints — `DocumentNumberService` (P00001 / Bill/2026/0001, row-locked), `PurchaseOrderService` owns line maths + state machine; draft-only editing, no double-confirm, no double-convert, archived products not selectable
* [x] BE-009 Vendor bill post (→ JournalEntryService) + payment endpoints — post writes Dr Purchase Expense / Cr Creditors; payments write Dr Creditors / Cr Cash|Bank, flip status to `paid` when fully settled; overpayment blocked; footer totals (paid via cash/bank, amount due) derived, never stored
* [ ] BE-010 SO create/confirm/convert-to-invoice endpoints
* [ ] BE-011 Customer invoice post (→ JournalEntryService) + payment endpoints
* [ ] BE-012 `/my/invoices`, `/my/bills`, `/my/invoices/{id}/pay` (Contact-scoped, policy-enforced)
* [ ] BE-013 Balance Sheet + P&L report endpoints (computed live from journal_entry_lines)

## Frontend — owner: member-3 (Auth + Master Data + Portal)

* [ ] FE-001 Auth context + login page + role-based redirect + protected route wrapper
* [ ] FE-002 Shared components: DataTable, StatusBadge, MoneyValue, form inputs
* [ ] FE-003 Contacts list/create/edit
* [ ] FE-004 Products list/create/edit
* [ ] FE-005 Chart of Accounts list/create/edit (grouped by type)
* [ ] FE-006 Journals list/create/edit
* [ ] FE-007 Contact Portal shell (`/portal`) + invoice/bill list + pay action

## Frontend — owner: member-4 (Transactions + Reports UI)

* [ ] FE-008 PO list/create/detail + Convert to Bill button
* [ ] FE-009 Vendor Bill detail (Post button, shows generated journal entry lines, Register Payment)
* [ ] FE-010 SO list/create/detail + Convert to Invoice button
* [ ] FE-011 Customer Invoice detail (Post, journal entry display, Register Payment)
* [ ] FE-012 Balance Sheet report page
* [ ] FE-013 P&L report page

## Integration (whole team, ongoing — do not batch this to the end)

* [ ] INT-001 Auth token flow end-to-end (login → stored token → authenticated request)
* [ ] INT-002 Contacts/Products/CoA/Journals screens wired to real API (not mocks) by hour 5
* [ ] INT-003 Full PO→Bill→Payment flow wired end-to-end by hour 7
* [ ] INT-004 Full SO→Invoice→Payment flow wired end-to-end by hour 7
* [ ] INT-005 Balance Sheet numbers verified by hand against seed data (assets == liabilities+capital)
* [ ] INT-006 Contact portal login + pay-own-invoice flow verified with a real contact-role user

**Checkpoint at hour 8: if INT-003, INT-004, INT-005 aren't done, stop starting new P0 work and finish these three before touching anything in P1.**

---

# P1 — High Value (target: hour 8 → hour 11, only after P0 checkpoint passes)

* [ ] BE-014 Budget CRUD + `/reports/budget` (live actual computation)
* [ ] BE-015 `/reports/aging` (AR/AP buckets)
* [ ] BE-016 `/reports/dashboard` (KPI aggregates)
* [ ] FE-014 Budget screen + Budget Report page
* [ ] FE-015 Aging report page
* [ ] FE-016 Dashboard KPI cards + 1-2 charts
* [ ] INT-007 Invoice/Bill PDF generation wired (barryvdh/laravel-dompdf)
* [x] BE-019 Auth endpoints: `POST /auth/login` (by `login_id`), `POST /auth/logout`, `GET /auth/me` — Sanctum tokens, single error message `Invalid Login Id or Password`, throttled
* [x] BE-020 Forgot/Reset password endpoints + reset-link Mailable + password policy rule — reset link points at `FRONTEND_URL/reset-password`, token 60-min single-use, reset revokes all tokens, no account enumeration
* [x] BE-024 Public signup endpoint — role `user` hardcoded server-side, `role` in payload ignored; creates + links a `customer` Contact in the same transaction (reuse an existing contact with the same email)
* [x] BE-025 Admin Users CRUD + role assignment (`PUT /users/{id}/role`) behind UserPolicy (admin-only). Guards: cannot demote/delete yourself, cannot demote or delete the last admin, a role-`user` account must always keep a linked contact, password change revokes tokens
* [ ] FE-022 Signup page (no role selector) + Admin Users screen with role dropdown
* [x] BE-021 Mail configured — Resend via `resend/resend-laravel` (`MAIL_MAILER=resend`, `RESEND_API_KEY`), domain verified, live send verified. Sent synchronously: no `ShouldQueue`, no queue worker needed
* [ ] BE-022 Invoice/Bill PDF + `POST .../send` Mailable with the PDF attached
* [ ] BE-023 Report PDF (`GET /reports/{report}/pdf`) + `POST /reports/{report}/send`
* [ ] FE-020 Forgot Password + Reset Password pages wired to the auth endpoints
* [ ] FE-021 Print/Send buttons on invoice, bill and all three reports + send dialog and toasts
* [ ] INT-008 Search/filter added to all master data + transaction list screens

---

# P2 — Nice to Have (target: hour 11 → hour 13, only if ahead of schedule)

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
