import { describe, expect, it } from "vitest";

import {
  normalizeRemoteDirectory,
  remoteDirectoryPrefix,
  remoteFilePath,
  videoEntries,
  type IDriveEntry,
} from "@/lib/idrive";

describe("IDrive catalog", () => {
  it("keeps supported video files only", () => {
    const entries: IDriveEntry[] = [
      { modifiedAt: "now", name: "movie.mp4", size: 10, type: "file" },
      { modifiedAt: "now", name: "MOVIE.MKV", size: 20, type: "file" },
      { modifiedAt: "now", name: "notes.txt", size: 2, type: "file" },
      { modifiedAt: "now", name: "folder.mp4", size: 0, type: "directory" },
      { modifiedAt: "now", name: "unknown-size.mp4", type: "file" },
    ];
    expect(videoEntries(entries).map((entry) => entry.name)).toEqual(["movie.mp4", "MOVIE.MKV"]);
  });

  it("normalizes absent modification timestamps without invalidating the entry", () => {
    expect(videoEntries([{ name: "movie.mp4", size: 10, type: "file" }])).toEqual([
      { name: "movie.mp4", size: 10, type: "file", modifiedAt: null },
    ]);
  });

  it("joins a configured folder and safe filename", () => {
    expect(remoteFilePath("personal/", "movie.mp4")).toBe("/personal/movie.mp4");
    expect(() => remoteFilePath("/personal", "../movie.mp4")).toThrow();
    expect(normalizeRemoteDirectory("personal/")).toBe("/personal");
    expect(remoteFilePath("/", "movie.mp4")).toBe("/movie.mp4");
    expect(remoteDirectoryPrefix("personal")).toBe("/personal/");
    expect(remoteDirectoryPrefix("/")).toBe("/");
  });

});
