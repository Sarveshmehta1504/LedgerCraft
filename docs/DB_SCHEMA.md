# Database Schema

## Database

MySQL 8

All monetary columns: `decimal(14,2)`. All FKs: `bigint unsigned`, `on delete restrict`
unless noted otherwise (accounting data must never silently cascade-delete).

---

# Entity: users

| Column      | Type      | Nullable | Default | Description                          |
| ----------- | --------- | -------- | ------- | ------------------------------------- |
| id          | bigint    | No       | —       | Primary key                           |
| name        | string    | No       | —       | User name                             |
| login_id    | string    | No       | —       | Unique, 6–12 chars — the login handle  |
| email       | string    | No       | —       | Unique                                |
| password    | string    | No       | —       | Hashed                                |
| contact_id  | bigint FK | Yes      | null    | Set only for role=Contact users       |
| created_at  | timestamp | No       | —       | Created                               |
| updated_at  | timestamp | No       | —       | Updated                               |

Roles/permissions live in Spatie's own tables (`roles`, `model_has_roles`, etc.).
Roles per the design board: `admin` (all access), `accountant` (create master data,
record transactions, view reports, manage invoices/bills/payments — the
"Invoicing User"), `user` (portal: sees only their own invoices/bills in
paid/unpaid status and pays dues from the portal).

**Signup validation (design board):**

* `login_id` — unique, 6–12 characters
* `email` — must not already exist
* `password` — more than 8 characters, and must contain a lowercase letter, an
  uppercase letter and a special character
* Failed login shows exactly: `Invalid Login Id or Password`
* Public Sign Up creates an **`accountant` user only**; a Forgot Password page exists.

---

# Entity: contacts

| Column        | Type      | Nullable | Default    | Description                        |
| ------------- | --------- | -------- | ---------- | ----------------------------------- |
| id            | bigint    | No       | —          | Primary key                         |
| name          | string    | No       | —          | Contact/company name                |
| type          | enum      | No       | 'customer' | customer / vendor / both            |
| email         | string    | Yes      | null       |                                      |
| mobile        | string    | Yes      | null       |                                      |
| address_street| string    | Yes      | null       |                                      |
| address_city  | string    | Yes      | null       |                                      |
| address_state | string    | Yes      | null       |                                      |
| address_country| string   | Yes      | null       |                                      |
| address_pin   | string    | Yes      | null       | Pincode                              |
| profile_image | string    | Yes      | null       | Storage path (upload image)         |
| created_at    | timestamp | No       | —          |                                      |
| updated_at    | timestamp | No       | —          |                                      |

---

# Entity: product_categories

| Column     | Type      | Nullable | Default | Description                                  |
| ---------- | --------- | -------- | ------- | ---------------------------------------------- |
| id         | bigint    | No       | —       | Primary key                                     |
| name       | string    | No       | —       | e.g. "Chairs", "Tables", "Raw Material"         |
| parent_id  | bigint FK | Yes      | null    | → product_categories.id (nested categories)     |
| created_at | timestamp | No       | —       |                                                  |
| updated_at | timestamp | No       | —       |                                                  |

Category is a **master table**, not a free-text field on the product. Mirrors
Odoo's `product.category`. `name` is unique **within a parent**, so "Chairs" may
appear under two different parents. Self-FK is `on delete restrict`: a category
with children cannot be deleted, and neither can one referenced by a product.
Guard against `parent_id` cycles in the application layer.

Seed a baseline set of categories before products — the product form has nothing
to select otherwise.

---

# Entity: products

| Column      | Type      | Nullable | Default | Description                            |
| ----------- | --------- | -------- | ------- | ---------------------------------------- |
| id          | bigint    | No       | —       | Primary key                               |
| name        | string    | No       | —       |                                           |
| type        | enum      | No       | 'goods' | goods / service / combo                  |
| sales_price | decimal   | No       | 0.00    |                                           |
| cost_price  | decimal   | No       | 0.00    |                                           |
| category_id | bigint FK | No       | —       | → product_categories.id, indexed          |
| created_at  | timestamp | No       | —       |                                           |
| updated_at  | timestamp | No       | —       |                                           |

`category_id` is **mandatory** — a product cannot be created without a category.
Index it: the product list view filters and groups by category. Product API
responses embed the related category so the list view renders the name without a
second request; validation is `required|exists:product_categories,id`.

---

# Entity: chart_of_accounts

| Column     | Type      | Nullable | Default | Description                                    |
| ---------- | --------- | -------- | ------- | ------------------------------------------------ |
| id         | bigint    | No       | —       | Primary key                                       |
| code       | string    | No       | —       | Unique short code, e.g. "1000"                    |
| name       | string    | No       | —       | e.g. "Cash", "Bank", "Debtors", "Sale Income"      |
| type       | enum      | No       | —       | See account types below                            |
| created_at | timestamp | No       | —       |                                                    |
| updated_at | timestamp | No       | —       |                                                    |

