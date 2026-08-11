import { NextResponse } from "next/server";
import { currentOwnerSession } from "@/lib/session";

export async function GET() {
  const session = await currentOwnerSession();
  return NextResponse.json(session ? {
    authenticated: true,
    account: session.account,
    expires_at: session.expiresAt.toISOString(),
  } : { authenticated: false });
}
