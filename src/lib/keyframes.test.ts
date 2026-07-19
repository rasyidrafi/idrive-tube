import { describe, expect, it } from "vitest";

import { maximumKeyframeInterval } from "@/lib/keyframes";

describe("keyframe cadence", () => {
  it("includes the opening and closing segment intervals", () => {
    expect(maximumKeyframeInterval("0\n5.9\n11.8\n", 14)).toBeCloseTo(5.9);
  });

  it("rejects missing keyframe data", () => {
    expect(maximumKeyframeInterval("", 60)).toBe(Number.POSITIVE_INFINITY);
  });
});
