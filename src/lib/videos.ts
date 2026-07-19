import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { remoteDirectoryPrefix } from "@/lib/idrive";
import type { VideoVisibility } from "@/lib/video-policy";

export type VideoStatus = "available" | "queued" | "processing" | "ready" | "failed";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVideoId(value: string): boolean {
  return uuidPattern.test(value);
}

export interface VideoRecord {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  description: string;
  originalName: string;
  visibility: VideoVisibility;
  status: VideoStatus;
  errorMessage: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  archivePath: string | null;
  remotePath: string;
  createdAt: string;
}

const selectVideo = `
  select v.id, v.owner_id as "ownerId", u.email as "ownerEmail", v.title,
    v.description, v.original_name as "originalName", v.visibility, v.status,
    v.error_message as "errorMessage", v.duration_seconds as "durationSeconds",
    v.width, v.height, v.size_bytes::float8 as "sizeBytes", v.archive_path as "archivePath",
    v.remote_path as "remotePath",
    v.created_at as "createdAt"
  from videos v join users u on u.id = v.owner_id`;

export async function listVideosForUser(userId: string, isAdmin: boolean): Promise<VideoRecord[]> {
  const folderPrefix = remoteDirectoryPrefix(env().IDRIVE_VIDEO_FOLDER);
  return query<VideoRecord>(
    `${selectVideo} where left(v.remote_path, length($3)) = $3 and (v.visibility = 'shared' or v.owner_id = $1 or $2) order by v.original_name`,
    [userId, isAdmin, folderPrefix],
  );
}

export async function findVideo(id: string): Promise<VideoRecord | null> {
  if (!isVideoId(id)) return null;
  const folderPrefix = remoteDirectoryPrefix(env().IDRIVE_VIDEO_FOLDER);
  const rows = await query<VideoRecord>(
    `${selectVideo} where v.id = $1 and left(v.remote_path, length($2)) = $2`,
    [id, folderPrefix],
  );
  return rows[0] ?? null;
}
