# Backend Requirements

Reference `docs/DB_SCHEMA.md` and `docs/API_DOCUMENTATION.md` for the concrete
tables/endpoints — this file states the business rules and authorization matrix
behind them.

---

# Authentication & Roles

* [ ] Sanctum token login/logout
* [ ] Spatie roles: `admin`, `accountant`, `user`, seeded in
      `RoleSeeder` at project setup
* [ ] A `user`-role account is always linked to exactly one `contacts` row via
      `users.contact_id` — create this link when an Admin/Accountant
      generates portal access for a contact (bonus: "Invite Contact" action)

## Role Matrix

| Action                                  | Admin | Accountant | User |
| ---------------------------------------- | ----- | ---------------- | -------- |
| CRUD master data (Contacts/Products/CoA) | ✅    | ✅ create/edit only | ❌     |
| Archive/delete master data               | ✅    | ❌                | ❌       |
| Record transactions (PO/SO/Bill/Invoice) | ✅    | ✅                | ❌       |
| Record payments on own contact           | —     | —                 | ✅       |
| Record payments on any contact           | ✅    | ✅                | ❌       |
| View reports                             | ✅    | ✅                | ❌       |
| View own invoices/bills only             | —     | —                 | ✅       |
| User management / role assignment        | ✅    | ❌                | ❌       |

---

# Chart of Accounts + Journals + Journal Entries (Core Ledger)

## Business Rules

1. Every posted vendor bill, customer invoice, or payment produces exactly one
   `journal_entry` with 2+ `journal_entry_lines`.
2. `sum(debit) == sum(credit)` for a journal entry is validated inside the same
   DB transaction that inserts it — if it fails, roll back the whole write and
   return 422. Never persist an unbalanced entry.
3. Journal entries are immutable once created (no update endpoint) — to correct
   a mistake, post a reversing entry. This matches real accounting practice and
   is much simpler to implement correctly than in-place edits.
4. Account balances (for Balance Sheet/P&L) are always computed live by summing
   `journal_entry_lines` — never cached in a column that can drift out of sync.

## Endpoints
See API_DOCUMENTATION.md → Chart of Accounts, Journals, Journal Entries.

## Validation
* `chart_of_accounts.type` must be one of the 5 enum values
* `journal_entry_lines`: debit and credit are never both non-zero on the same line

## Authorization
Admin + Accountant read/write; portal User has no access.

## Database
`chart_of_accounts`, `journals`, `journal_entries`, `journal_entry_lines`

## Important Error Cases
* Posting a bill/invoice with zero lines → 422
* Posting a bill/invoice a second time (already posted) → 409
* Deleting an account referenced by any journal_entry_line → 422

---

# Purchase Flow (PO → Bill → Payment)

## Business Rules
1. A Purchase Order's `total` is server-computed from its lines
   (`sum(quantity * unit_price)`), never trusted from client input.
2. Converting a PO to a Bill copies its lines and sets PO status → `billed`; a
   PO can only be converted once.
3. Posting a bill creates: Debit `Purchase Expense`, Credit `Creditors/AP`.
4. A payment against a bill creates: Debit `Creditors/AP`, Credit `Cash` or
   `Bank` (per the journal chosen). Bill flips to `paid` when
   `sum(payments.amount) >= bill.total`.
5. A payment amount that would exceed the remaining balance is rejected (422).

## Endpoints
`POST /purchase-orders`, `.../confirm`, `.../convert-to-bill`,
`POST /vendor-bills/{id}/post`, `POST /vendor-bills/{id}/payments`

## Validation
* Every line must reference an existing, non-archived product
* Every product must reference an existing product category (`category_id`, required)
* `quantity > 0`, `unit_price >= 0`

## Authorization
Admin, Accountant only.

## Database
`purchase_orders`, `purchase_order_lines`, `vendor_bills`, `vendor_bill_lines`,
`payments`

## Important Error Cases
* Convert-to-bill on an already-billed PO → 409
* Payment on an unposted (draft) bill → 422
* Overpayment → 422

---

# Sales Flow (SO → Invoice → Payment)

## Business Rules
Mirror of Purchase Flow. Posting an invoice creates: Debit `Debtors/AR`, Credit
`Sale Income`. Payment creates: Debit `Cash`/`Bank`, Credit `Debtors/AR`.
Tax is a **required PS field on Sales Order** (and carries to the Customer
Invoice); it is added to the line subtotal and posted to `Sale Income` as a simple
percentage add-on (no separate tax liability account in P0 scope). Purchase-side
documents have no tax field.

## Endpoints
`POST /sales-orders`, `.../confirm`, `.../convert-to-invoice`,
`POST /customer-invoices/{id}/post`, `POST /customer-invoices/{id}/payments`,
`GET /my/invoices`, `POST /my/invoices/{id}/pay`

## Validation
Same shape as Purchase Flow.

## Authorization
Admin/Accountant for full CRUD; portal User restricted to `GET /my/invoices`
and `POST /my/invoices/{id}/pay` where `contact_id == auth()->user()->contact_id`
— enforce this in a policy, not just a query scope, so a crafted request to
someone else's invoice ID returns 403.

## Database
`sales_orders`, `sales_order_lines`, `customer_invoices`,
`customer_invoice_lines`, `payments`

## Important Error Cases
* Contact requesting another contact's invoice → 403 (not 404 — but do not leak
  whether the ID exists either; a generic 403 is fine for hackathon scope)
* Overpayment → 422

---

# Budgets & Analytic Accounts (P1)

## Business Rules
1. `actual_amount` for a budget is computed on read: sum of
   `journal_entry_lines.debit - credit` (or the inverse for income-type
   analytic accounts) where `analytic_account_id` matches and the journal
   entry date falls within the budget's period.
2. `variance = planned_amount - actual_amount`.

## Endpoints
`GET/POST /analytic-accounts`, `GET/POST /budgets`, `GET /reports/budget`

## Authorization
Admin, Accountant only.

---

# Reports (Balance Sheet, P&L, Budget, Aging, Dashboard)

## Business Rules
1. Balance Sheet: for each account, balance = sum(debit) - sum(credit) for
   **debit-normal** types (`asset`, `bank`, `cash`, `expense`, `other_expense`),
   and sum(credit) - sum(debit) for **credit-normal** types (`liability`,
   `income`, `capital`), as of the given date.
   Balance Sheet sections: Assets = `asset` + `bank` + `cash`;
   Liabilities = `liability` + `capital`.
2. Assets must equal Liabilities + Capital — if they don't in testing, the bug
   is in the posting logic, not the report; fix it there.
3. P&L: Income accounts minus Expense accounts within the date range = net
   profit.
4. All reports are read-only, computed on request — no stored report tables.

## Endpoints
See API_DOCUMENTATION.md → Reports.

## Authorization
Admin, Accountant only.

## Important Error Cases
* `as_of` date in the future relative to server time is allowed (still valid —
  just returns whatever is posted up to now, capped at "now")
* Missing/invalid date params → 422
