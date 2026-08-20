import { NextResponse } from "next/server";
import { advanceOfficialRequest } from "@/lib/official";
import { apiError, unauthorized } from "@/lib/http";
import { currentOwnerSession } from "@/lib/session";

export async function POST(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const session = await currentOwnerSession();
    if (!session) return unauthorized();
    const { requestId } = await context.params;
    const view = await advanceOfficialRequest(session, requestId);
    return NextResponse.json(view);
  } catch (error) {
    return apiError(error);
  }
}
