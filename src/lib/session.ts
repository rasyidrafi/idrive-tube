import { cookies } from "next/headers";
import { cache } from "react";

import { env } from "@/lib/env";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "@/lib/auth";

export const currentUser = cache(async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, env().SESSION_SECRET) : null;
});
