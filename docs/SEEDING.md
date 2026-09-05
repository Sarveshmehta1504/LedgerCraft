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
