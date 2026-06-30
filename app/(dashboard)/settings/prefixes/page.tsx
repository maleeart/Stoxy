"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const REF = doc(db, "settings", "prefixes");

const CATEGORIES = [
  { id: "meter",           label: "มิเตอร์และเครื่องวัด" },
  { id: "tools",           label: "เครื่องมือช่าง" },
  { id: "safety",          label: "อุปกรณ์ PPE" },
  { id: "electrical_parts",label: "อุปกรณ์ไฟฟ้า" },
  { id: "cable",           label: "สายและท่อร้อยสาย" },
  { id: "spareparts",      label: "อะไหล่และวัสดุ" },
];

const HARDCODED: Record<string, string> = {
  meter: "MTR", tools: "TLS", safety: "SFT",
  electrical_parts: "ELP", cable: "CBL", spareparts: "SPR",
};

export default function PrefixesPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [prefixes, setPrefixes] = useState<Record<string, string>>(HARDCODED);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(REF).then((snap) => {
      if (snap.exists()) setPrefixes({ ...HARDCODED, ...snap.data() });
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(REF, prefixes);
      toast.success("บันทึกแล้ว");
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  function update(id: string, val: string) {
    setPrefixes((p) => ({ ...p, [id]: val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) }));
  }

  return (
    <AppShell title="รหัสอุปกรณ์">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/settings")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> ตั้งค่า
        </button>
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            รหัสนำหน้าของแต่ละหมวดหมู่ที่ใช้สร้างรหัสอุปกรณ์ เช่น <span className="font-mono text-blue-600">MTR-001</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">รหัสนำหน้าหมวดหมู่</h2>
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{cat.label}</p>
                <p className="text-xs text-gray-400">{cat.id}</p>
              </div>
              <input
                value={prefixes[cat.id] ?? HARDCODED[cat.id]}
                onChange={(e) => update(cat.id, e.target.value)}
                disabled={!isAdmin}
                maxLength={6}
                placeholder="MTR"
                className="w-24 text-center font-mono font-semibold px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-3">ตัวอย่างรหัสที่จะสร้าง: <span className="font-mono">{prefixes["meter"] ?? "MTR"}-001</span></p>
            {isAdmin && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
