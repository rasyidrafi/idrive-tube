import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { query } from "@/lib/db";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
}

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }
  const rows = await query<UserRow>(
    `select id, email, password_hash as "passwordHash", role from users where email = $1`,
    [parsed.data.email],
  );
  const user = rows[0];
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const token = await createSessionToken(
    { userId: user.id, email: user.email, role: user.role },
    env().SESSION_SECRET,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
