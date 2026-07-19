import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { clearDirectoryContents } from "@/worker/startup";

describe("worker startup cleanup", () => {
  it("clears children without removing the mounted root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "idrive-tube-startup-"));
    try {
      await mkdir(path.join(root, "partial"));
      await writeFile(path.join(root, "partial", "video.tmp"), "partial");
      await clearDirectoryContents(root);
      await expect(readdir(root)).resolves.toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
