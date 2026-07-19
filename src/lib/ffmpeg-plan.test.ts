import { describe, expect, it } from "vitest";

import { encodingArguments, hlsArguments } from "@/lib/ffmpeg-plan";

describe("FFmpeg encoding arguments", () => {
  it("copies video while converting only incompatible audio", () => {
    expect(encodingArguments({
      videoMode: "copy", audioMode: "transcode", width: 1280, height: 720,
      videoCodec: "h264", audioCodec: "aac", videoStreamIndex: 0,
    })).toEqual([
      "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    ]);
  });

  it("forces six-second keyframes only when video is transcoded", () => {
    const args = encodingArguments({
      videoMode: "transcode", audioMode: "copy", width: 1920, height: 1080,
      videoCodec: "h264", audioCodec: "aac", videoStreamIndex: 0,
    });
    expect(args).toContain("expr:gte(t,n_forced*6)");
    expect(args).toContain("scale=1920:1080");
    expect(args.slice(-2)).toEqual(["-c:a", "copy"]);
  });

  it("builds the worker HLS command with autorotation and isolated output paths", () => {
    const args = hlsArguments("/input/video.mp4", "/cache/video-id", {
      videoMode: "copy", audioMode: "copy", width: 1280, height: 720,
      videoCodec: "h264", audioCodec: "aac", videoStreamIndex: 2,
    });
    expect(args).toContain("/input/video.mp4");
    expect(args).toContain("0:2");
    expect(args).toContain("/cache/video-id/segment-%05d.m4s");
    expect(args.at(-1)).toBe("/cache/video-id/master.m3u8");
    expect(args.slice(3, 7)).toEqual(["-y", "-autorotate", "1", "-i"]);
  });
});
