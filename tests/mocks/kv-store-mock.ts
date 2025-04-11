/**
 * Mock implementation of the KV store for testing
 */

// Mock implementation of the KV store
export class MockKvStore {
  private store: Map<string, any> = new Map();

  // Set a value in the mock store
  async set(key: Deno.KvKey, value: any, options?: { expireIn?: number }): Promise<void> {
    const keyString = JSON.stringify(key);
    this.store.set(keyString, value);
  }

  // Get a value from the mock store
  async get<T>(key: Deno.KvKey): Promise<{ value: T } | null> {
    const keyString = JSON.stringify(key);
    const result = this.store.get(keyString);
    return result !== undefined ? { value: result } : null;
  }

  // Delete a value from the mock store
  async delete(key: Deno.KvKey): Promise<void> {
    const keyString = JSON.stringify(key);
    this.store.delete(keyString);
  }

  // List values with a prefix
  async list<T>(prefix: Deno.KvKey, options?: Deno.KvListOptions): Promise<Deno.KvListIterator<T>> {
    const prefixString = JSON.stringify(prefix).slice(0, -1); // Remove the closing bracket
    const entries: Array<{ key: Deno.KvKey; value: T }> = [];

    for (const [keyString, value] of this.store.entries()) {
      if (keyString.startsWith(prefixString)) {
        entries.push({
          key: JSON.parse(keyString),
          value: value as T,
        });
      }
    }

    // Create a simple iterator that implements AsyncIterableIterator
    const iterator = {
      entries,
      cursor: 0,
      async next() {
        if (this.cursor < this.entries.length) {
          return { value: this.entries[this.cursor++], done: false };
        } else {
          return { value: undefined as any, done: true };
        }
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    return iterator as unknown as Deno.KvListIterator<T>;
  }

  // Atomic operations (simplified for testing)
  atomic(): Deno.AtomicOperation {
    return {
      commit: async () => ({ ok: true }),
      check: () => ({ ok: true }),
      sum: () => ({ ok: true }),
      min: () => ({ ok: true }),
      max: () => ({ ok: true }),
      set: () => ({ ok: true }),
      delete: () => ({ ok: true }),
      enqueue: () => ({ ok: true }),
    } as unknown as Deno.AtomicOperation;
  }

  // Clear all values (for test setup/teardown)
  clear(): void {
    this.store.clear();
  }

  // Populate with test data
  populate(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      this.store.set(key, value);
    }
  }
}

// Create a singleton instance
export const mockKvStore = new MockKvStore();

// Mock the KvStore class from the utils
export const mockKvStoreModule = {
  getInstance: () => Promise.resolve(mockKvStore as unknown as Deno.Kv),
  get: async <T>(key: Deno.KvKey): Promise<T | null> => {
    const result = await mockKvStore.get<T>(key);
    return result ? result.value : null;
  },
  set: async (key: Deno.KvKey, value: any, options?: { expireIn?: number }): Promise<void> =>
    mockKvStore.set(key, value, options),
  delete: async (key: Deno.KvKey): Promise<void> => mockKvStore.delete(key),
  list: async <T>(
    prefix: Deno.KvKey,
    options?: Deno.KvListOptions,
  ): Promise<Array<{ key: Deno.KvKey; value: T }>> => {
    const entries: Array<{ key: Deno.KvKey; value: T }> = [];
    const iter = await mockKvStore.list<T>(prefix, options);
    for await (const entry of iter) {
      entries.push(entry);
    }
    return entries;
  },
  withTransaction: async (fn: (atomic: Deno.AtomicOperation) => Deno.AtomicOperation) => {
    return {
      ok: true,
      versionstamp: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    };
  },
};
