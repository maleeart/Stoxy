"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { ShoppingCart, AlertTriangle, Download } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function PurchasePage() {
  const { data: items = [], isLoading } = useInventoryItems();

  const lowStock = useMemo(
    () =>
      items
        .filter((i) => (i.minStockLevel ?? 0) > 0 && i.quantityAvailable <= i.minStockLevel!)
        .sort((a, b) => a.quantityAvailable - b.quantityAvailable),
    [items]
  );

  function exportExcel() {
    const rows = lowStock.map((i) => ({
      รหัส: i.code,
      ชื่อ: i.name,
      คงเหลือ: i.quantityAvailable,
      ขั้นต่ำ: i.minStockLevel ?? 0,
      ต้องสั่ง: Math.max(0, (i.minStockLevel ?? 0) * 3 - i.quantityAvailable),
      ยี่ห้อ: i.brand ?? "",
      สถานที่: i.locationName ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายการต้องสั่งซื้อ");
    XLSX.writeFile(wb, `purchase-list-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <AppShell title="ต้องสั่งซื้อ">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">รายการต้องสั่งซื้อ</h2>
          <p className="text-sm text-gray-500">อุปกรณ์ที่สต็อกต่ำกว่าขั้นต่ำ {lowStock.length} รายการ</p>
        </div>
        {lowStock.length > 0 && (
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : lowStock.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">สต็อกทุกรายการอยู่ในระดับปกติ</p>
          </div>
        ) : (
          lowStock.map((item, i) => {
            const pct = item.minStockLevel
              ? (item.quantityAvailable / item.minStockLevel) * 100
              : 100;
            const urgent = item.quantityAvailable === 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-2xl border p-4",
                  urgent
                    ? "border-red-200 dark:border-red-900"
                    : "border-yellow-200 dark:border-yellow-900/50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      urgent ? "bg-red-100 dark:bg-red-950/40" : "bg-yellow-50 dark:bg-yellow-950/30"
                    )}>
                      <AlertTriangle className={cn("w-4 h-4", urgent ? "text-red-500" : "text-yellow-500")} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                          {item.code}
                        </span>
                        {urgent && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                            หมดแล้ว
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-lg font-bold", urgent ? "text-red-600" : "text-yellow-600")}>
                      {item.quantityAvailable}
                      <span className="text-xs font-normal text-gray-400">/{item.minStockLevel ?? 0} ขั้นต่ำ</span>
                    </p>
                    <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1 ml-auto">
                      <div
                        className={cn("h-full rounded-full", urgent ? "bg-red-500" : "bg-yellow-400")}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
