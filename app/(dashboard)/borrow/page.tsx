"use client";

import { useState } from "react";
import { Plus, Search, ScanLine, Clock, CheckCircle, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { getBorrowRecords, getPendingApprovals } from "@/services/borrow.service";
import { formatDate, formatRelative, borrowStatusConfig, cn } from "@/lib/utils";
import type { BorrowRecord, BorrowStatus } from "@/types";
import { motion } from "framer-motion";

const tabs: { label: string; value: BorrowStatus | "all" }[] = [
  { label: "ทั้งหมด", value: "all" },
  { label: "รออนุมัติ", value: "pending_approval" },
  { label: "ยืมอยู่", value: "borrowed" },
  { label: "เกินกำหนด", value: "overdue" },
  { label: "คืนแล้ว", value: "returned" },
];

export default function BorrowPage() {
  const [tab, setTab] = useState<BorrowStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["borrows", tab],
    queryFn: () =>
      tab === "all" ? getBorrowRecords() : getBorrowRecords(tab),
  });

  const filtered = search
    ? records.filter(
        (r) =>
          r.itemName.toLowerCase().includes(search.toLowerCase()) ||
          r.borrowerName.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  return (
    <AppShell title="ยืม-คืน">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกการยืม-คืน</h2>
          <p className="text-sm text-gray-500">{filtered.length} รายการ</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          สร้างคำขอยืม
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              tab === t.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาอุปกรณ์หรือผู้ยืม..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ไม่พบรายการ</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((record, i) => (
            <BorrowCard key={record.id} record={record} index={i} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function BorrowCard({ record, index }: { record: BorrowRecord; index: number }) {
  const cfg = borrowStatusConfig[record.status];
  const isOverdue =
    record.status === "borrowed" &&
    record.expectedReturnDate.toDate() < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border p-4 hover:shadow-md transition-all cursor-pointer",
        isOverdue
          ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10"
          : "border-gray-100 dark:border-gray-800"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            {isOverdue && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                เกินกำหนด
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {record.itemName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>ผู้ยืม: {record.borrowerName}</span>
            <span>·</span>
            <span>{record.borrowerDepartment}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">กำหนดคืน</p>
          <p
            className={cn(
              "text-sm font-semibold",
              isOverdue ? "text-red-600" : "text-gray-800 dark:text-gray-200"
            )}
          >
            {formatDate(record.expectedReturnDate)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatRelative(record.createdAt)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
