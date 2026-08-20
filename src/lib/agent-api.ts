import "server-only";

import { z } from "zod";
import { runtimeConfig } from "./env";

const problemSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    cause: z.string().optional(),
    resolution: z.string().optional(),
  }).optional(),
  success: z.number().optional(),
});

// upstream(modoocheck5-api) 오류 봉투: { success: 0, error: "메시지", error_code? }
// owner 프록시가 upstream 상태·본문을 그대로 전달하므로 이 형태도 해석해야 한다 (예: SUBSCRIPTION_REQUIRED).
const upstreamProblemSchema = z.object({
  success: z.number().optional(),
  error: z.string().min(1),
  error_code: z.string().optional(),
});

const ownerLoginSchema = z.object({
  success: z.number(),
  data: z.union([z.string(), z.object({ token: z.string().min(1) })]).optional(),
  error: z.string().optional(),
});

const enrollmentSchema = z.object({
  enrollment_code: z.string().min(1),
  expires_in: z.number().int().positive(),
});

const assertionSchema = z.object({
  assertion: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
});
const decisionSchema = z.object({
  request_id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});
const pendingApprovalsSchema = z.object({
  approvals: z.array(z.object({
    request_id: z.string().min(1),
    operation_id: z.string().min(1),
    target_count: z.number().int().nonnegative(),
    side_effects: z.array(z.string()),
    challenge: z.string().min(1),
    request_digest: z.string().min(1),
    expires_at: z.string().min(1),
    created_at: z.string().min(1),
  })),
});
export type PendingApproval = z.infer<typeof pendingApprovalsSchema>["approvals"][number];

const healthSchema = z.object({
  status: z.string(),
  upstream: z.object({ connected: z.boolean(), ready: z.boolean(), status: z.number().nullable() }),
});

// agent-api가 upstream(모두출첵 본체 서버) 장애를 알려오는 코드들.
// 기술 메시지(영문) 대신 사용자가 이해할 수 있는 안내로 바꿔 보여준다. 코드는 그대로 유지한다.
const UPSTREAM_OUTAGE_GUIDE: Record<string, { cause: string; resolution: string }> = {
  UPSTREAM_UNAVAILABLE: {
    cause: "모두출첵 서버가 응답하지 않아 요청을 마치지 못했습니다.",
    resolution: "모두출첵 서버가 일시적으로 불안정할 수 있어요. 1~2분 뒤 다시 시도하고, 계속되면 모두출첵 고객센터에 문의해 주세요.",
  },
  UPSTREAM_MALFORMED: {
    cause: "모두출첵 서버가 올바르지 않은 응답을 보냈습니다.",
    resolution: "잠시 후 다시 시도해 주세요. 계속되면 모두출첵 서버 점검이 필요할 수 있으니 모두출첵 고객센터에 알려 주세요.",
  },
  UPSTREAM_AUTH_UNAVAILABLE: {
    cause: "모두출첵 서버와의 인증 연결이 완료되지 않았습니다.",
    resolution: "모두출첵 서버가 일시적으로 불안정할 수 있어요. 1~2분 뒤 다시 시도하고, 계속되면 모두출첵 고객센터에 문의해 주세요.",
  },
};

export class AgentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly resolution?: string,
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

async function request(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${runtimeConfig().agentApiBase}${path}`, {
      ...init,
      cache: "no-store",
      headers: { accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    // agent-api 자체가 꺼졌거나(연결 거부) 응답이 없는(시간 초과) 경우.
    const timedOut = cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
    throw new AgentApiError(
      timedOut
        ? "AI 에이전트 서버가 응답하지 않습니다. (10초 초과)"
        : "AI 에이전트 서버에 연결하지 못했습니다.",
      timedOut ? 504 : 503,
      timedOut ? "AGENT_API_TIMEOUT" : "AGENT_API_UNREACHABLE",
      "일시적인 서비스 장애일 수 있어요. 잠시 후 다시 시도하고, 계속되면 모두출첵 고객센터에 문의해 주세요.",
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = problemSchema.safeParse(body);
    if (problem.success && problem.data.error) {
      const code = problem.data.error.code || "AGENT_API_ERROR";
      const guide = UPSTREAM_OUTAGE_GUIDE[code];
      throw new AgentApiError(
        guide?.cause || problem.data.error.cause || `Agent API returned HTTP ${response.status}.`,
        response.status,
        code,
        guide?.resolution || problem.data.error.resolution,
      );
    }
    const upstreamProblem = upstreamProblemSchema.safeParse(body);
    if (upstreamProblem.success) {
      throw new AgentApiError(upstreamProblem.data.error, response.status, upstreamProblem.data.error_code || "AGENT_API_ERROR");
    }
    throw new AgentApiError(`Agent API returned HTTP ${response.status}.`, response.status, "AGENT_API_ERROR");
  }
  return body;
}

export async function loginOwner(email: string, password: string) {
  const result = ownerLoginSchema.parse(await request("/v1/owner/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  if (result.success !== 1 || !result.data) {
    throw new AgentApiError(result.error || "원장 로그인에 실패했습니다.", 401, "OWNER_LOGIN_FAILED");
  }
  return typeof result.data === "string" ? result.data : result.data.token;
}

export async function issueEnrollmentCode(ownerToken: string) {
  return enrollmentSchema.parse(await request("/v1/owner/enrollment-code", {
    method: "POST",
    headers: { "content-type": "application/json", "x-access-token": ownerToken },
    body: JSON.stringify({ audience: "modoocheck5-agent-api" }),
  }));
}

export async function decideApproval(ownerToken: string, input: {
  requestId: string;
  challenge: string;
  digest: string;
  operationId: string;
  targetCount: number;
  expiresAt: string;
  decision: "APPROVE" | "REJECT";
}) {
  const assertion = assertionSchema.parse(await request("/v1/owner/approval-assertions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-access-token": ownerToken },
    body: JSON.stringify({
      request_id: input.requestId,
      challenge: input.challenge,
      request_digest: input.digest,
      operation_id: input.operationId,
      target_count: input.targetCount,
      expires_at: input.expiresAt,
    }),
  }));
  return decisionSchema.parse(await request(`/v1/changes/approvals/${encodeURIComponent(input.requestId)}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner_assertion: assertion.assertion,
      decision: input.decision,
    }),
  }));
}

export async function listPendingApprovals(ownerToken: string) {
  return pendingApprovalsSchema.parse(await request("/v1/owner/pending-approvals", {
    method: "POST",
    headers: { "content-type": "application/json", "x-access-token": ownerToken },
    body: JSON.stringify({}),
  }));
}

export async function agentHealth() {
  return healthSchema.parse(await request("/v1/health"));
}
