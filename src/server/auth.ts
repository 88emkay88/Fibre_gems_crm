import crypto from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { getDb, isMockMode, mockStore } from "./db";
import { profiles, userRoles, sessions } from "./db/schema";
import { eq, and, gt } from "drizzle-orm";

const SESSION_COOKIE = "fg_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!combinedHash || !combinedHash.includes(":")) return false;
  const [salt, storedHash] = combinedHash.split(":");
  if (!salt || !storedHash) return false;
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  agentCode: string | null;
  role: "admin" | "team_leader" | "agent";
  status: string;
};

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  if (isMockMode()) {
    mockStore.sessions.set(token, { userId, expiresAt });
  } else {
    const db = getDb();
    await db.insert(sessions).values({
      id: token,
      userId,
      expiresAt,
    });
  }

  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    if (isMockMode()) {
      mockStore.sessions.delete(token);
    } else {
      try {
        const db = getDb();
        await db.delete(sessions).where(eq(sessions.id, token));
      } catch {
        // ignore deletion errors on logout
      }
    }
  }

  deleteCookie(SESSION_COOKIE, {
    path: "/",
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  if (isMockMode()) {
    const sess = mockStore.sessions.get(token);
    if (!sess || sess.expiresAt < new Date()) {
      if (sess) mockStore.sessions.delete(token);
      return null;
    }
    const profile = mockStore.profiles.get(sess.userId);
    if (!profile) return null;
    const role = mockStore.userRoles.get(sess.userId) ?? "agent";
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      agentCode: profile.agentCode ?? null,
      role: role as AuthUser["role"],
      status: profile.status,
    };
  }

  try {
    const db = getDb();
    const now = new Date();
    const [sess] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
      .limit(1);

    if (!sess) return null;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, sess.userId))
      .limit(1);

    if (!profile) return null;

    const [roleRow] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, profile.id))
      .limit(1);

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      agentCode: profile.agentCode,
      role: (roleRow?.role ?? "agent") as AuthUser["role"],
      status: profile.status,
    };
  } catch (err) {
    console.error("[Auth] Error fetching current user:", err);
    return null;
  }
}
