import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { query } from "@/lib/db";
import { env } from "@/lib/env";

interface CacheRow {
  id: string;
  lastAccessedAt: string | null;
}

export interface CacheEntry extends CacheRow {
  protected?: boolean;
  sizeBytes: number;
}

export function selectEvictions(entries: CacheEntry[], maximumBytes: number): CacheEntry[] {
  let total = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (total <= maximumBytes) return [];
  const oldestFirst = entries.filter((entry) => !entry.protected).sort((a, b) => {
    const left = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
    const right = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
    return left - right;
  });
  const evictions: CacheEntry[] = [];
  for (const entry of oldestFirst) {
    if (total <= maximumBytes) break;
    total -= entry.sizeBytes;
    evictions.push(entry);
  }
  return evictions;
}

export async function evictCache(): Promise<number> {
  const rows = await query<CacheRow>(
    `select id, last_accessed_at as "lastAccessedAt" from videos where status = 'ready'`,
  );
  const entries: CacheEntry[] = [];
  const activeCutoff = Date.now() - 5 * 60 * 1000;
  for (const row of rows) {
    const directory = path.join(env().HLS_ROOT, row.id);
    try {
      await stat(path.join(directory, "master.m3u8"));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      const claimed = await query<{ id: string }>(
        `update videos set status = 'available', updated_at = now()
         where id = $1 and status = 'ready' returning id`,
        [row.id],
      );
      if (claimed.length > 0) await removeCachedFiles(row.id);
      continue;
    }
    entries.push({
      ...row,
      protected: Boolean(row.lastAccessedAt && new Date(row.lastAccessedAt).getTime() >= activeCutoff),
      sizeBytes: await directorySize(directory),
    });
  }
  const evictions = selectEvictions(entries, env().HLS_CACHE_MAX_BYTES);
  let evicted = 0;
  for (const entry of evictions) {
    const claimed = await query<{ id: string }>(
      `update videos set status = 'available', updated_at = now()
       where id = $1 and status = 'ready'
         and (last_accessed_at is null or last_accessed_at < $2)
       returning id`,
      [entry.id, new Date(activeCutoff)],
    );
    if (claimed.length > 0) {
      await removeCachedFiles(entry.id);
      evicted += 1;
    }
  }
  return evicted;
}

async function removeCachedFiles(videoId: string) {
  await Promise.all([
    rm(path.join(env().HLS_ROOT, videoId), { recursive: true, force: true }),
    rm(path.join(env().THUMBNAIL_ROOT, `${videoId}.jpg`), { force: true }),
  ]);
}

async function directorySize(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const sizes = await Promise.all(entries.map(async (entry) => {
      const child = path.join(directory, entry.name);
      return entry.isDirectory() ? directorySize(child) : (await stat(child)).size;
    }));
    return sizes.reduce((sum, size) => sum + size, 0);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return 0;
    throw error;
  }
}
