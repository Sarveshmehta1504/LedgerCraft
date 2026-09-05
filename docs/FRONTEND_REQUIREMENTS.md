# Frontend Requirements

# 1. Login

## Route
`/login`

## Components
Login form, error message, loading state.

## API
`POST /api/auth/login` — store token, redirect by role: admin/accountant →
`/dashboard`, contact → `/portal`.

---

# 2. Dashboard (Admin / Accountant home)

## Route
`/dashboard`

## Components
* KPI cards (cash position, receivables, payables, overdue count) — P1
* Quick links: New Sales Order, New Purchase Order, View Reports
* Recent transactions list

## API
`GET /api/reports/dashboard` (P1) — for P0, a simple links/nav landing page is enough.

## States
Loading, Empty, Error, Success

---

# 3. Master Data — Contacts

## Route
`/contacts`, `/contacts/new`, `/contacts/[id]`

## User Actions
1. List/search/filter contacts by type
2. Create/edit contact (name, type, email, mobile, address, profile image)
3. Archive contact (Admin only — button hidden for Accountant)

## API Dependencies
`GET/POST/PUT /api/contacts`, `PATCH /api/contacts/{id}/archive`

## Success
Table updates optimistically or on refetch; toast confirms.

## Failure
Inline field errors from 422 `errors` payload; toast for 403/500.

---

# 4. Master Data — Product Categories, Products, Chart of Accounts, Journals

Same pattern as Contacts: list + form + (archive for Admin). Routes:
`/product-categories`, `/products`, `/accounts`, `/journals`. Product categories
need their own list + create/edit screens, since a category must exist before a
product can be created. On the Product form, `Category` is a required
searchable select populated from `GET /product-categories` — never a text input;
the product list shows the category name and supports filtering by it. Chart of Accounts list should visually
group by `type` — all eight: Asset, Liability, Bank, Capital, Cash, Income,
Expense, Other Expense — this doubles as a mini reference screen during the demo.

---

# 5. Purchase Flow

## Routes
`/purchases` (PO list), `/purchases/new`, `/purchases/[id]` (PO detail with
"Convert to Bill" button), `/bills/[id]` (Bill detail with "Post" and
"Register Payment" buttons)

## User Actions
1. Create PO: pick vendor contact, add product lines, quantity/unit price
2. Confirm PO
3. Convert to Bill → navigates to bill detail
4. Post Bill → shows the generated journal entry inline (debit/credit rows) —
   this is a good "show the ledger" moment for the demo
5. Register Payment (Cash/Bank) → status updates to Paid when fully settled

## API Dependencies
See API_DOCUMENTATION.md → Purchase Flow

## Success
Status badges update live (Draft → Confirmed → Billed / Draft → Posted → Paid)

## Failure
422 overpayment / already-posted errors surfaced as inline alerts, not silent toasts —
these are business-rule violations the user should understand, not just dismiss.

---

# 6. Sales Flow

Same pattern as Purchase Flow. Routes: `/sales`, `/sales/new`, `/sales/[id]`,
`/invoices/[id]`.

---

# 7. Reports

## Routes
`/reports/balance-sheet`, `/reports/profit-and-loss`, `/reports/budget`,
`/reports/aging` (P1)

## User Actions
1. Pick a date/period
2. View report table, grouped by account type
3. **Print** — downloads the report PDF (`GET /api/reports/{report}/pdf`)
4. **Send** — opens a small dialog (recipient prefilled where known, editable
   subject) and posts to `POST /api/reports/{report}/send`

Both buttons sit in the report header, matching the mockup's `Print` / `Back`
controls. Show a spinner while the request is in flight and a toast on success or
failure — a Send that silently does nothing is worse than no button.

## API Dependencies
`GET /api/reports/balance-sheet`, `GET /api/reports/profit-and-loss`,
`GET /api/reports/budget`

## Success
Numbers render immediately from the API response; a "Balance Check" line
(Total Assets vs Total Liabilities+Capital) should visually confirm they match —
strong demo signal that the ledger is correct.

## Failure
Invalid date range → inline message; empty period → "No transactions in this
period" empty state, not a blank table.

---

# 8. Contact Portal (separate, restricted view)

## Route
`/portal` (own layout, no access to `/dashboard`, `/contacts`, etc. — enforce
both client-side route guard AND rely on backend 403 as the real security
boundary)

## User Actions
1. View list of own invoices/bills with status
2. Open one, view line items
3. Register a payment against it (Cash/Bank)

## API Dependencies
`GET /api/my/invoices`, `GET /api/my/bills`, `POST /api/my/invoices/{id}/pay`

## Success
Status flips to Paid immediately after payment.

## Failure
Attempting to view another contact's data should be structurally impossible
from this UI (no ID is ever exposed that isn't the user's own) — do not rely on
hiding a link as the only protection.

---

# Global Notes

* Every list screen: Loading / Empty / Error / Success states, per
  `UI_GUIDELINES.md`.
* Role-based nav: render only the links the current role can use — read the
  role off `/api/auth/me` once after login and store in a lightweight
  client-side auth context.
* All monetary values formatted consistently (2 decimals, currency symbol) via
  one shared formatter utility — do not hand-format numbers per screen.
