export interface QueryCacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
}

export interface PeekQueryCacheResult<T> {
  data: T;
  isFresh: boolean;
}

export interface CachedQueryOptions {
  ttlMs?: number;
  staleMs?: number;
  forceRefresh?: boolean;
}

const DEFAULT_TTL_MS = 90_000;
const DEFAULT_STALE_MS = 600_000;
const MAX_CACHE_ENTRIES = 250;

const cacheStore = new Map<string, QueryCacheEntry>();
const inFlightStore = new Map<string, Promise<unknown>>();

export const cacheKeys = {
  workspaces: () => "workspaces:all",
  entities: () => "entities:all",
  usage: (workspaceId?: string, entityId?: string) =>
    `usage:${workspaceId || "none"}:${entityId || "none"}`,
  workBatches: (params: {
    entityId: string;
    batchType?: string;
    periodMonth?: string;
    page: number;
    pageSize: number;
    search?: string;
  }) =>
    params.search
      ? `batches:${params.entityId}:${params.batchType || "all"}:${params.periodMonth || "all"}:${params.page}:${params.pageSize}:${params.search}`
      : `batches:${params.entityId}:${params.batchType || "all"}:${params.periodMonth || "all"}:${params.page}:${params.pageSize}`,
  workBatchMonths: (entityId: string, batchType?: string) =>
    `batch-months:${entityId}:${batchType || "all"}`,
  workBatchById: (batchId: string) => `batch:${batchId}`,
  aiThreads: (params: {
    entityId?: string;
    workspaceId?: string;
    page: number;
    pageSize: number;
    search?: string;
  }) =>
    `threads:${params.entityId || "none"}:${params.workspaceId || "none"}:${params.page}:${params.pageSize}:${params.search || ""}`,
  aiThreadById: (threadId: string) => `thread:${threadId}`,
  transactionsPaginated: (entityId: string, p: Record<string, unknown>) =>
    `tx:${entityId}:${JSON.stringify(p)}`,
  transactionsAll: (entityId?: string) => `tx:${entityId || "all"}:list`,
  recentTransactions: (entityId: string, limit: number) =>
    `tx:${entityId}:recent:${limit}`,
  transactionCounts: (entityId: string) => `tx:${entityId}:counts`,
  chartOfAccounts: (entityId?: string) => `coa:${entityId || "all"}`,
  journalEntries: (entityId?: string) => `je:${entityId || "all"}:list`,
  journalEntriesPaginated: (entityId: string, page: number, pageSize: number) =>
    `je:${entityId}:p:${page}:${pageSize}`,
  trialBalance: (entityId: string, from?: string, to?: string) =>
    `tb:${entityId}:${from || ""}:${to || ""}`,
  generalLedger: (entityId: string, code: string, from?: string, to?: string) =>
    `gl:${entityId}:${code}:${from || ""}:${to || ""}`,
  taxRecords: (entityId?: string) => `tax:${entityId || "all"}:records`,
  taxRecordsPaginated: (entityId: string, page: number, pageSize: number) =>
    `tax:${entityId}:p:${page}:${pageSize}`,
  taxDeadlines: (entityId?: string) => `tax:${entityId || "all"}:deadlines`,
  exceptions: (entityId?: string) => `exc:${entityId || "all"}:list`,
  exceptionsPaginated: (entityId: string, p: Record<string, unknown>) =>
    `exc:${entityId}:${JSON.stringify(p)}`,
  exceptionCounts: (entityId: string) => `exc:${entityId}:counts`,
};

function setCacheEntry(key: string, data: unknown): void {
  if (cacheStore.has(key)) {
    cacheStore.delete(key);
  }
  cacheStore.set(key, { data, fetchedAt: Date.now() });

  while (cacheStore.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey === undefined) break;
    cacheStore.delete(oldestKey);
  }
}

function runDeduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightStore.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promiseRef: { current?: Promise<T> } = {};
  const promise: Promise<T> = (async () => {
    try {
      const data = await fetcher();
      // Only write back if this in-flight entry was not invalidated/cleared mid-request
      if (inFlightStore.get(key) === promiseRef.current) {
        setCacheEntry(key, data);
      }
      return data;
    } finally {
      if (inFlightStore.get(key) === promiseRef.current) {
        inFlightStore.delete(key);
      }
    }
  })();

  promiseRef.current = promise;
  inFlightStore.set(key, promise);
  return promise;
}

export function peekQueryCache<T>(
  key: string,
  maxStaleMs: number = DEFAULT_STALE_MS,
  ttlMs: number = DEFAULT_TTL_MS
): PeekQueryCacheResult<T> | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.fetchedAt;
  if (age > maxStaleMs) {
    cacheStore.delete(key);
    return null;
  }

  return {
    data: entry.data as T,
    isFresh: age < ttlMs,
  };
}

export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CachedQueryOptions = {}
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const forceRefresh = options.forceRefresh ?? false;

  if (!forceRefresh) {
    const entry = cacheStore.get(key);
    if (entry) {
      const age = Date.now() - entry.fetchedAt;
      if (age < ttlMs) {
        return entry.data as T;
      }
      if (age < staleMs) {
        void runDeduplicatedFetch(key, fetcher).catch(() => {});
        return entry.data as T;
      }
      cacheStore.delete(key);
    }
  }

  return runDeduplicatedFetch(key, fetcher);
}

export function invalidateCachePrefix(...prefixes: string[]): void {
  if (prefixes.length === 0) return;

  for (const key of Array.from(cacheStore.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      cacheStore.delete(key);
    }
  }

  for (const key of Array.from(inFlightStore.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      inFlightStore.delete(key);
    }
  }
}

export function clearAllQueryCache(): void {
  cacheStore.clear();
  inFlightStore.clear();
}
