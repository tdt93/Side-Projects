import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireOwnerSession } from "@/lib/auth-guards";
import { getAnalytics, type AnalyticsRange } from "@/lib/analytics-server";

export async function GET(req: Request) {
  const session = await requireOwnerSession();
  if (isAuthError(session)) return session;

  const rangeParam = new URL(req.url).searchParams.get("range") ?? "month";
  const range = z.enum(["day", "month", "year"]).parse(rangeParam) as AnalyticsRange;

  const data = await getAnalytics(session.tenantId, range, {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  });

  return NextResponse.json(data);
}
