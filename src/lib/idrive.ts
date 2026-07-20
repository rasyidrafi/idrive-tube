import path from "node:path";

export interface IDriveEntry {
  modifiedAt?: string;
  name: string;
  size?: number;
  type: "directory" | "file";
}

export interface CatalogVideoEntry {
  modifiedAt: string | null;
  name: string;
  size: number;
  type: "file";
}

const videoExtensions = new Set([".mp4", ".m4v", ".mov", ".mkv", ".webm"]);

export function videoEntries(entries: IDriveEntry[]): CatalogVideoEntry[] {
  return entries.flatMap((entry) => {
    if (
      entry.type !== "file" ||
      !videoExtensions.has(path.extname(entry.name).toLowerCase()) ||
      typeof entry.size !== "number" ||
      !Number.isFinite(entry.size) ||
      entry.size < 0
    ) {
      return [];
    }
    return [{ ...entry, modifiedAt: entry.modifiedAt ?? null, size: entry.size, type: "file" as const }];
  });
}

export function remoteFilePath(directory: string, name: string): string {
  const root = normalizeRemoteDirectory(directory);
  if (path.basename(name) !== name || name.includes("\\")) throw new Error("Invalid remote filename");
  return root === "/" ? `/${name}` : `${root}/${name}`;
}

export function normalizeRemoteDirectory(directory: string): string {
  const normalized = directory.split("/").filter(Boolean).join("/");
  return normalized ? `/${normalized}` : "/";
}

export function remoteDirectoryPrefix(directory: string): string {
  const normalized = normalizeRemoteDirectory(directory);
  return normalized === "/" ? "/" : `${normalized}/`;
}
