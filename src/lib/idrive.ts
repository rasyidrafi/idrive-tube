import path from "node:path";
import { spawn } from "node:child_process";

export interface IDriveEntry {
  modifiedAt?: string;
  name: string;
  size?: number;
  type: "file" | "directory";
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

export async function runIdrive(args: string[], timeoutMs = 30 * 60 * 1000): Promise<string> {
  const executable = path.join(process.cwd(), "node_modules", ".bin", "idrive-cli");
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`idrive-cli ${timedOut ? "timed out" : `exited with ${code}`}: ${(stderr || stdout).trim()}`));
    });
  });
}
