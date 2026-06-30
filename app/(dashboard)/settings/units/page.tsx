"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const REF = doc(db, "settings", "units");
const DEFAULTS = ["อัน", "ชุด", "ตัว", "ม้วน", "เส้น", "แผ่น", "กล่อง", "ถุง", "คู่", "ชิ้น", "ขวด", "ก้อน"];

async function getUnits(): Promise<string[]> {
  const snap = await getDoc(REF);
  return snap.exists() ? (snap.data().items as string[]) : DEFAULTS;
}

export default function UnitsPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getUnits().then(setItems); }, []);

  async function handleAdd() {
    const name = input.trim();
    if (!name || items.includes(name)) return;
    const updated = [...items, name];
    setSaving(true);
    try {
      await setDoc(REF, { items: updated });
      setItems(updated);
      setInput("");
      toast.success("เพิ่มหน่วยแล้ว");
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  async function handleRemove(name: string) {
    const updated = items.filter((u) => u !== name);
    setSaving(true);
    try {
      await setDoc(REF, { items: updated });
      setItems(updated);
      toast.success("ลบแล้ว");
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  return (
    <AppShell title="หน่วยนับ">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/settings")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> ตั้งค่า
        </button>
        <div className="mb-4">
          <p className="text-sm text-gray-500">รายการหน่วยนับที่ใช้ตอนเพิ่มอุปกรณ์ใหม่ (แสดงเป็น dropdown ใน AddItem)</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">หน่วยนับ</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <AnimatePresence>
              {items.map((unit) => (
                <motion.div key={unit} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <span className="text-sm text-gray-800 dark:text-gray-200">{unit}</span>
                  {isAdmin && (
                    <button onClick={() => handleRemove(unit)} disabled={saving}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="เช่น ม้วน, แผ่น, กล่อง..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <button onClick={handleAdd} disabled={!input.trim() || saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Plus className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
