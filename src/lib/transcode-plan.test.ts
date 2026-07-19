import { describe, expect, it } from "vitest";

import { createTranscodePlan } from "@/lib/transcode-plan";
import type { VideoMetadata } from "@/lib/media";

function metadata(overrides: Partial<VideoMetadata> = {}): VideoMetadata {
  return {
    durationSeconds: 60,
    width: 1280,
    height: 720,
    videoCodec: "h264",
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    rotation: 0,
    videoStreamIndex: 0,
    maxKeyframeIntervalSeconds: 6,
    ...overrides,
  };
}

describe("format-aware preparation", () => {
  it("stream-copies compatible landscape video through 1080p", () => {
    expect(createTranscodePlan(metadata({ width: 1920, height: 1080 }))).toEqual({
      videoMode: "copy", audioMode: "copy", width: 1920, height: 1080,
      videoCodec: "h264", audioCodec: "aac",
      videoStreamIndex: 0,
    });
  });

  it("stream-copies compatible portrait video through 1080p", () => {
    expect(createTranscodePlan(metadata({ width: 1080, height: 1920 }))).toMatchObject({
      videoMode: "copy", width: 1080, height: 1920,
    });
  });

  it("never upscales a compatible lower-resolution source", () => {
    expect(createTranscodePlan(metadata({ width: 854, height: 480 }))).toMatchObject({
      videoMode: "copy", width: 854, height: 480,
    });
  });

  it("downscales landscape sources above 1080p", () => {
    expect(createTranscodePlan(metadata({ width: 3840, height: 2160 }))).toEqual({
      videoMode: "transcode", audioMode: "copy", width: 1920, height: 1080,
      videoCodec: "h264", audioCodec: "aac",
      videoStreamIndex: 0,
    });
  });

  it("downscales portrait sources above the portrait 1080p boundary", () => {
    expect(createTranscodePlan(metadata({ width: 1440, height: 2560 }))).toMatchObject({
      videoMode: "transcode", width: 1080, height: 1920,
    });
  });

  it("keeps resolution while converting incompatible codecs", () => {
    expect(createTranscodePlan(metadata({ videoCodec: "hevc", audioCodec: "opus" }))).toEqual({
      videoMode: "transcode", audioMode: "transcode", width: 1280, height: 720,
      videoCodec: "h264", audioCodec: "aac",
      videoStreamIndex: 0,
    });
  });

  it("transcodes non-browser-compatible H.264 pixel formats", () => {
    expect(createTranscodePlan(metadata({ pixelFormat: "yuv420p10le" }))).toMatchObject({
      videoMode: "transcode", width: 1280, height: 720,
    });
  });

  it("uses even dimensions when an odd-sized source must be transcoded", () => {
    expect(createTranscodePlan(metadata({ width: 853, height: 481, videoCodec: "vp9" }))).toMatchObject({
      videoMode: "transcode", width: 852, height: 480,
    });
  });

  it("preserves odd dimensions when the video can be copied", () => {
    expect(createTranscodePlan(metadata({ width: 853, height: 481 }))).toMatchObject({
      videoMode: "copy", width: 853, height: 481,
    });
  });

  it("transcodes incompatible audio without re-encoding compatible video", () => {
    expect(createTranscodePlan(metadata({ audioCodec: "ac3" }))).toMatchObject({
      videoMode: "copy", audioMode: "transcode", width: 1280, height: 720,
    });
  });

  it("copies compatible audio while re-encoding incompatible video", () => {
    expect(createTranscodePlan(metadata({ videoCodec: "hevc" }))).toMatchObject({
      videoMode: "transcode", audioMode: "copy",
    });
  });

  it("transcodes video when copied HLS segments would exceed the cadence limit", () => {
    expect(createTranscodePlan(metadata({ maxKeyframeIntervalSeconds: 20 }))).toMatchObject({
      videoMode: "transcode",
    });
  });
});
