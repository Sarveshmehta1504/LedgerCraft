<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['customer', 'vendor', 'both'])->default('customer');
            $table->string('email')->nullable();
            $table->string('mobile')->nullable();
            $table->string('address_street')->nullable();
            $table->string('address_city')->nullable();
            $table->string('address_state')->nullable();
            $table->string('address_country')->nullable();
            $table->string('address_pin')->nullable();
            $table->string('profile_image')->nullable();
            // Master data is archived, never hard-deleted, once it has transactions.
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
