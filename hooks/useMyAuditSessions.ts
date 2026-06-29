import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useHasActiveAudit(uid: string | undefined) {
  return useQuery({
    queryKey: ["my_active_audit", uid],
    queryFn: async () => {
      const q = query(collection(db, "audit_sessions"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.some(d => {
        const data = d.data();
        if (data.status !== "in_progress") return false;
        const users: string[] = data.assignedUsers ?? [];
        return users.includes(uid!) || users.includes("all");
      });
    },
    enabled: !!uid,
    staleTime: 0,
  });
}
