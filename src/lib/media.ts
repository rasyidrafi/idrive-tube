interface ProbeStream {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  tags?: { rotate?: string };
  side_data_list?: Array<{ rotation?: number }>;
  disposition?: { attached_pic?: number; default?: number };
}

interface ProbeOutput {
  format?: { duration?: string };
  streams?: ProbeStream[];
}

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
  pixelFormat: string;
  rotation: 0 | 90 | 180 | 270;
  videoStreamIndex: number;
  maxKeyframeIntervalSeconds?: number;
}

const safePart = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function buildHlsRelativePath(videoId: string, fileName: string): string {
  if (!safePart.test(videoId) || !safePart.test(fileName)) {
    throw new Error("Invalid media path");
  }
  return `${videoId}/${fileName}`;
}

export function parseVideoMetadata(output: ProbeOutput): VideoMetadata {
  const videoStreams = (output.streams ?? [])
    .map((stream, position) => ({ stream, index: stream.index ?? position }))
    .filter(({ stream }) => stream.codec_type === "video" && stream.disposition?.attached_pic !== 1);
  const selectedVideo = videoStreams.find(({ stream }) => stream.disposition?.default === 1) ?? videoStreams[0];
  const video = selectedVideo?.stream;
  const audio = output.streams?.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number(output.format?.duration);
  if (!selectedVideo || !video || !Number.isFinite(durationSeconds) || !video.width || !video.height) {
    throw new Error("ffprobe did not return valid video metadata");
  }
  const rotation = normalizeRotation(
    video.side_data_list?.find((sideData) => Number.isFinite(sideData.rotation))?.rotation ??
      Number(video.tags?.rotate ?? 0),
  );
  const swapsDimensions = rotation === 90 || rotation === 270;
  return {
    durationSeconds,
    width: swapsDimensions ? video.height : video.width,
    height: swapsDimensions ? video.width : video.height,
    videoCodec: video.codec_name ?? "unknown",
    audioCodec: audio?.codec_name ?? "none",
    pixelFormat: video.pix_fmt ?? "unknown",
    rotation,
    videoStreamIndex: selectedVideo.index,
  };
}

function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  if (!Number.isFinite(rotation)) return 0;
  const normalized = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
  return normalized as 0 | 90 | 180 | 270;
}
