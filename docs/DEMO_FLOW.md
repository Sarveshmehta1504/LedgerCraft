# Demo Flow

The five-minute run for judging, plus the pre-flight that has to happen first.
Every step below was checked against the code and against the running API. Where
a screen does not do what an earlier draft of this document claimed, the step
says so rather than promising it on stage.

---

## 1. Problem

> Urban Furniture tracks sales, purchases, and finances by hand — no real-time
> view of what the business actually owns, owes, or earns.

---

## 2. User

> The business owner and accountant, who need to record transactions once and
> trust the books; and the business's own customers/vendors, who need to see
> and pay their own invoices without calling the office.

---

## 3. Solution

> LedgerCraft: master data drives sales/purchase/payment transactions, every
> transaction auto-posts a correct double-entry journal entry, and financial
> reports are computed live from that ledger — not typed in separately.

---

# Pre-flight

Two blocking items. Neither is optional, and both are cheap.

## 1. Re-seed the database

The seeders are idempotent by design — `SalesDemoSeeder` opens with
`if (SalesOrder::exists()) return;` — so `db:seed` on a database that already
has orders adds **nothing**. A database that has been demoed on and hand-edited
drifts a long way from what the seeders define:

| | Seeder defines | Drifted database |
| --- | --- | --- |
| Products | 44 | 13 |
| Sales orders | 28 | 10 |
| Contacts | 21 | 13 |
| Portal users | 3 | 1 |

In that state Hotel Saffron Grand, Zenith Coworking LLP, Meera Krishnan and
Sahyadri Interiors do not exist, the `saffrongrand` and `zenithco` logins return
**401**, and — fatally for Step 5 — Nimesh Patel's invoices are all fully paid
with `amount_due 0.00`, so the portal has nothing to pay.

```bash
php artisan migrate:fresh --seed
```

Run this before rehearsing, and again immediately before presenting. It is
destructive; that is the point.

## 2. The Profit and Loss date range is hardcoded

`frontend/src/app/(app)/reports/profit-and-loss/page.tsx`:

```ts
const [from, setFrom] = useState("2026-08-01");
const [to, setTo]     = useState("2026-09-05");
```

Posting an invoice dates its journal entry `invoice_date`, which is today, and
`ReportService` filters on `whereDate('journal_entries.date', '<=', $to)` — an
inclusive upper bound. **A sale created during the demo falls outside the
default range and will not appear in the P&L**, which is exactly the figure
Step 4 is built on.

Either change the default to `today()` — already imported and used by the
Balance Sheet — or change the "To" field on screen during the demo. The Balance
Sheet needs no such handling; it defaults to today.

---

# Credentials

Login is by **login ID, not email**.

| Login ID | Password | Role |
| --- | --- | --- |
| `adminuser` | `Admin@123` | Admin — Parth Trivedi |
| `accountant1` | `Account@123` | Accountant — Priya Desai |
| `accountant2` | `Harsh@1234` | Accountant — Harsh Bhavsar |
| `nimeshp` | `Nimesh@123` | Portal — Nimesh Patel (has dues) |
| `saffrongrand` | `Saffron@123` | Portal — heavily overdue |
| `zenithco` | `Zenith@1234` | Portal — fully settled |

---

# Live Demo (~5 minutes)

## Step 1 — Log in as Admin, show master data

**Do:** Log in as `adminuser` / `Admin@123`. You land on `/dashboard`. Open
**Account → Chart of Accounts**, then **Account → Contact**.

**They see:** Eight accounts under "Grouped by account type" — Cash (1000),
Bank (1010), Debtors (1100), Creditors (2000), Capital (3000), Sale Income
(4000), Purchase Expense (5000), Other Expense (6000). Then 21 real contacts
across customer / vendor / both.

> "This is a real accounting model — a coded chart of accounts, not a to-do
> list with a finance label on it."

## Step 2 — Record a sale end-to-end

**Do:** **Sales → Sales Order → New**. Customer **Nimesh Patel**. Add a line:
**Executive Office Chair**, qty **5**. Unit price auto-fills to **6200**.

**Type `18` in the tax column — new lines default to 0%.** The total should
read **₹36,580** (31,000 + 5,580).

Then **Save → Confirm → Create Invoice → Open INV/2026/xxxx → Post**.

**They see:** Status walks Draft → Confirmed → Invoiced, then on the invoice,
Posted. Below the invoice a section appears — "Journal entry — Generated
automatically on posting" — with Account / Debit / Credit columns and a totals
row:

```text
Debtors        36,580.00
Sale Income                 36,580.00
               36,580.00    36,580.00
```

> "Nobody typed that. Posting the invoice generated it, and debit equals
> credit — enforced server-side."

**Why Nimesh Patel:** he is also a portal user, so Step 5 can log in as him and
pay this exact invoice. It turns six steps into one story.

## Step 3 — Register payment

**Do:** On the same invoice, **Register Payment → via Bank → Confirm payment**.
Then go to **Account → Journal Entries**.

**They see:** The invoice flips Posted → Paid, Amount paid fills in, Amount due
goes to zero. In Journal Entries a new entry with **Source = payment** sits at
the top; open it for **Debit Bank / Credit Debtors**.

> "The receipt wrote its own second entry — the money moved from receivables
> into the bank."

**Do not promise the second entry on the invoice screen.** `CustomerInvoice`
`belongsTo` a single journal entry — the posting one. The payment's entry
belongs to the `Payment` record, so it is only reachable from Journal Entries.
Navigate there.

## Step 4 — Flip to reports, live

