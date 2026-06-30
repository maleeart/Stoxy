"use client";

import { useState } from "react";
import { collection, getDocs, writeBatch, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PREFIX: Record<string, string> = {
  meter: "MTR", tools: "TLS", safety: "SFT",
  electrical_parts: "ELP", cable: "CBL", spareparts: "SPR",
};

const CATEGORY_LABEL: Record<string, string> = {
  meter: "มิเตอร์และเครื่องวัด",
  tools: "เครื่องมือช่าง",
  safety: "อุปกรณ์ PPE",
  electrical_parts: "อุปกรณ์ไฟฟ้า",
  cable: "สายและท่อ",
  spareparts: "อะไหล่และวัสดุ",
};

type LogLine = { old: string; next: string; name: string };

export default function RecodePage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "preview" | "running" | "done">("idle");
  const [preview, setPreview] = useState<LogLine[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);

  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  async function loadPreview() {
    setStatus("preview");
    try {
      const [snap, prefixDoc] = await Promise.all([
        getDocs(collection(db, "inventory_items")),
        getDoc(doc(db, "settings", "prefixes")),
      ]);
      const prefixes: Record<string, string> = prefixDoc.exists()
        ? { ...DEFAULT_PREFIX, ...prefixDoc.data() }
        : DEFAULT_PREFIX;

      // Group by categoryId, sort by current numeric suffix to preserve order
      const groups = new Map<string, { id: string; name: string; code: string }[]>();
      for (const d of snap.docs) {
        const { categoryId, name, code } = d.data() as { categoryId: string; name: string; code: string };
        if (!groups.has(categoryId)) groups.set(categoryId, []);
        groups.get(categoryId)!.push({ id: d.id, name, code });
      }

      const lines: LogLine[] = [];
      for (const [cat, items] of groups.entries()) {
        const prefix = prefixes[cat] ?? "ITEM";
        // Sort by numeric part of current code (fallback: alphabetical)
        items.sort((a, b) => {
          const na = parseInt(a.code.replace(/\D/g, "") || "0");
          const nb = parseInt(b.code.replace(/\D/g, "") || "0");
          return na - nb || a.code.localeCompare(b.code);
        });
        items.forEach((item, idx) => {
          const next = `${prefix}-${String(idx + 1).padStart(3, "0")}`;
          lines.push({ old: item.code, next, name: item.name });
        });
      }
      setPreview(lines);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "เกิดข้อผิดพลาด");
      setStatus("idle");
    }
  }

  async function run() {
    setStatus("running");
    try {
      const [snap, prefixDoc] = await Promise.all([
        getDocs(collection(db, "inventory_items")),
        getDoc(doc(db, "settings", "prefixes")),
      ]);
      const prefixes: Record<string, string> = prefixDoc.exists()
        ? { ...DEFAULT_PREFIX, ...prefixDoc.data() }
        : DEFAULT_PREFIX;

      const groups = new Map<string, { id: string; name: string; code: string }[]>();
      for (const d of snap.docs) {
        const { categoryId, name, code } = d.data() as { categoryId: string; name: string; code: string };
        if (!groups.has(categoryId)) groups.set(categoryId, []);
        groups.get(categoryId)!.push({ id: d.id, name, code });
      }

      const updates: { id: string; code: string; old: string; name: string }[] = [];
      for (const [cat, items] of groups.entries()) {
        const prefix = prefixes[cat] ?? "ITEM";
        items.sort((a, b) => {
          const na = parseInt(a.code.replace(/\D/g, "") || "0");
          const nb = parseInt(b.code.replace(/\D/g, "") || "0");
          return na - nb || a.code.localeCompare(b.code);
        });
        items.forEach((item, idx) => {
          updates.push({ id: item.id, code: `${prefix}-${String(idx + 1).padStart(3, "0")}`, old: item.code, name: item.name });
        });
      }

      // Batch write (500 per batch)
      for (let i = 0; i < updates.length; i += 500) {
        const batch = writeBatch(db);
        for (const u of updates.slice(i, i + 500)) {
          batch.update(doc(db, "inventory_items", u.id), { code: u.code });
        }
        await batch.commit();
      }

      setLog(updates.map(u => ({ old: u.old, next: u.code, name: u.name })));
      setStatus("done");
      toast.success(`อัปเดต ${updates.length} รายการสำเร็จ`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "เกิดข้อผิดพลาด");
      setStatus("idle");
    }
  }

  if (!isAdmin) {
    return <AppShell title="ไม่มีสิทธิ์"><p className="text-center text-gray-500 py-20">เฉพาะผู้ดูแลระบบ</p></AppShell>;
  }

  const displayLines = status === "done" ? log : preview;

  return (
    <AppShell title="จัดเรียงรหัสใหม่">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/settings")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">จัดเรียงรหัสอุปกรณ์ใหม่</h2>
          <p className="text-sm text-gray-500 mb-1">
            กำหนดรหัสใหม่ตามหมวดหมู่ปัจจุบัน เช่น MTR-001, TLS-002 โดยใช้ prefix ที่ตั้งค่าไว้
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 mb-5">
            ⚠️ การดำเนินการนี้จะเปลี่ยนรหัสของอุปกรณ์ทุกชิ้น — ตรวจสอบ preview ก่อนยืนยัน
          </p>

          {status === "done" ? (
            <div className="flex items-center gap-2 text-emerald-600 font-medium mb-4">
              <CheckCircle className="w-5 h-5" />
              เสร็จแล้ว — อัปเดต {log.length} รายการ
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              {status === "idle" && (
                <button onClick={loadPreview} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <RefreshCw className="w-4 h-4" /> ดู Preview
                </button>
              )}
              {status === "preview" && (
                <>
                  <button onClick={run} className="flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                    ยืนยันจัดเรียงใหม่ ({preview.length} รายการ)
                  </button>
                  <button onClick={() => setStatus("idle")} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                    ยกเลิก
                  </button>
                </>
              )}
              {status === "running" && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังอัปเดต...
                </div>
              )}
            </div>
          )}

          {displayLines.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 grid grid-cols-[1fr_auto_auto] gap-3">
                <span>ชื่ออุปกรณ์</span>
                <span>รหัสเดิม</span>
                <span>รหัสใหม่</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {displayLines.map((l, i) => (
                  <div key={i} className="px-3 py-2 text-xs grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{l.name}</span>
                    <span className="font-mono text-red-500 shrink-0">{l.old}</span>
                    <span className="font-mono text-emerald-600 shrink-0">{l.next}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
