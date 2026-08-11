import { NextResponse } from "next/server";
import { z } from "zod";
import { decideApproval } from "@/lib/agent-api";
import { apiError, unauthorized } from "@/lib/http";
import { audit, currentOwnerSession } from "@/lib/session";

const inputSchema = z.object({
  locator: z.string().min(1),
  csrf: z.string().min(1),
  challenge: z.string().min(1),
  digest: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
});

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const session = await currentOwnerSession();
    if (!session) return unauthorized();
    const { requestId } = await context.params;
    const input = inputSchema.parse(await request.json());
    const result = await decideApproval(session.ownerToken, { requestId, ...input });
    audit(`APPROVAL_${result.status}`, session.account, requestId, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
