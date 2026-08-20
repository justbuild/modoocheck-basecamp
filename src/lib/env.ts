import "server-only";

import { z } from "zod";

const runtimeSchema = z.object({
  BASECAMP_AGENT_API_BASE: z.string().url(),
  BASECAMP_UPSTREAM_API_BASE: z.string().url(),
  BASECAMP_SESSION_KEY: z.string().min(43),
  DATABASE_FILENAME: z.string().regex(/^[A-Za-z0-9._-]+$/).default("basecamp.db"),
});

export type RuntimeConfig = {
  agentApiBase: string;
  upstreamApiBase: string;
  sessionKey: string;
  databasePath: string;
};

let cached: RuntimeConfig | undefined;

export function runtimeConfig(): RuntimeConfig {
  if (cached) return cached;
  const parsed = runtimeSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Basecamp runtime configuration is invalid: ${names}. ` +
        "비어 있는 URL 값은 전달받은 Agent API 문서(/v1/docs)의 services.env_bootstrap.values 값으로 .env.local에 채우세요.",
    );
  }
  cached = {
    agentApiBase: parsed.data.BASECAMP_AGENT_API_BASE.replace(/\/+$/, ""),
    upstreamApiBase: parsed.data.BASECAMP_UPSTREAM_API_BASE.replace(/\/+$/, ""),
    sessionKey: parsed.data.BASECAMP_SESSION_KEY,
    databasePath: `./data/${parsed.data.DATABASE_FILENAME}`,
  };
  return cached;
}
