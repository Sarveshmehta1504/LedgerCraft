# API Documentation

## Base URL

```text
/api
```

## Authentication

Laravel Sanctum, token-based (SPA or personal access token — token is simplest for a
hackathon: return it on login, frontend sends `Authorization: Bearer <token>`).
Every route below except `/auth/login` requires auth. Role checks use Spatie
middleware (`role:admin`, `role:admin,accountant`, etc.) per the matrix in
`BACKEND_REQUIREMENTS.md`.

---

# Authentication

## POST `/auth/login`

### Request
```json
{ "login_id": "urbanadmin", "password": "Password@1" }
```
Login is by **`login_id`**, not email (per the design board).

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
Returns current user + role + linked contact_id (if role=`user`).

## POST `/auth/signup`
Public self-registration. Request
`{ "name": "...", "login_id": "...", "email": "...", "password": "...", "password_confirmation": "..." }`.

**Always assigns role `user`.** A `role` field in the request body must be ignored
outright — never trusted — or signup becomes privilege escalation. Validation
matches the design board: `login_id` unique 6–12 chars, `email` unique, password
>8 chars with lower + upper + special.

Signup also **creates a `contacts` row of type `customer`** (name + email from the
form) and links it via `users.contact_id`, in the same transaction as the user. If
a contact with that email already exists, link to it rather than creating a
duplicate.

---

# Users (Admin only)

* `GET /users` — list accounts with their roles
* `POST /users` — Admin creates an account **and assigns its role**
  (`admin` | `accountant` | `user`); optionally links `contact_id`
* `PUT /users/{id}` — update details / link a `contact_id`
* `PUT /users/{id}/role` — change role, body `{ "role": "accountant" }`
* `DELETE /users/{id}` — **deactivates** the account (sets `deactivated_at`) and
  revokes its tokens. The row is never deleted: a user is referenced by
  `journal_entries.created_by`, so removing it would break the audit trail.
  Idempotent — deactivating an already-deactivated user returns 200.
* `PATCH /users/{id}/reactivate` — clears `deactivated_at`

`GET /users` **excludes deactivated accounts by default**; pass
`?deactivated=only` to list just those. Every user payload carries
`deactivated_at` (`null` when active).

A deactivated account cannot log in: `POST /auth/login` returns **403**
`This account has been deactivated. Contact your administrator.` — distinct from
the 401 for bad credentials, since the credentials are valid.

**Guards on the user endpoints** (all return `422` unless noted):

* you cannot remove your own admin role, or delete your own account (`403`)
* you cannot demote or deactivate the last remaining admin
* creating or switching to role `user` requires `contact_id` — a portal account
  must always be linked to a contact, and that link cannot later be set to null
* changing a password revokes every existing token for that account
* `PUT /users/{id}` ignores a `role` field; role changes go through
  `PUT /users/{id}/role` only

All return `403` for Accountant and User. This is the only route to an `admin` or
`accountant` account — signup can never produce one.

---

## POST `/auth/forgot-password`
Request `{ "email": "owner@urbanfurniture.test" }`. Generates a token in
`password_reset_tokens` and emails a reset link. **Always returns 200** with
`"If the email exists, a reset link has been sent"` — never reveal whether an
account exists.

## POST `/auth/reset-password`
Request `{ "email": "...", "token": "...", "password": "...", "password_confirmation": "..." }`.
Enforces the same password policy as signup (>8 chars, lower + upper + special).
Errors: `422` invalid/expired token or weak password.

---

# Mail & Documents

Every endpoint below is Admin/Accountant only, except a portal User may print
their own invoice.

* `GET /customer-invoices/{id}/pdf` — download the invoice PDF
* `POST /customer-invoices/{id}/send` — email the invoice PDF to the customer's
  contact email
* `GET /vendor-bills/{id}/pdf` — download the bill PDF
* `POST /vendor-bills/{id}/send` — email the bill PDF to the vendor
* `GET /reports/{report}/pdf` — `report` ∈ `balance-sheet` | `profit-and-loss` |
  `budget`; same query params as the JSON report (period/date)
* `POST /reports/{report}/send` — body `{ "to": "...", "subject": "...", "period": {...} }`,
  emails the rendered report PDF

`send` responses: `200 { "code": 200, "message": "Invoice sent to nimesh@example.com" }`.
Errors: `422` if the contact has no email address on file; `500` if the mail
transport fails — surface the real reason, do not silently succeed.

**Mail is sent synchronously**, inside the request. A `200` therefore means the
message really was handed to SMTP, and the client can show "Sent" with
confidence. The trade-off is a ~1s response — the frontend Send button must show
a spinner and stay disabled until it resolves.

---

# Contacts

* `GET /contacts` — filters: `type`, `search` — Admin, Accountant
* `POST /contacts` — Admin, Accountant
* `GET /contacts/{id}` — Admin, Accountant, or a portal User viewing their own contact
* `PUT /contacts/{id}` — Admin, Accountant
* `DELETE /contacts/{id}` — Admin only, blocked (422) if contact has any transactions — archive instead via `PATCH /contacts/{id}/archive`

## Archiving

Every master resource (`contacts`, `products`, `product-categories`, `accounts`,
`journals`) supports:

* `PATCH /{resource}/{id}/archive` — sets `archived_at` to now
* `PATCH /{resource}/{id}/unarchive` — clears `archived_at` back to null

Both are Admin only. List endpoints **exclude archived rows by default**; pass
`?archived=1` to include them, or `?archived=only` for just the archived ones.
Every record carries `archived_at` in its JSON (`null` when active) so the client
can badge archived rows.

---

# Product Categories

* `GET /product-categories` — populates the Category dropdown on the product form
* `GET /product-categories/{id}`
* `POST /product-categories` / `PUT /product-categories/{id}` — Admin, Accountant
* `DELETE /product-categories/{id}` — Admin only, blocked (409) if the category is
  referenced by any product or has child categories

---

# Products

* `GET /products` — filters: `type`, `category_id`, `search`. Each product embeds
  its related category so the list view can render the name in one request.
* `POST /products` / `PUT /products/{id}` / `PATCH /products/{id}/archive`
* `category_id` is required — validated with `required|exists:product_categories,id`

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
