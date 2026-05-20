import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function requireLogin() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireLogin();
  if (session.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }
  return session;
}

export async function requireTherapistOrAdmin() {
  const session = await requireLogin();
  if (session.role !== "THERAPIST" && session.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }
  return session;
}
