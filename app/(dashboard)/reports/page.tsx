"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { getBorrowRecords } from "@/services/borrow.service";
import { getRecentMovements } from "@/services/inventory.service";
import { getRequisitions } from "@/services/requisition.service";
import {
  exportInventoryPDF, exportInventoryExcel,
  exportBorrowsPDF, exportBorrowsExcel,
  exportMovementsPDF, exportMovementsExcel,
  exportRequisitionsPDF, exportRequisitionsExcel,
} from "@/lib/export";
import { FileText, FileSpreadsheet, Package, ArrowLeftRight, Activity, PackageOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const { data: items = [] } = useInventoryItems();
  const { data: borrows = [] } = useQuery({
    queryKey: ["borrow_records"],
    queryFn: () => getBorrowRecords(),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["movements_all"],
    queryFn: () => getRecentMovements(500),
  });
  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions_all"],
    queryFn: () => getRequisitions(),
  });

  const reports = [
    {
      title: "รายงานคลังอุปกรณ์",
      description: `${items.length} รายการ`,
      icon: <Package className="w-5 h-5 text-blue-700" />,
      iconBg: "bg-blue-100",
      accent: "border-l-4 border-blue-500",
      btnClass: "border-blue-200 text-blue-700 hover:bg-blue-50",
      actions: [
        { label: "PDF", icon: <FileText className="w-4 h-4" />, fn: () => exportInventoryPDF(items) },
        { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, fn: () => exportInventoryExcel(items) },
      ],
    },
    {
      title: "รายงานการยืม-คืน",
      description: `${borrows.length} รายการ`,
      icon: <ArrowLeftRight className="w-5 h-5 text-emerald-700" />,
      iconBg: "bg-emerald-100",
      accent: "border-l-4 border-emerald-500",
      btnClass: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      actions: [
        { label: "PDF", icon: <FileText className="w-4 h-4" />, fn: () => exportBorrowsPDF(borrows) },
        { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, fn: () => exportBorrowsExcel(borrows) },
      ],
    },
    {
      title: "รายงานการเบิกวัสดุ",
      description: `${requisitions.length} รายการ`,
      icon: <PackageOpen className="w-5 h-5 text-amber-700" />,
      iconBg: "bg-amber-100",
      accent: "border-l-4 border-amber-500",
      btnClass: "border-amber-200 text-amber-700 hover:bg-amber-50",
      actions: [
        { label: "PDF", icon: <FileText className="w-4 h-4" />, fn: () => exportRequisitionsPDF(requisitions) },
        { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, fn: () => exportRequisitionsExcel(requisitions) },
      ],
    },
    {
      title: "ประวัติการเคลื่อนไหว",
      description: `${movements.length} รายการล่าสุด`,
      icon: <Activity className="w-5 h-5 text-purple-700" />,
      iconBg: "bg-purple-100",
      accent: "border-l-4 border-purple-500",
      btnClass: "border-purple-200 text-purple-700 hover:bg-purple-50",
      actions: [
        { label: "PDF", icon: <FileText className="w-4 h-4" />, fn: () => exportMovementsPDF(movements) },
        { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, fn: () => exportMovementsExcel(movements) },
      ],
    },
  ];

  return (
    <AppShell title="รายงาน">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">ส่งออกรายงาน</h2>
        <p className="text-sm text-gray-500">เลือกรูปแบบ PDF หรือ Excel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {reports.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 ${r.accent} p-5 shadow-sm`}
          >
            <div className={`w-10 h-10 rounded-xl ${r.iconBg} flex items-center justify-center mb-3`}>
              {r.icon}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-0.5">{r.title}</h3>
            <p className="text-xs text-gray-500 mb-4">{r.description}</p>
            <div className="flex gap-2">
              {r.actions.map((a, j) => (
                <button
                  key={j}
                  onClick={a.fn}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-xl transition-colors ${r.btnClass}`}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
