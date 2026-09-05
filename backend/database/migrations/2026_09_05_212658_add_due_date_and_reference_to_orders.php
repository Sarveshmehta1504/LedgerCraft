<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Orders previously had no due date, so a bill or invoice created by
     * conversion inherited none - and a document with no due date never ages,
     * which left the aging report blind to anything created through the normal
     * flow.
     *
     * Orders carry no `reference`: they are identified by their own number
     * (P00001 / S00001). The other party's reference is captured on the bill or
     * invoice, where the design board asks for it.
     */
    public function up(): void
    {
        foreach (['purchase_orders', 'sales_orders'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->date('due_date')->nullable()->after('date');
            });
        }
    }

    public function down(): void
    {
        foreach (['purchase_orders', 'sales_orders'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropColumn('due_date');
            });
        }
    }
};
