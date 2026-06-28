"use client";

import { Bell, Package, Clock, AlertTriangle, Gauge, CheckSquare } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, formatRelative } from "@/lib/utils";
import { motion } from "framer-motion";

const mockNotifications = [
  {
    id: "1",
    type: "low_stock",
    title: "สต็อกต่ำ",
    message: "มิเตอร์วัดกระแส Fluke 376 เหลือ 1 ชิ้น (ต่ำกว่าขั้นต่ำ 3 ชิ้น)",
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    icon: AlertTriangle,
    color: "text-red-500 bg-red-50",
  },
  {
    id: "2",
    type: "overdue_borrow",
    title: "เกินกำหนดคืน",
    message: "นายสมชาย ชาญวิทย์ ยืม สว่านไฟฟ้า Bosch เกินกำหนดแล้ว 3 วัน",
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    icon: Clock,
    color: "text-orange-500 bg-orange-50",
  },
  {
    id: "3",
    type: "calibration_due",
    title: "สอบเทียบใกล้ครบกำหนด",
    message: "Insulation Tester Megger MIT400 หมดอายุสอบเทียบใน 7 วัน",
    isRead: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    icon: Gauge,
    color: "text-purple-500 bg-purple-50",
  },
  {
    id: "4",
    type: "approval_required",
    title: "รออนุมัติการยืม",
    message: "นายวิชัย ดีมาก ขอยืม Oscilloscope Tektronix TBS1052B จำนวน 1 เครื่อง",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    icon: CheckSquare,
    color: "text-blue-500 bg-blue-50",
  },
];

export default function NotificationsPage() {
  const unreadCount = mockNotifications.filter((n) => !n.isRead).length;

  return (
    <AppShell title="แจ้งเตือน">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            การแจ้งเตือน
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full font-medium">
                {unreadCount} ใหม่
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">ทั้งหมด {mockNotifications.length} รายการ</p>
        </div>
        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          ทำเครื่องหมายอ่านทั้งหมด
        </button>
      </div>

      <div className="space-y-2">
        {mockNotifications.map((n, i) => {
          const Icon = n.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-sm",
                n.isRead
                  ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                  : "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
              )}
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", n.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      n.isRead
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-900 dark:text-white"
                    )}
                  >
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {formatRelative(n.createdAt)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
