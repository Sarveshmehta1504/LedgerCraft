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
Send **exactly one** identifier — `login_id` or `email`:

```json
{ "login_id": "adminuser" }
```
```json
{ "email": "admin_ledgercraft@yopmail.com" }
```

`login_id` is accepted because login is by login id, so that is what a user who
has just failed to sign in has to hand; the server resolves it to that account's
email address and sends there. Sending both, or neither, is a `422`.

Generates a token in `password_reset_tokens` and emails a reset link.
**Always returns 200** with `"If the email exists, a reset link has been sent"` —
identical body for a known identifier, an unknown one, and a mail transport
failure. Never reveal whether an account exists.

The reset link is `FRONTEND_URL/reset-password?token=…&email=…`, so the reset
form reads both values from the query string and the user never re-types an
identifier.

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

# Purchase Orders

* `GET /purchase-orders` — filters: `status`, `contact_id`, `search` (by number)
* `POST /purchase-orders` — body `{contact_id, date, lines:[{product_id, account_id?, analytic_account_id?, quantity, unit_price}]}`.
  `number` is generated (`P00001`); `account_id` defaults to the Purchase
  Expense account; `subtotal = quantity * unit_price` and the header `total` is
  the sum of lines — both are computed server-side and ignored if sent.
* `GET /purchase-orders/{id}` — includes lines with product/account/analytic, and
  `bill` (id, number, status) when one exists
* `PUT /purchase-orders/{id}` — **draft only**, replaces the whole line set; `409` otherwise
* `DELETE /purchase-orders/{id}` — draft only (`409` otherwise), Admin only; lines cascade
* `POST /purchase-orders/{id}/confirm` — draft → confirmed. `409` if already confirmed or billed
* `POST /purchase-orders/{id}/convert-to-bill` — confirmed → billed, creates a
  draft Vendor Bill copying vendor, products, prices and quantities. `409` if the
  order is still draft or has already been converted

Status transitions are strict: `draft → confirmed → billed`, one way only.
Adding an archived product to a new document returns `422`, though documents
that already reference it keep resolving it.

---

# Sales Orders

Mirrors Purchase Orders, with tax:

* `GET /sales-orders` — filters: `status`, `contact_id`, `search`
* `POST /sales-orders` — lines take an optional `tax_percent` (0-100, default 0).
  `number` generated (`S00001`); line `account_id` defaults to **Sale Income**.
* `GET|PUT|DELETE /sales-orders/{id}` — draft-only for edit and delete
* `POST /sales-orders/{id}/confirm` — draft → confirmed
* `POST /sales-orders/{id}/convert-to-invoice` — confirmed → invoiced, creates a
  draft Customer Invoice copying customer, products, prices, quantities **and tax**

## Tax and totals

```text
line.subtotal   = quantity * unit_price        (stored, tax-exclusive)
line.tax_amount = subtotal * tax_percent / 100 (derived)
line.line_total = subtotal + tax_amount        (derived)
header.total    = sum(line_total)              (stored, tax-INCLUSIVE)
```

`tax_amount` and `line_total` are appended to every sales line in the JSON; they
are not columns. Posting an invoice debits Debtors for the tax-inclusive
`total`. Purchase-side documents have no `tax_percent` — a value sent there is
ignored.

---

# Vendor Bills

* `GET /vendor-bills` — filters: `status`, `contact_id`, `search` (number or reference)
* `POST /vendor-bills` — standalone bill; `bill_number` generated (`Bill/2026/0001`).
  Same line shape as a purchase order. `due_date` must not precede `bill_date`.
* `GET /vendor-bills/{id}` — lines, contact, `purchase_order` (when converted
  from one), and the generated `journal_entry` with its lines
* `PUT /vendor-bills/{id}` — **draft only** (`409` otherwise)
* `DELETE /vendor-bills/{id}` — draft only; a posted bill is part of the ledger
* `POST /vendor-bills/{id}/post` — draft → posted. Creates the journal entry
  **Debit Purchase Expense / Credit Creditors** for the bill total, via
  `JournalEntryService`. `409` if already posted or if the bill has no lines.
* `POST /vendor-bills/{id}/payments` — body `{amount, payment_via?, date?, note?}`.
  `payment_via` defaults to `bank`. Creates **Debit Creditors / Credit Cash|Bank**
  and flips the bill to `paid` once fully settled.
  `422` if the amount is zero/negative, exceeds the amount due, or the bill is
  still draft or already paid.

Every bill payload carries derived footer totals — `amount_paid`,
`paid_via_cash`, `paid_via_bank`, `amount_due` — computed from payments and
never stored, so they cannot drift.

---

# Customer Invoices

The mirror of Vendor Bills:

* `GET /customer-invoices` — filters: `status`, `contact_id`, `search`
* `POST /customer-invoices` — standalone invoice; `invoice_number` generated
  (`INV/2026/0001`). Lines accept `tax_percent`.
* `GET /customer-invoices/{id}` — lines, contact, `sales_order` (when converted
  from one), and the generated `journal_entry` with its lines
* `PUT|DELETE /customer-invoices/{id}` — **draft only** (`409` otherwise)
* `POST /customer-invoices/{id}/post` — creates **Debit Debtors / Credit Sale
  Income** for the tax-inclusive total
* `POST /customer-invoices/{id}/payments` — creates **Debit Cash|Bank / Credit
  Debtors**, `payment_type` `receive`, and flips the invoice to `paid` once
  settled. Same guards as bill payments.

Invoice payloads carry the same derived footer totals as bills: `amount_paid`,
`paid_via_cash`, `paid_via_bank`, `amount_due`.

## Ledger summary

| Action | Debit | Credit |
| ------ | ----- | ------ |
| Post vendor bill | Purchase Expense | Creditors |
| Pay vendor bill | Creditors | Cash / Bank |
| Post customer invoice | Debtors | Sale Income |
| Receive invoice payment | Cash / Bank | Debtors |

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
