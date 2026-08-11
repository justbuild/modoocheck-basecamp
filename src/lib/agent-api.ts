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

export async function agentHealth() {
  return healthSchema.parse(await request("/v1/health"));
}
