type TenantListener = () => void;

const listeners = new Map<string, Set<TenantListener>>();

export function subscribeTenantUpdates(tenantId: string, listener: TenantListener) {
  if (!listeners.has(tenantId)) listeners.set(tenantId, new Set());
  listeners.get(tenantId)!.add(listener);
  return () => listeners.get(tenantId)?.delete(listener);
}

export function notifyTenantUpdate(tenantId: string) {
  listeners.get(tenantId)?.forEach((fn) => fn());
}
