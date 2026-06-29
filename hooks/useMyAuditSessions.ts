import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useHasActiveAudit(uid: string | undefined) {
  return useQuery({
    queryKey: ["my_active_audit", uid],
    queryFn: async () => {
      const q = query(collection(db, "audit_sessions"), where("status", "==", "in_progress"));
      const snap = await getDocs(q);
      return snap.docs.some(d => {
        const users: string[] = d.data().assignedUsers ?? [];
        return users.includes(uid!) || users.includes("all");
      });
    },
    enabled: !!uid,
    staleTime: 60_000,
  });
}
