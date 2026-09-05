<?php

namespace App\Services;

use App\Models\Product;
use App\Support\LruCache;
use Illuminate\Support\Facades\Cache;

class ProductCache
{
    private const CAPACITY = 25;

    private const TTL_SECONDS = 900; // 15 minutes

    private const TOUCH_INTERVAL_SECONDS = 10;

    private const KEY_PREFIX = 'product:';

    private LruCache $lru;

    public function __construct(?LruCache $lru = null)
    {
        $this->lru = $lru ?? new LruCache(
            namespace: 'lru:products',
            capacity: self::CAPACITY,
            ttlSeconds: self::TTL_SECONDS,
            touchIntervalSeconds: self::TOUCH_INTERVAL_SECONDS,
        );

        app()->terminating(fn () => $this->lru->flushStats());
    }

    public function find(int $id): ?Product
    {
        if ($this->usesStoreLru()) {
            return Cache::remember(
                self::KEY_PREFIX.$id,
                self::TTL_SECONDS,
                fn () => Product::with('category:id,name,parent_id')->find($id),
            );
        }

        $cached = $this->lru->get((string) $id);

        if ($cached instanceof Product) {
            return $cached;
        }

        $product = Product::with('category:id,name,parent_id')->find($id);

        if ($product !== null) {
            $this->lru->put((string) $id, $product);
        }

        return $product;
    }

    private function usesStoreLru(): bool
    {
        return config('cache.product_strategy') === 'remember';
    }

    public function forget(int $id): void
    {
        Cache::forget(self::KEY_PREFIX.$id);
        $this->lru->forget((string) $id);
    }

    public function flush(): void
    {
        $this->lru->flush();
    }

    public function stats(): array
    {
        return $this->lru->stats();
    }
}
