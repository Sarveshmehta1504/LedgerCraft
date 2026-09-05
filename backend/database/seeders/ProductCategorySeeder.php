<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductCategorySeeder extends Seeder
{
    /**
     * Categories must exist before products - the product form has nothing to
     * select otherwise. Nesting is exercised so the parent_id path is proven.
     */
    public function run(): void
    {
        $roots = ['Furniture', 'Electronics', 'Raw Material'];

        foreach ($roots as $name) {
            $this->category($name, null);
        }

        $furnitureId = DB::table('product_categories')
            ->whereNull('parent_id')->where('name', 'Furniture')->value('id');

        foreach (['Chairs', 'Tables', 'Sofas'] as $name) {
            $this->category($name, $furnitureId);
        }
    }

    private function category(string $name, ?int $parentId): void
    {
        DB::table('product_categories')->updateOrInsert(
            ['parent_id' => $parentId, 'name' => $name],
            ['created_at' => now(), 'updated_at' => now()],
        );
    }
}
