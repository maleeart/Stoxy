import { useQuery } from "@tanstack/react-query";
import { getFMWorkOrders, getFMWorkOrder } from "@/services/fm.service";

export function useFMWorkOrders() {
  return useQuery({
    queryKey: ["fm_workorders"],
    queryFn: getFMWorkOrders,
    staleTime: 1000 * 30, // 30s
  });
}

export function useFMWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["fm_workorder", id],
    queryFn: () => (id ? getFMWorkOrder(id) : null),
    enabled: !!id,
  });
}

export function useActiveFMCount(uid: string | undefined, role?: string) {
  return useQuery({
    queryKey: ["fm_active_count", uid, role],
    queryFn: async () => {
      const orders = await getFMWorkOrders();
      const isAdmin = role === "admin" || role === "manager" || role === "supervisor";
      if (isAdmin) {
        // Admin cares about pending_review
        return orders.filter((o) => o.status === "pending_review").length;
      }
      // Staff cares about pending execution
      return orders.filter(
        (o) =>
          o.status === "pending" &&
          (!o.assignedTechnicianId ||
            o.assignedTechnicianId === "all" ||
            o.assignedTechnicianId === uid)
      ).length;
    },
    enabled: !!uid,
    staleTime: 1000 * 20,
  });
}
