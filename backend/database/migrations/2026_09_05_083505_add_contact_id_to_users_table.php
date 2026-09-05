<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links a role-`user` (portal) account to its Contact. Always set for role
     * `user` - signup creates the contact in the same transaction - and null
     * for admins and accountants.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('contact_id')
                ->nullable()
                ->after('email')
                ->constrained('contacts')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('contact_id');
        });
    }
};
