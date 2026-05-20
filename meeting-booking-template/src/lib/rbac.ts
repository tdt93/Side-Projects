import type { SessionData } from "@/lib/session";
import type { UserRole } from "@/generated/prisma";

export function requireSuperAdmin(session: SessionData) {
  if (session.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
}

export function requireTherapist(session: SessionData) {
  if (session.role !== "THERAPIST" || !session.therapistProfileId) {
    throw new Error("Forbidden");
  }
}

export function requireAuth(session: SessionData) {
  if (!session.userId) {
    throw new Error("Unauthorized");
  }
}

export function sessionRole(role: UserRole): SessionData["role"] {
  return role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "THERAPIST";
}