**Account types — 8 values (decided):** `asset`, `liability`, `bank`, `capital`,
`cash`, `income`, `expense`, `other_expense`. The type drives how the account is
treated and where it appears in reports.

> The PS text lists only five (Asset, Liability, Expense, Income, Capital). **We
> build the mockup's eight** — the mockup is linked from the PS, and its Balance
> Sheet and P&L layouts depend on `bank`, `cash` and `other_expense` existing as
> distinct types. The five PS types remain a strict subset, so nothing in the PS
> breaks.

Report mapping given on the board:

```text
Bank      → Asset / Bank            Creditors → Liability / Creditor
Cash      → Asset / Cash            Capital   → Capital
Debtors   → Asset / Debtors
```

All accounts are **pre-configured (seeded)**, not created during the demo. Seed at
least: Cash, Bank, Debtors/AR, Creditors/AP, Sale Income, Purchase Expense,
Capital.

---

# Entity: journals

| Column                | Type      | Nullable | Default | Description                          |
| --------------------- | --------- | -------- | ------- | -------------------------------------- |
| id                    | bigint    | No       | —       | Primary key                            |
| name                  | string    | No       | —       | e.g. "Sales Journal"                   |
| type                  | enum      | No       | —       | sales / purchase / bank / cash         |
| default_debit_account | bigint FK | Yes      | null    | → chart_of_accounts.id                 |
| default_credit_account| bigint FK | Yes      | null    | → chart_of_accounts.id                 |
| created_at            | timestamp | No       | —       |                                         |
| updated_at            | timestamp | No       | —       |                                         |

---

# Entity: journal_entries

| Column        | Type      | Nullable | Default | Description                                   |
| ------------- | --------- | -------- | ------- | ----------------------------------------------- |
| id            | bigint    | No       | —       | Primary key                                     |
| journal_id    | bigint FK | No       | —       | → journals.id                                   |
| date          | date      | No       | —       |                                                  |
| reference     | string    | Yes      | null    | e.g. bill/invoice/payment number                |
| source_type   | string    | No       | —       | 'vendor_bill' / 'customer_invoice' / 'payment'  |
| source_id     | bigint    | No       | —       | Polymorphic pointer to the originating record   |
| created_by    | bigint FK | No       | —       | → users.id                                      |
| created_at    | timestamp | No       | —       |                                                  |

**Invariant enforced in a DB transaction at write time:** sum of
`journal_entry_lines.debit` = sum of `journal_entry_lines.credit` for a given
`journal_entry_id`. Reject the write otherwise — this is the single most important
business rule in the whole system.

---

# Entity: journal_entry_lines

| Column           | Type      | Nullable | Default | Description               |
| ---------------- | --------- | -------- | ------- | --------------------------- |
| id               | bigint    | No       | —       | Primary key                 |
| journal_entry_id | bigint FK | No       | —       | → journal_entries.id        |
| account_id       | bigint FK | No       | —       | → chart_of_accounts.id      |
| debit            | decimal   | No       | 0.00    |                              |
| credit           | decimal   | No       | 0.00    |                              |
| analytic_account_id | bigint FK | Yes  | null    | → analytic_accounts.id      |
| description      | string    | Yes      | null    |                              |

---

# Entity: analytic_accounts

| Column     | Type      | Nullable | Default | Description        |
| ---------- | --------- | -------- | ------- | -------------------- |
| id         | bigint    | No       | —       |                       |
| name       | string    | No       | —       |                       |
| type       | enum      | No       | —       | income / expense      |

The Analytic form shows every budget in which the analytic account is used:
`Budget | Start Date | End Date | Committed | Achieved`.

---

# Entity: budgets

| Column               | Type      | Nullable | Default | Description                   |
| -------------------- | --------- | -------- | ------- | -------------------------------- |
| id                   | bigint    | No       | —       |                                   |
| name                 | string    | No       | —       |                                   |
| analytic_account_id  | bigint FK | No       | —       | → analytic_accounts.id           |
| period_start         | date      | No       | —       |                                   |
| period_end           | date      | No       | —       |                                   |
| committed_amount     | decimal   | No       | 0.00    | Planned/budgeted amount           |
| responsible_id       | bigint FK | No       | —       | → contacts.id (selected from Contacts) |
| status               | enum      | No       | 'draft' | draft / confirmed / revised / cancelled |
| revision_of_id       | bigint FK | Yes      | null    | → budgets.id (original budget)   |

**Achieved amount is derived, never stored.** For an analytic account, sum the
matching lines within `period_start`/`period_end`:

