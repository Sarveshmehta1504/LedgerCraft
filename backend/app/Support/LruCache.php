<?php

namespace App\Support;

use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;

class LruCache
{
    private array $memo = [];

    private array $pendingStats = [];

    public function __construct(
        private readonly string $namespace,
        private readonly int $capacity,
        private readonly int $ttlSeconds = 3600,
        private readonly int $touchIntervalSeconds = 10,
        private readonly int $sampleSize = 8,
        private readonly ?Repository $store = null,
    ) {}

    public function get(string $key): mixed
    {
        if (array_key_exists($key, $this->memo)) {
            $record = $this->memo[$key];
            $this->stat('hits');
            $this->stat('memo_hits');
            $this->touch($key, $record);

            return $record['value'];
        }

        $record = $this->store()->get($this->valueKey($key));

        if (! is_array($record) || ! array_key_exists('value', $record)) {
            $this->stat('misses');

            return null;
        }

        $this->stat('hits');
        $this->memo[$key] = $record;
        $this->touch($key, $record);

        return $record['value'];
    }

    public function put(string $key, mixed $value): void
    {
        $record = ['value' => $value, 'used' => $this->now()];

        $this->store()->put($this->valueKey($key), $record, $this->ttlSeconds);
        $this->memo[$key] = $record;

        $this->locked(function () use ($key) {
            $index = $this->readIndex();

            if (! in_array($key, $index, true)) {
                $index[] = $key;
            }

            while (count($index) > $this->capacity) {
                $victim = $this->pickVictim($index);

                if ($victim === null) {
                    break;
                }

                $this->store()->forget($this->valueKey($victim));
                unset($this->memo[$victim]);
                $index = array_values(array_diff($index, [$victim]));
                $this->stat('evictions');
            }

            $this->writeIndex($index);
        });
    }

    public function forget(string $key): void
    {
        unset($this->memo[$key]);
        $this->store()->forget($this->valueKey($key));

        $this->locked(fn () => $this->writeIndex(
            array_values(array_diff($this->readIndex(), [$key]))
        ));
    }

    public function flush(): void
    {
        $this->memo = [];
        $this->pendingStats = [];

        $this->locked(function () {
            foreach ($this->readIndex() as $key) {
                $this->store()->forget($this->valueKey($key));
            }

            $this->writeIndex([]);
            $this->store()->forget($this->statsKey());
        });
    }

    public function keys(): array
    {
        $used = [];

        foreach ($this->readIndex() as $key) {
            $record = $this->store()->get($this->valueKey($key));
            $used[$key] = is_array($record) ? ($record['used'] ?? 0) : 0;
        }

        asort($used);

        return array_keys($used);
    }

    public function count(): int
    {
        return count($this->readIndex());
    }

    public function stats(): array
    {
        $this->flushStats();

        $stats = $this->store()->get($this->statsKey(), []);
        $hits = (int) ($stats['hits'] ?? 0);
        $misses = (int) ($stats['misses'] ?? 0);
        $total = $hits + $misses;

        return [
            'capacity' => $this->capacity,
            'size' => $this->count(),
            'hits' => $hits,
            'memo_hits' => (int) ($stats['memo_hits'] ?? 0),
            'misses' => $misses,
            'evictions' => (int) ($stats['evictions'] ?? 0),
            'hit_rate' => $total === 0 ? null : round($hits / $total * 100, 1).'%',
            'keys_lru_first' => $this->keys(),
        ];
    }

    public function flushStats(): void
    {
        if ($this->pendingStats === []) {
            return;
        }

        $pending = $this->pendingStats;
        $this->pendingStats = [];

        $stats = $this->store()->get($this->statsKey(), []);

        foreach ($pending as $name => $count) {
            $stats[$name] = ($stats[$name] ?? 0) + $count;
        }

        $this->store()->forever($this->statsKey(), $stats);
    }

    public function __destruct()
    {
        $this->flushStats();
    }

    private function touch(string $key, array $record): void
    {
        if (($this->now() - ($record['used'] ?? 0)) < $this->touchIntervalSeconds) {
            return;
        }

        $record['used'] = $this->now();
        $this->memo[$key] = $record;
        $this->store()->put($this->valueKey($key), $record, $this->ttlSeconds);
    }

    private function pickVictim(array $index): ?string
    {
        if ($index === []) {
            return null;
        }

        $sample = count($index) <= $this->sampleSize
            ? $index
            : array_map(fn ($i) => $index[$i], (array) array_rand($index, $this->sampleSize));

        $oldestKey = null;
        $oldestUsed = INF;

        foreach ($sample as $key) {
            $record = $this->store()->get($this->valueKey($key));
            $used = is_array($record) ? ($record['used'] ?? 0) : -1;

            if ($used < $oldestUsed) {
                $oldestUsed = $used;
                $oldestKey = $key;
            }
        }

        return $oldestKey;
    }

    private function stat(string $name): void
    {
        $this->pendingStats[$name] = ($this->pendingStats[$name] ?? 0) + 1;
    }

    private function locked(callable $callback): mixed
    {
        $lock = Cache::lock($this->namespace.':lock', 5);

        try {
            return $lock->block(3, $callback);
        } catch (LockTimeoutException) {
            return null;
        } finally {
            optional($lock)->release();
        }
    }

    private function now(): float
    {
        return microtime(true);
    }

    private function readIndex(): array
    {
        return $this->store()->get($this->indexKey(), []);
    }

    private function writeIndex(array $index): void
    {
        $this->store()->forever($this->indexKey(), array_values($index));
    }

    private function store(): Repository
    {
        return $this->store ?? Cache::store();
    }

    private function valueKey(string $key): string
    {
        return $this->namespace.':v:'.$key;
    }

    private function indexKey(): string
    {
        return $this->namespace.':index';
    }

    private function statsKey(): string
    {
        return $this->namespace.':stats';
    }
}
