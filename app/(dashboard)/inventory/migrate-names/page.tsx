"use client";

import { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MigrateNamesPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [log, setLog] = useState<string[]>([]);

  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  async function run() {
    setStatus("running");
    setLog([]);
    try {
      // 1. Build uid → displayName map
      const usersSnap = await getDocs(collection(db, "users"));
      const nameMap: Record<string, string> = {};
      usersSnap.docs.forEach((d) => {
        const u = d.data();
        if (u.uid && u.displayName) nameMap[u.uid] = u.displayName;
      });

      // 2. Find movements where performedByName is itself a UID (key in nameMap)
      const movSnap = await getDocs(collection(db, "stock_movements"));
      const toFix = movSnap.docs.filter((d) => {
        const m = d.data();
        return m.performedByName && nameMap[m.performedByName];
      });

      if (toFix.length === 0) {
        setLog(["ไม่มีรายการที่ต้องอัปเดต"]);
        setStatus("done");
        return;
      }

      const lines: string[] = [];
      for (let i = 0; i < toFix.length; i += 500) {
        const batch = writeBatch(db);
        toFix.slice(i, i + 500).forEach((d) => {
          const uid = d.data().performedByName as string;
          const name = nameMap[uid];
          batch.update(doc(db, "stock_movements", d.id), { performedByName: name });
          lines.push(`${d.data().itemName} : ${uid} → ${name}`);
        });
        await batch.commit();
      }

      setLog(lines);
      setStatus("done");
      toast.success(`อัปเดต ${lines.length} รายการสำเร็จ`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "เกิดข้อผิดพลาด");
      setStatus("idle");
    }
  }

  if (!isAdmin) {
    return (
      <AppShell title="ไม่มีสิทธิ์">
        <p className="text-center text-gray-500 py-20">เฉพาะผู้ดูแลระบบ</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Migrate ชื่อผู้ดำเนินการ">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/inventory")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">แก้ชื่อผู้ดำเนินการ</h2>
          <p className="text-sm text-gray-500 mb-6">
            อัปเดตประวัติการเคลื่อนไหวที่บันทึก UID แทนชื่อ ให้แสดงเป็น displayName
          </p>

          {status === "done" ? (
            <div className="flex items-center gap-2 text-emerald-600 font-medium mb-4">
              <CheckCircle className="w-5 h-5" /> เสร็จแล้ว — {log.length} รายการ
            </div>
          ) : (
            <button
              onClick={run}
              disabled={status === "running"}
              className="flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 mb-4"
            >
              {status === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "running" ? "กำลัง migrate..." : "เริ่ม Migrate"}
            </button>
          )}

          {log.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 max-h-64 overflow-y-auto text-xs space-y-1">
              {log.map((l, i) => <p key={i} className="text-gray-600 dark:text-gray-400">{l}</p>)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
