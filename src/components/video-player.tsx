"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const LimeplayVideoPlayer = dynamic(
  () => import("@/components/video-player/player").then((module) => module.VideoPlayer),
  { loading: () => <Skeleton className="aspect-video w-full bg-neutral-900" aria-label="Loading video player" />, ssr: false },
);

export function VideoPlayer({
  source,
  poster,
  title,
  description,
}: {
  source: string;
  poster: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="player-shell">
      <LimeplayVideoPlayer
        mediaProps={{ playsInline: true, preload: "metadata" }}
        source={{ id: source, src: source, poster, title, description }}
        sourceKey={source}
        theme="dark"
      />
    </div>
  );
}
