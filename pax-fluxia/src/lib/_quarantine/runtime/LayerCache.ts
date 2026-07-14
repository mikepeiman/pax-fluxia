export interface LayerCacheStats {
    hits: number;
    misses: number;
    size: number;
}

interface LayerCacheEntry<ValueType> {
    value: ValueType;
    createdAtMs: number;
    lastAccessedAtMs: number;
}

export class LayerCache<KeyType, ValueType> {
    private readonly entries = new Map<KeyType, LayerCacheEntry<ValueType>>();
    private hits = 0;
    private misses = 0;

    get(key: KeyType): ValueType | null {
        const entry = this.entries.get(key);
        if (!entry) {
            this.misses += 1;
            return null;
        }

        this.hits += 1;
        entry.lastAccessedAtMs = Date.now();
        return entry.value;
    }

    set(key: KeyType, value: ValueType): ValueType {
        const nowMs = Date.now();
        this.entries.set(key, {
            value,
            createdAtMs: nowMs,
            lastAccessedAtMs: nowMs,
        });
        return value;
    }

    getOrCreate(key: KeyType, build: () => ValueType): ValueType {
        const cached = this.get(key);
        if (cached) {
            return cached;
        }

        return this.set(key, build());
    }

    delete(key: KeyType): boolean {
        return this.entries.delete(key);
    }

    clear(): void {
        this.entries.clear();
        this.hits = 0;
        this.misses = 0;
    }

    stats(): LayerCacheStats {
        return {
            hits: this.hits,
            misses: this.misses,
            size: this.entries.size,
        };
    }
}
