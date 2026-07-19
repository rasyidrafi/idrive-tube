import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("video player layout", () => {
  it("keeps media contained inside the player instead of cropping it", async () => {
    const css = await readFile("src/app/globals.css", "utf8");

    expect(css).toMatch(
      /\.player-shell video\s*\{[^}]*height:\s*100%[^}]*object-fit:\s*contain[^}]*width:\s*100%/,
    );
    expect(css).not.toMatch(
      /\.player-shell video\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/,
    );
  });

  it("lets the player fill the viewport in fullscreen", async () => {
    const css = await readFile("src/app/globals.css", "utf8");

    expect(css).toMatch(
      /\[data-layout-type="root-container"\]:fullscreen\s*\{[^}]*height:\s*100(?:vh|dvh)[^}]*width:\s*100(?:vw|dvw)/,
    );
    expect(css).toMatch(
      /\[data-layout-type="root-container"\]:fullscreen\s*\{[^}]*aspect-ratio:\s*auto/,
    );
  });

  it("renders controls as an overlay rather than document flow", async () => {
    const layout = await readFile(
      "src/components/limeplay/player-layout.tsx",
      "utf8",
    );

    expect(layout).toContain(
      "pointer-events-none absolute inset-0 isolate z-20 flex flex-col",
    );
  });
});
