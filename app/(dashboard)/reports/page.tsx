"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems, useDashboardStats } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { getBorrowRecords } from "@/services/borrow.service";
import { getRecentMovements } from "@/services/inventory.service";
import { exportInventoryPDF, exportBorrowsPDF, exportInventoryExcel, exportMovementsExcel } from "@/lib/export";
import { FileText, FileSpreadsheet, Download, Package, ArrowLeftRight, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const { data: stats } = useDashboardStats();
  const { data: items = [] } = useInventoryItems();
  const { data: borrows = [] } = useQuery({
    queryKey: ["borrow_records"],
    queryFn: () => getBorrowRecords(),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["movements_all"],
    queryFn: () => getRecentMovements(500),
  });

  const reports = [
    {
      title: "รายงานคลังอุปกรณ์",
      description: `${items.length} รายการอุปกรณ์ทั้งหมด`,
      icon: <Package className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      actions: [
        { label: "PDF", icon: <FileText className="w-4 h-4" />, fn: () => exportInventoryPDF(items) },
        { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, fn: () => exportInventoryExcel(items) },
      ],
    },
    {
      title: "รายงานการยืม-คืน",
      description: `${borrows.length} รายการ`,
      icon: <ArrowLeftRight className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      actions: [
        { label: "PDF", icon: <FileText className="w-4 h-4" />, fn: () => exportBorrowsPDF(borrows) },
      ],
    },
    {
      title: "ประวัติการเคลื่อนไหว",
      description: `${movements.length} รายการล่าสุด`,
      icon: <Activity className="w-5 h-5 text-purple-600" />,
      bg: "bg-purple-50 dark:bg-purple-900/20",
      actions: [
        { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, fn: () => exportMovementsExcel(movements) },
      ],
    },
  ];

  return (
    <AppShell title="รายงาน">
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "รายการทั้งหมด", value: stats.totalItems },
            { label: "พร้อมใช้งาน", value: stats.availableQuantity },
            { label: "ถูกยืม", value: stats.borrowedQuantity },
            { label: "สต็อกต่ำ", value: stats.lowStockCount },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">รายงาน</h2>
        <p className="text-sm text-gray-500">ส่งออกข้อมูลเป็น PDF หรือ Excel</p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5"
          >
            <div className={`w-10 h-10 rounded-xl ${r.bg} flex items-center justify-center mb-3`}>
              {r.icon}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5">{r.title}</h3>
            <p className="text-xs text-gray-400 mb-4">{r.description}</p>
            <div className="flex gap-2">
              {r.actions.map((a, j) => (
                <button
                  key={j}
                  onClick={a.fn}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {a.icon}
                  {a.label}
                  <Download className="w-3 h-3 text-gray-400" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
