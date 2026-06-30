"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLocations, addLocation } from "@/services/locations.service";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function LocationsPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getLocations().then(setItems); }, []);

  async function handleAdd() {
    const name = input.trim();
    if (!name || items.includes(name)) return;
    setSaving(true);
    try {
      setItems(await addLocation(name));
      setInput("");
      toast.success("เพิ่มสถานที่แล้ว");
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  async function handleRemove(name: string) {
    const updated = items.filter((l) => l !== name);
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "locations"), { items: updated });
      setItems(updated);
      toast.success("ลบแล้ว");
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  return (
    <AppShell title="สถานที่จัดเก็บ">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/settings")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> ตั้งค่า
        </button>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">สถานที่จัดเก็บ</h2>
          <div className="space-y-2 mb-4">
            <AnimatePresence>
              {items.map((loc) => (
                <motion.div key={loc} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-sm text-gray-800 dark:text-gray-200">{loc}</span>
                  {isAdmin && (
                    <button onClick={() => handleRemove(loc)} disabled={saving}
                      className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="ชื่อสถานที่ใหม่..."
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
