import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Nginx media gateway configuration", () => {
  it("protects every HLS file and forbids private browser caching", async () => {
    const config = await readFile(path.join(process.cwd(), "nginx/default.conf"), "utf8");
    const mediaLocation = config.match(/location ~ "\^\/media[\s\S]*?\n  }/)?.[0] ?? "";
    expect(mediaLocation).toContain("auth_request /_media_auth");
    expect(mediaLocation).toContain('Cache-Control "no-store"');
  });

  it("does not contain a browser upload endpoint", async () => {
    const config = await readFile(path.join(process.cwd(), "nginx/default.conf"), "utf8");
    expect(config).not.toContain("client_max_body_size");
    expect(config).not.toMatch(/location \/api\/videos\s*\{/);
  });
});
