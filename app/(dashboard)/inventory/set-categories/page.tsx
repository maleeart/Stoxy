"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useInventoryItems } from "@/hooks/useInventory";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "meter", label: "มิเตอร์และเครื่องวัด" },
  { id: "tools", label: "เครื่องมือช่าง" },
  { id: "safety", label: "อุปกรณ์ PPE" },
  { id: "electrical_parts", label: "อุปกรณ์ไฟฟ้า" },
  { id: "cable", label: "สายและท่อร้อยสาย" },
  { id: "spareparts", label: "อะไหล่และวัสดุ" },
];
const LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

export default function SetCategoriesPage() {
  const router = useRouter();
  const { data: items = [], isLoading, refetch } = useInventoryItems();
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [local, setLocal] = useState<Record<string, string>>({});

  async function save(itemId: string) {
    const cat = local[itemId];
    if (!cat) return;
    setSaving((p) => ({ ...p, [itemId]: true }));
    try {
      await updateDoc(doc(db, "inventory_items", itemId), {
        categoryId: cat,
        categoryName: LABEL[cat] ?? cat,
      });
      refetch();
      toast.success("บันทึกแล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving((p) => ({ ...p, [itemId]: false }));
    }
  }

  return (
    <AppShell title="ตั้งหมวดหมู่รายการ">
      <button onClick={() => router.push("/inventory")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const current = local[item.id] ?? item.categoryId;
            const changed = local[item.id] && local[item.id] !== item.categoryId;
            return (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.images?.[0]
                    ? <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                    : <Package className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.code}</p>
                </div>
                <select
                  value={current}
                  onChange={(e) => setLocal((p) => ({ ...p, [item.id]: e.target.value }))}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => save(item.id)}
                  disabled={!changed || saving[item.id]}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition-all disabled:opacity-30 bg-[#1D4ED8] text-white hover:bg-blue-700 disabled:cursor-not-allowed"
                >
                  {saving[item.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  บันทึก
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
