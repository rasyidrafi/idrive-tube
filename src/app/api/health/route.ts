import { connection, NextResponse } from "next/server";

import { query } from "@/lib/db";

export async function GET() {
  await connection();
  try {
    await query("select 1");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
