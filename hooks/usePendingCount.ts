import { useQuery } from "@tanstack/react-query";
import { getRequisitions } from "@/services/requisition.service";
import { getBorrowRecords } from "@/services/borrow.service";
import { getAuditSessions } from "@/services/audit.service";
import { getPendingCount as getAccessRequestCount } from "@/services/accessRequest.service";
import { useInventoryItems } from "./useInventory";
import { useMemo } from "react";

export function usePendingCount() {
  const { data: items = [] } = useInventoryItems();

  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions", "all"],
    queryFn: getRequisitions,
    staleTime: 1000 * 60,
  });

  const { data: borrows = [] } = useQuery({
    queryKey: ["borrows", "all"],
    queryFn: () => getBorrowRecords(),
    staleTime: 1000 * 60,
  });

  const { data: auditSessions = [] } = useQuery({
    queryKey: ["audit_sessions"],
    queryFn: getAuditSessions,
    staleTime: 1000 * 60,
  });

  const { data: pendingAccessRequests = 0 } = useQuery({
    queryKey: ["access_requests", "pending_count"],
    queryFn: getAccessRequestCount,
    staleTime: 1000 * 60,
  });

  return useMemo(() => {
    const pendingReqs = requisitions.filter((r) => r.status === "pending").length;
    const pendingBorrows = borrows.filter((b) => b.status === "pending_approval").length;
    const overdue = borrows.filter(
      (b) => b.status === "borrowed" && b.expectedReturnDate.toDate() < new Date()
    ).length;
    const lowStock = items.filter(
      (i) => (i.minStockLevel ?? 0) > 0 && i.quantityAvailable <= i.minStockLevel
    ).length;
    const pendingAudits = auditSessions.filter((s) => s.status === "pending_approval").length;

    return {
      pendingReqs,
      pendingBorrows,
      overdue,
      lowStock,
      pendingAudits,
      pendingAccessRequests,
      total: pendingReqs + pendingBorrows + overdue + lowStock + pendingAudits,
    };
  }, [requisitions, borrows, items, auditSessions, pendingAccessRequests]);
}
