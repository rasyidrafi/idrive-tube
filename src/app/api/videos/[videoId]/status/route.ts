import { NextResponse } from "next/server";

import { currentUser } from "@/lib/session";
import { findVideo } from "@/lib/videos";
import { canWatchVideo } from "@/lib/video-policy";

export async function GET(_request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  const [user, video] = await Promise.all([currentUser(), findVideo(videoId)]);
  if (!video || !canWatchVideo(video, user)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status: video.status, error: video.errorMessage });
}
