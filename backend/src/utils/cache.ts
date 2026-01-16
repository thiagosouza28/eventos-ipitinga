type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

type CacheOptions = {
  maxEntries?: number;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inflightStore = new Map<string, Promise<unknown>>();

const now = () => Date.now();

const isExpired = (entry: CacheEntry<unknown>) => entry.expiresAt > 0 && entry.expiresAt <= now();

const prune = (maxEntries?: number) => {
  if (!maxEntries || cacheStore.size <= maxEntries) return;
  const entries = Array.from(cacheStore.entries());
  entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
  while (cacheStore.size > maxEntries && entries.length) {
    const [key] = entries.shift()!;
    cacheStore.delete(key);
  }
};

export const cacheGet = <T>(key: string): T | undefined => {
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  if (isExpired(entry)) {
    cacheStore.delete(key);
    return undefined;
  }
  return entry.value as T;
};

export const cacheSet = <T>(key: string, value: T, ttlMs: number, options?: CacheOptions) => {
  if (!ttlMs || ttlMs <= 0) return;
  const createdAt = now();
  cacheStore.set(key, {
    value,
    createdAt,
    expiresAt: createdAt + ttlMs
  });
  prune(options?.maxEntries);
};

export const cacheDelete = (key: string) => {
  cacheStore.delete(key);
  inflightStore.delete(key);
};

export const cacheDeletePrefix = (prefix: string) => {
  if (!prefix) return;
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
  for (const key of inflightStore.keys()) {
    if (key.startsWith(prefix)) {
      inflightStore.delete(key);
    }
  }
};

export const cacheClear = () => {
  cacheStore.clear();
  inflightStore.clear();
};

export const cacheGetOrSet = async <T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options?: CacheOptions
): Promise<T> => {
  if (!ttlMs || ttlMs <= 0) {
    return loader();
  }

  const cached = cacheGet<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const inflight = inflightStore.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      cacheSet(key, value, ttlMs, options);
      return value;
    })
    .finally(() => {
      inflightStore.delete(key);
    });

  inflightStore.set(key, promise);
  return promise;
};
