import path from "node:path";
import { rm } from "node:fs/promises";

import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { listIdrive } from "@/lib/idrive-client";
import { normalizeRemoteDirectory, remoteDirectoryPrefix, remoteFilePath, videoEntries } from "@/lib/idrive";

interface AdminRow { id: string }
interface ExistingRow {
  id: string;
  remoteModifiedAt: string | null;
  sizeBytes: number;
  status: string;
}
interface RemovedRow { id: string }

export async function syncCatalog(signal?: AbortSignal): Promise<number> {
  const folder = normalizeRemoteDirectory(env().IDRIVE_VIDEO_FOLDER);
  const entries = videoEntries(await listIdrive(folder, signal ? { signal } : {}));
  signal?.throwIfAborted();
  const admins = await query<AdminRow>(`select id from users where role = 'admin' order by created_at limit 1`);
  const ownerId = admins[0]?.id;
  if (!ownerId) throw new Error("Catalog sync requires a bootstrap administrator");
  const scanStartedAt = new Date();

  for (const entry of entries) {
    signal?.throwIfAborted();
    const remotePath = remoteFilePath(folder, entry.name);
    const title = path.basename(entry.name, path.extname(entry.name)).replace(/[-_]+/g, " ").trim() || entry.name;
    const existing = (await query<ExistingRow>(
      `select id, remote_modified_at as "remoteModifiedAt", size_bytes::float8 as "sizeBytes", status
       from videos where remote_path = $1`,
      [remotePath],
    ))[0];
    await query(
      `insert into videos(owner_id, title, description, original_name, stored_name, visibility, status,
        size_bytes, archive_path, remote_path, remote_modified_at, last_seen_at)
       values ($1, $2, '', $3, $3, 'private', 'available', $4, $5, $5, $6, $7)
       on conflict(remote_path) where remote_path is not null do update set
         original_name = excluded.original_name,
         stored_name = excluded.stored_name,
         size_bytes = excluded.size_bytes,
         remote_modified_at = excluded.remote_modified_at,
         last_seen_at = excluded.last_seen_at,
         status = case
           when videos.remote_modified_at is distinct from excluded.remote_modified_at
             or videos.size_bytes is distinct from excluded.size_bytes then 'available'
           else videos.status
         end,
         updated_at = now()`,
      [ownerId, title, entry.name, entry.size, remotePath, entry.modifiedAt, scanStartedAt],
    );
    if (existing && (
      existing.remoteModifiedAt !== entry.modifiedAt ||
      existing.sizeBytes !== entry.size ||
      existing.status === "available" ||
      existing.status === "failed"
    )) {
      await removeCachedMedia(existing.id);
    }
  }

  signal?.throwIfAborted();
  const removed = await query<RemovedRow>(
    `select id from videos where remote_path is not null and
      (left(remote_path, length($1)) <> $1 or last_seen_at is null or last_seen_at < $2)
     order by id`,
    [remoteDirectoryPrefix(folder), scanStartedAt],
  );
  for (const video of removed) {
    signal?.throwIfAborted();
    await removeCachedMedia(video.id);
  }
  if (removed.length > 0) {
    signal?.throwIfAborted();
    await query(`delete from videos where id = any($1::uuid[])`, [removed.map((video) => video.id)]);
  }
  return entries.length;
}

async function removeCachedMedia(videoId: string) {
  await Promise.all([
    rm(path.join(env().HLS_ROOT, videoId), { recursive: true, force: true }),
    rm(path.join(env().THUMBNAIL_ROOT, `${videoId}.jpg`), { force: true }),
  ]);
}
