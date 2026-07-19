import { describe, expect, it } from "vitest";

import { createSessionToken, verifySessionToken } from "@/lib/auth";

const secret = "a-test-secret-that-is-at-least-32-characters";

describe("session tokens", () => {
  it("round-trips an authenticated user", async () => {
    const token = await createSessionToken(
      { userId: "user-1", email: "owner@example.com", role: "admin" },
      secret,
    );

    await expect(verifySessionToken(token, secret)).resolves.toMatchObject({
      userId: "user-1",
      email: "owner@example.com",
      role: "admin",
    });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(
      { userId: "user-1", email: "owner@example.com", role: "admin" },
      secret,
    );

    await expect(
      verifySessionToken(token, "another-secret-that-is-at-least-32-chars"),
    ).resolves.toBeNull();
  });
});
