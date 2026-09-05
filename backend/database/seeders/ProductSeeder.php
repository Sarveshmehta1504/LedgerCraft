<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Seeder;
use RuntimeException;

class ProductSeeder extends Seeder
{
    /**
     * Urban Furniture's catalogue: finished goods it sells, raw material it
     * buys, services it charges for, and bundles that combine them.
     *
     * Depends on ProductCategorySeeder - category_id is mandatory per
     * docs/DB_SCHEMA.md, so every product resolves against a real seeded
     * category rather than being created loose.
     *
     * Pricing follows the real trade: finished goods carry roughly a 75-80%
     * markup, and raw material has a sales price of zero because the company
     * buys it and never resells it. That zero is what makes the Purchase
     * Expense and Sale Income sides of the P&L look like a manufacturer's
     * rather than a reseller's.
     *
     * All three values of the `type` enum appear - goods, service and combo -
     * so no branch of the product form is left undemonstrated.
     */
    public function run(): void
    {
        foreach ($this->catalogue() as $categoryPath => $products) {
            [$name, $parent] = array_pad(explode('|', $categoryPath), 2, null);
            $categoryId = $this->categoryId($name, $parent);

            foreach ($products as $product) {
                Product::firstOrCreate(
                    ['name' => $product[0]],
                    [
                        'type' => $product[1],
                        'cost_price' => $product[2],
                        'sales_price' => $product[3],
                        'category_id' => $categoryId,
                    ],
                );
            }
        }

        // Withdrawn from the catalogue but still on historical documents, so it
        // is archived rather than deleted. Proves both the archive filter on
        // the product list and the guard that keeps an archived product out of
        // a new order.
        $discontinued = Product::firstOrCreate(
            ['name' => 'Cane Rocking Chair (discontinued)'],
            [
                'type' => 'goods',
                'cost_price' => 2600,
                'sales_price' => 5200,
                'category_id' => $this->categoryId('Discontinued Lines', 'Furniture'),
            ],
        );

        if (! $discontinued->isArchived()) {
            $discontinued->archived_at = now()->subDays(70);
            $discontinued->save();
        }
    }

    /**
     * Keyed by "category|parent" - a bare key is a root category.
     *
     * @return array<string, array<int, array{0:string, 1:string, 2:float|int, 3:float|int}>>
     */
    private function catalogue(): array
    {
        return [
            'Chairs|Furniture' => [
                ['Wooden Dining Chair', 'goods', 1200, 2200],
                ['Executive Office Chair', 'goods', 3500, 6200],
                ['Ergonomic Mesh Task Chair', 'goods', 4200, 7500],
                ['Folding Cafe Chair', 'goods', 700, 1400],
                ['Bar Stool (Walnut)', 'goods', 1800, 3400],
            ],
            'Tables|Furniture' => [
                ['4-Seater Dining Table', 'goods', 8000, 14500],
                ['6-Seater Dining Table', 'goods', 12000, 21000],
                ['Compact Study Table', 'goods', 3200, 5800],
                ['Height-Adjustable Standing Desk', 'goods', 11000, 19500],
                ['Nesting Coffee Table Set', 'goods', 4500, 8200],
            ],
            'Sofas & Seating|Furniture' => [
                ['3-Seater Fabric Sofa', 'goods', 15000, 26500],
                ['2-Seater Leatherette Sofa', 'goods', 11500, 20000],
                ['Recliner Lounge Chair', 'goods', 9000, 16500],
                ['Ottoman Footstool', 'goods', 1600, 3200],
            ],
            'Storage|Furniture' => [
                ['4-Door Wardrobe', 'goods', 16000, 28500],
                ['Bookshelf (5 Tier)', 'goods', 3800, 7200],
                ['Shoe Cabinet', 'goods', 2400, 4600],
                ['Office Filing Cabinet', 'goods', 5200, 9400],
            ],
            'Beds|Furniture' => [
                ['Queen Bed with Storage', 'goods', 18000, 32000],
                ['Single Bed Frame', 'goods', 7500, 13500],
            ],
            'Lighting|Electronics' => [
                ['LED Reading Lamp', 'goods', 450, 900],
                ['Pendant Ceiling Light', 'goods', 1400, 2800],
                ['Tripod Floor Lamp', 'goods', 1900, 3600],
            ],
            'Desk Accessories|Electronics' => [
                ['Wireless Charging Dock', 'goods', 800, 1500],
                ['Cable Management Tray', 'goods', 350, 750],
                ['Monitor Riser (Oak)', 'goods', 900, 1800],
            ],

            // Raw material: bought, never sold, hence sales_price 0.
            'Wood & Board|Raw Material' => [
                ['Teak Wood Plank (per sq ft)', 'goods', 220, 0],
                ['Plywood Sheet 19mm (8x4)', 'goods', 2100, 0],
                ['MDF Board 12mm (8x4)', 'goods', 950, 0],
            ],
            'Fabric & Foam|Raw Material' => [
                ['Upholstery Fabric (per meter)', 'goods', 180, 0],
                ['High-Density Foam Sheet', 'goods', 1250, 0],
                ['Leatherette Roll (per meter)', 'goods', 340, 0],
            ],
            'Hardware & Fittings|Raw Material' => [
                ['Steel Hinges (pack of 50)', 'goods', 350, 0],
                ['Drawer Slide Set', 'goods', 260, 0],
                ['Chair Gas Lift Cylinder', 'goods', 480, 0],
            ],
            'Finishes|Raw Material' => [
                ['PU Polish (5 litre)', 'goods', 1850, 0],
                ['Wood Primer (10 litre)', 'goods', 1400, 0],
            ],

            'Installation|Services' => [
                ['Furniture Assembly Service', 'service', 0, 500],
                ['On-Site Carpentry (per hour)', 'service', 250, 650],
            ],
            'Logistics|Services' => [
                ['White-Glove Delivery Service', 'service', 0, 1200],
                ['Outstation Freight (per shipment)', 'service', 900, 1800],
            ],

            // Bundles sit on the parent category rather than a leaf: they span
            // more than one leaf by definition.
            'Furniture' => [
                ['Dining Set Combo (Table + 4 Chairs)', 'combo', 16800, 29900],
                ['Home Office Combo (Desk + Chair + Lamp)', 'combo', 15650, 27500],
                ['Bedroom Combo (Queen Bed + Wardrobe)', 'combo', 34000, 57000],
            ],
        ];
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
