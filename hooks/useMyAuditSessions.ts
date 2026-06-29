import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useHasActiveAudit(uid: string | undefined) {
  return useQuery({
    queryKey: ["my_active_audit", uid],
    queryFn: async () => {
      try {
        const q = query(collection(db, "audit_sessions"), orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        console.log("[audit hook] docs:", snap.size, "uid:", uid);
        const result = snap.docs.some(d => {
          const data = d.data();
          console.log("[audit hook] session:", data.status, data.assignedUsers);
          if (data.status !== "in_progress") return false;
          const users: string[] = data.assignedUsers ?? [];
          return users.includes(uid!) || users.includes("all");
        });
        console.log("[audit hook] hasActive:", result);
        return result;
      } catch (e) {
        console.error("[audit hook] error:", e);
        return false;
      }
    },
    enabled: !!uid,
    staleTime: 0,
  });
}
