import { describe, expect, it } from "vitest";

import { isVideoId } from "@/lib/videos";

describe("video identifiers", () => {
  it("accepts UUIDs and rejects arbitrary route strings", () => {
    expect(isVideoId("64d7e193-2fe9-4f27-9a27-c602a4b38e85")).toBe(true);
    expect(isVideoId("foo")).toBe(false);
    expect(isVideoId("../../etc/passwd")).toBe(false);
  });
});
