import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { academyProfile } from "@/lib/academy-profile";
import { currentOwnerSession } from "@/lib/session";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await currentOwnerSession();
  if (!session) redirect("/login");
  const academy = await academyProfile(session);
  return <AppShell account={session.account} academy={academy}>{children}</AppShell>;
}
