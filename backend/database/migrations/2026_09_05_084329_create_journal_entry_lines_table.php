<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * sum(debit) must equal sum(credit) across the lines of one entry. That
     * invariant is enforced in JournalEntryService inside the same DB
     * transaction as the write - the database cannot express it.
     */
    public function up(): void
    {
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            // Lines are meaningless without their entry, so this is the one
            // cascade in the schema.
            $table->foreignId('journal_entry_id')
                ->constrained('journal_entries')
                ->cascadeOnDelete();
            $table->foreignId('account_id')
                ->constrained('chart_of_accounts')
                ->restrictOnDelete();
            $table->decimal('debit', 14, 2)->default(0);
            $table->decimal('credit', 14, 2)->default(0);
            $table->foreignId('analytic_account_id')
                ->nullable()
                ->constrained('analytic_accounts')
                ->restrictOnDelete();
            $table->string('description')->nullable();

            // Budget achieved amounts filter by analytic account.
            $table->index('analytic_account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entry_lines');
    }
};
