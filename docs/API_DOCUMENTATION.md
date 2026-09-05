# API Documentation

## Base URL

```text
/api
```

## Authentication

Laravel Sanctum, token-based (SPA or personal access token — token is simplest for a
hackathon: return it on login, frontend sends `Authorization: Bearer <token>`).
Every route below except `/auth/login` requires auth. Role checks use Spatie
middleware (`role:admin`, `role:admin,invoicing_user`, etc.) per the matrix in
`BACKEND_REQUIREMENTS.md`.

---

# Authentication

## POST `/auth/login`

### Request
```json
{ "email": "owner@urbanfurniture.test", "password": "password" }
```

### Success
```json
{ "code": 200, "message": "Login successful", "data": { "user": {}, "token": "..." } }
```

### Errors
* 401 Unauthenticated
* 422 Validation error

## POST `/auth/logout`
Revokes current token. `{ "code": 200, "message": "Logged out" }`

## GET `/auth/me`
Returns current user + role + linked contact_id (if role=contact).

---

# Contacts

* `GET /contacts` — filters: `type`, `search` — Admin, Invoicing User
* `POST /contacts` — Admin, Invoicing User
* `GET /contacts/{id}` — Admin, Invoicing User, or Contact viewing self
* `PUT /contacts/{id}` — Admin, Invoicing User
* `DELETE /contacts/{id}` — Admin only, blocked (422) if contact has any transactions — archive instead via `PATCH /contacts/{id}/archive`

---

# Products

* `GET /products` — filters: `type`, `category`, `search`
* `POST /products` / `PUT /products/{id}` / `PATCH /products/{id}/archive`

---

# Chart of Accounts

* `GET /accounts` — filter: `type`
* `POST /accounts` / `PUT /accounts/{id}`
* `DELETE /accounts/{id}` — blocked (422) if any journal_entry_lines reference it

---

# Journals

* `GET /journals`
* `POST /journals` / `PUT /journals/{id}`

---

# Analytic Accounts & Budgets

* `GET /analytic-accounts` / `POST /analytic-accounts`
* `GET /budgets` — filter: `period_start`, `period_end`
* `POST /budgets`
* `GET /budgets/{id}` — response includes computed `actual_amount` (live, not stored)

---

# Purchase Flow

## POST `/purchase-orders`
```json
{ "contact_id": 3, "date": "2026-09-05",
  "lines": [{ "product_id": 5, "quantity": 2, "unit_price": 1200 }] }
```
Response: created PO with `status: draft`, `total` computed server-side.

## POST `/purchase-orders/{id}/confirm` — sets status → confirmed

## POST `/purchase-orders/{id}/convert-to-bill`
Creates a `vendor_bill` pre-filled from the PO lines, PO status → `billed`.
```json
{ "code": 201, "message": "Vendor bill created", "data": { "vendor_bill": {} } }
```

## POST `/vendor-bills/{id}/post`
Validates, then creates the balanced journal entry (Debit Purchase Expense /
Credit Creditors), sets `status: posted`. Returns 422 with a clear message if the
bill has no lines or total is zero.

## POST `/vendor-bills/{id}/payments`
```json
{ "amount": 2400, "date": "2026-09-05", "journal_id": 4 }
```
Creates payment + journal entry (Debit Creditors / Credit Cash-Bank). If
cumulative payments == bill total, bill `status → paid`. 422 if amount exceeds
remaining balance.

### Errors (apply to all of the above)
* 401, 403 (role/ownership), 404, 422 (validation / unbalanced entry / overpayment), 500

---

# Sales Flow

Mirror of Purchase Flow:

* `POST /sales-orders`
* `POST /sales-orders/{id}/confirm`
* `POST /sales-orders/{id}/convert-to-invoice`
* `POST /customer-invoices/{id}/post` — Debit Debtors / Credit Sale Income
* `POST /customer-invoices/{id}/payments` — Debit Cash-Bank / Credit Debtors

## Contact-role scoped endpoints
* `GET /my/invoices` — Contact sees only invoices where `contact_id == self`
* `GET /my/bills` — same, for bills
* `POST /my/invoices/{id}/pay` — Contact pays their own invoice only (403 otherwise)

---

# Journal Entries (read-only ledger view)

* `GET /journal-entries` — filters: `journal_id`, `date_from`, `date_to`,
  `source_type` — for audit trail / drill-down from reports

---

# Reports

## GET `/reports/balance-sheet?as_of=2026-09-05`
```json
{ "code": 200, "message": "Balance sheet generated", "data": {
  "assets": [{"account": "Cash", "balance": 12000}],
  "liabilities": [{"account": "Creditors", "balance": 3400}],
  "capital": [{"account": "Capital", "balance": 8600}],
  "total_assets": 12000, "total_liabilities_and_capital": 12000 } }
```

## GET `/reports/profit-and-loss?from=2026-08-01&to=2026-09-05`
Returns income accounts, expense accounts, and `net_profit` — computed live from
`journal_entry_lines` grouped by account within the date range.

## GET `/reports/budget?budget_id=2`
Returns `planned_amount`, computed `actual_amount`, `variance`.

## GET `/reports/aging?type=receivable|payable` (P1)
Buckets outstanding invoice/bill balances into 0-30/31-60/61-90/90+.

## GET `/reports/dashboard` (P1)
KPI cards: cash_position, total_receivables, total_payables, overdue_count,
top_customers[].

### Errors (all reports)
* 401, 403, 422 (bad date range), 500
