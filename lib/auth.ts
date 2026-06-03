import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { query, withTransaction } from "@/lib/db";

const SESSION_COOKIE = "splitwise_clone_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [
    tokenHash,
    userId,
    expiresAt
  ]);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (cookie) {
    await query("delete from sessions where token_hash = $1", [hashToken(cookie.value)]);
  }
  cookieStore.set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const result = await query<SessionUser & { expires_at: string }>(
    `
      select u.id, u.email, u.display_name, s.expires_at
      from sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()
      limit 1
    `,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");
  return user;
}

export async function registerAndLogin(email: string, password: string, displayName: string) {
  return withTransaction(async (client) => {
    const normalized = email.trim().toLowerCase();
    const existing = await client.query("select id from users where lower(email) = lower($1) limit 1", [normalized]);
    if (existing.rows.length > 0) {
      throw new Error("An account with this email already exists.");
    }
    const passwordHash = await hashPassword(password);
    const userResult = await client.query<SessionUser>(
      "insert into users (email, password_hash, display_name) values ($1, $2, $3) returning id, email, display_name",
      [normalized, passwordHash, displayName.trim()]
    );
    return userResult.rows[0];
  });
}

export async function loginUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const result = await query<{ id: string; email: string; password_hash: string; display_name: string }>(
    "select id, email, password_hash, display_name from users where lower(email) = lower($1) limit 1",
    [normalized]
  );
  const user = result.rows[0];
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, email: user.email, display_name: user.display_name };
}
