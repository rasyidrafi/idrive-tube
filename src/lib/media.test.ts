import { describe, expect, it } from "vitest";

import { buildHlsRelativePath, parseVideoMetadata } from "@/lib/media";

describe("media helpers", () => {
  it("builds a traversal-safe HLS path", () => {
    expect(buildHlsRelativePath("video-1", "master.m3u8")).toBe(
      "video-1/master.m3u8",
    );
    expect(() => buildHlsRelativePath("../video", "master.m3u8")).toThrow();
    expect(() => buildHlsRelativePath("video-1", "../secret")).toThrow();
  });

  it("extracts duration and dimensions from ffprobe output", () => {
    expect(
      parseVideoMetadata({
        format: { duration: "42.25" },
        streams: [
          { codec_type: "audio", codec_name: "aac" },
          { codec_type: "video", codec_name: "h264", width: 1280, height: 720, pix_fmt: "yuv420p" },
        ],
      }),
    ).toEqual({
      durationSeconds: 42.25,
      width: 1280,
      height: 720,
      videoCodec: "h264",
      audioCodec: "aac",
      pixelFormat: "yuv420p",
      rotation: 0,
      videoStreamIndex: 1,
    });
  });

  it("reports display dimensions for a rotated video", () => {
    expect(
      parseVideoMetadata({
        format: { duration: "10" },
        streams: [{
          index: 0,
          codec_type: "video",
          codec_name: "h264",
          width: 1920,
          height: 1080,
          pix_fmt: "yuv420p",
          side_data_list: [{ rotation: -90 }],
        }],
      }),
    ).toMatchObject({ width: 1080, height: 1920, rotation: 270 });
  });

  it("selects the default movie stream instead of attached cover art", () => {
    expect(parseVideoMetadata({
      format: { duration: "15" },
      streams: [
        {
          index: 0, codec_type: "video", codec_name: "mjpeg", width: 600, height: 600,
          pix_fmt: "yuvj420p", disposition: { attached_pic: 1, default: 0 },
        },
        {
          index: 2, codec_type: "video", codec_name: "h264", width: 1280, height: 720,
          pix_fmt: "yuv420p", disposition: { attached_pic: 0, default: 1 },
        },
      ],
    })).toMatchObject({
      videoStreamIndex: 2, videoCodec: "h264", width: 1280, height: 720,
    });
  });
});
