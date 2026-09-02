"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import {
  ShoppingCart, AlertTriangle, FileSpreadsheet, FileText,
  Package, Tag, MapPin, Building2, X, ZoomIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { exportPurchasePDF, exportPurchaseExcel } from "@/lib/export";

export default function PurchasePage() {
  const { data: items = [], isLoading } = useInventoryItems();
  const [viewImage, setViewImage] = useState<string | null>(null);

  const lowStock = useMemo(
    () =>
      items
        .filter((i) => (i.minStockLevel ?? 0) > 0 && i.quantityAvailable <= i.minStockLevel!)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })),
    [items]
  );

  return (
    <AppShell title="ต้องสั่งซื้อ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">รายการต้องสั่งซื้อ</h2>
          <p className="text-sm text-gray-500">
            อุปกรณ์ที่สต็อกต่ำกว่าเกณฑ์ขั้นต่ำ{" "}
            <span className="font-semibold text-red-600">{lowStock.length}</span> รายการ
          </p>
        </div>

        {lowStock.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPurchasePDF(lowStock)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
            >
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </button>
            <button
              onClick={() => exportPurchaseExcel(lowStock)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel
            </button>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : lowStock.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <ShoppingCart className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">สต็อกทุกรายการอยู่ในระดับปกติ</p>
          </div>
        ) : (
          lowStock.map((item, i) => {
            const pct = item.minStockLevel
              ? (item.quantityAvailable / item.minStockLevel) * 100
              : 100;
            const urgent = item.quantityAvailable === 0;
            const hasImage = (item.images ?? []).length > 0;
            const orderQty = Math.max(1, (item.minStockLevel ?? 0) * 2 - item.quantityAvailable);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md",
                  urgent
                    ? "border-red-200 dark:border-red-900/60"
                    : "border-yellow-200 dark:border-yellow-900/50"
                )}
              >
                <div className="flex items-start gap-3.5">
                  {/* Image / Thumbnail with click to zoom */}
                  <div
                    onClick={() => hasImage && setViewImage(item.images![0])}
                    className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden relative border border-gray-200 dark:border-gray-700 group",
                      hasImage ? "cursor-pointer" : ""
                    )}
                  >
                    {hasImage ? (
                      <>
                        <img
                          src={item.images![0]}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </>
                    ) : (
                      <Package className="w-7 h-7 text-gray-400" />
                    )}
                    {urgent && (
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                        หมด
                      </span>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                            {item.code}
                          </span>
                          {urgent ? (
                            <span className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> หมดสต็อก
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> ต่ำกว่าเกณฑ์
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-snug">
                          {item.name}
                        </h3>
                      </div>

                      {/* Stock summary badge */}
                      <div className="text-right shrink-0">
                        <p className={cn("text-base sm:text-lg font-bold", urgent ? "text-red-600" : "text-amber-600")}>
                          {item.quantityAvailable}
                          <span className="text-xs font-normal text-gray-400">
                            {" "}/ ขั้นต่ำ {item.minStockLevel ?? 0} {item.unit ?? "ชิ้น"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Metadata details: Brand, Model, Category, Location, Supplier */}
                    <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                      {(item.brand || item.model) && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {[item.brand && `ยี่ห้อ: ${item.brand}`, item.model && `รุ่น: ${item.model}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                      {item.categoryName && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-gray-400" /> {item.categoryName}
                        </span>
                      )}
                      {item.locationName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" /> {item.locationName}
                        </span>
                      )}
                      {item.supplier && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" /> {item.supplier}
                        </span>
                      )}
                    </div>

                    {/* Footer: Suggested order quantity & Progress bar */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg">
                        แนะนำสั่งซื้อ: +{orderQty} {item.unit ?? "ชิ้น"}
                      </span>

                      <div className="w-24 sm:w-32 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              urgent ? "bg-red-500" : "bg-amber-400"
                            )}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">{Math.round(pct)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {viewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewImage(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center">
              <button
                onClick={() => setViewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={viewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
