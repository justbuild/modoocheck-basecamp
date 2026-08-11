import { redirect } from "next/navigation";
import { currentOwnerSession } from "@/lib/session";

export default async function Home() {
  redirect((await currentOwnerSession()) ? "/dashboard" : "/login");
}
