<?php

namespace Database\Seeders;

use App\Models\ProductCategory;
use Illuminate\Database\Seeder;

class ProductCategorySeeder extends Seeder
{
    /**
     * Categories must exist before products - the product form has nothing to
     * select otherwise.
     *
     * Four roots with children under each, rather than nesting one branch, so
     * the tree on screen looks like a real catalogue and every root proves the
     * parent_id path works. One archived child demonstrates that an obsolete
     * category disappears from the picker while its products still resolve.
     */
    public function run(): void
    {
        $tree = [
            'Furniture' => ['Chairs', 'Tables', 'Sofas & Seating', 'Storage', 'Beds'],
            'Electronics' => ['Lighting', 'Desk Accessories'],
            'Raw Material' => ['Wood & Board', 'Fabric & Foam', 'Hardware & Fittings', 'Finishes'],
            'Services' => ['Installation', 'Logistics'],
        ];

        foreach ($tree as $root => $children) {
            $parent = $this->category($root, null);

            foreach ($children as $child) {
                $this->category($child, $parent->id);
            }
        }

        // A line the company no longer makes. Archived, not deleted: products
        // still point at it, and the FK is restrictive.
        $furniture = ProductCategory::whereNull('parent_id')->where('name', 'Furniture')->firstOrFail();
        $discontinued = $this->category('Discontinued Lines', $furniture->id);

        if (! $discontinued->isArchived()) {
            $discontinued->archived_at = now()->subDays(75);
            $discontinued->save();
        }
    }

    private function category(string $name, ?int $parentId): ProductCategory
    {
        return ProductCategory::firstOrCreate(['parent_id' => $parentId, 'name' => $name]);
    }
}
