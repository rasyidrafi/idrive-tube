import { describe, expect, it } from "vitest";

import { timelineValueToTime } from "@/components/limeplay/timeline-control";
import { normalizeVolumeValue } from "@/components/limeplay/volume-control";

describe("Limeplay keyboard slider values", () => {
  it("maps controlled timeline values to VOD and live seek positions", () => {
    expect(timelineValueToTime(25, 120, false, { start: 0, end: 120 })).toBe(30);
    expect(timelineValueToTime(50, 300, true, { start: 100, end: 160 })).toBe(130);
  });

  it("clamps keyboard volume changes to the native media range", () => {
    expect(normalizeVolumeValue(-0.25)).toBe(0);
    expect(normalizeVolumeValue(0.65)).toBe(0.65);
    expect(normalizeVolumeValue(1.25)).toBe(1);
  });
});
