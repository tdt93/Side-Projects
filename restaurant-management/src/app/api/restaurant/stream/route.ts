import { prisma } from "@/lib/db";
import { getRestaurantData } from "@/lib/restaurant-data";
import { subscribeTenantUpdates } from "@/lib/live-broadcast";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.tenantId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenantId = session.tenantId;
  const url = new URL(req.url);
  const viewAllParam = url.searchParams.get("viewAll") === "1";
  const locationIdParam = url.searchParams.get("locationId");
  const encoder = new TextEncoder();

  async function resolveStreamScope() {
    let activeLocationId = session.activeLocationId ?? null;
    if (viewAllParam && session.staffRole === "OWNER") {
      activeLocationId = null;
    } else if (locationIdParam) {
      const loc = await prisma.location.findFirst({
        where: { id: locationIdParam, tenantId, isActive: true },
        select: { id: true },
      });
      if (loc) activeLocationId = loc.id;
    }
    return { staffRole: session.staffRole, activeLocationId };
  }

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const push = async () => {
        if (closed) return;
        try {
          const scope = await resolveStreamScope();
          const payload = await getRestaurantData(tenantId, scope);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "update", payload })}\n\n`),
          );
        } catch {
          /* ignore transient DB errors */
        }
      };

      void push();
      const unsub = subscribeTenantUpdates(tenantId, () => void push());
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);
      const poll = setInterval(() => void push(), 15000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        unsub();
        clearInterval(heartbeat);
        clearInterval(poll);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