The money shot.

**Do:** **Report → Balance Sheet** (defaults to today — leave it). Then
**Report → Profit and Loss**, and **set "To" to today's date before you talk**
(see Pre-flight 2).

**They see:** On the Balance Sheet, a green **"Balance check passed"** with
Total assets against Liabilities + capital — verified live against the seeded
database at ₹1,051,478.00 = ₹1,051,478.00, `balanced: true`. On the P&L, once
dated correctly, Sale Income includes the new ₹31,000 net.

> "Every figure here is computed from posted journal entries at request time.
> There's no report table to drift out of sync."

Point at the green badge explicitly. It is the differentiator rendering itself
in real time, and it is easy to walk straight past.

## Step 5 — Contact portal

**Do:** Log out. Log in as `nimeshp` / `Nimesh@123`.

**They see:** Lands straight on `/portal`, not the dashboard. The nav bar is
empty — no Sales, Purchase, Account or Report menus, just "My Invoices" and a
**PORTAL** role badge — and only their own invoices are listed.

**Do:** Type `/dashboard` into the address bar. It bounces back to `/portal`.
Then open an unpaid invoice → **Pay ₹X,XXX** → choose **Bank** → confirm.

**They see:** "Payment of ₹X received. Thank you." Status flips to Paid.

> "Role separation is enforced twice — the UI hides it, and the API refuses it."

Called directly with a portal token, `GET /api/contacts` returns **403** and
`GET /api/reports/balance-sheet` returns **403**. Scope comes from the
authenticated user's `contact_id` server-side, never from the request. If a
judge asks whether the frontend is only hiding buttons, that 403 is the answer.

## Step 5b — The accountant role (~30 seconds)

The system has **three** roles, not two, and the steps above only show two. This
closes that gap and costs half a minute.

**Do:** Log out. Log in as `accountant1` / `Account@123`. Open the **Account**
menu. Then type `/users` into the address bar.

**They see:** A working back office — Sales, Purchase, Account and Report menus
all present, and the role badge reads **ACCOUNTANT**. But the **Users** entry is
missing from the Account menu, and `/users` renders **"Admins only"** instead of
the user list.

> "Three roles, not two. The accountant runs the books — master data,
> transactions, reports — but cannot create logins or hand out roles. Only the
> admin can."

The boundary, as enforced in the policies:

| | Admin | Accountant | Portal (`user`) |
| --- | --- | --- | --- |
| Master data, transactions, reports | ✅ | ✅ | ❌ (403) |
| Delete master data | ✅ | ❌ | ❌ |
| Manage users / assign roles | ✅ | ❌ | ❌ |
| Own invoices, pay dues | ✅ | ✅ | ✅ |

If time runs short this is the step to drop — but if a judge asks "who else can
use this?", it is the answer. `accountant2` (`Harsh@1234`) exists so a second
accountant can be shown, and the Users list carries a deactivated account
(`exaccountant`) to show that leavers are deactivated, never deleted, so their
posted entries stay attributable.

## Step 6 — Analytic accounts and budgets

**Do:** Back as Admin → **Account → Analytic Budget**, open a confirmed budget.
Then **Report → Budget Report**.

**They see:** Planned against achieved per analytic account, computed from the
same ledger. The dashboard's Budgets panel shows how many are confirmed and how
many are achieving.

**On the Dashboard:** it shows live order counts by status and the latest ten
invoices and bills with status badges. It does **not** show KPI money cards or
an AR aging table — `/reports/dashboard` and `/reports/aging` exist in the API
but have no frontend page and no nav entry. Describe what is actually there; do
not promise the aging table.

---

# Differentiator

Every number in the reports is computed live from posted journal entries at
request time — there is no cached "report" table that could silently drift from
the real ledger. Combined with a genuine double-entry engine (`postDoubleEntry`
enforces debit = credit server-side on every post), this is the difference
between a CRUD app that talks about accounting and one that actually does it.

---

# Odoo Connection

The data model — Contacts, Chart of Accounts, Journals, Journal Entries,
Analytic Accounts, Budgets — and the Purchase/Sales → Invoice/Bill → Payment →
Ledger → Report pipeline is the same shape as Odoo Accounting's own core
modules, built independently to prove the team understands the domain, not just
the Odoo UI.

The three roles map to the problem statement directly: `admin` is the business
owner, `accountant` is the Invoicing User, and `user` is the Contact.

---

# Business Impact

* Real-time financial position instead of end-of-month manual reconciliation
* Customers/vendors can self-serve invoice viewing and payment, cutting back-
  and-forth with the office
* Analytic budgets give early visibility into whether a cost or revenue centre
  is tracking to plan
* Role separation means the books can be delegated to an accountant without
  handing over control of who can sign in

---

# Demo Backup

If live functionality fails:

1. Switch to the pre-recorded screen capture of a full successful run — record
   it during hour 14 testing, not the night before
2. Keep a second seeded browser tab already logged in and mid-flow, as a
   fallback if one flow breaks but the rest of the app is fine
3. `php artisan migrate:fresh --seed` restores known-good demo data in under a
   minute if the database gets into a bad state during rehearsal

Two rules learned the hard way:

* **Rehearse on a freshly seeded database, then leave it alone.** Every
  discrepancy this document corrects came from a database that had drifted from
  its seeders.
* **Do not demo `/reports/aging` or `/reports/trial-balance`.** They are
  API-only, with no page and no nav entry. If asked, say the endpoints are built
  and the UI was not prioritised — better than clicking into a dead route.
