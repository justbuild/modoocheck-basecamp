import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AgentApiError } from "./agent-api";
import { UpstreamApiError } from "./upstream";

export function apiError(error: unknown) {
  if (error instanceof UpstreamApiError) {
    // 서버 무응답(연결 실패·이상 응답)은 사용자 잘못이 아니므로 재시도 안내를 구분해 보여준다.
    const outage = error.code === "UPSTREAM_UNAVAILABLE" || error.code === "UPSTREAM_MALFORMED";
    return NextResponse.json({
      error: {
        code: error.code,
        cause: error.message,
        resolution: outage
          ? "모두출첵 서버가 일시적으로 불안정할 수 있어요. 1~2분 뒤 다시 시도하고, 계속되면 모두출첵 고객센터에 문의해 주세요."
          : "입력값과 모두출첵 연결 상태를 확인한 뒤 다시 시도하세요.",
      },
    }, { status: error.status });
  }
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
