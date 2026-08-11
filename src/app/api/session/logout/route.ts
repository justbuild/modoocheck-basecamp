import { cookies } from "next/headers";
import { deleteOwnerSession, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) deleteOwnerSession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
