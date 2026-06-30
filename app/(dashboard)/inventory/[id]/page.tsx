"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItem } from "@/hooks/useInventory";
import { statusConfig, formatDate, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft, Package, MapPin, Tag, Calendar, Wrench,
  Gauge, QrCode, FileText, Edit, AlertTriangle,
} from "lucide-react";
import { exportInventoryPDF } from "@/lib/export";
import { motion } from "framer-motion";

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: item, isLoading } = useInventoryItem(id);

  if (isLoading) {
    return (
      <AppShell title="รายละเอียดอุปกรณ์">
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell title="ไม่พบอุปกรณ์">
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">ไม่พบอุปกรณ์นี้</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">
            ← กลับ
          </button>
        </div>
      </AppShell>
    );
  }

  const statusCfg = statusConfig[item.status];
  const pct = item.quantity > 0 ? (item.quantityAvailable / item.quantity) * 100 : 0;

  return (
    <AppShell title={item.name}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportInventoryPDF([item])}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => router.push(`/inventory/${id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#1D4ED8] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            <Edit className="w-4 h-4" />
            แก้ไข
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
              {item.images?.[0] ? (
                <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                  {item.code}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.badge}`}>
                  {statusCfg.label}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{item.name}</h1>
              {(item.brand || item.model) && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {[item.brand, item.model].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Stock Bar */}
          <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">สต็อก</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {item.quantityAvailable} / {item.quantity}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>พร้อมใช้: {item.quantityAvailable}</span>
              <span>ถูกยืม: {item.quantityBorrowed}</span>
              <span>ซ่อม: {item.quantityUnderRepair}</span>
            </div>
            {(item.minStockLevel ?? 0) > 0 && item.quantityAvailable <= item.minStockLevel && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                สต็อกต่ำกว่าขั้นต่ำ ({item.minStockLevel})
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {item.unit && (
              <Info label="หน่วยนับ" value={item.unit} />
            )}
            {item.serialNumber && (
              <Info label="ซีเรียลนัมเบอร์" value={item.serialNumber} />
            )}
            {item.categoryName && (
              <Info label="หมวดหมู่" value={item.categoryName} icon={<Tag className="w-3.5 h-3.5" />} />
            )}
            {item.locationName && (
              <Info label="สถานที่" value={item.locationName} icon={<MapPin className="w-3.5 h-3.5" />} />
            )}
            {item.purchaseDate && (
              <Info label="วันที่จัดซื้อ" value={formatDate(item.purchaseDate)} icon={<Calendar className="w-3.5 h-3.5" />} />
            )}
            {item.purchasePrice && (
              <Info label="ราคา" value={formatCurrency(item.purchasePrice)} />
            )}
            {item.supplier && (
              <Info label="ผู้จำหน่าย" value={item.supplier} />
            )}
          </div>

          {item.notes && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1">หมายเหตุ</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{item.notes}</p>
            </div>
          )}
        </motion.div>

        {/* Side Cards */}
        <div className="space-y-4">
          {/* Calibration */}
          {item.requiresCalibration && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">สอบเทียบ</span>
              </div>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>ครั้งล่าสุด</span>
                  <span>{formatDate(item.calibration?.lastDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ครั้งถัดไป</span>
                  <span className={item.calibration?.nextDate && new Date() > item.calibration.nextDate.toDate() ? "text-red-500 font-medium" : ""}>
                    {formatDate(item.calibration?.nextDate)}
                  </span>
                </div>
                {item.calibration?.interval && (
                  <div className="flex justify-between">
                    <span>รอบการสอบเทียบ</span>
                    <span>{item.calibration.interval} วัน</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Maintenance */}
          {item.requiresMaintenance && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">ซ่อมบำรุง</span>
              </div>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>ครั้งล่าสุด</span>
                  <span>{formatDate(item.maintenance?.lastDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ครั้งถัดไป</span>
                  <span className={item.maintenance?.nextDate && new Date() > item.maintenance.nextDate.toDate() ? "text-red-500 font-medium" : ""}>
                    {formatDate(item.maintenance?.nextDate)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">QR Code</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 text-center">{item.qrCode ?? item.code}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <div className="flex items-center gap-1 mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  );
}
