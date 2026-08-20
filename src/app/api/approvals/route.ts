import { NextResponse } from "next/server";
import { listPendingApprovals } from "@/lib/agent-api";
import { apiError, unauthorized } from "@/lib/http";
import { currentOwnerSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await currentOwnerSession();
    if (!session) return unauthorized();
    const result = await listPendingApprovals(session.ownerToken);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
