import { describe, expect, it, vi } from "vitest";

describe("cache eviction database lease", () => {
  it("rechecks last access time when claiming an eviction", async () => {
    vi.resetModules();
    const query = vi.fn()
      .mockResolvedValueOnce([{ id: "video-1", lastAccessedAt: "2020-01-01T00:00:00Z" }])
      .mockResolvedValueOnce([]);
    vi.doMock("@/lib/db", () => ({ query }));
    vi.doMock("@/lib/env", () => ({
      env: () => ({ HLS_ROOT: "/hls", THUMBNAIL_ROOT: "/thumbs", HLS_CACHE_MAX_BYTES: 50 }),
    }));
    vi.doMock("node:fs/promises", () => ({
      readdir: vi.fn().mockResolvedValue([{ name: "master.m3u8", isDirectory: () => false }]),
      rm: vi.fn(),
      stat: vi.fn().mockResolvedValue({ size: 100 }),
    }));

    const { evictCache } = await import("@/worker/cache-eviction");
    await evictCache();

    expect(query.mock.calls[1][0]).toContain("last_accessed_at is null or last_accessed_at < $2");
    expect(query.mock.calls[1][1][1]).toBeInstanceOf(Date);
  });
});
