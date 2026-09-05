# Project Overview

## Project Name

LedgerCraft — Accounting System for Urban Furniture

## Problem

Small/mid-size businesses like Urban Furniture need a proper double-entry accounting
system, not a spreadsheet: master data (contacts, products, chart of accounts, journals,
budgets), sales/purchase/payment recording, and real-time financial reporting
(Balance Sheet, P&L, Budget Report), with role-based access for the owner, the
accountant, and the business's own customers/vendors.

## Solution

A Laravel 12 + Next.js accounting platform that turns master data into linked
transactions (Purchase Order → Vendor Bill → Payment, Sales Order → Customer Invoice →
Payment), auto-generates correct double-entry journal entries for every transaction, and
computes financial reports live from the ledger rather than from stored snapshots.

## Target Users

* Admin (Business Owner) — full control: master data, transactions, reports
* Accountant (`accountant`, the PS's "Invoicing User") — creates master data, records transactions, views reports
* Contact (Customer/Vendor portal user) — views only their own invoices/bills, pays them

## Why This Matters

Real accounting logic (debit/credit correctness, account classification, budget
tracking) is what separates a CRUD demo from a system that actually models how a
business's books work. It is also directly relevant to Odoo, which is built around the
same Contacts → Products → Journals → Journal Entries → Reports architecture.

## Core Workflow

```text
Master Data (Contacts, Products, CoA, Journals, Budgets)
    ↓
Purchase Order → Vendor Bill → Payment
Sales Order → Customer Invoice → Payment
    ↓
Automatic Journal Entry (double-entry, debit = credit)
    ↓
Live Reports (Balance Sheet, P&L, Budget Report)
```

## Technology

* Frontend: Next.js (TypeScript)
* Backend: Laravel 12, Sanctum, Spatie Permission
* Database: MySQL
* Odoo: Mirrors Odoo Accounting's core data model (Contacts, Chart of Accounts,
  Journals, Journal Entries, Analytic Accounts, Budgets) and its Purchase/Sales →
  Invoice/Bill → Payment → Ledger flow.

## Key Differentiator

Reports and dashboards are computed live from real journal entries (no cached/fake
numbers), plus bonus modules layered on top of a fully working core: AR/AP aging,
bank reconciliation, and a live financial KPI dashboard. See `REQUIREMENTS.md` P1/P2
for the prioritized bonus list.
