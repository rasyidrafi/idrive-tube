import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgres://idrive_tube:idrive_tube@localhost:5432/idrive_tube"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  SESSION_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  MEDIA_ROOT: z.string().default("/data/media"),
  HLS_ROOT: z.string().default("/data/hls"),
  THUMBNAIL_ROOT: z.string().default("/data/thumbnails"),
  IDRIVE_VIDEO_FOLDER: z.string().default("/personal"),
  CATALOG_SYNC_INTERVAL_SECONDS: z.coerce.number().int().positive().default(300),
  HLS_CACHE_MAX_BYTES: z.coerce.number().int().positive().default(50 * 1024 * 1024 * 1024),
});

export function env() {
  return serverSchema.parse(process.env);
}
