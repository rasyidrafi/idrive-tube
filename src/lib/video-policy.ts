import type { SessionUser } from "@/lib/auth";

export type VideoVisibility = "private" | "shared";

interface VideoPolicyRecord {
  ownerId: string;
  visibility: VideoVisibility;
}

export function canWatchVideo(
  video: VideoPolicyRecord,
  user: Pick<SessionUser, "userId" | "role"> | null,
): boolean {
  if (!user) return false;
  return video.visibility === "shared" || user.role === "admin" || video.ownerId === user.userId;
}

export function canManageVideo(
  video: VideoPolicyRecord,
  user: Pick<SessionUser, "userId" | "role"> | null,
): boolean {
  return Boolean(user && (user.role === "admin" || video.ownerId === user.userId));
}
