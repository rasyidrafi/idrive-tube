import { describe, expect, it } from "vitest";

import { runCommand } from "@/worker/command";

describe("worker command runner", () => {
  it("aborts a running process", async () => {
    const controller = new AbortController();
    const command = runCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      killGraceMs: 50,
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 25);
    await expect(command).rejects.toThrow("was aborted");
  });

  it("escalates after a timed-out process ignores SIGTERM", async () => {
    const startedAt = Date.now();
    const command = runCommand(process.execPath, [
      "-e",
      "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
    ], { killGraceMs: 50, timeoutMs: 50 });

    await expect(command).rejects.toThrow("timed out after 50ms");
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it("keeps successful stdout intact but bounds failure details to their tail", async () => {
    const successful = "x".repeat(20_000);
    await expect(runCommand(process.execPath, [
      "-e",
      `process.stdout.write(${JSON.stringify(successful)})`,
    ])).resolves.toBe(successful);

    let error: Error | undefined;
    try {
      await runCommand(process.execPath, [
        "-e",
        "process.stderr.write('START' + 'x'.repeat(20000) + 'TAIL'); process.exit(7)",
      ]);
    } catch (caught) {
      error = caught as Error;
    }

    expect(error?.message).toContain("TAIL");
    expect(error?.message).toContain("truncated");
    expect(error?.message).not.toContain("START");
    expect(error?.message.length).toBeLessThan(10_000);
  });
});
