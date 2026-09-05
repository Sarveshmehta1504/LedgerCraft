<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Achieved amount / achieved % / amount-to-achieve are NOT stored - they are
     * derived live from invoice and bill lines carrying the same analytic
     * account within the budget period.
     */
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('analytic_account_id')
                ->constrained('analytic_accounts')
                ->restrictOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('committed_amount', 14, 2)->default(0);
            // Responsible person is picked from the Contacts master.
            $table->foreignId('responsible_id')
                ->constrained('contacts')
                ->restrictOnDelete();
            $table->enum('status', ['draft', 'confirmed', 'revised', 'cancelled'])
                ->default('draft');
            // Set on the NEW budget created by Revise; points at the original,
            // which moves to status 'revised'.
            $table->foreignId('revision_of_id')
                ->nullable()
                ->constrained('budgets')
                ->restrictOnDelete();

            $table->timestamps();

            $table->index('status');
            $table->index(['period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
