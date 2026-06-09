import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function PlatformHomePage() {
  const session = await getSession();
  if (session.platformAdmin) redirect("/platform/dashboard");
  redirect("/platform/login");
}
