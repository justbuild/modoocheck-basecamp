import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { agentHealth } from "@/lib/agent-api";
import { apiError } from "@/lib/http";

export async function GET() {
  try {
    getDb().run(sql`select 1`);
    const agent = await agentHealth();
    return NextResponse.json({
      status: agent.upstream.ready ? "ready" : "degraded",
      database: { connected: true },
      agent_api: agent,
    });
  } catch (error) {
    return apiError(error);
  }
}
