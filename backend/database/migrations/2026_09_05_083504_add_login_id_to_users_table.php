<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Login is by login_id, not email (unique, 6-12 chars).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('login_id')->nullable()->after('name');
        });

        // Backfill any pre-existing rows before enforcing NOT NULL.
        DB::table('users')->whereNull('login_id')->orderBy('id')->each(function ($user) {
            DB::table('users')->where('id', $user->id)->update([
                'login_id' => 'user'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('login_id')->nullable(false)->change();
            $table->unique('login_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['login_id']);
            $table->dropColumn('login_id');
        });
    }
};
