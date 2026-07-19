import { notFound, redirect } from "next/navigation";
import { access } from "node:fs/promises";
import path from "node:path";
import { Suspense } from "react";
import { CalendarDays, HardDrive, LockKeyhole, MonitorPlay, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PreparingVideo } from "@/components/preparing-video";
import { WatchSkeleton } from "@/components/page-skeletons";
import { VideoPlayer } from "@/components/video-player";
import { Badge } from "@/components/ui/badge";
import { currentUser } from "@/lib/session";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { findVideo } from "@/lib/videos";
import { canWatchVideo } from "@/lib/video-policy";

// Authenticated samples cannot safely embed a real session token in source or build output.
// Cache Components still prerenders this shell and streams the request-specific content.
export const unstable_instant = false;

export default function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  return <AppShell><Suspense fallback={<WatchSkeleton />}><WatchContent params={params} /></Suspense></AppShell>;
}

async function WatchContent({ params }: { params: Promise<{ videoId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  let video = await findVideo((await params).videoId);
  if (!video || !canWatchVideo(video, user)) notFound();
  await query(`update videos set last_accessed_at = now() where id = $1`, [video.id]);
  if (video.status === "ready") {
    try {
      await access(path.join(env().HLS_ROOT, video.id, "master.m3u8"));
    } catch {
      await query(`update videos set status = 'available', updated_at = now() where id = $1`, [video.id]);
      video = { ...video, status: "available" };
    }
  }
  return (
      <div className="watch-layout">
        {video.status === "ready" ? (
          <VideoPlayer description={video.description} poster={`/api/thumbnails/${video.id}`} source={`/media/${video.id}/master.m3u8`} title={video.title} />
        ) : (
          <PreparingVideo initialStatus={video.status} videoId={video.id} />
        )}
        <article className="watch-copy">
          <div className="flex flex-wrap gap-2"><Badge>{video.visibility === "private" ? <LockKeyhole /> : <Users />}{video.visibility}</Badge>{video.width && video.height ? <Badge variant="outline"><MonitorPlay /> {video.width}×{video.height}</Badge> : null}</div>
          <h1>{video.title}</h1>
          <p className="watch-description">{video.description || "No description provided."}</p>
          <div className="watch-meta"><span><CalendarDays /> {new Date(video.createdAt).toLocaleDateString()}</span><span><HardDrive /> {video.remotePath}</span></div>
        </article>
      </div>
  );
}
