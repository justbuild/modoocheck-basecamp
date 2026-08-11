import "server-only";

import { z } from "zod";

const runtimeSchema = z.object({
  BASECAMP_AGENT_API_BASE: z.string().url().default("http://localhost:4000"),
  BASECAMP_SESSION_KEY: z.string().min(43),
  DATABASE_FILENAME: z.string().regex(/^[A-Za-z0-9._-]+$/).default("basecamp.db"),
});

export type RuntimeConfig = {
  agentApiBase: string;
  sessionKey: string;
  databasePath: string;
};

let cached: RuntimeConfig | undefined;

export function runtimeConfig(): RuntimeConfig {
  if (cached) return cached;
  const parsed = runtimeSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Basecamp runtime configuration is invalid: ${names}`);
  }
  cached = {
    agentApiBase: parsed.data.BASECAMP_AGENT_API_BASE.replace(/\/+$/, ""),
    sessionKey: parsed.data.BASECAMP_SESSION_KEY,
    databasePath: `./data/${parsed.data.DATABASE_FILENAME}`,
  };
  return cached;
}
