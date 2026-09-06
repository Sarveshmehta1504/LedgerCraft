# LedgerCraft

> **A real double-entry accounting system for Urban Furniture — built like Odoo Accounting, sized for a hackathon.**

LedgerCraft turns master data (contacts, products, chart of accounts, journals, budgets)
into linked sales/purchase/payment transactions, auto-posts correct double-entry
journal entries for every transaction, and generates live Balance Sheet, P&L, and
Budget reports straight from the ledger.

This is a solo/team Odoo Hackathon build under a **12–15 hour** compressed window.
See [`AGENTS.md`](AGENTS.md) for the full AI-agent rules and timeline, and
[`docs/TEAM_TASKS.md`](docs/TEAM_TASKS.md) for the authoritative task board.

---

## 📌 Current Status

> Kept honest on purpose — update the checkboxes as work lands instead of
> rewriting this section from scratch.

**Done (Hour 0–1 setup):**

- ✅ Repo scaffolded — `backend/` (Laravel 12) and `frontend/` (Next.js) created
- ✅ Laravel 12 installed with **Sanctum** (auth) and **Spatie Laravel Permission** (RBAC) pulled in
- ✅ `GET /api/health` implemented ([routes/api.php](backend/routes/api.php)) and returns the standard envelope
- ✅ Next.js homepage (`/health`) calls the backend health endpoint and renders the response — first Next.js ↔ Laravel round trip proven
- ✅ Base migrations present: users, cache, jobs, personal access tokens, Spatie permission tables
- ✅ Full project documentation written and finalized in [`docs/`](docs) (requirements, DB schema, API contract, UI guidelines, demo flow, team task board)

**Not started yet (tracked in [`docs/TEAM_TASKS.md`](docs/TEAM_TASKS.md)):**

- ⬜ Master data (Contacts, Products, Chart of Accounts, Journals) — migrations, models, CRUD APIs, screens
- ⬜ `JournalEntryService` — the core double-entry posting engine
- ⬜ Purchase Order → Vendor Bill → Payment flow
- ⬜ Sales Order → Customer Invoice → Payment flow
- ⬜ Balance Sheet / P&L / Budget reports (computed live from the ledger)
- ⬜ Auth flows beyond scaffolding: login by `login_id`, signup, forgot/reset password
- ⬜ Contact portal (`/portal`) for customers/vendors to view and pay their own invoices/bills
- ⬜ PDF export + email delivery for invoices, bills and reports (Mail, see below)
- ⬜ AR/AP aging report, dashboard KPIs, bank reconciliation (stretch)

If you're picking this repo up fresh, the fastest way to get oriented is:
read this README's setup section, get `/health` working end-to-end locally, then
open [`docs/TEAM_TASKS.md`](docs/TEAM_TASKS.md) and pick up the next unchecked item
for your area.

---

## 📌 Project Overview

### Problem

Urban Furniture needs an accounting system that records purchases, sales, and payments
using shared master data, and produces accurate financial reports
(Balance Sheet, P&L, Budget Report) without manual bookkeeping.

### Solution

A Laravel 12 API + Next.js frontend that models Contacts, Products, Chart of Accounts,
Journals, and Journal Entries, drives Purchase Order → Vendor Bill → Payment and Sales
Order → Customer Invoice → Payment flows, and computes reports live from posted
journal entries rather than stored snapshots.

### Target Users

| Role | Access |
|---|---|
| **Admin** (Business Owner) | Full CRUD on master data, transactions, reports, user/role management |
| **Accountant** (Invoicing User) | Creates master data, records transactions, views reports |
| **Contact** (Customer/Vendor) | Portal-only access to their own invoices/bills, can pay them |

### Core Workflow

```text
Master Data (Contacts, Products, CoA, Journals, Budgets)
    ↓
Purchase Order → Vendor Bill → Payment
Sales Order → Customer Invoice → Payment
    ↓
Automatic Journal Entry (debit = credit, enforced in a DB transaction)
    ↓
Live Reports (Balance Sheet, P&L, Budget Report, AR/AP Aging)
```

### Odoo Relevance

Mirrors Odoo Accounting's core model 1:1 — Contacts, Chart of Accounts, Journals,
Journal Entries, Analytic Accounts, Budgets — and its Purchase/Sales →
Invoice/Bill → Payment → Ledger → Report pipeline.