* `type = income` → Sales Invoice lines carrying that analytic account
* `type = expense` → Vendor Bill / Purchase Order lines carrying that analytic account

Derived fields shown on the Budget form (Confirmed budgets only):

```text
achieved_percent  = (achieved_amount / committed_amount) * 100
amount_to_achieve = committed_amount - achieved_amount
```

Clicking the Achieved Amount opens the list of all invoices/bills sharing that
analytic account within the budget period.

**Budget stages (design board):**

| Stage     | Meaning                                                              |
| --------- | -------------------------------------------------------------------- |
| draft     | Newly created, still editable                                         |
| confirmed | User confirmed it; Achieved/Achieved %/Amount-to-Achieve become visible |
| revised   | Superseded by a revision — only reachable from `confirmed`            |
| cancelled | Archived                                                              |

**Revision rule:** pressing *Revise* on a confirmed budget creates a **new** budget
and moves the old one to `revised`. The new budget keeps the original name with
the word "Revised" appended (e.g. `Project A Revised`) and sets `revision_of_id`
to the original. Both link to each other in the UI.

---

# Entity: purchase_orders / purchase_order_lines

| Column      | Type      | Nullable | Default | Description                          |
| ----------- | --------- | -------- | ------- | --------------------------------------|
| id          | bigint    | No       | —       |                                        |
| contact_id  | bigint FK | No       | —       | → contacts.id (vendor)                |
| date        | date      | No       | —       |                                        |
| status      | enum      | No       | 'draft' | draft / confirmed / billed            |
| total       | decimal   | No       | 0.00    | Denormalized sum of lines             |

`purchase_order_lines`: id, purchase_order_id FK, product_id FK (Many2one),
account_id FK → chart_of_accounts.id, analytic_account_id FK →
analytic_accounts.id (Many2one), quantity (decimal), unit_price (decimal),
subtotal (decimal = quantity * unit_price).

