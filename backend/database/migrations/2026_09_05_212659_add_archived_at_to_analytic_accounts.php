<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Brings analytic accounts in line with every other master table: a finished
     * project can be retired without deleting it, so historical documents that
     * reference it still resolve.
     *
     * Timestamps come along too - the table had none.
     */
    public function up(): void
    {
        Schema::table('analytic_accounts', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('type');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('analytic_accounts', function (Blueprint $table) {
            $table->dropColumn(['archived_at', 'created_at', 'updated_at']);
        });
    }
};
