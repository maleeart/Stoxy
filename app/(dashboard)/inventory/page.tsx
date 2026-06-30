"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  QrCode,
  Printer,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Package,
  Camera,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryItems } from "@/hooks/useInventory";
import { statusConfig, formatDate, cn } from "@/lib/utils";
import type { InventoryItem, ItemStatus } from "@/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { exportInventoryExcel } from "@/lib/export";

const statusFilters: { label: string; value: ItemStatus | "all" }[] = [
  { label: "ทั้งหมด", value: "all" },
  { label: "พร้อมใช้งาน", value: "available" },
  { label: "ถูกยืม", value: "borrowed" },
];

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "meter", label: "มิเตอร์วัด" },
  { id: "tools", label: "เครื่องมือช่าง" },
  { id: "safety", label: "PPE" },
  { id: "electrical_parts", label: "อุปกรณ์ไฟฟ้า" },
  { id: "cable", label: "สายและท่อ" },
  { id: "spareparts", label: "อะไหล่และวัสดุ" },
];

export default function InventoryPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: items = [], isLoading } = useInventoryItems();

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    if (categoryFilter !== "all") result = result.filter((i) => i.categoryId === categoryFilter);
    if (!search) return result;
    const lower = search.toLowerCase();
    return result.filter(
      (i) =>
        i.name.toLowerCase().includes(lower) ||
        i.code.toLowerCase().includes(lower) ||
        i.serialNumber?.toLowerCase().includes(lower) ||
        i.brand?.toLowerCase().includes(lower)
    );
  }, [items, search, statusFilter, categoryFilter]);

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded"
          />
        ),
        size: 40,
      },
      {
        accessorKey: "code",
        header: "รหัส",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "ชื่ออุปกรณ์",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
              {row.original.images?.[0] ? (
                <img
                  src={row.original.images[0]}
                  alt={row.original.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                {row.original.name}
              </p>
              {row.original.brand && (
                <p className="text-xs text-gray-400">{row.original.brand}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "หมวดหมู่",
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {(getValue() as string) || "-"}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: "คงเหลือ",
        cell: ({ row }) => {
          const item = row.original;
          const pct =
            item.quantity > 0 ? (item.quantityAvailable / item.quantity) * 100 : 0;
          return (
            <div className="flex items-center gap-2">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.quantityAvailable}/{item.quantity}
                </span>
                {item.unit && (
                  <span className="ml-1 text-xs text-gray-400">{item.unit}</span>
                )}
              </div>
              <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "สถานะ",
        cell: ({ getValue }) => {
          const s = getValue() as keyof typeof statusConfig;
          const cfg = statusConfig[s] ?? { badge: "bg-gray-100 text-gray-600", label: s };
          return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
              {cfg.label}
            </span>
          );
        },
      },
      {
        accessorKey: "locationName",
        header: "สถานที่",
        cell: ({ getValue }) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(getValue() as string) || "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`/inventory/${row.original.id}`}>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Eye className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </Link>
            <Link href={`/inventory/${row.original.id}/edit`}>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Edit className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </Link>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <QrCode className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        ),
        size: 100,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    initialState: { pagination: { pageSize: 20 } },
  });

  const selectedItems = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <AppShell title="คลังอุปกรณ์">
      {!isAdmin && <MobileHeader title="คลังอุปกรณ์" />}
      <div className="px-4 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            คลังอุปกรณ์ไฟฟ้า
          </h2>
          <p className="text-sm text-gray-500">
            {filtered.length.toLocaleString("th-TH")} รายการ
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportInventoryExcel(selectedItems.length > 0 ? selectedItems : filtered)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">
              {selectedItems.length > 0 ? `ส่งออก (${selectedItems.length})` : "ส่งออก"}
            </span>
          </button>

          <Link href="/inventory/add-photos">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">เพิ่มรูป</span>
            </button>
          </Link>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            เพิ่มอุปกรณ์
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา ชื่อ รหัส ยี่ห้อ ซีเรียล..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          />
        </div>
        {/* Status + Category */}
        <div className="flex gap-2 flex-wrap items-center">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-xl border transition-all",
                statusFilter === f.value
                  ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
              )}
            >
              {f.label}
            </button>
          ))}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={cn(
              "ml-auto px-3 py-1.5 text-xs font-medium rounded-xl border transition-all appearance-none cursor-pointer",
              categoryFilter !== "all"
                ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            )}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50"
                >
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">ไม่พบรายการอุปกรณ์</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-50 dark:border-gray-800/60 group hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500">
            หน้า {table.getState().pagination.pageIndex + 1} จาก{" "}
            {table.getPageCount()} ({filtered.length} รายการ)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ก่อนหน้า
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      <AddItemDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
      </div>
    </AppShell>
  );
}