Every transaction line carries **both** a Chart of Account and a Budget Analytic —
the board's line grid is `Sr. No. | Product | Chart of Account | Budget Analytics |
Qty | Unit Price | Total`. On purchase-side documents `account_id` **defaults to
the Purchase account**. Purchase-side lines carry **no tax** — the PS omits Tax
from the Purchase Order field list.

---

# Entity: vendor_bills / vendor_bill_lines

| Column            | Type      | Nullable | Default | Description                       |
| ----------------- | --------- | -------- | ------- | ------------------------------------ |
| id                | bigint    | No       | —       |                                       |
| purchase_order_id | bigint FK | Yes      | null    | Nullable — a bill can exist standalone|
| contact_id        | bigint FK | No       | —       | → contacts.id (vendor)               |
| bill_date         | date      | No       | —       |                                       |
| due_date          | date      | Yes      | null    |                                       |
| status            | enum      | No       | 'draft' | draft / posted / paid                |
| bill_number       | string    | No       | —       | Sequence `Bill/2026/0001`, +1 of last |
| bill_reference    | string    | Yes      | null    | Vendor's own ref, free text (`ABC-26-001`) |
| total             | decimal   | No       | 0.00    |                                       |
| journal_entry_id  | bigint FK | Yes      | null    | Set when posted                      |

`vendor_bill_lines`: mirrors purchase_order_lines (product_id, account_id,
analytic_account_id, quantity, unit_price, subtotal).

A bill created **from a PO** copies vendor, products, prices and quantities, and
shows a `PO` link back to its origin. A bill created standalone hides that link —
hence `purchase_order_id` is nullable.

Footer totals: `Total`, `Paid via Cash`, `Paid via Bank`, and
`Amount Due = Total - Amount Paid`.

**Posting a vendor bill** creates a journal entry: Debit Purchase Expense,
Credit Creditors/AP, for `total`.

---

# Entity: sales_orders / sales_order_lines

Mirrors purchase_orders, with `contact_id` → customer. Lines carry the same
columns as purchase lines (product, account, analytic, qty, unit price, total)
**plus `tax_percent`** (decimal, default 0). `status`: draft / confirmed / invoiced.

**Tax is sales-side only.** The PS Transaction Flow table lists `Tax` as a Sales
Order field and omits it from Purchase Order. `subtotal = quantity * unit_price`,
and the line total adds `tax_percent`. The Excalidraw mockup has no tax column —
that is a gap in the mockup; the PS wins.

---

# Entity: customer_invoices / customer_invoice_lines

Mirrors vendor_bills: `invoice_number` sequence `INV/2026/0001` (+1 of last),
`invoice_reference` (customer's own ref, free text), `invoice_date`, `due_date`,
`status`. On sales-side documents the line `account_id` **defaults to the Sales
account**. An invoice created from an SO copies customer, products, prices and
quantities and shows an `SO` link back; a standalone invoice hides it.

Invoice lines carry `tax_percent`, copied from the originating SO line.

**Posting a customer invoice** creates a journal entry: Debit Debtors/AR, Credit
Sale Income, for `total` (tax-inclusive — posted to Sale Income as a percentage
add-on, with no separate tax liability account in P0 scope).

---

# Entity: payments

| Column           | Type      | Nullable | Default | Description                              |
| ---------------- | --------- | -------- | ------- | ------------------------------------------ |
| id               | bigint    | No       | —       |                                             |
| contact_id       | bigint FK | No       | —       | → contacts.id, autofilled from the bill/invoice |
| payment_type     | enum      | No       | —       | send (to vendor) / receive (from customer) |
| payable_type     | enum      | No       | —       | 'vendor_bill' / 'customer_invoice'         |
| payable_id       | bigint    | No       | —       | Polymorphic pointer                        |
| payment_via      | enum      | No       | 'bank'  | bank / cash — **defaults to Bank**         |
| journal_id       | bigint FK | No       | —       | Cash Journal or Bank Journal               |
| amount           | decimal   | No       | —       | Autofilled with the amount due             |
| date             | date      | No       | —       | Defaults to today                          |
| note             | string    | Yes      | null    | Free text                                  |
| journal_entry_id | bigint FK | Yes      | null    | Set once posted                            |

**Vendor bill payment** journal entry: Debit Creditors/AP, Credit Cash/Bank.
**Customer invoice payment** journal entry: Debit Cash/Bank, Credit Debtors/AR.
When `amount` sums to the full invoice/bill total, flip its `status` to `paid`.

---

# Relationships

```text
users ──(1:1 optional)── contacts
product_categories ──(self, nested)── product_categories
product_categories ──< products
contacts ──< purchase_orders ──< purchase_order_lines >── products
contacts ──< vendor_bills ──< vendor_bill_lines >── products
contacts ──< sales_orders ──< sales_order_lines >── products
contacts ──< customer_invoices ──< customer_invoice_lines >── products
contacts ──< payments
purchase_orders ──(0:1)── vendor_bills
sales_orders ──(0:1)── customer_invoices
vendor_bills / customer_invoices ──(0:1)── journal_entries
payments ──(0:1)── journal_entries
journals ──< journal_entries ──< journal_entry_lines >── chart_of_accounts
analytic_accounts ──< budgets
analytic_accounts ──< journal_entry_lines
```

---

# Business Constraints

* A `journal_entry` is only ever created by the system when posting a bill,
  invoice, or payment — never entered freely by a user in P0 scope.
* `sum(journal_entry_lines.debit) == sum(journal_entry_lines.credit)` per
  journal entry, enforced inside the same DB transaction as the write.
* A vendor bill/customer invoice cannot be paid for more than its remaining
  balance (`total` minus sum of linked payments).
* A Contact-role user may only read/pay invoices/bills where
  `contact_id == users.contact_id`.
* Deleting a contact/product/account that has transactions must be blocked
  (archive instead — the source PDF explicitly calls out "Archived" as the
  delete action for master data).
* Deleting a product category that is referenced by any product, or that has
  child categories, must be blocked — return `409`.
* A payment cannot exceed the document's Amount Due (`total` − amount already paid).
* A budget can only be revised from the `confirmed` stage.

# Status Values

```text
purchase_orders.status:      draft, confirmed, billed
sales_orders.status:         draft, confirmed, invoiced
vendor_bills.status:         draft, posted, paid
customer_invoices.status:    draft, posted, paid
budgets.status:              draft, confirmed, revised, cancelled
```

Bills and invoices can be **Reset to Draft** from the posted state.

---

# Sequences

```text
purchase_orders.number     P00001              (+1 of last)
sales_orders.number        S00001              (+1 of last)
vendor_bills.bill_number   Bill/2026/0001      (+1 of last)
customer_invoices.number   INV/2026/0001       (+1 of last)
```

---

# Reports (derived — no tables)

**Profit & Loss** — Income from Sales = total of account type `income`;
Purchase Expense = total of type `expense`; Other Expense = total of type
`other_expense`; **Net Income = Income − Expenses**. Printable to PDF.

**Balance Sheet** — Assets: Bank, Cash, Debtors. Liabilities: Capital, Creditors.
**Total Asset must always equal Total Liability.** Printable to PDF.

**Budget Report** — list and kanban views; kanban shows a pie chart per budget.

---

# Required Views

Contact, Product and Analytics masters each need **both a list view and a kanban
view**, with a toggle between them. All masters open in list view by default;
`New` opens a blank form, and clicking a saved record opens the form with its
values.
