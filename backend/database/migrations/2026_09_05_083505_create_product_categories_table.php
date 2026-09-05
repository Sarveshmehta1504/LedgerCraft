<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Category is a master table referenced by products, not a free-text field.
     * Mirrors Odoo's product.category, including nesting via parent_id.
     */
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('product_categories')
                ->restrictOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            // Unique within a parent: "Chairs" may exist under two parents.
            $table->unique(['parent_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_categories');
    }
};
