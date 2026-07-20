import { describe, expect, it, vi } from "vitest";

import {
  assertIdriveReady,
  downloadIdrive,
  idriveLocations,
  listIdrive,
  type IDriveClient,
} from "@/lib/idrive-client";
import type { IDriveEntry } from "@/lib/idrive";

describe("IDrive SDK adapter", () => {
  it("lists through the typed client without parsing CLI output", async () => {
    const entries: IDriveEntry[] = [{ name: "movie.mp4", size: 10, type: "file" }];
    const client: IDriveClient = {
      download: vi.fn().mockResolvedValue("/cache/movie.mp4"),
      list: vi.fn().mockResolvedValue(entries),
      status: vi.fn(),
    };

    const controller = new AbortController();
    await expect(listIdrive("/personal", { signal: controller.signal }, client)).resolves.toEqual(entries);
    expect(client.list).toHaveBeenCalledWith("/personal", {
      detailed: true,
      signal: controller.signal,
      timeoutMs: 30 * 60 * 1000,
    });
  });

  it("downloads through the typed client with the worker timeout", async () => {
    const client: IDriveClient = {
      download: vi.fn().mockResolvedValue("/cache/movie.mp4"),
      list: vi.fn(),
      status: vi.fn(),
    };
    const controller = new AbortController();

    await expect(downloadIdrive("/personal/movie.mp4", "/cache", {
      signal: controller.signal,
      timeoutMs: 1234,
    }, client)).resolves.toBe("/cache/movie.mp4");

    expect(client.download).toHaveBeenCalledWith("/personal/movie.mp4", "/cache", {
      signal: controller.signal,
      timeoutMs: 1234,
    });
  });

  it("fails preflight when the profile or transfer engine is unavailable", async () => {
    const client: IDriveClient = {
      download: vi.fn(),
      list: vi.fn(),
      status: vi.fn().mockResolvedValue({ engineInstalled: false, loggedIn: true }),
    };

    await expect(assertIdriveReady(client)).rejects.toThrow("transfer engine is not installed");

    vi.mocked(client.status).mockResolvedValue({ engineInstalled: true, loggedIn: false });
    await expect(assertIdriveReady(client)).rejects.toThrow("profile is not configured");
  });

  it("passes preflight when the worker profile and engine are ready", async () => {
    const client: IDriveClient = {
      download: vi.fn(),
      list: vi.fn(),
      status: vi.fn().mockResolvedValue({ engineInstalled: true, loggedIn: true }),
    };

    await expect(assertIdriveReady(client)).resolves.toBeUndefined();
  });

  it("keeps engine data paths while isolating worker transfer workspaces", () => {
    expect(idriveLocations({
      ...process.env,
      IDRIVE_CLI_CONFIG_DIR: "/config",
      IDRIVE_CLI_DATA_DIR: "/mounted-engine",
      IDRIVE_WORKER_TEMP_DIR: "/tmp/private-idrive",
    })).toEqual({
      configFile: "/config/config.json",
      dataDirectory: "/mounted-engine",
      engineDirectory: "/mounted-engine/bin",
      manifestFile: "/mounted-engine/engine.json",
      temporaryDirectory: "/tmp/private-idrive",
    });
  });
});
