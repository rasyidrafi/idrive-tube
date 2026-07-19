import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { VIDEO_JOB, videoQueue } from "@/lib/queue";
import { currentUser } from "@/lib/session";
import { findVideo } from "@/lib/videos";
import { canWatchVideo } from "@/lib/video-policy";

interface UpdatedRow { id: string }

export async function POST(_request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  const [user, video] = await Promise.all([currentUser(), findVideo(videoId)]);
  if (!video || !canWatchVideo(video, user)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video.status === "ready") return NextResponse.json({ status: "ready" });

  const updated = await query<UpdatedRow>(
    `update videos set status = 'queued', error_message = null, updated_at = now()
     where id = $1 and status in ('available', 'failed') returning id`,
    [videoId],
  );
  if (updated.length > 0) {
    try {
      await videoQueue().add(VIDEO_JOB, { videoId }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    } catch (error) {
      await query(`update videos set status = 'failed', error_message = $2 where id = $1`, [
        videoId,
        error instanceof Error ? error.message : "Could not queue video",
      ]);
      throw error;
    }
  }
  return NextResponse.json({ status: updated.length > 0 ? "queued" : video.status });
}
