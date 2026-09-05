<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Created only by the system when posting a bill, invoice or payment -
     * never entered freely by a user. Entries are immutable audit records,
     * hence created_at with no updated_at.
     */
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_id')
                ->constrained('journals')
                ->restrictOnDelete();
            $table->date('date');
            $table->string('reference')->nullable();
            // Polymorphic pointer to the originating document. Not a Laravel
            // morphTo relation on purpose: source_type holds the snake_case
            // document kind ('vendor_bill' | 'customer_invoice' | 'payment'),
            // which is what the API and reports match on.
            $table->string('source_type');
            $table->unsignedBigInteger('source_id');
            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->index(['source_type', 'source_id']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
