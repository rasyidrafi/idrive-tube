import { describe, expect, it } from "vitest";

import {
  canManageVideo,
  canWatchVideo,
} from "@/lib/video-policy";

describe("video access policy", () => {
  const privateVideo = { ownerId: "owner", visibility: "private" as const };
  const sharedVideo = { ownerId: "owner", visibility: "shared" as const };

  it("allows only the owner or an admin to watch private videos", () => {
    expect(canWatchVideo(privateVideo, { userId: "owner", role: "user" })).toBe(true);
    expect(canWatchVideo(privateVideo, { userId: "other", role: "user" })).toBe(false);
    expect(canWatchVideo(privateVideo, { userId: "admin", role: "admin" })).toBe(true);
  });

  it("allows signed-in users to watch shared videos", () => {
    expect(canWatchVideo(sharedVideo, { userId: "other", role: "user" })).toBe(true);
    expect(canWatchVideo(sharedVideo, null)).toBe(false);
  });

  it("allows only owners and admins to manage a video", () => {
    expect(canManageVideo(privateVideo, { userId: "owner", role: "user" })).toBe(true);
    expect(canManageVideo(privateVideo, { userId: "other", role: "user" })).toBe(false);
  });
});
