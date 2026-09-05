# LedgerCraft

> **A real double-entry accounting system for Urban Furniture — built like Odoo Accounting, sized for a hackathon.**

LedgerCraft turns master data (contacts, products, chart of accounts, journals, budgets)
into linked sales/purchase/payment transactions, auto-posts correct double-entry
journal entries for every transaction, and generates live Balance Sheet, P&L, and
Budget reports straight from the ledger.

---

# 📌 Project Overview

## Problem

Urban Furniture needs an accounting system that records purchases, sales, and payments
using shared master data, and produces accurate financial and stock reports
(Balance Sheet, P&L, Budget Report) without manual bookkeeping.

## Solution

A Laravel 12 API + Next.js frontend that models Contacts, Products, Chart of Accounts,
Journals, and Journal Entries, drives Purchase Order → Vendor Bill → Payment and Sales
Order → Customer Invoice → Payment flows, and computes reports live from posted
journal entries.

## Target Users

* Admin (Business Owner) — full CRUD on master data, transactions, reports
* Invoicing User (Accountant) — creates master data, records transactions, views reports
* Contact (Customer/Vendor) — portal access to their own invoices/bills and payments

## Core Workflow

```text
Master Data (Contacts, Products, CoA, Journals, Budgets)
    ↓
Purchase Order → Vendor Bill → Payment
Sales Order → Customer Invoice → Payment
    ↓
Automatic Journal Entry (debit = credit)
    ↓
Live Reports (Balance Sheet, P&L, Budget Report)
```

## Odoo Relevance

Mirrors Odoo Accounting's core model 1:1 — Contacts, Chart of Accounts, Journals,
Journal Entries, Analytic Accounts, Budgets — and its Purchase/Sales →
Invoice/Bill → Payment → Ledger → Report pipeline.

---

# 🛠️ Technology Stack

## Backend

* Laravel 12
* PHP 8.3
* MySQL 8
* REST APIs
* Laravel Sanctum — Authentication
* Spatie Laravel Permission — Roles & Permissions
* barryvdh/laravel-dompdf — PDF report/invoice export (bonus)

## Frontend

