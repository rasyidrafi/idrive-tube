import { Pool, type QueryResultRow } from "pg";

import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as { idriveTubePool?: Pool };

export function db(): Pool {
  if (!globalForDb.idriveTubePool) {
    globalForDb.idriveTubePool = new Pool({ connectionString: env().DATABASE_URL, max: 10 });
  }
  return globalForDb.idriveTubePool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await db().query<T>(text, values);
  return result.rows;
}
