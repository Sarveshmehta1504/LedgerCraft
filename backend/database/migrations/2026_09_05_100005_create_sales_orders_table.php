<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            // Sequence S00001.
            $table->string('number')->unique();
            $table->foreignId('contact_id')->constrained('contacts')->restrictOnDelete();
            $table->date('date');
            $table->enum('status', ['draft', 'confirmed', 'invoiced'])->default('draft');
            $table->decimal('total', 14, 2)->default(0);

            $table->timestamps();

            $table->index('status');
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
