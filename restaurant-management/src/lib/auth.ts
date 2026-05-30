import { redirect } from "next/navigation";
import { getSession, type StaffRole } from "./session";

export async function requireAccountSession() {
  const session = await getSession();
  if (!session.accountId || !session.tenantId) {
    redirect("/vi/login");
  }
  return session;
}

export async function requireStaffRole(role: StaffRole | StaffRole[]) {
  const session = await requireAccountSession();
  const roles = Array.isArray(role) ? role : [role];
  if (!session.staffUserId || !session.staffRole || !roles.includes(session.staffRole)) {
    redirect("/vi/app/roles");
  }
  return session;
}
