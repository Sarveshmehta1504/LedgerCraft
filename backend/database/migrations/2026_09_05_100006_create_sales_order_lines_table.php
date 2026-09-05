<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Same shape as purchase lines plus tax_percent: the PS Transaction Flow
     * table lists Tax as a Sales Order field and omits it from Purchase Order.
     */
    public function up(): void
    {
        Schema::create('sales_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->foreignId('analytic_account_id')->nullable()->constrained('analytic_accounts')->restrictOnDelete();
            $table->decimal('quantity', 14, 2)->default(0);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('tax_percent', 5, 2)->default(0);
            // subtotal = quantity * unit_price; the line total adds tax_percent.
            $table->decimal('subtotal', 14, 2)->default(0);

            $table->timestamps();

            $table->index('analytic_account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_order_lines');
    }
};
