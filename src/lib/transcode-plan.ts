import type { VideoMetadata } from "@/lib/media";

export interface TranscodePlan {
  videoMode: "copy" | "transcode";
  audioMode: "copy" | "transcode" | "none";
  width: number;
  height: number;
  videoCodec: "h264";
  audioCodec: "aac" | "none";
  videoStreamIndex: number;
}

export const MAX_COPY_KEYFRAME_INTERVAL_SECONDS = 12;

export function createTranscodePlan(metadata: VideoMetadata): TranscodePlan {
  const target = fitWithin1080(metadata.width, metadata.height);
  const videoMode =
    metadata.videoCodec === "h264" &&
    metadata.pixelFormat === "yuv420p" &&
    target.width === metadata.width &&
    target.height === metadata.height &&
    typeof metadata.maxKeyframeIntervalSeconds === "number" &&
    metadata.maxKeyframeIntervalSeconds <= MAX_COPY_KEYFRAME_INTERVAL_SECONDS
      ? "copy"
      : "transcode";
  const output = videoMode === "copy" ? target : evenDimensions(target);
  const audioMode = metadata.audioCodec === "none"
    ? "none"
    : metadata.audioCodec === "aac"
      ? "copy"
      : "transcode";

  return {
    videoMode,
    audioMode,
    width: output.width,
    height: output.height,
    videoCodec: "h264",
    audioCodec: metadata.audioCodec === "none" ? "none" : "aac",
    videoStreamIndex: metadata.videoStreamIndex,
  };
}

export function isVideoCopyCandidate(metadata: VideoMetadata): boolean {
  const target = fitWithin1080(metadata.width, metadata.height);
  return metadata.videoCodec === "h264" &&
    metadata.pixelFormat === "yuv420p" &&
    target.width === metadata.width &&
    target.height === metadata.height;
}

export function fitWithin1080(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Video dimensions must be positive numbers");
  }
  const landscape = width >= height;
  const maximumWidth = landscape ? 1920 : 1080;
  const maximumHeight = landscape ? 1080 : 1920;
  const scale = Math.min(1, maximumWidth / width, maximumHeight / height);
  if (scale === 1) return { width, height };
  return {
    width: Math.max(2, Math.floor((width * scale) / 2) * 2),
    height: Math.max(2, Math.floor((height * scale) / 2) * 2),
  };
}

function evenDimensions(dimensions: { width: number; height: number }): { width: number; height: number } {
  const width = Math.floor(dimensions.width / 2) * 2;
  const height = Math.floor(dimensions.height / 2) * 2;
  if (width < 2 || height < 2) throw new Error("Video is too small to transcode");
  return { width, height };
}
