"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getLocations, addLocation } from "@/services/locations.service";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin";

  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  async function handleAdd() {
    const name = newLocation.trim();
    if (!name || locations.includes(name)) return;
    setSaving(true);
    try {
      const updated = await addLocation(name);
      setLocations(updated);
      setNewLocation("");
      toast.success("เพิ่มสถานที่แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(name: string) {
    const updated = locations.filter((l) => l !== name);
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "locations"), { items: updated });
      setLocations(updated);
      toast.success("ลบสถานที่แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="ตั้งค่า">
      <div className="max-w-lg space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">ตั้งค่าระบบ</h2>
          <p className="text-sm text-gray-500">จัดการข้อมูลพื้นฐานของระบบ</p>
        </div>

        {/* Locations */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">สถานที่จัดเก็บ</h3>
          </div>

          <div className="space-y-2 mb-4">
            <AnimatePresence>
              {locations.map((loc) => (
                <motion.div
                  key={loc}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <span className="text-sm text-gray-800 dark:text-gray-200">{loc}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(loc)}
                      disabled={saving}
                      className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="ชื่อสถานที่ใหม่..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                onClick={handleAdd}
                disabled={!newLocation.trim() || saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                เพิ่ม
              </button>
            </div>
          )}

          {!isAdmin && (
            <p className="text-xs text-gray-400">เฉพาะ Admin เท่านั้นที่แก้ไขได้</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
