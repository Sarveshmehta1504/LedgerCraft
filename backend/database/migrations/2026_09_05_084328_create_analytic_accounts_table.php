<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Financial marker used to group income/expense for a project, department
     * or business unit. Budgets are defined against these.
     */
    public function up(): void
    {
        Schema::create('analytic_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['income', 'expense']);

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytic_accounts');
    }
};
