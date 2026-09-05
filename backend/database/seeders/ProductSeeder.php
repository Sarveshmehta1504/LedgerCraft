<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Seeder;
use RuntimeException;

class ProductSeeder extends Seeder
{
    /**
     * Depends on ProductCategorySeeder. category_id is mandatory - see
     * docs/DB_SCHEMA.md - so every product below is resolved against a real
     * seeded category rather than created loose.
     */
    public function run(): void
    {
        $chairs = $this->categoryId('Chairs', 'Furniture');
        $tables = $this->categoryId('Tables', 'Furniture');
        $sofas = $this->categoryId('Sofas', 'Furniture');
        $electronics = $this->categoryId('Electronics', null);
        $rawMaterial = $this->categoryId('Raw Material', null);

        $products = [
            ['name' => 'Wooden Dining Chair', 'type' => 'goods', 'cost_price' => 1200, 'sales_price' => 2200, 'category_id' => $chairs],
            ['name' => 'Executive Office Chair', 'type' => 'goods', 'cost_price' => 3500, 'sales_price' => 6200, 'category_id' => $chairs],
            ['name' => '4-Seater Dining Table', 'type' => 'goods', 'cost_price' => 8000, 'sales_price' => 14500, 'category_id' => $tables],
            ['name' => 'Compact Study Table', 'type' => 'goods', 'cost_price' => 3200, 'sales_price' => 5800, 'category_id' => $tables],
            ['name' => '3-Seater Fabric Sofa', 'type' => 'goods', 'cost_price' => 15000, 'sales_price' => 26500, 'category_id' => $sofas],
            ['name' => 'Recliner Lounge Chair', 'type' => 'goods', 'cost_price' => 9000, 'sales_price' => 16500, 'category_id' => $sofas],
            ['name' => 'LED Reading Lamp', 'type' => 'goods', 'cost_price' => 450, 'sales_price' => 900, 'category_id' => $electronics],
            ['name' => 'Wireless Charging Dock', 'type' => 'goods', 'cost_price' => 800, 'sales_price' => 1500, 'category_id' => $electronics],
            ['name' => 'Teak Wood Plank (per sq ft)', 'type' => 'goods', 'cost_price' => 220, 'sales_price' => 0, 'category_id' => $rawMaterial],
            ['name' => 'Upholstery Fabric (per meter)', 'type' => 'goods', 'cost_price' => 180, 'sales_price' => 0, 'category_id' => $rawMaterial],
            ['name' => 'Steel Hinges (pack of 50)', 'type' => 'goods', 'cost_price' => 350, 'sales_price' => 0, 'category_id' => $rawMaterial],
            ['name' => 'Furniture Assembly Service', 'type' => 'service', 'cost_price' => 0, 'sales_price' => 500, 'category_id' => $chairs],
            ['name' => 'White-Glove Delivery Service', 'type' => 'service', 'cost_price' => 0, 'sales_price' => 1200, 'category_id' => $tables],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(
                ['name' => $product['name']],
                $product,
            );
        }
    }

    private function categoryId(string $name, ?string $parentName): int
    {
        $parentId = $parentName === null
            ? null
            : ProductCategory::whereNull('parent_id')->where('name', $parentName)->value('id');

        $id = ProductCategory::where('parent_id', $parentId)->where('name', $name)->value('id');

        if ($id === null) {
            throw new RuntimeException("Category '{$name}' not found - run ProductCategorySeeder first");
        }

        return $id;
    }
}
