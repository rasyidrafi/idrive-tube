import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  rm: vi.fn(),
  runIdrive: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/lib/env", () => ({
  env: () => ({ IDRIVE_VIDEO_FOLDER: "personal", HLS_ROOT: "/hls", THUMBNAIL_ROOT: "/thumbs" }),
}));
vi.mock("node:fs/promises", () => ({ rm: mocks.rm }));
vi.mock("@/lib/idrive", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/idrive")>();
  return { ...original, runIdrive: mocks.runIdrive };
});

import { syncCatalog } from "@/worker/sync-catalog";

describe("catalog synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rm.mockResolvedValue(undefined);
  });

  it("upserts supported remote files using a normalized folder", async () => {
    mocks.runIdrive.mockResolvedValue(JSON.stringify([
      { name: "movie.mp4", size: 42, type: "file" },
      { name: "notes.txt", size: 4, type: "file" },
    ]));
    mocks.query
      .mockResolvedValueOnce([{ id: "admin" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(syncCatalog()).resolves.toBe(1);
    expect(mocks.runIdrive).toHaveBeenCalledWith(["ls", "/personal", "--json"]);
    expect(mocks.query.mock.calls[2][1]).toEqual([
      "admin", "movie", "movie.mp4", 42, "/personal/movie.mp4", null, expect.any(Date),
    ]);
  });

  it("deletes stale cache when a remote version changes", async () => {
    mocks.runIdrive.mockResolvedValue(JSON.stringify([
      { name: "movie.mp4", size: 42, type: "file", modifiedAt: "new" },
    ]));
    mocks.query
      .mockResolvedValueOnce([{ id: "admin" }])
      .mockResolvedValueOnce([{ id: "video-1", remoteModifiedAt: "old" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await syncCatalog();
    expect(mocks.rm).toHaveBeenCalledWith("/hls/video-1", { recursive: true, force: true });
    expect(mocks.rm).toHaveBeenCalledWith("/thumbs/video-1.jpg", { force: true });
  });
});