Full detail: [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) and [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

---

## 🛠️ Technology Stack

### Backend

* Laravel 12, PHP ^8.2
* MySQL 8
* REST APIs, consistent `{ code, message, data }` envelope
* Laravel Sanctum — token authentication
* Spatie Laravel Permission — roles & permissions (`admin`, `accountant`, `user`)
* barryvdh/laravel-dompdf — PDF export for invoices/bills/reports (planned)
* Laravel Mail — invoice/bill/report delivery by email (planned; see [Mail Configuration](#-mail-configuration))

### Frontend

* Next.js (App Router), React 19, TypeScript
* Tailwind CSS
* shadcn/ui — tables, forms, dialogs (planned)
* recharts — dashboard charts (bonus, planned)

### Development Tools

Git, GitHub, Composer, Laravel Artisan, Node.js/npm, MySQL.

---

## 📁 Project Structure

```text
LedgerCraft/
│
├── backend/                       # Laravel 12 application
│   ├── app/
│   ├── database/migrations/
│   ├── routes/api.php
│   └── .env.example
│
├── frontend/                      # Next.js application
│   └── src/app/health/            # first backend↔frontend integration screen
│
├── docs/                          # Shared project documentation (source of truth)
│   ├── PROJECT_OVERVIEW.md
│   ├── REQUIREMENTS.md
│   ├── DB_SCHEMA.md
│   ├── API_DOCUMENTATION.md
│   ├── FRONTEND_REQUIREMENTS.md
│   ├── BACKEND_REQUIREMENTS.md
│   ├── UI_GUIDELINES.md
│   ├── TEAM_TASKS.md
│   └── DEMO_FLOW.md
│
├── README.md
└── .gitignore
```

---

## 🏗️ Architecture

```text
┌──────────────────────┐
│      Next.js         │
│      Frontend        │
└──────────┬───────────┘
           │  HTTP / JSON
           ▼
┌──────────────────────┐
│     Laravel 12       │
│      REST API        │
│  Sanctum · Spatie     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        MySQL         │
└──────────────────────┘
```

**Backend owns:** API endpoints, authentication, authorization/RBAC, validation, business logic, database operations.

**Frontend owns:** pages, UI, components, forms, client-side state, API consumption, loading/error/empty states.

Frontend permission checks are UX-only — the backend is always the source of truth for authorization.

---

## 🔗 API Response Convention

Every backend endpoint returns the same envelope shape.

```json
{ "code": 200, "message": "Hello world" }
```

```json
{ "code": 200, "message": "Users fetched successfully", "data": [] }
```

```json
{ "code": 422, "message": "Validation failed", "errors": { "email": ["The email field is required."] } }
```

`code` should correspond to the HTTP status code.

For example:

```text
200 → Success
201 → Created
400 → Bad Request
401 → Unauthenticated
403 → Unauthorized
404 → Not Found
409 → Conflict
422 → Validation Error
500 → Server Error
```

Keep API responses predictable across the backend.

---

# 🔌 Backend API (integration quick reference)

Full contract: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

Base URL `http://127.0.0.1:8000/api`. Every endpoint except `/health` and the
public auth routes needs `Authorization: Bearer <token>`.

**Login is by `login_id`, not email.** Seeded accounts:

| login_id      | password      | role       |
| ------------- | ------------- | ---------- |
| `adminuser`   | `Admin@123`   | admin      |
| `accountant1` | `Account@123` | accountant |
| `nimeshp`     | `Nimesh@123`  | user (portal) |

The portal account is linked to the *Nimesh Patel* contact and has outstanding
invoices, so "pay my dues from the portal" can be demonstrated.

```text
auth        POST /auth/login | /auth/signup | /auth/logout | /auth/forgot-password
            POST /auth/reset-password   GET /auth/me
master      /contacts  /products  /product-categories  /accounts  /journals
            + PATCH {id}/archive and {id}/unarchive on each
users       /users (admin only) + PUT /users/{id}/role + PATCH {id}/reactivate
purchase    /purchase-orders + {id}/confirm + {id}/convert-to-bill
            /vendor-bills    + {id}/post    + {id}/payments
sales       /sales-orders    + {id}/confirm + {id}/convert-to-invoice
            /customer-invoices + {id}/post  + {id}/payments
portal      GET /my/invoices | /my/bills    POST /my/invoices/{id}/pay
reports     GET /reports/profit-and-loss | /reports/balance-sheet | /reports/trial-balance
```

Every response uses the `{code, message, data?}` envelope, and `code` mirrors the
HTTP status.

Adding seeders? Read [`docs/SEEDING.md`](docs/SEEDING.md) first — journal entries
must never be inserted by hand.

---

## 🧪 Initial Integration Test (already working)

```text
GET /api/health  →  { "code": 200, "message": "Backend is running successfully" }
```

The Next.js `/health` page calls this endpoint and renders the message + code.
This proves the full round trip: **Next.js → HTTP → Laravel → JSON → Next.js → UI.**
Confirm this still works after cloning before building anything else (see
[Verifying the Setup](#-verifying-the-setup) below).

---

## 🚀 Setup Guide (Windows & macOS)

Commands are given for both **Windows (PowerShell)** and **macOS/Linux (bash/zsh)**.
Where a command is identical on both, it's shown once.

### Prerequisites

| Tool | Version | Windows | macOS |
|---|---|---|---|
| PHP | ^8.2 | [windows.php.net](https://windows.php.net/download/) or [Laravel Herd](https://herd.laravel.com/windows) | `brew install php` or [Laravel Herd](https://herd.laravel.com) |
| Composer | latest | [getcomposer.org](https://getcomposer.org/download/) | `brew install composer` |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) or `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| MySQL | 8.x | [MySQL Installer](https://dev.mysql.com/downloads/installer/) or via Herd | `brew install mysql` |
| Git | latest | [git-scm.com](https://git-scm.com/download/win) | `brew install git` (or Xcode CLT) |

Verify everything is on `PATH`:

```bash
php -v
composer -V
node -v
npm -v
mysql --version
git --version
```

### 1. Clone the repository

```bash
git clone <repo-url> LedgerCraft
cd LedgerCraft
```

### 2. Backend (Laravel) setup

```bash
cd backend
composer install
```

Create the environment file:

```bash
# Windows (PowerShell / cmd)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Generate the app key:

```bash
php artisan key:generate
```

### 3. Database setup

Create a MySQL database named `ledgercraft` (via MySQL Workbench, TablePlus, or the CLI):

```sql
CREATE DATABASE ledgercraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Edit `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ledgercraft
DB_USERNAME=root
DB_PASSWORD=your_local_password
```

Run migrations:

```bash
php artisan migrate --seed
```

For a completely fresh database (⚠️ drops all tables/data first):

```bash
php artisan migrate:fresh --seed
```

### 4. Mail Configuration

Password reset, invoice/bill "send by email", and report emailing all go through
Laravel Mail. By default `MAIL_MAILER=log` in `.env.example` — mail is written to
the log file instead of actually sending, which is fine for local dev.

To send real mail (demo/staging), configure an SMTP provider in `backend/.env`, e.g. with
**Resend**:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=587
MAIL_USERNAME=resend
MAIL_PASSWORD=your_resend_api_key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="hello@yourdomain.test"
MAIL_FROM_NAME="LedgerCraft"
```

> **Do not spam the real Resend quota while developing.** Verify mail-sending code
> paths using `MAIL_MAILER=log` (or Mailtrap) and only switch to a live SMTP mailer
> for an actual demo/test send. Mail is sent **synchronously** (no queue worker
> required) so `php artisan queue:work` is not needed for mail to go out.

After changing `.env`, clear cached config:

```bash
php artisan config:clear
```

### 5. Start the backend

```bash
php artisan serve
```

Runs at **http://127.0.0.1:8000**. Verify: **http://127.0.0.1:8000/api/health**

Optionally, run backend + queue + logs together (from `backend/`):

```bash
composer run dev
```

### 6. Frontend (Next.js) setup

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Runs at **http://localhost:3000**.

If the frontend needs to know the API base URL explicitly, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### 7. Verifying the Setup

With both servers running:

1. Open **http://localhost:3000/health**
2. Confirm it displays `Backend is running successfully` with `Code: 200`
3. If it fails, check: backend server running? correct port? CORS enabled in
   `backend/config/cors.php`? `NEXT_PUBLIC_API_URL` correct?

### Clearing stale Laravel state

If config/cache/routes act stale after pulling changes:

```bash
php artisan optimize:clear
```

---

## 🔐 Authentication & RBAC

* Auth: **Laravel Sanctum** (token-based).
* Login is by **`login_id`**, not email (per the UI design board) — see [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).
* Public signup always assigns role `user` server-side; any `role` field in the request body is ignored to prevent privilege escalation, and creates/links a `customer` Contact in the same DB transaction.
* Forgot/reset password: token-based flow via `password_reset_tokens`; `forgot-password` always returns `200` regardless of whether the email exists, to avoid account enumeration.
* RBAC via **Spatie Laravel Permission**, three roles only: `admin`, `accountant` (Invoicing User), `user` (Contact/portal). No extra roles/permissions beyond what the problem statement requires.
* The backend is always the authorization source of truth — frontend role checks are UX convenience only.

Full endpoint contracts: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

---

## 📚 Project Documentation

The `docs/` directory is the shared project knowledge base.

```text
docs/
│
├── PROJECT_OVERVIEW.md
├── REQUIREMENTS.md
├── DB_SCHEMA.md
├── API_DOCUMENTATION.md
├── FRONTEND_REQUIREMENTS.md
├── BACKEND_REQUIREMENTS.md
├── UI_GUIDELINES.md
├── TEAM_TASKS.md
└── DEMO_FLOW.md
```

These documents should describe important project decisions and contracts.

---

# 🌿 Git Workflow

The team uses **exactly five branches**:

```text
main
│
├── parv
├── sarvesh
├── nikhil
└── jenish
```


## Important Rule

> **No team member directly commits to `main` after initial project setup.**

The only exception is the initial repository/project setup performed by the designated setup person.

After setup, all development happens on one of the four team branches.

---

# 👥 Team Branches

Each member owns one permanent development branch.

Example:

```text
main

parv
sarvesh
nikhil
jenish
```

Do NOT create a new feature branch for every task.

Tasks are tracked in:

```text
docs/TEAM_TASKS.md
```

---

# 🚀 Initial Repository Setup

The initial setup should happen in this order:

```text
1. Create GitHub repository
        ↓
2. Clone repository
        ↓
3. Create backend/
        ↓
4. Create frontend/
        ↓
5. Create docs/
        ↓
6. Configure Laravel
        ↓
7. Configure Next.js
        ↓
8. Configure authentication/RBAC dependencies
        ↓
9. Configure documentation
        ↓
10. Create /api/health
        ↓
11. Connect frontend homepage
        ↓
12. Verify frontend ↔ backend
        ↓
13. Commit initial setup
        ↓
14. Create four team branches
```

The initial setup commit may be made directly to:

```text
main
```

After that:

> **Do not directly commit to main.**

---

# 🔄 Daily Team Workflow

Before starting work:

```bash
# before starting work
git fetch origin
git rebase origin/main

# check what you're about to commit
git status
git diff

# commit with a meaningful message
git add .
git commit -m "feat: add contacts CRUD API"

# push your own rebased branch
git push --force-with-lease origin <your-branch>
```

Never `git push --force` (plain), never reset/delete a teammate's branch, never rewrite shared history without coordinating first.

### Commit message style

```text
feat: add product API
fix: resolve invalid order status
refactor: simplify order service
docs: update API documentation
chore: configure frontend environment
```

Avoid vague messages like `update`, `final`, `working`, `test`.

### Rebase conflicts

```bash
git status                 # see conflicted files
# resolve manually — never blindly take "ours" or "theirs"
git add .
git rebase --continue
git push --force-with-lease origin <your-branch>
```

If the correct resolution isn't obvious, stop and coordinate with the affected teammate.

Full rules: [`AGENTS.md`](AGENTS.md) §15–20.

---

## 👥 Team

| Member | Branch | Primary Responsibility |
|---|---|---|
| Parv | `parv` | Backend — Master Data + Chart of Accounts + Journals |
| Nikhil | `nikhil` | Backend — Purchase/Sales/Payment flow + Reports |
| Sarvesh | `sarvesh` | Frontend — Master Data screens + Auth + Contact portal |
| Jenish | `jenish` | Frontend — Transaction screens + Reports/Dashboard UI |

Agent ownership mirrors this: `frontend/` → Frontend agent, `backend/` → Backend agent,
Git operations → GitHub agent, quality review → Reviewer agent. Avoid modifying
another owner's primary area without coordinating first (`AGENTS.md` §13–14).

---

## 🧭 Hackathon Engineering Standard

This is a 12–15 hour hackathon build, not a production system. Priority order:

```text
Required Features → Core Workflow → Frontend/Backend Integration
    → Demo Reliability → Judging Impact → Odoo Relevance → UX Polish → Extras
```

Avoid over-engineering: no unnecessary design patterns, premature optimization,
exhaustive test coverage, or production-scale infrastructure. If a simple
implementation reliably solves the problem, ship that. Full rules: `AGENTS.md` §9–11.

---

## 🏆 Final Submission Checklist

```text
[ ] Core workflow works end-to-end (PO→Bill→Payment, SO→Invoice→Payment)
[ ] Frontend ↔ backend integration works with no mocked data left
[ ] Required features complete (see docs/REQUIREMENTS.md P0)
[ ] Authentication works for all 3 roles
[ ] Required RBAC enforced
[ ] Database migrations run clean from scratch
[ ] Demo data seeded
[ ] Demo flow rehearsed against docs/DEMO_FLOW.md
[ ] No obvious critical bugs
[ ] No secrets or .env files committed
[ ] No merge conflict markers left in the repo
[ ] README and docs/ updated to match reality
[ ] main contains the final working version
```

---

## 📄 License

This project is developed for hackathon purposes.
