"use client";

import { useState } from "react";
import { Plus, Wrench, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

// Placeholder data
const mockMaintenance = [
  {
    id: "1",
    itemCode: "ELEC-001",
    itemName: "มิเตอร์วัดกระแสไฟฟ้า Fluke 376",
    type: "preventive",
    status: "scheduled",
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    description: "ตรวจสอบประจำปี",
    technician: "ช่างสมชาย",
  },
  {
    id: "2",
    itemCode: "ELEC-015",
    itemName: "เครื่องทดสอบฉนวน Megger MIT400",
    type: "corrective",
    status: "in_progress",
    scheduledDate: new Date(),
    description: "ซ่อมหน้าจอแสดงผล",
    technician: "ช่างวิชัย",
  },
  {
    id: "3",
    itemCode: "ELEC-022",
    itemName: "สว่านไฟฟ้า Bosch GSB 13 RE",
    type: "preventive",
    status: "completed",
    scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    description: "ล้างทำความสะอาด เปลี่ยนแปรงถ่าน",
    technician: "ช่างประสิทธิ์",
  },
];

const typeLabel = { preventive: "ป้องกัน", corrective: "แก้ไข", inspection: "ตรวจสอบ" };
const typeBadge = {
  preventive: "bg-blue-100 text-blue-700",
  corrective: "bg-orange-100 text-orange-700",
  inspection: "bg-purple-100 text-purple-700",
};
const statusConfig = {
  scheduled: { label: "นัดหมาย", icon: Calendar, color: "text-blue-600" },
  in_progress: { label: "กำลังดำเนินการ", icon: Clock, color: "text-orange-600" },
  completed: { label: "เสร็จแล้ว", icon: CheckCircle, color: "text-emerald-600" },
  cancelled: { label: "ยกเลิก", icon: AlertCircle, color: "text-gray-400" },
};

export default function MaintenancePage() {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? mockMaintenance
      : mockMaintenance.filter((m) => m.status === filter);

  return (
    <AppShell title="ซ่อมบำรุง">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ซ่อมบำรุง</h2>
          <p className="text-sm text-gray-500">ป้องกัน / แก้ไข / ตรวจสอบ</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          สร้างงานซ่อม
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "กำหนดการ", count: 2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "กำลังดำเนินการ", count: 1, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "เสร็จแล้ว", count: 1, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} dark:bg-opacity-20 rounded-2xl p-4 text-center`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "scheduled", "in_progress", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-xl border transition-all",
              filter === f
                ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            )}
          >
            {f === "all"
              ? "ทั้งหมด"
              : statusConfig[f as keyof typeof statusConfig]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-3">
        {filtered.map((item, i) => {
          const st = statusConfig[item.status as keyof typeof statusConfig];
          const StatusIcon = st.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        typeBadge[item.type as keyof typeof typeBadge]
                      }`}
                    >
                      {typeLabel[item.type as keyof typeof typeLabel]}
                    </span>
                    <span
                      className={`text-xs font-medium flex items-center gap-1 ${st.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.itemName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>ช่าง: {item.technician}</span>
                    <span>·</span>
                    <span>วันที่: {formatDate(item.scheduledDate)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
