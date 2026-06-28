"use client";

import { useState } from "react";
import { Gauge, Plus, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, formatDate, isDueSoon, isOverdue } from "@/lib/utils";
import { motion } from "framer-motion";

const mockCalibrations = [
  {
    id: "1",
    itemCode: "ELEC-001",
    itemName: "มิเตอร์วัดกระแส Fluke 376 FC",
    status: "scheduled",
    scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    lab: "ห้องปฏิบัติการสอบเทียบ กฟผ.",
    certificateNumber: "CAL-2024-001",
  },
  {
    id: "2",
    itemCode: "ELEC-015",
    itemName: "Insulation Tester Megger MIT400",
    status: "overdue",
    scheduledDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    lab: "ห้องปฏิบัติการสอบเทียบ กฟผ.",
    certificateNumber: "CAL-2023-015",
  },
  {
    id: "3",
    itemCode: "ELEC-030",
    itemName: "Power Quality Analyzer Fluke 435-II",
    status: "completed",
    scheduledDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
    lab: "NIMT สถาบันมาตรวิทยาแห่งชาติ",
    certificateNumber: "CAL-2024-030",
  },
];

const statusConfig = {
  scheduled: { label: "นัดสอบเทียบ", badge: "bg-blue-100 text-blue-700" },
  in_progress: { label: "กำลังสอบเทียบ", badge: "bg-yellow-100 text-yellow-700" },
  completed: { label: "ผ่านการสอบเทียบ", badge: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "เกินกำหนด", badge: "bg-red-100 text-red-700" },
};

export default function CalibrationPage() {
  return (
    <AppShell title="สอบเทียบ">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">การสอบเทียบ</h2>
          <p className="text-sm text-gray-500">ติดตามใบรับรองและวันหมดอายุ</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors">
          <Plus className="w-4 h-4" />
          บันทึกการสอบเทียบ
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 text-center border border-red-100 dark:border-red-900">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">1</p>
          <p className="text-xs text-gray-500">เกินกำหนด</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl p-4 text-center border border-yellow-100 dark:border-yellow-900">
          <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-600">1</p>
          <p className="text-xs text-gray-500">ใกล้หมดอายุ</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 text-center border border-emerald-100 dark:border-emerald-900">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-emerald-600">1</p>
          <p className="text-xs text-gray-500">ผ่านแล้ว</p>
        </div>
      </div>

      <div className="grid gap-3">
        {mockCalibrations.map((item, i) => {
          const cfg = statusConfig[item.status as keyof typeof statusConfig];
          const expired = item.expiryDate < new Date();
          const dueSoon = isDueSoon(item.expiryDate, 30);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "bg-white dark:bg-gray-900 rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer",
                expired
                  ? "border-red-200 dark:border-red-900"
                  : dueSoon
                  ? "border-yellow-200 dark:border-yellow-900"
                  : "border-gray-100 dark:border-gray-800"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/40 rounded-xl flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.itemName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ใบรับรอง: {item.certificateNumber} · {item.lab}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">หมดอายุ</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      expired
                        ? "text-red-600"
                        : dueSoon
                        ? "text-yellow-600"
                        : "text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {formatDate(item.expiryDate)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
