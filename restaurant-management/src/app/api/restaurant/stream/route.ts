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
  const scope = {
    staffRole: session.staffRole,
    activeLocationId: session.activeLocationId,
  };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const push = async () => {
        if (closed) return;
        try {
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
