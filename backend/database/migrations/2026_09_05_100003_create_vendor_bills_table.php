<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_bills', function (Blueprint $table) {
            $table->id();
            // Sequence Bill/2026/0001.
            $table->string('bill_number')->unique();
            // Nullable: a bill can be raised standalone, without a PO.
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->restrictOnDelete();
            $table->foreignId('contact_id')->constrained('contacts')->restrictOnDelete();
            $table->date('bill_date');
            $table->date('due_date')->nullable();
            $table->enum('status', ['draft', 'posted', 'paid'])->default('draft');
            // The vendor's own reference, free text.
            $table->string('bill_reference')->nullable();
            $table->decimal('total', 14, 2)->default(0);
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->restrictOnDelete();

            $table->timestamps();

            $table->index('status');
            $table->index('bill_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_bills');
    }
};
