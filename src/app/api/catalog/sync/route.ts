import { NextResponse } from "next/server";

import { CATALOG_SYNC_JOB, videoQueue } from "@/lib/queue";
import { currentUser } from "@/lib/session";

export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await videoQueue().add(CATALOG_SYNC_JOB, {}, {
    jobId: "catalog-sync",
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: true,
    removeOnFail: true,
  });
  return NextResponse.json({ status: "queued" }, { status: 202 });
}
