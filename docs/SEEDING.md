# Seeding Rules

Rules for anyone adding seeders. The first one is the important one: breaking it
corrupts the ledger silently, and every report is wrong with nothing to tell you.

`php artisan migrate:fresh --seed` must always produce a database where the
Balance Sheet balances.

---

## 1. Never write journal entries by hand

**Do not insert into `journal_entries` or `journal_entry_lines` directly**, with
Eloquent or the DB facade. Post through the services:

```php
// A bill or invoice, end to end
app(VendorBillService::class)->post($bill, $userId);
app(CustomerInvoiceService::class)->post($invoice, $userId);

// Anything else that needs a ledger entry
app(JournalEntryService::class)->postDoubleEntry(
    journalId: $journal->id,
    date: '2026-09-01',
    sourceType: 'vendor_bill',
    sourceId: $bill->id,
    debitAccountId: $expense->id,
    creditAccountId: $creditors->id,
    amount: '10000.00',
    createdBy: $userId,
);
```

`JournalEntryService` enforces `sum(debit) == sum(credit)` inside the same
database transaction as the write and throws `UnbalancedJournalEntryException`
otherwise. A raw insert bypasses that check, and the first sign of trouble is a
Balance Sheet that does not balance during the demo.

Verify after seeding:

```bash
php artisan tinker --execute="echo App\Services\ReportService::class;"
```

or just call `GET /api/reports/trial-balance` — `balanced` must be `true`.

## 2. Do not hardcode document numbers

Use `DocumentNumberService` for `P00001`, `S00001`, `Bill/2026/0001`,
`INV/2026/0001`. It derives the next number by parsing the highest existing one,
so a hand-written or malformed number corrupts every number generated after it.

```php
$numbers = app(DocumentNumberService::class);
$numbers->purchaseOrder();    // P00002
$numbers->customerInvoice();  // INV/2026/0003
```

Better still, create documents through `PurchaseOrderService` /
`SalesOrderService` / `VendorBillService` / `CustomerInvoiceService`, which
number them for you and keep line maths and totals consistent.

## 3. Keep every seeder idempotent

Use `firstOrCreate` / `updateOrInsert`, never bare `create`. Seeders are re-run
constantly during integration, and duplicates in master data are painful to
unpick once transactions reference them.

## 4. Append to `DatabaseSeeder`, do not rewrite it

Add your seeder to the end of the existing `$this->call([...])` array. Order
matters — roles before users, accounts before journals, categories before
products, master data before transactions.

## 5. Backdate converted documents, or history lands on today

`convertToBill()` and `convertToInvoice()` set `bill_date` / `invoice_date` to
**today**. That is correct in real use — you convert when the supplier's bill
arrives, or when the goods go out — but it means a purchase order dated six
months ago produces a bill dated today that carries a due date months in the
past. Two things break quietly:

* a bill appears to be overdue before it existed, and
* budgets over a closed period read 0% achieved, because achieved amount is
  derived from the **document** date, not the order date.

Set the date on the draft before posting, through the same update the form uses:

```php
$bill = $orders->convertToBill($order->fresh());
$bill = $bills->update($bill, ['bill_date' => $date->copy()->addDays(3)->toDateString()]);
$bill = $bills->post($bill, $userId);
```

Only a draft can be updated, so this has to happen before `post()`.

## 6. One live budget per analytic account per period

Achieved amount is derived per `(analytic_account_id, period)`, not per budget.
Two budgets that are both counted — `draft` or `confirmed` — on the same pair
each claim the whole spend, and the report totals count it twice. A `revised`
or `cancelled` budget alongside its replacement is fine: those are excluded from
totals, which is what `counted_in_totals` is for.

---

## Invariants your data must satisfy

