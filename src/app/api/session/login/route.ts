import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loginOwner } from "@/lib/agent-api";
import { apiError } from "@/lib/http";
import { createOwnerSession, deleteOwnerSession, SESSION_COOKIE } from "@/lib/session";

const inputSchema = z.object({
  account: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const ownerToken = await loginOwner(input.account, input.password);
    const cookieStore = await cookies();
    const previous = cookieStore.get(SESSION_COOKIE)?.value;
    if (previous) deleteOwnerSession(previous);
    const session = await createOwnerSession(input.account, ownerToken);
    cookieStore.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      priority: "high",
    });
    return NextResponse.json({ account: input.account, expires_at: session.expiresAt.toISOString() });
  } catch (error) {
    return apiError(error);
  }
}
