import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { currentUser } from "@/lib/session";
import { findVideo } from "@/lib/videos";
import { canWatchVideo } from "@/lib/video-policy";

export async function GET(_request: Request, context: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await context.params;
  const [user, video] = await Promise.all([currentUser(), findVideo(videoId)]);
  if (!video || !canWatchVideo(video, user)) return new NextResponse(null, { status: 403 });
  try {
    const image = await readFile(path.join(env().THUMBNAIL_ROOT, `${videoId}.jpg`));
    return new NextResponse(image, {
      headers: { "content-type": "image/jpeg", "cache-control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
