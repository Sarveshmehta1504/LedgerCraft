# UI Guidelines

## Design Direction

Clean enterprise/ERP style — closer to Odoo's own back-office than a consumer
SaaS. Dense but readable tables, clear status badges, no decorative visual noise.

## Principles

* Clean
* Consistent
* Responsive (desktop-first — this is judged on a laptop/projector, not mobile)
* Easy to understand
* Demo-friendly: every screen that appears in the demo must load fast and show
  correct numbers with zero manual refresh

## Components

Build these as shared components once, reuse everywhere (shadcn/ui as the base):

* `<DataTable>` — sortable, searchable, paginated table used by every list screen
* `<StatusBadge>` — color-coded per status (Draft=gray, Confirmed/Posted=blue,
  Paid=green, Overdue=red)
* `<MoneyValue>` — consistent currency formatting
* Form inputs (text, select, date, number) with inline validation error display
* Modal/Dialog for quick create (e.g. add a Contact without leaving the PO form)
* Toast for success confirmations
* Loading skeleton (not a spinner-only blank screen) for tables and report pages

## Important States

Every important screen should consider:

* Loading
* Empty (e.g. "No purchase orders yet — create one")
* Error (network/500 — retry action)
* Success

## Color / Status Convention

```text
Draft       → gray
Confirmed   → blue
Posted      → blue
Paid        → green
Billed / Invoiced → indigo
Overdue     → red
```

## Demo

Prioritize visual polish on: Dashboard, PO/SO detail (the journal entry
reveal), Balance Sheet, P&L. These are the screens judges will actually watch.
Master data CRUD screens can be plainer — functional over pretty.

Avoid unnecessary visual complexity: no unnecessary animation, no dashboard
chart for its own sake — every chart must answer a real question (e.g. Salary
Cost by Department analog here would be "Revenue by Customer").
