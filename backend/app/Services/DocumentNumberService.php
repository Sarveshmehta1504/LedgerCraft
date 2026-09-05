<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Generates the document sequences defined in docs/DB_SCHEMA.md:
 *
 *   purchase_orders.number            P00001
 *   sales_orders.number               S00001
 *   vendor_bills.bill_number          Bill/2026/0001
 *   customer_invoices.invoice_number  INV/2026/0001
 *
 * Each is "+1 of last". The lookup takes a row lock inside the caller's
 * transaction, so two requests cannot read the same last number and generate a
 * duplicate - the unique index would otherwise reject the second one.
 */
class DocumentNumberService
{
    public function purchaseOrder(): string
    {
        return 'P'.$this->pad($this->nextPlainSequence('purchase_orders', 'number', 'P'), 5);
    }

    public function salesOrder(): string
    {
        return 'S'.$this->pad($this->nextPlainSequence('sales_orders', 'number', 'S'), 5);
    }

    public function vendorBill(?int $year = null): string
    {
        $year ??= (int) date('Y');

        return 'Bill/'.$year.'/'.$this->pad(
            $this->nextYearlySequence('vendor_bills', 'bill_number', 'Bill/'.$year.'/'),
            4,
        );
    }

    public function customerInvoice(?int $year = null): string
    {
        $year ??= (int) date('Y');

        return 'INV/'.$year.'/'.$this->pad(
            $this->nextYearlySequence('customer_invoices', 'invoice_number', 'INV/'.$year.'/'),
            4,
        );
    }

    /**
     * Sequence with a single-letter prefix and no year segment (P00001).
     */
    private function nextPlainSequence(string $table, string $column, string $prefix): int
    {
        $last = DB::table($table)
            ->where($column, 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByRaw('LENGTH('.$column.') DESC')
            ->orderBy($column, 'desc')
            ->value($column);

        return $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;
    }

    /**
     * Sequence that restarts each year (Bill/2026/0001).
     */
    private function nextYearlySequence(string $table, string $column, string $prefix): int
    {
        $last = DB::table($table)
            ->where($column, 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByRaw('LENGTH('.$column.') DESC')
            ->orderBy($column, 'desc')
            ->value($column);

        return $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;
    }

    /**
     * Order by length first, then value: plain string ordering would put
     * "P00010" before "P0009" once the counter passes a digit boundary.
     */
    private function pad(int $next, int $width): string
    {
        return str_pad((string) $next, $width, '0', STR_PAD_LEFT);
    }
}
