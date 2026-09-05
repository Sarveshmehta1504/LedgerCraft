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
| email       | string    | No       | —       | Unique, login                         |
| password    | string    | No       | —       | Hashed                                |
| contact_id  | bigint FK | Yes      | null    | Set only for role=Contact users       |
| created_at  | timestamp | No       | —       | Created                               |
| updated_at  | timestamp | No       | —       | Updated                               |

Roles/permissions live in Spatie's own tables (`roles`, `model_has_roles`, etc.).
Roles: `admin`, `invoicing_user`, `contact`.

---

# Entity: contacts

| Column        | Type      | Nullable | Default    | Description                        |
| ------------- | --------- | -------- | ---------- | ----------------------------------- |
| id            | bigint    | No       | —          | Primary key                         |
| name          | string    | No       | —          | Contact/company name                |
| type          | enum      | No       | 'customer' | customer / vendor / both            |
| email         | string    | Yes      | null       |                                      |
| mobile        | string    | Yes      | null       |                                      |
| address_city  | string    | Yes      | null       |                                      |
| address_state | string    | Yes      | null       |                                      |
| address_pin   | string    | Yes      | null       |                                      |
| profile_image | string    | Yes      | null       | Storage path                        |
| created_at    | timestamp | No       | —          |                                      |
| updated_at    | timestamp | No       | —          |                                      |

---

# Entity: products

| Column     | Type      | Nullable | Default | Description                  |
| ---------- | --------- | -------- | ------- | ------------------------------ |
| id         | bigint    | No       | —       | Primary key                    |
| name       | string    | No       | —       |                                 |
| type       | enum      | No       | 'goods' | goods / service / combo        |
| sales_price| decimal   | No       | 0.00    |                                 |
| cost_price | decimal   | No       | 0.00    |                                 |
| category   | string    | Yes      | null    |                                 |
| created_at | timestamp | No       | —       |                                 |
| updated_at | timestamp | No       | —       |                                 |

---

# Entity: chart_of_accounts

| Column     | Type      | Nullable | Default | Description                                    |
| ---------- | --------- | -------- | ------- | ------------------------------------------------ |
| id         | bigint    | No       | —       | Primary key                                       |
| code       | string    | No       | —       | Unique short code, e.g. "1000"                    |
| name       | string    | No       | —       | e.g. "Cash", "Bank", "Debtors", "Sale Income"      |
| type       | enum      | No       | —       | asset / liability / income / expense / capital     |
| created_at | timestamp | No       | —       |                                                    |
| updated_at | timestamp | No       | —       |                                                    |

Seed at least: Cash (asset), Bank (asset), Debtors/AR (asset), Creditors/AP
(liability), Sale Income (income), Purchase Expense (expense), Capital (capital).

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

---

# Entity: budgets

| Column               | Type      | Nullable | Default | Description                   |
| -------------------- | --------- | -------- | ------- | -------------------------------- |
| id                   | bigint    | No       | —       |                                   |
| name                 | string    | No       | —       |                                   |
| analytic_account_id  | bigint FK | No       | —       | → analytic_accounts.id           |
| period_start         | date      | No       | —       |                                   |
| period_end           | date      | No       | —       |                                   |
| planned_amount       | decimal   | No       | 0.00    |                                   |
| responsible_user_id  | bigint FK | No       | —       | → users.id                       |

Actual amount for the Budget Report is derived live: sum of
`journal_entry_lines` where `analytic_account_id` matches and the entry date falls
within `period_start`/`period_end`. Do not store a duplicate "actual" column.

---

# Entity: purchase_orders / purchase_order_lines

| Column      | Type      | Nullable | Default | Description                          |
| ----------- | --------- | -------- | ------- | --------------------------------------|
| id          | bigint    | No       | —       |                                        |
| contact_id  | bigint FK | No       | —       | → contacts.id (vendor)                |
| date        | date      | No       | —       |                                        |
| status      | enum      | No       | 'draft' | draft / confirmed / billed            |
| total       | decimal   | No       | 0.00    | Denormalized sum of lines             |

`purchase_order_lines`: id, purchase_order_id FK, product_id FK, quantity
(decimal), unit_price (decimal), subtotal (decimal, generated = quantity *
unit_price).

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
| total             | decimal   | No       | 0.00    |                                       |
| journal_entry_id  | bigint FK | Yes      | null    | Set when posted                      |

`vendor_bill_lines`: mirrors purchase_order_lines (product_id, quantity,
unit_price, subtotal).

**Posting a vendor bill** creates a journal entry: Debit Purchase Expense,
Credit Creditors/AP, for `total`.

---

# Entity: sales_orders / sales_order_lines

Mirrors purchase_orders, with `contact_id` → customer, and lines additionally
carry `tax_percent` (decimal, default 0) — `subtotal` includes tax.

---

# Entity: customer_invoices / customer_invoice_lines

Mirrors vendor_bills. **Posting a customer invoice** creates a journal entry:
Debit Debtors/AR, Credit Sale Income, for `total` (net of tax handling — keep tax
as a simple percentage add-on posted to Sale Income for hackathon scope; do not
build a separate tax liability account unless time allows).

---

# Entity: payments

| Column           | Type      | Nullable | Default | Description                              |
| ---------------- | --------- | -------- | ------- | ------------------------------------------ |
| id               | bigint    | No       | —       |                                             |
| contact_id       | bigint FK | No       | —       | → contacts.id                              |
| payable_type     | enum      | No       | —       | 'vendor_bill' / 'customer_invoice'         |
| payable_id       | bigint    | No       | —       | Polymorphic pointer                        |
| journal_id       | bigint FK | No       | —       | Cash Journal or Bank Journal               |
| amount           | decimal   | No       | —       |                                             |
| date             | date      | No       | —       |                                             |
| journal_entry_id | bigint FK | Yes      | null    | Set once posted                            |

**Vendor bill payment** journal entry: Debit Creditors/AP, Credit Cash/Bank.
**Customer invoice payment** journal entry: Debit Cash/Bank, Credit Debtors/AR.
When `amount` sums to the full invoice/bill total, flip its `status` to `paid`.

---

# Relationships

```text
users ──(1:1 optional)── contacts
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

# Status Values

```text
purchase_orders.status:      draft, confirmed, billed
sales_orders.status:         draft, confirmed, invoiced
vendor_bills.status:         draft, posted, paid
customer_invoices.status:    draft, posted, paid
```
