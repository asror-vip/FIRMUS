import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedQuery,
  clearAllQueryCache,
  invalidateCachePrefix,
  peekQueryCache,
} from "../../lib/cache/query-cache";

describe("Query Cache", () => {
  beforeEach(() => {
    clearAllQueryCache();
  });

  afterEach(() => {
    clearAllQueryCache();
    vi.useRealTimers();
  });

  it("returns cached data on fresh hit without re-invoking fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

    const first = await cachedQuery("fresh:key", fetcher, { ttlMs: 60_000 });
    const second = await cachedQuery("fresh:key", fetcher, { ttlMs: 60_000 });
    const third = await cachedQuery("fresh:key", fetcher, { ttlMs: 60_000 });

    expect(first).toEqual({ items: [1, 2, 3] });
    expect(second).toEqual({ items: [1, 2, 3] });
    expect(third).toEqual({ items: [1, 2, 3] });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent in-flight calls to cachedQuery with the same key", async () => {
    let resolveFetcher!: (value: string) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetcher = resolve;
        })
    );

    const p1 = cachedQuery("inflight:key", fetcher);
    const p2 = cachedQuery("inflight:key", fetcher);
    const p3 = cachedQuery("inflight:key", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveFetcher("shared-result");
    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual(["shared-result", "shared-result", "shared-result"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("peekQueryCache returns fresh, stale, and null states based on ttlMs and maxStaleMs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const fetcher = vi.fn().mockResolvedValue("cached-payload");
    await cachedQuery("peek:key", fetcher);

    expect(peekQueryCache<string>("peek:key", 5_000, 1_000)).toEqual({
      data: "cached-payload",
      isFresh: true,
    });

    vi.advanceTimersByTime(1_500);
    expect(peekQueryCache<string>("peek:key", 5_000, 1_000)).toEqual({
      data: "cached-payload",
      isFresh: false,
    });

    vi.advanceTimersByTime(4_000);
    expect(peekQueryCache<string>("peek:key", 5_000, 1_000)).toBeNull();
  });

  it("invalidateCachePrefix removes only matching keys and leaves unrelated keys intact", async () => {
    await cachedQuery("tx:ent-1:list", async () => ["tx-1"]);
    await cachedQuery("tx:ent-1:counts", async () => 12);
    await cachedQuery("coa:ent-1", async () => ["1010"]);

    invalidateCachePrefix("tx:ent-1:");

    expect(peekQueryCache("tx:ent-1:list")).toBeNull();
    expect(peekQueryCache("tx:ent-1:counts")).toBeNull();
    expect(peekQueryCache("coa:ent-1")).toEqual({
      data: ["1010"],
      isFresh: true,
    });
  });

  it("clearAllQueryCache clears all cached entries", async () => {
    const fetcherA = vi.fn().mockResolvedValue("a");
    const fetcherB = vi.fn().mockResolvedValue("b");

    await cachedQuery("key:a", fetcherA);
    await cachedQuery("key:b", fetcherB);

    expect(peekQueryCache("key:a")).toEqual({ data: "a", isFresh: true });
    expect(peekQueryCache("key:b")).toEqual({ data: "b", isFresh: true });

    clearAllQueryCache();

    expect(peekQueryCache("key:a")).toBeNull();
    expect(peekQueryCache("key:b")).toBeNull();

    await cachedQuery("key:a", fetcherA);
    expect(fetcherA).toHaveBeenCalledTimes(2);
  });
});
