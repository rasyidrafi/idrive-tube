import type { Worker } from "bullmq";

type ClosableWorker = Pick<Worker, "close" | "on">;
type ErrorLogger = (message: string, error: Error) => void;

export class WorkerLifecycle {
  private catalogInterval: ReturnType<typeof setInterval> | undefined;
  private shutdownPromise: Promise<void> | undefined;

  public constructor(
    private readonly worker: ClosableWorker,
    private readonly clearIntervalFn: typeof clearInterval = clearInterval,
    private readonly controller: AbortController = new AbortController(),
  ) {}

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public setCatalogInterval(interval: ReturnType<typeof setInterval>): void {
    this.catalogInterval = interval;
  }

  public attachErrorLogging(logError: ErrorLogger = console.error): void {
    this.worker.on("error", (error) => logError("Worker infrastructure error", error));
  }

  public shutdown(signal: string): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.controller.abort(new Error(`Worker received ${signal}`));
    if (this.catalogInterval) {
      this.clearIntervalFn(this.catalogInterval);
      this.catalogInterval = undefined;
    }
    this.shutdownPromise = this.worker.close();
    return this.shutdownPromise;
  }
}
