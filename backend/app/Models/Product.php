<?php

namespace App\Models;

use App\Models\Concerns\HasArchive;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasArchive, HasFactory;

    protected $fillable = [
        'name',
        'type',
        'sales_price',
        'cost_price',
        'category_id',
    ];

    protected function casts(): array
    {
        return [
            'sales_price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'archived_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }
}
