import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { findVideo } from "@/lib/videos";
import { canWatchVideo } from "@/lib/video-policy";

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId");
  const user = await currentUser();
  const video = videoId ? await findVideo(videoId) : null;
  if (!video || video.status !== "ready" || !canWatchVideo(video, user)) {
    return new NextResponse(null, { status: 403 });
  }
  const lease = await query<{ id: string }>(
    `update videos set last_accessed_at = now()
     where id = $1 and status = 'ready' returning id`,
    [video.id],
  );
  if (lease.length === 0) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204 });
}
