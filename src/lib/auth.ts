import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "idrive_tube_session";

export type UserRole = "admin" | "user";

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
}

function secretKey(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  user: SessionUser,
  secret: string,
): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ["HS256"],
    });
    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      (payload.role !== "admin" && payload.role !== "user")
    ) {
      return null;
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
