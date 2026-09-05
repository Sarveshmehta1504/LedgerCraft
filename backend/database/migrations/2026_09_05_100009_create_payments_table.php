<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Vendor bill payment  -> Debit Creditors/AP, Credit Cash/Bank.
     * Customer invoice payment -> Debit Cash/Bank, Credit Debtors/AR.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained('contacts')->restrictOnDelete();
            $table->enum('payment_type', ['send', 'receive']);
            // Polymorphic pointer, matching journal_entries.source_type: the
            // snake_case document kind, not a Laravel morph class name.
            $table->enum('payable_type', ['vendor_bill', 'customer_invoice']);
            $table->unsignedBigInteger('payable_id');
            $table->enum('payment_via', ['bank', 'cash'])->default('bank');
            $table->foreignId('journal_id')->constrained('journals')->restrictOnDelete();
            $table->decimal('amount', 14, 2);
            $table->date('date');
            $table->string('note')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->restrictOnDelete();

            $table->timestamps();

            $table->index(['payable_type', 'payable_id']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
