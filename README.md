# LedgerCraft

> A double-entry accounting system for **Urban Furniture** — master data, purchase and
> sales cycles, payments, and financial reports computed live from the ledger.

Built for the Odoo Hackathon. LedgerCraft models the same core objects Odoo Accounting
does — Contacts, Products, Chart of Accounts, Journals, Journal Entries, Analytic
Accounts and Budgets — and drives the full pipeline from a purchase or sales order
through to a posted, balanced ledger entry and a financial statement.

---

## Table of contents

- [What it does](#what-it-does)
- [Roles](#roles)
- [Feature status](#feature-status)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Setup](#setup)
- [Demo accounts](#demo-accounts)
- [Suggested demo walkthrough](#suggested-demo-walkthrough)
- [API conventions](#api-conventions)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Tests](#tests)
- [Team](#team)

---

## What it does

### The problem

Urban Furniture needs to record purchases, sales and payments against shared master
data, and produce accurate financial statements without keeping the books by hand.

### The approach

Every financial document — a vendor bill, a customer invoice, a payment — posts a
**balanced double-entry journal entry** when it is confirmed. Reports are then
projections over those entries. Nothing is stored as a snapshot, so the Balance Sheet
cannot drift away from the transactions behind it.

```text
Master data          Contacts · Products · Chart of Accounts · Journals · Analytic Accounts
      │
      ▼
Purchase cycle       Purchase Order → Vendor Bill → Payment
Sales cycle          Sales Order    → Customer Invoice → Payment
      │
      ▼
Ledger               Journal entries, debit = credit, enforced inside the DB transaction
      │
      ▼
Reports              Balance Sheet · Profit & Loss · Budget · Trial Balance · AR/AP Aging
```

### How the double entry works

A single service, `JournalEntryService`, is the only code in the system that writes to
`journal_entries` and `journal_entry_lines`. Before committing, it asserts that the
entry has at least two lines, that no line carries both a debit and a credit, that no
amount is negative, and that total debits equal total credits — compared as **integer
paise**, so floating-point rounding can never let an unbalanced entry through. A
failure raises `UnbalancedJournalEntryException` and the whole transaction rolls back.

The postings are the standard ones:

| Event | Debit | Credit |
| --- | --- | --- |
| Vendor bill posted | Purchase Expense | Creditors (AP) |
| Bill paid | Creditors (AP) | Bank / Cash |
| Customer invoice posted | Debtors (AR) | Sale Income |
| Invoice paid | Bank / Cash | Debtors (AR) |

Because every entry is balanced by construction, the Balance Sheet balances, the Trial
Balance balances, and retained earnings equals net income from the P&L — all three are
checked by the test suite.

### Odoo relevance

The domain model maps one-to-one onto Odoo Accounting: the same master data objects,
the same order → invoice/bill → payment → ledger → report pipeline, the same use of
analytic accounts as cost/revenue centres with budgets measured against them, and the
same practice of archiving master data rather than deleting records that transactions
still reference.

---

## Roles

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Admin** (Business Owner) | Everything below, plus archive/restore master data, delete records, and manage users and their roles | — |
| **Accountant** (Invoicing User) | Create and edit all master data; run the full purchase and sales cycles; post documents; register payments; create and revise budgets; read the ledger and every report | Archive, delete, or manage users |
| **Customer** (Contact portal) | See only their own posted and paid invoices and bills, download them as PDF, and pay outstanding dues | See anything belonging to another contact, or any back-office screen |

Authorization is enforced by Laravel policies on the server. Portal scope is derived
from the signed-in user's linked contact and is never read from the request, so a
portal account cannot widen its own scope. Requests for another contact's document
answer `404` rather than `403`, so probing cannot confirm that a record exists.

Frontend role checks exist only to hide controls that would fail — the backend is
always the authority.

---

## Feature status

**Master data**

- Contacts (customer / vendor / both) with full address and avatar, archive and restore
- Products with nested categories, three product types (goods, service, combo)
- Chart of Accounts across all eight account types
- Journals (sales, purchase, bank, cash) with default debit/credit accounts
- Analytic accounts as income or expense cost centres

**Transactions**

- Purchase Order → confirm → convert to Vendor Bill → post → register payment
- Sales Order → confirm → convert to Customer Invoice → post → register payment
- Tax per line on the sales side; payment by bank or cash, in full or in instalments
- Credit terms (`due_date`) agreed on the order and carried onto the bill or invoice
- Overpayment is rejected; only draft documents can be edited

**Ledger and reporting**

- Journal entries, read-only, generated by the system when a document is posted
- Balance Sheet, Profit & Loss, Budget report, Trial Balance, AR/AP Aging, dashboard KPIs
- Budgets with draft / confirmed / revised / cancelled states; achieved amounts derived
  live from posted document lines, so a superseded budget is listed but never
  double-counted in the totals
- PDF export and email delivery for invoices, bills and reports

**Accounts and access**

- Token authentication with a fixed lifetime and refresh
- Login by `login_id`; self-registration always creates a portal-only account
- Forgot / reset password by either login ID or email address
- Customer portal: own invoices and bills, PDF download, pay dues

**Frontend**

- 46 screens, list and card views, sortable columns, filtering and pagination throughout

---

## Technology stack

**Backend** — Laravel 12 · PHP 8.2 · MySQL 8 · Laravel Sanctum (token auth) ·
Spatie Laravel Permission (RBAC) · barryvdh/laravel-dompdf (PDF) · Resend (mail)

**Frontend** — Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 ·
Recharts

---

## Architecture

```text
┌──────────────────────────────┐
│  Next.js frontend            │   pages, forms, client state,
│  React 19 · TypeScript       │   loading / error / empty states
└──────────────┬───────────────┘
               │  JSON over HTTP, bearer token
               ▼
┌──────────────────────────────┐
│  Laravel 12 REST API         │   validation, policies, business
│  Sanctum · Spatie Permission │   logic, double-entry posting
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  MySQL 8                     │
└──────────────────────────────┘
```

Business rules live in service classes (`app/Services/`), not in controllers, so the
purchase and sales sides share the same posting, numbering and payment logic.
Authorization lives in policies (`app/Policies/`) and is checked before validation
runs, so an unauthorized request never learns anything about the data it was refused.

---

## Setup

Commands are shown for both Windows (PowerShell) and macOS/Linux where they differ.

### Prerequisites

| Tool | Version |
| --- | --- |
| PHP | 8.2 or newer |
| Composer | latest |
| Node.js | 20 or newer |
| MySQL | 8.x |
| Git | latest |

Check they are all on your `PATH`:

```bash
php -v && composer -V && node -v && npm -v && mysql --version
```

### 1. Clone

```bash
git clone <repository-url> LedgerCraft
cd LedgerCraft
```

### 2. Create the database

```sql
CREATE DATABASE ledgercraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend

```bash
cd backend
composer install
```

Copy the environment file:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Set the database credentials in `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ledgercraft
DB_USERNAME=root
DB_PASSWORD=your_local_password
```

Generate the application key, build the schema and load the demo data:

```bash
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

The API is now on **http://127.0.0.1:8000**. Confirm with
**http://127.0.0.1:8000/api/health**.

### 4. Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> Note the URL has **no `/api` suffix** — the frontend appends it. Adding it here
> produces requests to `/api/api/...` and every call fails.

```bash
npm run dev
```

The app is now on **http://localhost:3000**.

### 5. Verify

1. Open **http://localhost:3000/health** — it should report the backend as reachable.
2. Sign in at **http://localhost:3000/login** as `adminuser` / `Admin@123`.
3. The dashboard should show cash and bank balances, receivables and payables.

### Mail (optional)

Password reset and "send by email" go through Laravel Mail. `.env.example` ships with
`MAIL_MAILER=log`, which writes messages to `storage/logs/laravel.log` instead of
sending them — enough to exercise the whole flow locally. To send real mail, set
`RESEND_API_KEY` and `MAIL_MAILER=resend` in `backend/.env`. Mail is sent
synchronously, so no queue worker is required.

After editing `.env`, run `php artisan config:clear`.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| Frontend shows "could not load" everywhere | Backend not running, or `NEXT_PUBLIC_API_URL` has a trailing `/api` |
| `419` or CORS errors | Check `FRONTEND_URL` in `backend/.env` matches your frontend origin |
| Config changes ignored | `php artisan config:clear` |
| Stale routes or views after pulling | `php artisan optimize:clear` |
| Tests appear to target your dev database | Run `php artisan config:clear` before `php artisan test` |

---

## Demo accounts

Login is by **`login_id`**, not email.

| Login ID | Password | Role | Notes |
| --- | --- | --- | --- |
| `adminuser` | `Admin@123` | Admin | Full access, including user management |
| `accountant1` | `Account@123` | Accountant | Priya Desai |
| `accountant2` | `Harsh@1234` | Accountant | Harsh Bhavsar |
| `exaccountant` | `Vikram@123` | Accountant | **Deactivated** — login is refused |
| `nimeshp` | `Nimesh@123` | Customer portal | Has invoices outstanding to pay |
| `saffrongrand` | `Saffron@123` | Customer portal | Corporate account, heavily overdue |
| `zenithco` | `Zenith@1234` | Customer portal | Fully settled |

`php artisan migrate:fresh --seed` builds roughly seven months of trading history:
20 contacts, 45 products across 18 categories, 20 purchase orders, 24 sales orders,
18 vendor bills, 23 customer invoices, 20 payments, 12 budgets across two periods, and
59 balanced journal entries. Dates are relative to the day you seed, so the data never
goes stale.

The dataset deliberately covers every document status, all five ageing buckets on both
the receivable and payable sides, all four tax rates in use, budgets that are over and
under target, and archived master data — so no screen is empty and no state is
unreachable during a demo.

---

## Suggested demo walkthrough

1. **Dashboard** — cash and bank balances, receivables and payables with overdue
   amounts, top customers, recent transactions.
2. **Master data** — open Contacts and Products; note search, filters, sorting and the
   archived-records toggle.
3. **Purchase cycle** — create a Purchase Order, confirm it, convert it to a Vendor
   Bill, post the bill, then register a payment.
4. **Journal Entries** — open the entry the posting created and show that debits equal
   credits, with the source document and the accountant who posted it.
5. **Sales cycle** — the same flow from Sales Order to Customer Invoice to receipt.
6. **Reports** — Balance Sheet (it balances), Profit & Loss, Budget report (note the
   superseded budget listed but excluded from totals), and AR/AP Ageing.
7. **Customer portal** — sign in as `nimeshp` and pay an outstanding invoice; confirm
   that only that customer's own documents are visible.
8. **Access control** — sign in as `accountant1` and note that user management is
   unavailable.

A fuller script is in [`docs/DEMO_FLOW.md`](docs/DEMO_FLOW.md).

---

## API conventions

Base URL `http://127.0.0.1:8000/api`. Every route except `/health` and the public auth
routes requires `Authorization: Bearer <token>`.

Every response uses the same envelope, and `code` always mirrors the HTTP status:

```json
{ "code": 200, "message": "Contacts fetched successfully", "data": [] }
```

```json
{ "code": 422, "message": "Validation failed", "errors": { "name": ["The name field is required."] } }
```

### Endpoint groups

```text
auth       POST /auth/login · /auth/signup · /auth/logout · /auth/refresh
           POST /auth/forgot-password · /auth/reset-password    GET /auth/me
master     /contacts · /products · /product-categories · /accounts · /journals
           · /analytic-accounts   + PATCH {id}/archive and {id}/unarchive
users      /users (admin only) + PUT /users/{id}/role + PATCH {id}/reactivate
purchase   /purchase-orders + {id}/confirm + {id}/convert-to-bill
           /vendor-bills    + {id}/post + {id}/payments + {id}/pdf + {id}/send
sales      /sales-orders    + {id}/confirm + {id}/convert-to-invoice
           /customer-invoices + {id}/post + {id}/payments + {id}/pdf + {id}/send
budgets    /budgets + {id}/confirm + {id}/revise + {id}/cancel
ledger     GET /journal-entries · /journal-entries/{id}          (read-only)
reports    GET /reports/balance-sheet · /profit-and-loss · /budget
           · /trial-balance · /aging · /dashboard   + /{report}/pdf · /{report}/send
portal     GET /my/invoices · /my/bills   POST /my/invoices/{id}/pay
```

The full contract, with request and response bodies, is in
[`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

---

## Project structure

```text
LedgerCraft/
├── backend/                     Laravel 12 API
│   ├── app/
│   │   ├── Http/Controllers/Api/    16 resource controllers
│   │   ├── Http/Requests/           validation + authorization
│   │   ├── Models/                  19 Eloquent models
│   │   ├── Policies/                12 authorization policies
│   │   └── Services/                business logic, incl. JournalEntryService
│   ├── database/
│   │   ├── migrations/              29 migrations
│   │   └── seeders/                 demo dataset
│   ├── routes/api.php
│   └── tests/                       70 tests
│
├── frontend/                    Next.js 16 application
│   └── src/
│       ├── app/                     routes (App Router)
│       ├── components/              shared UI, forms, tables
│       ├── lib/                     API client, session, formatting
│       └── types/                   domain types mirrored from the API
│
└── docs/                        project documentation
```

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | Problem, solution, scope |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Functional requirements by priority |
| [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md) | Tables, columns, relationships |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Full endpoint contract |
| [`docs/BACKEND_REQUIREMENTS.md`](docs/BACKEND_REQUIREMENTS.md) | Backend rules and conventions |
| [`docs/FRONTEND_REQUIREMENTS.md`](docs/FRONTEND_REQUIREMENTS.md) | Screens and behaviour |
| [`docs/UI_GUIDELINES.md`](docs/UI_GUIDELINES.md) | Visual language |
| [`docs/SEEDING.md`](docs/SEEDING.md) | Seeding rules and what the demo data contains |
| [`docs/PDF_SERVICE.md`](docs/PDF_SERVICE.md) | PDF generation and mail delivery |
| [`docs/DEMO_FLOW.md`](docs/DEMO_FLOW.md) | Demo script |
| [`docs/TEAM_TASKS.md`](docs/TEAM_TASKS.md) | Task board |

---

## Tests

```bash
cd backend
php artisan config:clear   # ensures the test database configuration is used
php artisan test
```

**70 tests, 130 assertions.** They cover the double-entry invariants (an unbalanced
entry is rejected; the Balance Sheet balances; retained earnings equals net income),
budget lifecycle and achieved-amount derivation, the operational reports, PDF and mail
generation, token expiry and refresh, and portal isolation between contacts.

Frontend checks:

```bash
cd frontend
npx tsc --noEmit    # type check
npx eslint src      # lint
npm run build       # production build
```

---

## Team

| Member | Area |
| --- | --- |
| Parv | Backend — master data, chart of accounts, journals, ledger |
| Nikhil | Backend — purchase/sales/payment flows, reports |
| Sarvesh | Frontend — master data screens, authentication, customer portal |
| Jenish | Frontend — transaction screens, reports and dashboard |

---

## License

Developed for the Odoo Hackathon.
