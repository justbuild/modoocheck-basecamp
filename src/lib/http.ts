import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AgentApiError } from "./agent-api";

export function apiError(error: unknown) {
  if (error instanceof AgentApiError) {
    return NextResponse.json({
      error: {
        code: error.code,
        cause: error.message,
        resolution: error.resolution || "연결 상태와 입력값을 확인한 뒤 다시 시도하세요.",
      },
    }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: {
        code: "INVALID_REQUEST",
        cause: "요청 형식이 올바르지 않습니다.",
        resolution: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "),
      },
    }, { status: 400 });
  }
  console.error("Basecamp API error", error);
  return NextResponse.json({
    error: {
      code: "INTERNAL_ERROR",
      cause: "요청을 처리하지 못했습니다.",
      resolution: "서버 설정과 로그를 확인하세요.",
    },
  }, { status: 500 });
}

export function unauthorized() {
  return NextResponse.json({
    error: {
      code: "SESSION_REQUIRED",
      cause: "원장 로그인이 필요합니다.",
      resolution: "로그인 후 다시 시도하세요.",
    },
  }, { status: 401 });
}
