<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['sales', 'purchase', 'bank', 'cash']);
            // Column names match docs/DB_SCHEMA.md exactly - the frontend is
            // built against them, so the table must be named explicitly here
            // rather than inferred from the column name.
            $table->foreignId('default_debit_account')
                ->nullable()
                ->constrained(table: 'chart_of_accounts')
                ->restrictOnDelete();
            $table->foreignId('default_credit_account')
                ->nullable()
                ->constrained(table: 'chart_of_accounts')
                ->restrictOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};
