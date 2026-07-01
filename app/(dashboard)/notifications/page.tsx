"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { getRequisitions } from "@/services/requisition.service";
import { getBorrowRecords } from "@/services/borrow.service";
import { getAuditSessions } from "@/services/audit.service";
import {
  AlertTriangle, PackageOpen, Clock, Bell,
  ArrowLeftRight, ShieldCheck, CheckCircle2, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type NotifGroup = {
  id: string;
  type: "borrow_pending" | "borrow_overdue" | "req_pending" | "audit_review" | "low_stock";
  title: string;
  subtitle: string;
  href: string;
  urgent: boolean;
  date?: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { data: items = [] } = useInventoryItems();
  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions", "all"],
    queryFn: () => getRequisitions(),
  });
  const { data: borrows = [] } = useQuery({
    queryKey: ["borrows", "all"],
    queryFn: () => getBorrowRecords(),
  });
  const { data: auditSessions = [] } = useQuery({
    queryKey: ["audit_sessions"],
    queryFn: getAuditSessions,
  });

  const now = new Date();

  const groups = useMemo(() => {
    const result: NotifGroup[] = [];

    // 1. Audit pending approval — most urgent for admin
    auditSessions
      .filter((s) => s.status === "pending_approval")
      .forEach((s) => {
        result.push({
          id: `audit_${s.id}`,
          type: "audit_review",
          title: `ตรวจนับรออนุมัติ: ${s.name}`,
          subtitle: `ช่างส่งผลตรวจนับ กรุณาตรวจสอบและอนุมัติ`,
          href: `/audit/${s.id}`,
          urgent: true,
          date: formatDate(s.updatedAt),
        });
      });

    // 2. Borrow pending approval
    borrows
      .filter((b) => b.status === "pending_approval")
      .forEach((b) => {
        result.push({
          id: `borrow_pending_${b.id}`,
          type: "borrow_pending",
          title: `ยืม: ${b.itemName}`,
          subtitle: `${b.borrowerName} · ${b.borrowerDepartment ?? ""}`,
          href: "/borrow",
          urgent: false,
          date: formatDate(b.createdAt),
        });
      });

    // 3. Requisition pending
    requisitions
      .filter((r) => r.status === "pending")
      .forEach((r) => {
        result.push({
          id: `req_${r.id}`,
          type: "req_pending",
          title: `เบิก: ${r.itemName}`,
          subtitle: `${r.requesterName} · จำนวน ${r.quantity}`,
          href: "/requisition",
          urgent: false,
          date: formatDate(r.createdAt),
        });
      });

    // 4. Overdue borrows
    borrows
      .filter((b) => b.status === "borrowed" && b.expectedReturnDate.toDate() < now)
      .forEach((b) => {
        const days = Math.floor((now.getTime() - b.expectedReturnDate.toDate().getTime()) / 86400000);
        result.push({
          id: `overdue_${b.id}`,
          type: "borrow_overdue",
          title: `เกินกำหนด: ${b.itemName}`,
          subtitle: `${b.borrowerName} · เกิน ${days} วัน`,
          href: "/operations",
          urgent: true,
          date: b.expectedReturnDate.toDate().toLocaleDateString("th-TH"),
        });
      });

    // 5. Low stock
    items
      .filter((i) => i.quantityAvailable <= (i.minStockLevel ?? 0) && i.minStockLevel > 0)
      .forEach((i) => {
        result.push({
          id: `stock_${i.id}`,
          type: "low_stock",
          title: `สต็อกต่ำ: ${i.name}`,
          subtitle: `เหลือ ${i.quantityAvailable} / ขั้นต่ำ ${i.minStockLevel}`,
          href: "/purchase",
          urgent: i.quantityAvailable === 0,
          date: i.code,
        });
      });

    return result;
  }, [items, requisitions, borrows, auditSessions]);

  // Sort: urgent first
  const sorted = [...groups].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const urgentCount = sorted.filter((n) => n.urgent).length;

  const iconMap: Record<NotifGroup["type"], React.ReactNode> = {
    audit_review: <ShieldCheck className="w-4 h-4 text-white" />,
    borrow_pending: <ArrowLeftRight className="w-4 h-4 text-white" />,
    req_pending: <PackageOpen className="w-4 h-4 text-white" />,
    borrow_overdue: <Clock className="w-4 h-4 text-white" />,
    low_stock: <AlertTriangle className="w-4 h-4 text-white" />,
  };

  const colorMap: Record<NotifGroup["type"], string> = {
    audit_review: "bg-red-500",
    borrow_overdue: "bg-orange-500",
    borrow_pending: "bg-[#1D4ED8]",
    req_pending: "bg-amber-500",
    low_stock: "bg-rose-400",
  };

  const labelMap: Record<NotifGroup["type"], string> = {
    audit_review: "ตรวจนับ",
    borrow_overdue: "เกินกำหนด",
    borrow_pending: "รออนุมัติยืม",
    req_pending: "รออนุมัติเบิก",
    low_stock: "สต็อกต่ำ",
  };

  return (
    <AppShell title="แจ้งเตือน">
      {/* Header summary */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">การแจ้งเตือน</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {sorted.length} รายการรอดำเนินการ
            {urgentCount > 0 && (
              <span className="ml-2 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {urgentCount} เร่งด่วน
              </span>
            )}
          </p>
        </div>
        <Bell className="w-5 h-5 text-gray-300 mt-1" />
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">ทุกอย่างเรียบร้อย</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ไม่มีรายการที่ต้องดำเนินการ</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((n, i) => (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => router.push(n.href)}
              className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border p-4 flex items-center gap-3.5 active:scale-[0.98] transition-all hover:border-gray-200 dark:hover:border-gray-600 shadow-sm ${
                n.urgent ? "border-red-100 dark:border-red-900/40 shadow-red-50" : "border-gray-100 dark:border-gray-700"
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${colorMap[n.type]}`}>
                {iconMap[n.type]}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                    n.urgent ? "bg-red-50 dark:bg-red-900/40 text-red-500" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}>
                    {labelMap[n.type]}
                  </span>
                  {n.urgent && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{n.title}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{n.subtitle}</p>
              </div>

              {/* Date + arrow */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                {n.date && <span className="text-[10px] text-gray-400">{n.date}</span>}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
