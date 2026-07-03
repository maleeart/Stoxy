"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, User } from "lucide-react";
import { updateStoxyUser } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { EmployeeType } from "@/types";

export function ProfileSetupModal() {
  const { stoxyUser, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(stoxyUser?.displayName ?? "");
  const [nickname, setNickname] = useState(stoxyUser?.nickname ?? "");
  const [employeeType, setEmployeeType] = useState<EmployeeType>("employee");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!displayName.trim()) { toast.error("กรุณากรอกชื่อ-สกุล"); return; }
    if (!department.trim()) { toast.error("กรุณากรอกหน่วยงาน"); return; }
    if (employeeType === "employee" && !employeeId.trim()) {
      toast.error("กรุณากรอกรหัสพนักงาน"); return;
    }
    try {
      setLoading(true);
      await updateStoxyUser(stoxyUser!.uid, {
        displayName: displayName.trim(),
        nickname: nickname.trim() || undefined,
        employeeType,
        employeeId: employeeType === "employee" ? employeeId.trim() : undefined,
        department: department.trim(),
        profileCompleted: true,
      });
      await refreshUser();
    } catch {
      toast.error("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] bg-gradient-to-br from-[#1D4ED8] to-[#0ea5c2] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1D4ED8] to-blue-400 px-6 pt-6 pb-5 text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">ยินดีต้อนรับสู่ STOXY</h2>
          <p className="text-sm text-white/80 mt-0.5">กรอกข้อมูลเพื่อเริ่มใช้งาน</p>
        </div>

        <div className="p-6 space-y-4">
          {/* ชื่อ-สกุล */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">
              ชื่อ-สกุล <span className="text-red-500">*</span>
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* ชื่อเล่น */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">
              ชื่อเล่น <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
            </label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="เช่น ชาย"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* ประเภท */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">
              ประเภท <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {([["employee", "พนักงาน"], ["contractor", "ลูกจ้าง"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEmployeeType(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    employeeType === val
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* รหัสพนักงาน (เฉพาะพนักงาน) */}
          {employeeType === "employee" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                รหัสพนักงาน <span className="text-red-500">*</span>
              </label>
              <input
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="เช่น 123456"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </motion.div>
          )}

          {/* หน่วยงาน */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">
              หน่วยงาน / แผนก <span className="text-red-500">*</span>
            </label>
            <input
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="เช่น หบอว-ธ."
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-[#1D4ED8] text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            บันทึกและเริ่มใช้งาน
          </button>
        </div>
      </motion.div>
    </div>
  );
}
