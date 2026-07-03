"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, PackageOpen, Eye } from "lucide-react";
import { createAccessRequest } from "@/services/accessRequest.service";
import { updateStoxyUser } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function RoleRequestModal({ onDone }: { onDone: () => void }) {
  const { stoxyUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    if (!stoxyUser) return;
    try {
      setLoading(true);
      await createAccessRequest(
        stoxyUser.uid,
        stoxyUser.displayName,
        stoxyUser.email,
        stoxyUser.department,
        stoxyUser.employeeType,
      );
      await updateStoxyUser(stoxyUser.uid, { accessRequested: true });
      await refreshUser();
      toast.success("ส่งคำขอสิทธิ์เรียบร้อย รอ Admin อนุมัติ");
      onDone();
    } catch {
      toast.error("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewOnly() {
    if (!stoxyUser) return;
    await updateStoxyUser(stoxyUser.uid, { accessRequested: false });
    await refreshUser();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ต้องการทำอะไร?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            สวัสดี {stoxyUser?.nickname || stoxyUser?.displayName} — เลือกระดับการใช้งานที่ต้องการ
          </p>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleRequest}
              disabled={loading}
              className="w-full flex items-start gap-4 p-4 rounded-2xl border-2 border-[#1D4ED8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center shrink-0">
                {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <PackageOpen className="w-5 h-5 text-white" />}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">ขอสิทธิ์ยืม / เบิกอุปกรณ์</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ส่งคำขอให้ Admin อนุมัติ ระหว่างรอยังดูข้อมูลได้ปกติ</p>
              </div>
            </button>

            <button
              onClick={handleViewOnly}
              className="w-full flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">ดูข้อมูลเฉยๆ</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">เข้าดูสต็อก รายงาน โดยไม่ต้องยืม/เบิก</p>
              </div>
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            สามารถขอเปลี่ยนสิทธิ์ได้ภายหลังที่หน้าโปรไฟล์
          </p>
        </div>
      </motion.div>
    </div>
  );
}
