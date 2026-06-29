import { useQuery } from "@tanstack/react-query";
import { getRequisitions } from "@/services/requisition.service";
import { getBorrowRecords } from "@/services/borrow.service";
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

  return useMemo(() => {
    const pendingReqs = requisitions.filter((r) => r.status === "pending").length;
    const pendingBorrows = borrows.filter((b) => b.status === "pending_approval").length;
    const returnPending = borrows.filter((b) => b.status === "return_pending").length;
    const lowStock = items.filter((i) => i.quantityAvailable <= (i.minStockLevel ?? 0)).length;
    const overdue = borrows.filter(
      (b) => b.status === "borrowed" && b.expectedReturnDate.toDate() < new Date()
    ).length;
    return { pendingReqs, pendingBorrows, returnPending, lowStock, overdue, total: pendingReqs + pendingBorrows + returnPending + lowStock + overdue };
  }, [requisitions, borrows, items]);
}
