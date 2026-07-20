import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  chmod: vi.fn(),
  createTranscodePlan: vi.fn(),
  downloadIdrive: vi.fn(),
  hlsArguments: vi.fn(),
  isVideoCopyCandidate: vi.fn(),
  mkdir: vi.fn(),
  parseVideoMetadata: vi.fn(),
  query: vi.fn(),
  rm: vi.fn(),
  runCommand: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ chmod: mocks.chmod, mkdir: mocks.mkdir, rm: mocks.rm }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/lib/env", () => ({
  env: () => ({ HLS_ROOT: "/hls", MEDIA_ROOT: "/media", THUMBNAIL_ROOT: "/thumbs" }),
}));
vi.mock("@/lib/ffmpeg-plan", () => ({ hlsArguments: mocks.hlsArguments }));
vi.mock("@/lib/idrive-client", () => ({ downloadIdrive: mocks.downloadIdrive }));
vi.mock("@/lib/keyframes", () => ({ maximumKeyframeInterval: vi.fn() }));
vi.mock("@/lib/media", () => ({ parseVideoMetadata: mocks.parseVideoMetadata }));
vi.mock("@/lib/transcode-plan", () => ({
  createTranscodePlan: mocks.createTranscodePlan,
  isVideoCopyCandidate: mocks.isVideoCopyCandidate,
}));
vi.mock("@/worker/command", () => ({ runCommand: mocks.runCommand }));

import { processVideo } from "@/worker/process-video";

describe("video processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chmod.mockResolvedValue(undefined);
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.rm.mockResolvedValue(undefined);
    mocks.downloadIdrive.mockResolvedValue("/media/video-1/sdk-returned/movie.mp4");
    mocks.query
      .mockResolvedValueOnce([{
        id: "video-1",
        remoteModifiedAt: "version-1",
        remotePath: "/personal/movie.mp4",
        sizeBytes: 42,
        storedName: "movie.mp4",
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "video-1" }]);
    mocks.runCommand.mockResolvedValueOnce("{}").mockResolvedValue("");
    mocks.parseVideoMetadata.mockReturnValue({ durationSeconds: 12, videoStreamIndex: 0 });
    mocks.isVideoCopyCandidate.mockReturnValue(false);
    mocks.createTranscodePlan.mockReturnValue({
      audioCodec: "aac",
      audioMode: "copy",
      height: 720,
      videoCodec: "h264",
      videoMode: "copy",
      width: 1280,
    });
    mocks.hlsArguments.mockReturnValue(["hls"]);
  });

  it("uses the SDK-returned path and propagates cancellation to every external operation", async () => {
    const controller = new AbortController();

    await processVideo("video-1", { signal: controller.signal });

    expect(mocks.downloadIdrive).toHaveBeenCalledWith(
      "/personal/movie.mp4",
      "/media/video-1",
      { signal: controller.signal, timeoutMs: 24 * 60 * 60 * 1000 },
    );
    expect(mocks.runCommand).toHaveBeenCalledWith(
      "ffprobe",
      expect.arrayContaining(["/media/video-1/sdk-returned/movie.mp4"]),
      { signal: controller.signal },
    );
    expect(mocks.hlsArguments).toHaveBeenCalledWith(
      "/media/video-1/sdk-returned/movie.mp4",
      "/hls/video-1",
      expect.any(Object),
    );
    expect(mocks.runCommand).toHaveBeenCalledWith("ffmpeg", ["hls"], {
      signal: controller.signal,
      timeoutMs: 6 * 60 * 60 * 1000,
    });
  });

  it("keeps published output ready when downloaded-source cleanup fails", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.rm
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("source cleanup failed"));

    await expect(processVideo("video-1")).resolves.toBeUndefined();

    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(mocks.rm.mock.calls.filter(([target]) => target === "/hls/video-1")).toHaveLength(1);
    expect(logError).toHaveBeenCalledWith(
      "Could not clean up video processing artifact",
      expect.any(Error),
    );
    logError.mockRestore();
  });

  it("preserves the processing error when secondary cleanup fails", async () => {
    const processingError = new Error("ffprobe failed");
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let removeCall = 0;
    mocks.runCommand.mockReset().mockRejectedValueOnce(processingError);
    mocks.rm.mockImplementation(async () => {
      removeCall += 1;
      if (removeCall >= 3) throw new Error("cleanup failed");
    });

    await expect(processVideo("video-1")).rejects.toBe(processingError);

    expect(logError).toHaveBeenCalledWith(
      "Could not clean up video processing artifact",
      expect.any(Error),
    );
    logError.mockRestore();
  });
});
