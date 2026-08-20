import "server-only";

import { z } from "zod";
import { runtimeConfig } from "./env";

/**
 * 모두출첵 Core(upstream) 직접 호출 클라이언트.
 * 원장이 Basecamp 화면에서 직접 조작한 조회/변경은 AI 승인 파이프라인(agent-api)을
 * 거치지 않고, 원장 세션 토큰(x-access-token)으로 upstream을 바로 부른다.
 * AI(위임 클라이언트)의 작업만 agent-api의 요청 → 원장 승인 → 실행 계약을 따른다.
 */
const upstreamEnvelopeSchema = z.object({
  success: z.union([z.number(), z.boolean()]),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
});

export class UpstreamApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "UPSTREAM_ERROR",
  ) {
    super(message);
    this.name = "UpstreamApiError";
  }
}

export type UpstreamCall = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

function upstreamErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.length > 0) return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "모두출첵이 요청을 처리하지 못했습니다.";
}

/** upstream을 호출하고 성공 응답의 data만 돌려준다. 실패는 UpstreamApiError로 던진다. */
export async function callUpstream(ownerToken: string, call: UpstreamCall): Promise<unknown> {
  const url = new URL(`${runtimeConfig().upstreamApiBase}${call.path}`);
  for (const [key, value] of Object.entries(call.query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-access-token": ownerToken,
  };
  const init: RequestInit = {
    method: call.method,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  };
  if (call.method !== "GET") {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(call.body ?? {});
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new UpstreamApiError("모두출첵 서버에 연결하지 못했습니다.", 502, "UPSTREAM_UNAVAILABLE");
  }
  const raw: unknown = await response.json().catch(() => null);
  const envelope = upstreamEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new UpstreamApiError("모두출첵 응답 형식이 올바르지 않습니다.", 502, "UPSTREAM_MALFORMED");
  }
  const ok = envelope.data.success === 1 || envelope.data.success === true;
  if (!response.ok || !ok) {
    const status = response.ok ? 502 : response.status;
    throw new UpstreamApiError(upstreamErrorMessage(envelope.data.error), status);
  }
  return envelope.data.data ?? null;
}
