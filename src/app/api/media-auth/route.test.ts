import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), findVideo: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/videos", () => ({ findVideo: mocks.findVideo }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { GET } from "@/app/api/media-auth/route";

describe("media authorization route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies unauthenticated access to ready media", async () => {
    mocks.currentUser.mockResolvedValue(null);
    mocks.findVideo.mockResolvedValue({ ownerId: "owner", visibility: "private", status: "ready" });
    expect((await GET(new Request("http://app/api/media-auth?videoId=one"))).status).toBe(403);
  });

  it("allows the owner to retrieve ready media", async () => {
    mocks.currentUser.mockResolvedValue({ userId: "owner", role: "user" });
    mocks.findVideo.mockResolvedValue({ ownerId: "owner", visibility: "private", status: "ready" });
    mocks.query.mockResolvedValue([{ id: "one" }]);
    expect((await GET(new Request("http://app/api/media-auth?videoId=one"))).status).toBe(204);
  });

  it("denies a segment when eviction wins the ready-state lease race", async () => {
    mocks.currentUser.mockResolvedValue({ userId: "owner", role: "user" });
    mocks.findVideo.mockResolvedValue({ id: "one", ownerId: "owner", visibility: "private", status: "ready" });
    mocks.query.mockResolvedValue([]);
    expect((await GET(new Request("http://app/api/media-auth?videoId=one"))).status).toBe(403);
  });

  it("denies media that is not ready", async () => {
    mocks.currentUser.mockResolvedValue({ userId: "owner", role: "user" });
    mocks.findVideo.mockResolvedValue({ ownerId: "owner", visibility: "private", status: "processing" });
    expect((await GET(new Request("http://app/api/media-auth?videoId=one"))).status).toBe(403);
  });
});
