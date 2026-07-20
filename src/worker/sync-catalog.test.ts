import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  rm: vi.fn(),
  listIdrive: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/lib/env", () => ({
  env: () => ({ IDRIVE_VIDEO_FOLDER: "personal", HLS_ROOT: "/hls", THUMBNAIL_ROOT: "/thumbs" }),
}));
vi.mock("node:fs/promises", () => ({ rm: mocks.rm }));
vi.mock("@/lib/idrive-client", () => ({ listIdrive: mocks.listIdrive }));

import { syncCatalog } from "@/worker/sync-catalog";

describe("catalog synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rm.mockResolvedValue(undefined);
  });

  it("upserts supported remote files using a normalized folder", async () => {
    mocks.listIdrive.mockResolvedValue([
      { name: "movie.mp4", size: 42, type: "file" },
      { name: "notes.txt", size: 4, type: "file" },
    ]);
    mocks.query
      .mockResolvedValueOnce([{ id: "admin" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(syncCatalog()).resolves.toBe(1);
    expect(mocks.listIdrive).toHaveBeenCalledWith("/personal", {});
    expect(mocks.query.mock.calls[2][1]).toEqual([
      "admin", "movie", "movie.mp4", 42, "/personal/movie.mp4", null, expect.any(Date),
    ]);
  });

  it("deletes stale cache when a remote version changes", async () => {
    mocks.listIdrive.mockResolvedValue([
      { name: "movie.mp4", size: 42, type: "file", modifiedAt: "new" },
    ]);
    mocks.query
      .mockResolvedValueOnce([{ id: "admin" }])
      .mockResolvedValueOnce([{ id: "video-1", remoteModifiedAt: "old" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await syncCatalog();
    expect(mocks.rm).toHaveBeenCalledWith("/hls/video-1", { recursive: true, force: true });
    expect(mocks.rm).toHaveBeenCalledWith("/thumbs/video-1.jpg", { force: true });
  });

  it("propagates worker cancellation to the remote listing", async () => {
    const controller = new AbortController();
    mocks.listIdrive.mockRejectedValue(new Error("cancelled"));

    await expect(syncCatalog(controller.signal)).rejects.toThrow("cancelled");
    expect(mocks.listIdrive).toHaveBeenCalledWith("/personal", { signal: controller.signal });
  });

  it("stops reconciliation before stale deletion when cancellation arrives mid-scan", async () => {
    const controller = new AbortController();
    mocks.listIdrive.mockResolvedValue([
      { name: "first.mp4", size: 10, type: "file" },
      { name: "second.mp4", size: 20, type: "file" },
    ]);
    mocks.query
      .mockResolvedValueOnce([{ id: "admin" }])
      .mockResolvedValueOnce([])
      .mockImplementationOnce(async () => {
        controller.abort();
        return [];
      });

    await expect(syncCatalog(controller.signal)).rejects.toThrow("aborted");

    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(mocks.query).not.toHaveBeenCalledWith(
      expect.stringContaining("last_seen_at <"),
      expect.anything(),
    );
  });
});
