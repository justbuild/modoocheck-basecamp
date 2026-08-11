import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentOwnerSession } from "@/lib/session";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await currentOwnerSession();
  if (!session) redirect("/login");
  return <AppShell account={session.account}>{children}</AppShell>;
}
