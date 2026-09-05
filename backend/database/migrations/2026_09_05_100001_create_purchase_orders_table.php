<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            // Sequence P00001, +1 of last - see docs/DB_SCHEMA.md "Sequences".
            $table->string('number')->unique();
            $table->foreignId('contact_id')->constrained('contacts')->restrictOnDelete();
            $table->date('date');
            $table->enum('status', ['draft', 'confirmed', 'billed'])->default('draft');
            // Denormalised sum of the lines, kept in step by the service layer.
            $table->decimal('total', 14, 2)->default(0);

            $table->timestamps();

            $table->index('status');
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
