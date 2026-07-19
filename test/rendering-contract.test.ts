import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Next.js rendering contract", () => {
  it("enables Cache Components and instant route validation", async () => {
    const [config, home, watch] = await Promise.all([
      readFile("next.config.ts", "utf8"),
      readFile("src/app/page.tsx", "utf8"),
      readFile("src/app/watch/[videoId]/page.tsx", "utf8"),
    ]);
    expect(config).toContain("cacheComponents: true");
    expect(home).toContain("unstable_instant");
    expect(watch).toContain("unstable_instant");
    expect(home).toContain("<Suspense");
    expect(watch).toContain("<Suspense");
  });

  it("uses Limeplay and route-level Shadcn skeletons", async () => {
    const [player, homeLoading, watchLoading, skeletons] = await Promise.all([
      readFile("src/components/video-player.tsx", "utf8"),
      readFile("src/app/loading.tsx", "utf8"),
      readFile("src/app/watch/[videoId]/loading.tsx", "utf8"),
      readFile("src/components/page-skeletons.tsx", "utf8"),
    ]);
    expect(player).toContain("components/video-player/player");
    expect(homeLoading).toContain("HomeLoading");
    expect(watchLoading).toContain("WatchLoading");
    expect(skeletons).toContain("Skeleton");
  });

  it("keeps keyboard controls and theme selection wired", async () => {
    const [timeline, volume, theme] = await Promise.all([
      readFile("src/components/limeplay/timeline-control.tsx", "utf8"),
      readFile("src/components/limeplay/volume-control.tsx", "utf8"),
      readFile("src/components/theme-toggle.tsx", "utf8"),
    ]);
    expect(timeline).toContain("onValueChange={handleValueChange}");
    expect(volume).toContain("onValueChange={handleValueChange}");
    expect(theme).toContain("DropdownMenuRadioGroup");
  });
});
