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

const ownerLoginSchema = z.object({
  success: z.number(),
  data: z.union([z.string(), z.object({ token: z.string().min(1) })]).optional(),
  error: z.string().optional(),
});

const enrollmentSchema = z.object({
  enrollment_code: z.string().min(1),
  expires_in: z.number().int().positive(),
});

const assertionSchema = z.object({ owner_assertion: z.string().min(1) });
const decisionSchema = z.object({
  request_id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});
const fixedScopeSchema = z.string().min(1);
const enrollmentResultSchema = z.object({
  family_id: z.string().min(1),
  family_secret: z.string().min(1),
  access_token: z.string().min(1),
  access_expires_at: z.string().min(1),
  scopes: z.array(fixedScopeSchema),
});
const authResultSchema = z.object({
  family_id: z.string().min(1),
  access_token: z.string().min(1),
  access_expires_at: z.string().min(1),
  scopes: z.array(fixedScopeSchema),
});
const requestedOperationSchema = z.object({
  request_id: z.string().min(1),
  operation: z.string(),
  status: z.literal("REQUESTED"),
  target_count: z.number().int().nonnegative(),
  side_effects: z.array(z.string()),
  approval_digest: z.string(),
  expires_at: z.string().min(1),
  notification: z.enum(["SENT", "FAILED"]),
});
const executionStatusSchema = z.object({
  request_id: z.string().min(1),
  execution_id: z.string().optional(),
  operation: z.string(),
  status: z.enum(["REQUESTED", "REJECTED", "EXPIRED", "APPROVED", "EXECUTED", "FAILED", "UNKNOWN"]),
  correlation_id: z.string().optional(),
  deadline_at: z.string().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  next_action: z.string().optional(),
});
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type RequestedOperation = z.infer<typeof requestedOperationSchema>;

const healthSchema = z.object({
  status: z.string(),
  upstream: z.object({ connected: z.boolean(), ready: z.boolean(), status: z.number().nullable() }),
});

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
  const response = await fetch(`${runtimeConfig().agentApiBase}${path}`, {
    ...init,
    cache: "no-store",
    headers: { accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = problemSchema.safeParse(body);
    throw new AgentApiError(
      problem.success ? problem.data.error?.cause || `Agent API returned HTTP ${response.status}.` : `Agent API returned HTTP ${response.status}.`,
      response.status,
      problem.success ? problem.data.error?.code || "AGENT_API_ERROR" : "AGENT_API_ERROR",
      problem.success ? problem.data.error?.resolution : undefined,
    );
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
  locator: string;
  csrf: string;
  challenge: string;
  digest: string;
  decision: "APPROVE" | "REJECT";
}) {
  const assertion = assertionSchema.parse(await request("/v1/owner/approval-assertions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-access-token": ownerToken },
    body: JSON.stringify({
      audience: "modoocheck5-agent-api",
      challenge: input.challenge,
      request_digest: input.digest,
    }),
  }));
  return decisionSchema.parse(await request(`/v1/changes/approvals/${encodeURIComponent(input.requestId)}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      locator: input.locator,
      csrf: input.csrf,
      owner_assertion: assertion.owner_assertion,
      decision: input.decision,
    }),
  }));
}

export async function enrollDelegatedFamily(enrollmentCode: string) {
  return enrollmentResultSchema.parse(await request("/v1/auth/enroll", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enrollment_code: enrollmentCode }),
  }));
}

export async function refreshDelegatedFamily(familyId: string, familySecret: string) {
  return authResultSchema.parse(await request("/v1/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ family_id: familyId, family_secret: familySecret }),
  }));
}

export async function createChangeRequest(accessToken: string, operation: string, requestInput: {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}) {
  return requestedOperationSchema.parse(await request("/v1/changes/requests", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ operation, request: requestInput }),
  }));
}

export async function changeRequestStatus(accessToken: string, requestId: string) {
  return executionStatusSchema.parse(await request(`/v1/changes/requests/${encodeURIComponent(requestId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  }));
}

export async function dispatchChangeRequest(accessToken: string, requestId: string) {
  return executionStatusSchema.parse(await request(`/v1/changes/requests/${encodeURIComponent(requestId)}/dispatch`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  }));
}

export async function agentHealth() {
  return healthSchema.parse(await request("/v1/health"));
}
