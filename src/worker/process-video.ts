import { chmod, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { hlsArguments } from "@/lib/ffmpeg-plan";
import { downloadIdrive } from "@/lib/idrive-client";
import { maximumKeyframeInterval } from "@/lib/keyframes";
import { parseVideoMetadata } from "@/lib/media";
import { createTranscodePlan, isVideoCopyCandidate } from "@/lib/transcode-plan";
import { runCommand } from "@/worker/command";

interface WorkerVideoRow {
  id: string;
  storedName: string;
  remotePath: string;
  remoteModifiedAt: string | null;
  sizeBytes: number;
}

interface UpdatedRow { id: string }

export async function processVideo(videoId: string, options: { signal?: AbortSignal } = {}): Promise<void> {
  const rows = await query<WorkerVideoRow>(
    `select id, stored_name as "storedName", remote_path as "remotePath",
     remote_modified_at as "remoteModifiedAt", size_bytes::float8 as "sizeBytes"
     from videos where id = $1`,
    [videoId],
  );
  const video = rows[0];
  if (!video?.remotePath) throw new Error(`Video ${videoId} does not exist in the remote catalog`);
  await query(`update videos set status = 'processing', error_message = null, updated_at = now() where id = $1`, [videoId]);

  const downloadDirectory = path.join(env().MEDIA_ROOT, video.id);
  const hlsDirectory = path.join(env().HLS_ROOT, video.id);
  const thumbnail = path.join(env().THUMBNAIL_ROOT, `${video.id}.jpg`);
  try {
    await rm(downloadDirectory, { recursive: true, force: true });
    await rm(hlsDirectory, { recursive: true, force: true });
    await mkdir(downloadDirectory, { recursive: true, mode: 0o700 });
    await mkdir(hlsDirectory, { recursive: true, mode: 0o755 });
    await mkdir(env().THUMBNAIL_ROOT, { recursive: true, mode: 0o700 });

    const source = await downloadIdrive(video.remotePath, downloadDirectory, {
      ...(options.signal ? { signal: options.signal } : {}),
      timeoutMs: 24 * 60 * 60 * 1000,
    });
    const probe = JSON.parse(await runCommand("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-show_entries", "stream=index,codec_name,codec_type,width,height,pix_fmt:stream_tags=rotate:stream_side_data=rotation:stream_disposition=attached_pic,default",
      "-of", "json", source,
    ], options.signal ? { signal: options.signal } : {}));
    let metadata = parseVideoMetadata(probe);
    if (isVideoCopyCandidate(metadata)) {
      const keyframes = await runCommand("ffprobe", [
        "-v", "error", "-select_streams", String(metadata.videoStreamIndex),
        "-skip_frame", "nokey", "-show_frames",
        "-show_entries", "frame=best_effort_timestamp_time", "-of", "default=noprint_wrappers=1:nokey=1",
        source,
      ], options.signal ? { signal: options.signal } : {});
      metadata = {
        ...metadata,
        maxKeyframeIntervalSeconds: maximumKeyframeInterval(keyframes, metadata.durationSeconds),
      };
    }
    const plan = createTranscodePlan(metadata);
    console.log(
      `Preparing ${video.id} with video=${plan.videoMode}, audio=${plan.audioMode} at ${plan.width}x${plan.height}`,
    );

    await runCommand("ffmpeg", hlsArguments(source, hlsDirectory, plan), {
      ...(options.signal ? { signal: options.signal } : {}),
      timeoutMs: 6 * 60 * 60 * 1000,
    });
    await chmod(hlsDirectory, 0o755);

    await runCommand("ffmpeg", [
      "-hide_banner", "-loglevel", "warning", "-y", "-ss", "00:00:02", "-i", source,
      "-frames:v", "1", "-vf", "scale=640:-2", thumbnail,
    ], options.signal ? { signal: options.signal } : {});

    const updated = await query<UpdatedRow>(
      `update videos set status = 'ready', duration_seconds = $2, width = $3, height = $4,
       video_codec = $5, audio_codec = $6, error_message = null, updated_at = now()
       where id = $1 and remote_modified_at is not distinct from $7 and size_bytes = $8 returning id`,
      [video.id, metadata.durationSeconds, plan.width, plan.height, plan.videoCodec, plan.audioCodec, video.remoteModifiedAt, video.sizeBytes],
    );
    if (updated.length === 0) {
      throw new Error("Remote video changed while it was being prepared; retry with the latest version");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : String(error);
    try {
      await query(
        `update videos set status = 'failed', error_message = $2, updated_at = now()
         where id = $1 and status in ('queued', 'processing')`,
        [video.id, message],
      );
    } catch (statusError) {
      console.error("Could not record video processing failure", statusError);
    }
    await settleCleanup([
      rm(hlsDirectory, { recursive: true, force: true }),
      rm(thumbnail, { force: true }),
    ]);
    throw error;
  } finally {
    await settleCleanup([
      rm(downloadDirectory, { recursive: true, force: true }),
    ]);
  }
}

async function settleCleanup(operations: Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(operations);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Could not clean up video processing artifact", result.reason);
    }
  }
}
