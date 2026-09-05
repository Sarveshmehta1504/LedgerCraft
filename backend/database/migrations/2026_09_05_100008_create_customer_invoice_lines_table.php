<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_invoice_id')->constrained('customer_invoices')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->foreignId('analytic_account_id')->nullable()->constrained('analytic_accounts')->restrictOnDelete();
            $table->decimal('quantity', 14, 2)->default(0);
            $table->decimal('unit_price', 14, 2)->default(0);
            // Copied from the originating SO line.
            $table->decimal('tax_percent', 5, 2)->default(0);
            $table->decimal('subtotal', 14, 2)->default(0);

            $table->timestamps();

            $table->index('analytic_account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_invoice_lines');
    }
};
