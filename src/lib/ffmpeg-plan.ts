import path from "node:path";

import type { TranscodePlan } from "@/lib/transcode-plan";

export function encodingArguments(plan: TranscodePlan): string[] {
  const video = plan.videoMode === "copy"
    ? ["-c:v", "copy"]
    : [
        "-vf", `scale=${plan.width}:${plan.height}`,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
        "-force_key_frames", "expr:gte(t,n_forced*6)", "-metadata:s:v:0", "rotate=0",
      ];
  const audio = plan.audioMode === "copy"
    ? ["-c:a", "copy"]
    : plan.audioMode === "transcode"
      ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"]
      : [];
  return [...video, ...audio];
}

export function hlsArguments(source: string, outputDirectory: string, plan: TranscodePlan): string[] {
  return [
    "-hide_banner", "-loglevel", "warning", "-y", "-autorotate", "1", "-i", source,
    "-map", `0:${plan.videoStreamIndex}`, "-map", "0:a:0?",
    ...encodingArguments(plan),
    "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_segment_type", "fmp4",
    "-hls_fmp4_init_filename", "init.mp4",
    "-hls_segment_filename", path.join(outputDirectory, "segment-%05d.m4s"),
    path.join(outputDirectory, "master.m3u8"),
  ];
}
