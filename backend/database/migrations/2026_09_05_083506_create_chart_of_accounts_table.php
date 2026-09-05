<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Eight account types per the mockup. Debit-normal: asset, bank, cash,
     * expense, other_expense. Credit-normal: liability, income, capital.
     */
    public function up(): void
    {
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->enum('type', [
                'asset',
                'liability',
                'bank',
                'capital',
                'cash',
                'income',
                'expense',
                'other_expense',
            ]);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};
