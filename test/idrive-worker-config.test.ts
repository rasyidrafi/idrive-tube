import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("IDrive worker configuration", () => {
  it("stages the host profile with worker ownership before starting", async () => {
    const compose = await readFile("docker-compose.yml", "utf8");

    expect(compose).toContain("/idrive-host-config:ro");
    expect(compose).not.toContain("${HOME}/.config/idrive-cli:/root/.config/idrive-cli:ro");
    expect(compose).toContain("IDRIVE_WORKER_TEMP_DIR: /tmp/idrive-cli");
    expect(compose).toContain("stop_grace_period: 30s");
    expect(compose).toContain("${HOME}/.local/share/idrive-cli:/root/.local/share/idrive-cli:ro");
    expect(compose).toMatch(/install -m 600 .*config\.json .*\/root\/\.config\/idrive-cli\/config\.json/);
  });
});
