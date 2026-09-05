<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['goods', 'service', 'combo'])->default('goods');
            $table->decimal('sales_price', 14, 2)->default(0);
            $table->decimal('cost_price', 14, 2)->default(0);
            // Mandatory: a product cannot exist without a category.
            $table->foreignId('category_id')
                ->constrained('product_categories')
                ->restrictOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
