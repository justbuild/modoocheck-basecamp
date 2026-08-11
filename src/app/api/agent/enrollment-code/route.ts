import { NextResponse } from "next/server";
import { issueEnrollmentCode } from "@/lib/agent-api";
import { apiError, unauthorized } from "@/lib/http";
import { audit, currentOwnerSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await currentOwnerSession();
    if (!session) return unauthorized();
    const code = await issueEnrollmentCode(session.ownerToken);
    audit("ENROLLMENT_CODE_ISSUED", session.account, null, { expires_in: code.expires_in });
    return NextResponse.json(code, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
