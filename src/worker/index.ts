import { Worker } from "bullmq";

import { CATALOG_SYNC_JOB, VIDEO_JOB, VIDEO_QUEUE, redisConnection, videoQueue } from "@/lib/queue";
import { evictCache } from "@/worker/cache-eviction";
import { processVideo } from "@/worker/process-video";
import { syncCatalog } from "@/worker/sync-catalog";
import { clearDirectoryContents } from "@/worker/startup";

let worker: Worker | null = null;

async function main() {
  const mediaRoot = process.env.MEDIA_ROOT ?? "/data/media";
  await clearDirectoryContents(mediaRoot);

  worker = new Worker(
    VIDEO_QUEUE,
    async (job) => {
      if (job.name === CATALOG_SYNC_JOB) {
        const count = await syncCatalog();
        await evictCache();
        console.log(`Catalog sync found ${count} video files`);
        return;
      }
      if (job.name !== VIDEO_JOB || typeof job.data.videoId !== "string") {
        throw new Error("Invalid worker job");
      }
      console.log(`Processing video ${job.data.videoId}, attempt ${job.attemptsMade + 1}`);
      await processVideo(job.data.videoId);
      await evictCache();
    },
    { connection: redisConnection(), concurrency: 1 },
  );

  worker.on("completed", (job) => console.log(`Completed job ${job.name}`));
  worker.on("failed", (job, error) => console.error(`Failed job ${job?.name}: ${error.message}`));

  await scheduleCatalogSync();
  setInterval(
    () => void scheduleCatalogSync(),
    Number(process.env.CATALOG_SYNC_INTERVAL_SECONDS ?? 300) * 1000,
  ).unref();
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
  await worker?.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void main().catch((error) => {
  console.error("Worker startup failed", error);
  process.exit(1);
});
