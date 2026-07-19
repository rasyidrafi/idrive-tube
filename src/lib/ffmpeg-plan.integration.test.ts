import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hlsArguments } from "@/lib/ffmpeg-plan";
import { maximumKeyframeInterval } from "@/lib/keyframes";
import { parseVideoMetadata, type VideoMetadata } from "@/lib/media";
import { createTranscodePlan } from "@/lib/transcode-plan";

const run = promisify(execFile);
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "idrive-tube-ffmpeg-"));
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("FFmpeg preparation integration", () => {
  it("transcodes odd dimensions to a valid even-sized HLS stream", async () => {
    const source = path.join(directory, "odd.mkv");
    const output = path.join(directory, "odd-hls");
    await mkdir(output, { recursive: true });
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc=size=853x481:rate=5", "-t", "1",
      "-c:v", "ffv1", "-an", source,
    ]);
    const metadata = await probeMetadata(source);
    const plan = createTranscodePlan(metadata);
    expect(plan).toMatchObject({ videoMode: "transcode", width: 852, height: 480 });
    await packageHls(source, output, plan);
    expect(await probeMetadata(path.join(output, "master.m3u8"))).toMatchObject({ width: 852, height: 480 });
  }, 30_000);

  it("uses display rotation when transcoding portrait video", async () => {
    const base = path.join(directory, "rotation-base.mp4");
    const source = path.join(directory, "rotated.mp4");
    const copyOutput = path.join(directory, "rotated-copy-hls");
    const transcodeOutput = path.join(directory, "rotated-transcode-hls");
    await mkdir(copyOutput, { recursive: true });
    await mkdir(transcodeOutput, { recursive: true });
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=12", "-t", "1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", base,
    ]);
    await ffmpeg(["-display_rotation", "90", "-i", base, "-c", "copy", source]);
    const metadata = await probeMetadata(source);
    expect(metadata).toMatchObject({ width: 180, height: 320, rotation: 90 });
    const copyPlan = createTranscodePlan({ ...metadata, maxKeyframeIntervalSeconds: 1 });
    await packageHls(source, copyOutput, copyPlan);
    expect(await probeMetadata(path.join(copyOutput, "master.m3u8"))).toMatchObject({
      width: 180, height: 320, rotation: 90,
    });
    const plan = createTranscodePlan({ ...metadata, videoCodec: "hevc" });
    await packageHls(source, transcodeOutput, plan);
    expect(await probeMetadata(path.join(transcodeOutput, "master.m3u8"))).toMatchObject({
      width: 180, height: 320, rotation: 0,
    });
  }, 30_000);

  it("copies compatible video while converting AC3 audio to AAC", async () => {
    const source = path.join(directory, "mixed-codecs.mkv");
    const output = path.join(directory, "mixed-codecs-hls");
    await mkdir(output, { recursive: true });
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=12",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=5.1:sample_rate=48000", "-t", "1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "ac3", source,
    ]);
    const metadata = await probeMetadata(source);
    const plan = createTranscodePlan({ ...metadata, maxKeyframeIntervalSeconds: 1 });
    expect(plan).toMatchObject({ videoMode: "copy", audioMode: "transcode" });
    await packageHls(source, output, plan);
    expect(await probeMetadata(path.join(output, "master.m3u8"))).toMatchObject({
      videoCodec: "h264", audioCodec: "aac", width: 320, height: 180,
    });
  }, 30_000);

  it("packages the movie stream instead of an attached cover image", async () => {
    const movie = path.join(directory, "cover-movie.mp4");
    const cover = path.join(directory, "cover.jpg");
    const source = path.join(directory, "cover-first.mp4");
    const output = path.join(directory, "cover-first-hls");
    await mkdir(output, { recursive: true });
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=12", "-t", "1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", movie,
    ]);
    await ffmpeg(["-f", "lavfi", "-i", "color=size=600x600:color=navy", "-frames:v", "1", cover]);
    await ffmpeg([
      "-i", cover, "-i", movie, "-map", "0:v:0", "-map", "1:v:0", "-c", "copy",
      "-disposition:v:0", "attached_pic", "-disposition:v:1", "default", source,
    ]);
    const metadata = await probeMetadata(source);
    expect(metadata).toMatchObject({
      videoCodec: "h264", width: 320, height: 180,
    });
    const { stdout: streamJson } = await run("ffprobe", [
      "-v", "error", "-show_entries", "stream=index,codec_name:stream_disposition=attached_pic",
      "-of", "json", source,
    ]);
    expect(JSON.parse(streamJson).streams).toContainEqual(expect.objectContaining({
      disposition: expect.objectContaining({ attached_pic: 1 }),
    }));
    const cadence = await probeMaximumKeyframeInterval(source, metadata);
    const plan = createTranscodePlan({ ...metadata, maxKeyframeIntervalSeconds: cadence });
    expect(plan.videoMode).toBe("copy");
    await packageHls(source, output, plan);
    expect(await probeMetadata(path.join(output, "master.m3u8"))).toMatchObject({
      videoCodec: "h264", width: 320, height: 180,
    });
  }, 30_000);

  it("rejects sparse-GOP copy and creates bounded HLS segments", async () => {
    const source = path.join(directory, "long-gop.mp4");
    const output = path.join(directory, "long-gop-hls");
    await mkdir(output, { recursive: true });
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=10", "-t", "13",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-g", "500", "-keyint_min", "500",
      "-sc_threshold", "0", "-an", source,
    ]);
    const metadata = await probeMetadata(source);
    const plan = createTranscodePlan({
      ...metadata,
      maxKeyframeIntervalSeconds: await probeMaximumKeyframeInterval(source, metadata),
    });
    expect(plan.videoMode).toBe("transcode");
    await packageHls(source, output, plan);
    const playlist = await readFile(path.join(output, "master.m3u8"), "utf8");
    const durations = [...playlist.matchAll(/#EXTINF:([0-9.]+)/g)].map((match) => Number(match[1]));
    expect(Math.max(...durations)).toBeLessThanOrEqual(6.1);
  }, 30_000);
});

async function ffmpeg(args: string[]) {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
}

async function probeMetadata(source: string): Promise<VideoMetadata> {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-show_entries", "stream=index,codec_name,codec_type,width,height,pix_fmt:stream_tags=rotate:stream_side_data=rotation:stream_disposition=attached_pic,default",
    "-of", "json", source,
  ]);
  return parseVideoMetadata(JSON.parse(stdout));
}

async function packageHls(source: string, output: string, plan: ReturnType<typeof createTranscodePlan>) {
  await run("ffmpeg", hlsArguments(source, output, plan));
}

async function probeMaximumKeyframeInterval(source: string, metadata: VideoMetadata): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", String(metadata.videoStreamIndex),
    "-skip_frame", "nokey", "-show_frames",
    "-show_entries", "frame=best_effort_timestamp_time", "-of", "default=noprint_wrappers=1:nokey=1",
    source,
  ]);
  return maximumKeyframeInterval(stdout, metadata.durationSeconds);
}
