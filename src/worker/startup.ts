import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

export async function clearDirectoryContents(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const entries = await readdir(directory);
  await Promise.all(entries.map((entry) =>
    rm(path.join(directory, entry), { recursive: true, force: true }),
  ));
}
