import { NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/http";
import { officialOperation, studentDetailSchema } from "@/lib/official-catalog";
import { runOfficialOperation } from "@/lib/official";
import { currentOwnerSession } from "@/lib/session";

/** 학생 한 명의 상세정보 조회. 원장 세션 토큰으로 upstream을 바로 부른다. */
export async function GET(_request: Request, context: { params: Promise<{ studentUuid: string }> }) {
  try {
    const session = await currentOwnerSession();
    if (!session) return unauthorized();
    const { studentUuid } = await context.params;
    const input = officialOperation("students.detail").input.parse({
      params: { student_uuid: studentUuid },
    });
    const view = await runOfficialOperation(session, "students.detail", input);
    const student = studentDetailSchema.parse(view.data);
    return NextResponse.json({ student });
  } catch (error) {
    return apiError(error);
  }
}
