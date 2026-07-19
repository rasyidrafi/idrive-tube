import { describe, expect, it } from "vitest";

import { selectEvictions } from "@/worker/cache-eviction";

describe("HLS cache eviction", () => {
  it("evicts least recently accessed entries until under the limit", () => {
    const entries = [
      { id: "new", lastAccessedAt: "2026-07-19T12:00:00Z", sizeBytes: 40 },
      { id: "old", lastAccessedAt: "2026-07-17T12:00:00Z", sizeBytes: 35 },
      { id: "never", lastAccessedAt: null, sizeBytes: 30 },
    ];
    expect(selectEvictions(entries, 70).map((entry) => entry.id)).toEqual(["never", "old"]);
  });

  it("does nothing while the cache is within its budget", () => {
    expect(selectEvictions([{ id: "one", lastAccessedAt: null, sizeBytes: 20 }], 20)).toEqual([]);
  });

  it("never evicts an active playback lease", () => {
    const entries = [
      { id: "active", lastAccessedAt: "2026-07-19T12:00:00Z", sizeBytes: 90, protected: true },
      { id: "old", lastAccessedAt: "2026-07-18T12:00:00Z", sizeBytes: 20 },
    ];
    expect(selectEvictions(entries, 10).map((entry) => entry.id)).toEqual(["old"]);
  });
});
