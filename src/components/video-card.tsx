import Link from "next/link";
import { Cloud, LoaderCircle, LockKeyhole, TriangleAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { VideoRecord } from "@/lib/videos";

export function VideoCard({ video }: { video: VideoRecord }) {
  return (
    <Link className="video-card group" href={`/watch/${video.id}`}>
      <div className="thumbnail-frame">
        {video.status === "ready" ? <>
          {/* Authenticated thumbnails are intentionally served by the application. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" loading="lazy" src={`/api/thumbnails/${video.id}`} />
          <span className="duration">{formatDuration(video.durationSeconds ?? 0)}</span>
        </> : <div className="remote-placeholder"><Cloud /><span>{statusLabel(video.status)}</span></div>}
        <div className="play-mark"><span /></div>
      </div>
      <div className="video-card-copy">
        <h2>{video.title}</h2>
        <div>
          <span>{video.ownerEmail.split("@")[0]}</span>
          <Badge variant="outline">
            {video.status === "failed" ? <TriangleAlert /> : video.status === "processing" || video.status === "queued" ? <LoaderCircle /> : video.visibility === "private" ? <LockKeyhole /> : <Users />}
            {video.status === "ready" ? video.visibility : statusLabel(video.status)}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

function statusLabel(status: VideoRecord["status"]) {
  if (status === "available") return "On IDrive";
  if (status === "queued") return "Queued";
  if (status === "processing") return "Preparing";
  if (status === "failed") return "Retry needed";
  return "Ready";
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`
    : `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
