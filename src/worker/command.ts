import { spawn } from "node:child_process";

const FAILURE_DETAIL_MAX_CHARACTERS = 8 * 1024;

export interface CommandOptions {
  killGraceMs?: number;
  maxOutputBytes?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function runCommand(
  command: string,
  args: readonly string[],
  options: CommandOptions = {},
): Promise<string> {
  if (options.signal?.aborted) throw new Error(`${command} was aborted`);

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
    const killGraceMs = options.killGraceMs ?? 5_000;
    const maxOutputBytes = options.maxOutputBytes ?? 16 * 1024 * 1024;
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;
    let terminationError: Error | undefined;
    let killTimer: NodeJS.Timeout | undefined;

    const kill = (signal: NodeJS.Signals) => {
      if (process.platform !== "win32" && child.pid !== undefined) {
        try {
          process.kill(-child.pid, signal);
          return;
        } catch {
          // The process group may already be gone; fall back to the child handle.
        }
      }
      child.kill(signal);
    };

    const terminate = (error: Error) => {
      if (settled || terminationError) return;
      terminationError = error;
      kill("SIGTERM");
      killTimer = setTimeout(() => {
        if (!settled) kill("SIGKILL");
      }, killGraceMs);
      killTimer.unref();
    };

    const timer = setTimeout(
      () => terminate(new Error(`${command} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    timer.unref();
    const onAbort = () => terminate(new Error(`${command} was aborted`));
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      options.signal?.removeEventListener("abort", onAbort);
    };

    const append = (stream: "stderr" | "stdout", chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        terminate(new Error(`${command} exceeded the output limit`));
        return;
      }
      if (stream === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    };

    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (terminationError) {
        reject(terminationError);
        return;
      }
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${boundedFailureDetail(stderr || stdout)}`));
    });
  });
}

function boundedFailureDetail(output: string): string {
  const detail = output.trim();
  if (detail.length <= FAILURE_DETAIL_MAX_CHARACTERS) return detail;
  return `[output truncated]\n${detail.slice(-FAILURE_DETAIL_MAX_CHARACTERS)}`;
}