* Next.js 14+ (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui — tables, forms, dialogs
* recharts — dashboard charts (bonus)
* axios / fetch wrapper for the API client

## Development Tools

* Git
* GitHub
* Composer
* Laravel Artisan
* Node.js / npm
* MySQL

---

# 📁 Project Structure

```text
LedgerCraft/
│
├── backend/                       # Laravel 12 application
│
├── frontend/                      # Next.js application
│
├── docs/                          # Shared project documentation
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
├── .claude/
│   ├── agents/
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── github.md
│   │   └── reviewer.md
│   │
│   ├── commands/
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── github.md
│   │   ├── review.md
│   │   └── push.md
│   │
│   ├── hooks/
│   │   └── claude_md_drift_check.sh
│   │
│   └── settings.json
│
├── CLAUDE.md
├── README.md
└── .gitignore
```

---

# 🏗️ Architecture

The project uses a separate frontend/backend architecture.

```text
┌──────────────────────┐
│      Next.js         │
│      Frontend        │
└──────────┬───────────┘
           │
           │ HTTP / JSON
           ▼
┌──────────────────────┐
│     Laravel 12       │
│      REST API        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        MySQL         │
└──────────────────────┘
```

## Backend Responsibilities

Laravel owns:

* API endpoints
* Authentication
* Authorization / RBAC
* Validation
* Business logic
* Database operations


## Frontend Responsibilities

Next.js owns:

* Pages
* UI
* Components
* Forms
* Client-side state
* API consumption
* User interaction
* Loading/error/empty states

---

# 🔗 API Response Convention

All APIs should follow a consistent basic response structure.

## Success

```json
{
  "code": 200,
  "message": "Hello world"
}
```

## Example With Data

```json
{
  "code": 200,
  "message": "Users fetched successfully",
  "data": []
}
```

## Error

```json
{
  "code": 422,
  "message": "Validation failed"
}
```

Additional fields may be added when required:

```json
{
  "code": 422,
  "message": "Validation failed",
  "errors": {
    "email": [
      "The email field is required."
    ]
  }
}
```

### Important

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

# 🧪 Initial Integration Test

Before implementing the actual problem statement, the repository should prove that frontend and backend communicate correctly.

## Backend

Create:

```text
GET /api/health
```

Example response:

```json
{
  "code": 200,
  "message": "Backend is running successfully"
}
```

The endpoint should be intentionally simple.

Its purpose is to verify:

```text
Next.js
   ↓
HTTP request
   ↓
Laravel
   ↓
JSON response
   ↓
Next.js
   ↓
Display message
```

## Frontend

The homepage should call:

```text
GET /api/health
```

and display the returned message.

Example:

```text
Backend Status

Backend is running successfully

Code: 200
```

This becomes our initial **frontend ↔ backend connectivity test**.

---

# ⚙️ Backend Setup

Move into the backend:

```bash
cd backend
```

## Install Dependencies

```bash
composer install
```

The project uses the same authentication/RBAC dependencies established in the team's practice project.

Install/configure the required packages according to the project's backend configuration.

---

## Environment

Create the environment file.

### Windows

```bash
copy .env.example .env
```

### Linux/macOS

```bash
cp .env.example .env
```

Generate the Laravel application key:

```bash
php artisan key:generate
```

---

# 🗄️ Database Setup

Configure `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ledgercraft
DB_USERNAME=root
DB_PASSWORD=
```

Then run:

```bash
php artisan migrate --seed
```

For a completely fresh database:

```bash
php artisan migrate:fresh --seed
```

> `migrate:fresh` deletes existing tables and data. Use only when you are okay with losing local database data.

---

# 🧹 Laravel Cache

If configuration or application state becomes stale:

```bash
php artisan optimize:clear
```

---

# ▶️ Start Backend

```bash
php artisan serve
```

Default:

```text
http://127.0.0.1:8000
```

Health endpoint:

```text
GET http://127.0.0.1:8000/api/health
```

---

# 🖥️ Frontend Setup

Move into:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Default Next.js development URL:

```text
http://localhost:3000
```

The homepage should communicate with the Laravel backend.

---

# 🔐 Authentication & RBAC

Authentication will use the same backend authentication approach and dependencies used by the team's practice project.

RBAC should be implemented **only if the problem statement requires it or it provides meaningful value**.

Do not build unnecessary permission systems during the hackathon.

The backend remains responsible for enforcing authorization.

Frontend permission checks are for UX only and must not be treated as security.

---

# 📚 Project Documentation

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
6. Create .claude/
        ↓
7. Configure Laravel
        ↓
8. Configure Next.js
        ↓
9. Configure authentication/RBAC dependencies
        ↓
10. Configure documentation
        ↓
11. Create /api/health
        ↓
12. Connect frontend homepage
        ↓
13. Verify frontend ↔ backend
        ↓
14. Commit initial setup
        ↓
15. Create four team branches
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
git fetch origin
git rebase origin/main
```

Then work on your assigned team branch.

Check:

```bash
git status
git diff
```

Commit meaningful changes:

```bash
git add .
git commit -m "feat: add dashboard"
```

---

# ⬆️ Push Workflow

Because team branches are rebased regularly, use:

```bash
git push --force-with-lease origin <your-branch>
```

Example:

```bash
git push --force-with-lease origin parv
```

Never use:

```bash
git push --force
```

unless explicitly approved by the lead.

---

# 🔀 Pull Request Workflow

When a meaningful piece of work is complete:

```text
Team Branch
    ↓
Fetch latest main
    ↓
Rebase onto main
    ↓
Test
    ↓
Push
    ↓
Pull Request
    ↓
Review
    ↓
Merge into main
```

Before creating a PR:

```bash
git fetch origin
git rebase origin/main
```

Resolve conflicts if required.

Then:

```bash
git push --force-with-lease origin <your-branch>
```

Create a Pull Request:

```text
<your-team-branch> → main
```

---

# ⚠️ Important Git Rules

## Never

```text
❌ Directly commit to main
❌ git push --force
❌ Reset another teammate's branch
❌ Delete another teammate's branch
❌ Rewrite shared history without coordination
```

## Prefer

```text
✅ git fetch origin
✅ git rebase origin/main
✅ git push --force-with-lease
✅ Pull Requests
✅ Small meaningful commits
```

---

# 📝 Commit Convention

Prefer:

```text
feat: add product API
feat: add dashboard
feat: add login page
fix: handle invalid order status
fix: resolve API validation issue
refactor: simplify order service
docs: update API documentation
chore: configure frontend environment
```

Avoid:

```text
update
changes
final
final2
working
test
asdf
```

---

# 🔁 Rebase Conflict Workflow

If a rebase produces conflicts:

```bash
git status
```

Inspect the conflicted files.

Resolve the conflict manually.

Then:

```bash
git add .
git rebase --continue
```

Repeat until complete.

After the rebase:

```bash
git push --force-with-lease origin <your-branch>
```

If the correct resolution is unclear:

> Stop and coordinate with the affected teammate/lead.

Do not blindly choose "ours" or "theirs".

---

# 🧪 Hackathon Testing Philosophy

Testing should focus on high-value scenarios.

Prioritize:

1. Core workflow
2. Important business rules
3. API integration
4. Authentication
5. Authorization where required
6. Demo flow

At minimum:

```text
Happy path
+
Important failure path
```

Do not block development for exhaustive production-level test coverage.

---

# 🎯 Hackathon Engineering Standard

This project is being developed in a **24-hour coding round**.

The objective is:

> Build a complete, convincing and reliable solution — not a production enterprise platform.

Prioritize:

```text
Required functionality
        ↓
End-to-end workflow
        ↓
Demo reliability
        ↓
Judging impact
        ↓
Odoo relevance
        ↓
UX polish
        ↓
Extra features
```

Avoid spending significant time on:

* Perfect abstractions
* Excessive refactoring
* Comprehensive test coverage
* Rare edge cases
* Premature optimization
* Enterprise infrastructure
* Minor visual imperfections

---

# 🏆 Final Submission Checklist

```text
[ ] Core workflow works
[ ] Frontend ↔ backend integration works
[ ] Required features complete
[ ] Authentication works
[ ] Required RBAC works
[ ] Database migrations work
[ ] Demo data exists
[ ] Demo flow tested
[ ] No obvious critical bugs
[ ] No secrets committed
[ ] No .env committed
[ ] No merge conflict markers
[ ] README updated
[ ] Documentation updated
[ ] main contains final working version
[ ] Repository is clean
```

---

# 👨‍💻 Team

| Member     | Branch            | Primary Responsibility                                    |
| ---------- | ----------------- | ---------------------------------------------------------- |
| Parv       | `parv`            | Backend — Master Data + Chart of Accounts + Journals        |
| Nikhil     | `nikhil`          | Backend — Purchase/Sales/Payment flow + Reports             |
| Sarvesh    | `sarvesh`         | Frontend — Master Data screens + Auth + Contact portal      |
| Jenish     | `jenish`          | Frontend — Transaction screens + Reports/Dashboard UI       |

---

# 📄 License

This project is developed for hackathon purposes.