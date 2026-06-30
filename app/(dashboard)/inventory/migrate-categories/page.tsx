"use client";

import { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const REMAP: Record<string, string> = {
  electrical: "electrical_parts",
  others: "spareparts",
};

export default function MigrateCategoriesPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [log, setLog] = useState<string[]>([]);

  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  async function run() {
    setStatus("running");
    setLog([]);
    try {
      const snap = await getDocs(collection(db, "inventory_items"));
      const toMigrate = snap.docs.filter((d) => REMAP[d.data().categoryId]);
      if (toMigrate.length === 0) {
        setLog(["ไม่มีรายการที่ต้องอัปเดต"]);
        setStatus("done");
        return;
      }

      // Firestore batch limit = 500
      const chunks: typeof toMigrate[] = [];
      for (let i = 0; i < toMigrate.length; i += 500)
        chunks.push(toMigrate.slice(i, i + 500));

      const lines: string[] = [];
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const d of chunk) {
          const old = d.data().categoryId as string;
          const next = REMAP[old];
          batch.update(doc(db, "inventory_items", d.id), {
            categoryId: next,
            categoryName: { electrical_parts: "อุปกรณ์ไฟฟ้า", spareparts: "อะไหล่และวัสดุ" }[next] ?? next,
          });
          lines.push(`${d.data().name} : ${old} → ${next}`);
        }
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
    <AppShell title="Migrate หมวดหมู่">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push("/inventory")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Migrate หมวดหมู่</h2>
          <p className="text-sm text-gray-500 mb-4">
            อัปเดต categoryId ในฐานข้อมูลตามตาราง:
          </p>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2">เดิม</th>
                <th className="text-left pb-2">ใหม่</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(REMAP).map(([from, to]) => (
                <tr key={from} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-red-500">{from}</td>
                  <td className="py-2 font-mono text-emerald-600">{to}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {status === "done" ? (
            <div className="flex items-center gap-2 text-emerald-600 font-medium mb-4">
              <CheckCircle className="w-5 h-5" />
              เสร็จแล้ว — {log.length} รายการ
            </div>
          ) : (
            <button
              onClick={run}
              disabled={status === "running"}
              className="flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors mb-4"
            >
              {status === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "running" ? "กำลัง migrate..." : "เริ่ม Migrate"}
            </button>
          )}

          {log.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 max-h-60 overflow-y-auto text-xs space-y-1">
              {log.map((l, i) => <p key={i} className="text-gray-600 dark:text-gray-400">{l}</p>)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
