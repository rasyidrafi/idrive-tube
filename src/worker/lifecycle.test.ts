import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { WorkerLifecycle } from "@/worker/lifecycle";

describe("worker lifecycle", () => {
  it("aborts active work, clears the interval, and closes only once", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const clearInterval = vi.fn();
    const lifecycle = new WorkerLifecycle({ close } as never, clearInterval);
    lifecycle.setCatalogInterval({} as NodeJS.Timeout);

    const first = lifecycle.shutdown("SIGTERM");
    const second = lifecycle.shutdown("SIGINT");
    await Promise.all([first, second]);

    expect(lifecycle.signal.aborted).toBe(true);
    expect(clearInterval).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("logs worker infrastructure errors", () => {
    const worker = new EventEmitter();
    const error = vi.fn();
    const lifecycle = new WorkerLifecycle(worker as never);

    lifecycle.attachErrorLogging(error);
    worker.emit("error", new Error("redis unavailable"));

    expect(error).toHaveBeenCalledWith("Worker infrastructure error", expect.any(Error));
  });
});
