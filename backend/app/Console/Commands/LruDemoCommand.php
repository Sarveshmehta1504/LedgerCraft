<?php

namespace App\Console\Commands;

use App\Support\LruCache;
use Illuminate\Console\Command;

class LruDemoCommand extends Command
{
    protected $signature = 'lru:demo {--capacity=3}';

    protected $description = 'Walk through an LRU cache step by step, showing promotion and eviction';

    public function handle(): int
    {
        $capacity = (int) $this->option('capacity');

        $lru = new LruCache(
            namespace: 'lru:demo',
            capacity: $capacity,
            ttlSeconds: 60,
            touchIntervalSeconds: 0,
        );
        $lru->flush();

        $this->newLine();
        $this->info("LRU cache, capacity {$capacity}");
        $this->line('Order below is least-recently-used first. The leftmost key is next to be evicted.');
        $this->newLine();

        $rows = [];

        $step = function (string $action, callable $run) use (&$rows, $lru) {
            $result = $run();
            $rows[] = [
                $action,
                is_null($result) ? '—' : (is_scalar($result) ? (string) $result : 'ok'),
                implode(' → ', $lru->keys()) ?: '(empty)',
                $lru->count(),
            ];
        };

        $step("put('chair')", fn () => $lru->put('chair', 'Wooden Chair'));
        $step("put('table')", fn () => $lru->put('table', 'Dining Table'));
        $step("put('sofa')", fn () => $lru->put('sofa', 'Corner Sofa'));

        $this->line('  Cache is now full. "chair" is the oldest, so it would be evicted next...');
        $step("get('chair')", fn () => $lru->get('chair'));
        $this->line('  ...but reading it promoted it. "table" is now the oldest.');

        $step("put('lamp')", fn () => $lru->put('lamp', 'Desk Lamp'));
        $step("get('table')", fn () => $lru->get('table'));
        $step("get('chair')", fn () => $lru->get('chair'));

        $this->table(['Operation', 'Returned', 'Cache (LRU → MRU)', 'Size'], $rows);

        $stats = $lru->stats();

        $this->newLine();
        $this->line(sprintf(
            '  hits: %d    misses: %d    evictions: %d    hit rate: %s',
            $stats['hits'],
            $stats['misses'],
            $stats['evictions'],
            $stats['hit_rate'] ?? 'n/a',
        ));
        $this->newLine();
        $this->line('  A FIFO cache would have evicted "chair" - it arrived first.');
        $this->line('  LRU evicted "table" instead, because "chair" had just been used.');
        $this->newLine();

        $lru->flush();

        return self::SUCCESS;
    }
}