| Rule | Why |
| ---- | --- |
| Every product has a `category_id` | Column is `NOT NULL`; the product form selects from the category master |
| Every role-`user` account has a `contact_id` | The portal scopes by it; an unlinked portal user can see nothing |
| `users.login_id` is set, unique, 6–12 chars | Login is by `login_id`, not email |
| Accounts use the 8 types | `asset, liability, bank, capital, cash, income, expense, other_expense` |
| Lines carry `account_id` **and** `analytic_account_id` | Reports and budgets both read them |
| `tax_percent` on sales lines only | The PS lists Tax on the Sales Order, not the Purchase Order |
| Emails are real yopmail.com inboxes | Resend rejects `example.com` and `.test` outright |

## Mail

**Do not send mail from a seeder.** The Resend plan has a hard cap of ~100
messages and the demo needs them.

## A note on demo data

Seed an **opening Capital entry** (Debit Cash / Credit Capital) before any
trading. Without it Cash goes negative as soon as a bill is paid, and the
Capital account never appears on the Balance Sheet — arithmetically correct, but
it reads as broken on screen.

---

## What `migrate:fresh --seed` produces

Urban Furniture Pvt Ltd, Ahmedabad, with roughly seven months of trading behind
it. Dates are relative to the day you seed, so the data never goes stale.

### Logins

| Login ID | Password | Role | Notes |
| -------- | -------- | ---- | ----- |
| `adminuser` | `Admin@123` | admin | Parth Trivedi |
| `accountant1` | `Account@123` | accountant | Priya Desai |
| `accountant2` | `Harsh@1234` | accountant | Harsh Bhavsar |
| `exaccountant` | `Vikram@123` | accountant | **Deactivated** — login returns 403 |
| `nimeshp` | `Nimesh@123` | user (portal) | Has dues to pay |
| `saffrongrand` | `Saffron@123` | user (portal) | Heavily overdue |
| `zenithco` | `Zenith@1234` | user (portal) | Fully settled |

### Volume

| | Count | |
| --- | ---: | --- |
| Contacts | 20 | 8 vendors, 9 customers, 2 both, 1 archived |
| Product categories | 18 | 4 roots with children, 1 archived |
| Products | 45 | 38 goods, 4 services, 3 combos, 1 archived |
| Analytic accounts | 8 | 4 income, 4 expense (1 archived) |
| Budgets | 12 | Across 2 periods and all 4 statuses |
| Purchase orders | 20 | 3 draft, 2 confirmed, 15 billed |
| Vendor bills | 18 | 2 draft, 10 posted, 6 paid |
| Sales orders | 24 | 3 draft, 2 confirmed, 19 invoiced |
| Customer invoices | 23 | 2 draft, 16 posted, 5 paid |
| Payments | 20 | 15 bank, 5 cash; every one has a reference and a note |
| Journal entries | 59 | 118 lines, all balanced |

### What the data deliberately covers

* Every status of every document, so no list screen is empty and no badge is
  unreachable.
* All five aging buckets populated on **both** the receivable and payable side,
  plus documents with no due date at all (never overdue).
* All four tax rates in use: 0%, 5%, 12% and 18%.
* Payments in full and in instalments, by bank and by cash.
* One budget over 100% achieved, so the over-budget state is on screen.
* A superseded budget next to its replacement, and a cancelled one — the rows
  the report lists but excludes from totals.
* Both corporate customers buy at negotiated unit prices below list, which is
  why unit price is editable on the order form.
* Journal entries attributed to both accountants, so "posted by" varies.
* Every optional column filled: full postal addresses, PINs, avatars, payment
  references and notes, vendor and customer document references.

### Figures to expect

| | |
| --- | ---: |
| Balance sheet | balances at ₹50,80,016 |
| Net income | ₹14,02,416 |
| Cash / Bank | ₹2,57,882 / ₹42,20,230 |
| Receivable (overdue) | ₹6,01,904 (₹4,95,546) |
| Payable (overdue) | ₹5,77,600 (₹5,20,600) |

Contact avatars are inline SVG data URIs rather than uploaded files, so they
render on a freshly seeded machine with no `.uploads` directory and no internet
connection. They are 223 characters, inside the `varchar(255)` column.
