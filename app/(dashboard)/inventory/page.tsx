"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Package,
  Camera,
  ScanLine,
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
import { useInventoryItems, useDeleteInventoryItem } from "@/hooks/useInventory";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { statusConfig, formatDate, cn } from "@/lib/utils";
import type { InventoryItem, ItemStatus } from "@/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { AddItemDialog } from "@/components/inventory/AddItemDialog";
import { exportInventoryExcel } from "@/lib/export";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: items = [], isLoading } = useInventoryItems();
  const deleteMut = useDeleteInventoryItem();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success("ลบอุปกรณ์แล้ว");
      setDeleteTarget(null);
    } catch {
      toast.error("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  }

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
            {isAdmin && (
              <>
                <Link href={`/inventory/${row.original.id}/edit`}>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Edit className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </Link>
                <button
                  onClick={() => setDeleteTarget({ id: row.original.id, name: row.original.name })}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </>
            )}
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
      {!isAdmin && <MobileHeader title="คลังอุปกรณ์" actions={
        <button onClick={() => router.push("/scan?mode=inventory")}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
          <ScanLine className="w-5 h-5 text-gray-500" />
        </button>
      } />}
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
          <button onClick={() => router.push("/scan?mode=inventory")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">สแกน QR</span>
          </button>
          <Link href="/inventory/add-photos">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">เพิ่มรูป</span>
            </button>
          </Link>
          {isAdmin && (
            <>
              <button
                onClick={() => exportInventoryExcel(selectedItems.length > 0 ? selectedItems : filtered)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {selectedItems.length > 0 ? `ส่งออก (${selectedItems.length})` : "ส่งออก"}
                </span>
              </button>
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                เพิ่มอุปกรณ์
              </button>
            </>
          )}
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

      {/* Mobile card list */}
      <div className="block md:hidden space-y-2.5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
                    <div className="h-4 w-14 bg-gray-100 dark:bg-gray-800 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-3.5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                    <div className="h-3.5 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-10 bg-gray-100 dark:bg-gray-800 rounded" />
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <EmptyState
              icon={Package}
              title={search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีอุปกรณ์ในคลัง"}
              description={search ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เพิ่มอุปกรณ์ชิ้นแรกเพื่อเริ่มต้นใช้งาน"}
              action={isAdmin && !search ? { label: "+ เพิ่มอุปกรณ์", onClick: () => setShowAddDialog(true) } : undefined}
            />
          </div>
        ) : (
          filtered.map((item, i) => {
            const pct = item.quantity > 0 ? (item.quantityAvailable / item.quantity) * 100 : 0;
            const s = item.status as keyof typeof statusConfig;
            const cfg = statusConfig[s] ?? { badge: "bg-gray-100 text-gray-600", label: s };
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Link href={`/inventory/${item.id}`}>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 active:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-1">{item.name}</p>
                            {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">{item.code}</span>
                          {item.categoryName && <span className="text-xs text-gray-400">{item.categoryName}</span>}
                          {item.locationName && <span className="text-xs text-gray-400">· {item.locationName}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                            {item.quantityAvailable}/{item.quantity}{item.unit ? ` ${item.unit}` : ""}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
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

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">ยืนยันการลบ</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                ลบ <span className="font-medium text-gray-900 dark:text-white">{deleteTarget.name}</span> ออกจากระบบถาวร ไม่สามารถกู้คืนได้
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMut.isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {deleteMut.isPending ? "กำลังลบ..." : "ลบถาวร"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </AppShell>
  );
}
