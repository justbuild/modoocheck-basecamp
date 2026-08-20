import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, unauthorized } from "@/lib/http";
import { isOfficialOperation, officialOperation } from "@/lib/official-catalog";
import { startOfficialRequest } from "@/lib/official";
import { currentOwnerSession } from "@/lib/session";

const bodySchema = z.object({
  operation: z.string().min(1),
  request: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await currentOwnerSession();
    if (!session) return unauthorized();
    const body = bodySchema.parse(await request.json());
    if (!isOfficialOperation(body.operation)) {
      return NextResponse.json({
        error: {
          code: "OPERATION_NOT_ALLOWED",
          cause: "허용 목록에 없는 작업입니다.",
          resolution: "Basecamp 화면이 제공하는 작업만 요청할 수 있습니다.",
        },
      }, { status: 403 });
    }
    const input = officialOperation(body.operation).input.parse(body.request ?? {});
    const view = await startOfficialRequest(session, body.operation, input);
    return NextResponse.json(view, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
