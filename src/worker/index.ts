import { Worker } from "bullmq";

import { assertIdriveReady } from "@/lib/idrive-client";
import { CATALOG_SYNC_JOB, VIDEO_JOB, VIDEO_QUEUE, redisConnection, videoQueue } from "@/lib/queue";
import { evictCache } from "@/worker/cache-eviction";
import { WorkerLifecycle } from "@/worker/lifecycle";
import { processVideo } from "@/worker/process-video";
import { syncCatalog } from "@/worker/sync-catalog";
import { clearDirectoryContents } from "@/worker/startup";

let lifecycle: WorkerLifecycle | null = null;
const workerController = new AbortController();

async function main() {
  await assertIdriveReady();
  console.log("IDrive worker profile and transfer engine verified");
  const mediaRoot = process.env.MEDIA_ROOT ?? "/data/media";
  await clearDirectoryContents(mediaRoot);

  const worker = new Worker(
    VIDEO_QUEUE,
    async (job) => {
      if (job.name === CATALOG_SYNC_JOB) {
        const count = await syncCatalog(workerController.signal);
        await evictCache();
        console.log(`Catalog sync found ${count} video files`);
        return;
      }
      if (job.name !== VIDEO_JOB || typeof job.data.videoId !== "string") {
        throw new Error("Invalid worker job");
      }
      console.log(`Processing video ${job.data.videoId}, attempt ${job.attemptsMade + 1}`);
      await processVideo(job.data.videoId, { signal: workerController.signal });
      await evictCache();
    },
    { connection: redisConnection(), concurrency: 1 },
  );

  lifecycle = new WorkerLifecycle(worker, clearInterval, workerController);
  lifecycle.attachErrorLogging();
  worker.on("completed", (job) => console.log(`Completed job ${job.name}`));
  worker.on("failed", (job, error) => console.error(`Failed job ${job?.name}: ${error.message}`));

  await scheduleCatalogSync();
  const catalogInterval = setInterval(
    () => void scheduleCatalogSync(),
    Number(process.env.CATALOG_SYNC_INTERVAL_SECONDS ?? 300) * 1000,
  );
  catalogInterval.unref();
  lifecycle.setCatalogInterval(catalogInterval);
}

async function scheduleCatalogSync() {
  try {
    await videoQueue().add(CATALOG_SYNC_JOB, {}, {
      jobId: "catalog-sync",
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  } catch (error) {
    console.error("Could not queue catalog sync", error);
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}; closing worker`);
  await lifecycle?.shutdown(signal);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void main().catch((error) => {
  console.error("Worker startup failed", error);
  process.exit(1);
});
