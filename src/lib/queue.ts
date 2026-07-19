import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/lib/env";

export const VIDEO_QUEUE = "video-processing";
export const VIDEO_JOB = "process-video";
export const CATALOG_SYNC_JOB = "sync-catalog";

const globalQueue = globalThis as unknown as {
  videoQueue?: Queue;
  redisConnection?: IORedis;
};

export function redisConnection(): IORedis {
  if (!globalQueue.redisConnection) {
    globalQueue.redisConnection = new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return globalQueue.redisConnection;
}

export function videoQueue(): Queue {
  if (!globalQueue.videoQueue) {
    globalQueue.videoQueue = new Queue(VIDEO_QUEUE, { connection: redisConnection() });
  }
  return globalQueue.videoQueue;
}
