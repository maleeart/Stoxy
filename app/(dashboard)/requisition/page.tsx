"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import {
  createRequisition, getRequisitions, getMyRequisitions,
  approveRequisition, rejectRequisition,
} from "@/services/requisition.service";
import { formatDateTime, cn } from "@/lib/utils";
import {
  PackageOpen, Search, X, CheckCircle, XCircle, Plus, Minus,
  ShoppingCart, MapPin, Package,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { InventoryItem } from "@/types";

// ── Shared ─────────────────────────────────────────────────────────────────────
const statusBadge = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
const statusLabel = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ" };

// เบิกได้: ของสิ้นเปลือง/ทดแทน — เครื่องมือ/มิเตอร์/ความปลอดภัยใช้เมนูยืม
const WITHDRAWABLE = new Set(["electrical", "cable", "spareparts", "others"]);

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "electrical", label: "ไฟฟ้า" },
  { id: "cable", label: "สายไฟ" },
  { id: "spareparts", label: "อะไหล่" },
  { id: "others", label: "อื่นๆ" },
];

type CartItem = { itemId: string; itemCode: string; itemName: string; qty: number; maxQty: number };

// ── Staff Requisition Page (shopping cart) ─────────────────────────────────────
function StaffRequisitionPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useInventoryItems();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purpose, setPurpose] = useState("");

  const available = items.filter(i => i.quantityAvailable > 0 && WITHDRAWABLE.has(i.categoryId));
  const filtered = available.filter(i => {
    const matchCat = category === "all" || i.categoryId === category;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.itemId === item.id);
      if (existing) return prev.map(c => c.itemId === item.id ? { ...c, qty: Math.min(c.qty + 1, c.maxQty) } : c);
      return [...prev, { itemId: item.id, itemCode: item.code, itemName: item.name, qty: 1, maxQty: item.quantityAvailable }];
    });
  };

  const updateQty = (itemId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(c => c.itemId !== itemId)); return; }
    setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, qty: Math.min(qty, c.maxQty) } : c));
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  const submitMut = useMutation({
    mutationFn: async () => {
      for (const c of cart) {
        await createRequisition({
          itemId: c.itemId, itemCode: c.itemCode, itemName: c.itemName,
          quantity: c.qty, purpose,
          requesterId: stoxyUser?.uid ?? "",
          requesterName: stoxyUser?.displayName ?? "ไม่ระบุ",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success(`ส่งคำขอเบิก ${cart.length} รายการสำเร็จ`);
      setCart([]); setPurpose(""); setShowConfirm(false);
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Unified header */}
      <MobileHeader
        title="เบิกของ"
        actions={cart.length > 0 ? (
          <button onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            <ShoppingCart className="w-4 h-4" />{cart.length}
          </button>
        ) : undefined}
      />

      {/* Sub-header: search + chips */}
      <div className="px-4 pb-0 bg-white sticky top-14 z-20 border-b border-gray-100">
        {/* Search */}
        <div className="relative mt-3 mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาอุปกรณ์, รหัส..."
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                category === c.id ? "bg-[#1D4ED8] text-white" : "bg-gray-100 text-gray-500")}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div className="px-5 py-3 pb-32 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">ไม่พบอุปกรณ์</p>
          </div>
        ) : (
          filtered.map((item, i) => {
            const inCart = cart.find(c => c.itemId === item.id);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
                className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Package className="w-7 h-7 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.locationName && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />{item.locationName}
                      </span>
                    )}
                    <span className="text-xs text-emerald-600 font-medium">คงเหลือ {item.quantityAvailable}</span>
                  </div>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.id, inCart.qty - 1)}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95">
                      <Minus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <input
                      type="number" min={1} max={item.quantityAvailable}
                      value={inCart.qty}
                      onChange={e => updateQty(item.id, Math.min(item.quantityAvailable, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-10 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    <button onClick={() => updateQty(item.id, inCart.qty + 1)}
                      disabled={inCart.qty >= item.quantityAvailable}
                      className="w-8 h-8 rounded-xl bg-[#1D4ED8] flex items-center justify-center active:scale-95 disabled:opacity-40">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(item)}
                    className="shrink-0 w-9 h-9 bg-[#1D4ED8] rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Sticky cart bar */}
      <AnimatePresence>
        {cart.length > 0 && !showConfirm && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-24 left-0 right-0 px-5 z-[55]"
          >
            <button onClick={() => setShowConfirm(true)}
              className="w-full py-4 bg-[#1D4ED8] text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                รายการเบิก ({cart.length} รายการ · {totalItems} ชิ้น)
              </span>
              <span>ยืนยันการเบิก →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm bottom sheet */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowConfirm(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl px-5 pt-5 pb-10 safe-area-bottom"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base">ยืนยันการเบิก</h3>
                <button onClick={() => setShowConfirm(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Cart items */}
              <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                {cart.map(c => (
                  <div key={c.itemId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{c.itemName}</p>
                      <p className="text-xs text-gray-400">{c.itemCode}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(c.itemId, c.qty - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-95">
                        <Minus className="w-3 h-3 text-gray-600" />
                      </button>
                      <input
                        type="number" min={1} max={c.maxQty}
                        value={c.qty}
                        onChange={e => updateQty(c.itemId, Math.min(c.maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-10 text-center text-sm font-bold border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]/30"
                      />
                      <button onClick={() => updateQty(c.itemId, c.qty + 1)}
                        disabled={c.qty >= c.maxQty}
                        className="w-7 h-7 rounded-lg bg-[#1D4ED8] flex items-center justify-center disabled:opacity-40 active:scale-95">
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Purpose */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">วัตถุประสงค์ / งานที่ใช้</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
                  rows={3} placeholder="ระบุงานหรือเหตุผลที่ต้องการเบิก..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
                />
              </div>

              <button onClick={() => submitMut.mutate()}
                disabled={!purpose.trim() || submitMut.isPending}
                className="w-full py-3.5 bg-[#1D4ED8] text-white font-bold text-sm rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {submitMut.isPending ? "กำลังส่ง..." : `ส่งคำขอเบิก ${cart.length} รายการ`}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Admin Requisition Page (existing flow) ─────────────────────────────────────
function AdminRequisitionPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState("");

  const { data: items = [] } = useInventoryItems();

  const { data: allReqs = [], isLoading } = useQuery({
    queryKey: ["requisitions", tab, stoxyUser?.uid],
    queryFn: () =>
      tab === "all" ? getRequisitions() : getMyRequisitions(stoxyUser?.uid ?? ""),
    enabled: !!stoxyUser,
  });

  const createMut = useMutation({
    mutationFn: () => {
      const item = items.find(i => i.id === itemId)!;
      return createRequisition({
        itemId, itemCode: item.code, itemName: item.name, quantity, purpose,
        requesterId: stoxyUser?.uid ?? "",
        requesterName: stoxyUser?.displayName ?? "ไม่ระบุ",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("ส่งคำขอเบิกสำเร็จ");
      setShowForm(false); setItemId(""); setQuantity(1); setPurpose("");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveRequisition(id, stoxyUser?.uid ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("อนุมัติการเบิกแล้ว สต็อกถูกตัดออก");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectRequisition(rejectId!, stoxyUser?.uid ?? "", rejectReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("ปฏิเสธคำขอแล้ว");
      setRejectId(null); setRejectReason("");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const selected = items.find(i => i.id === itemId);

  return (
    <AppShell title="เบิกของ">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เบิกของ</h2>
          <p className="text-sm text-gray-500">ขอเบิกวัสดุ/อุปกรณ์จากสต็อก</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
        >
          <PackageOpen className="w-4 h-4" />ขอเบิก
        </button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">ขอเบิกของ</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">รายการที่ต้องการเบิก</label>
                  <select value={itemId} onChange={e => setItemId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- เลือกรายการ --</option>
                    {items.filter(i => i.quantityAvailable > 0).map(i => (
                      <option key={i.id} value={i.id}>[{i.code}] {i.name} (คงเหลือ {i.quantityAvailable})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">จำนวน</label>
                  <input type="number" value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1} max={selected?.quantityAvailable ?? 999}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {selected && <p className="text-xs text-gray-400 mt-1">คงเหลือในสต็อก: {selected.quantityAvailable}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">วัตถุประสงค์ / งานที่ใช้</label>
                  <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
                    rows={3} placeholder="ระบุงานหรือเหตุผลที่ต้องการเบิก..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <button onClick={() => createMut.mutate()}
                  disabled={!itemId || !purpose.trim() || createMut.isPending}
                  className="w-full py-2.5 text-sm font-medium bg-[#0d2137] text-white rounded-xl disabled:opacity-50 hover:bg-[#1a3a5c] transition-colors"
                >
                  {createMut.isPending ? "กำลังส่ง..." : "ส่งคำขอเบิก"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setRejectId(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">เหตุผลที่ปฏิเสธ</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="ระบุเหตุผล..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => rejectMut.mutate()}
                  disabled={!rejectReason.trim() || rejectMut.isPending}
                  className="flex-1 py-2 text-sm font-medium bg-red-600 text-white rounded-xl disabled:opacity-50 hover:bg-red-700 transition-colors"
                >ยืนยันปฏิเสธ</button>
                <button onClick={() => setRejectId(null)}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >ยกเลิก</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {([["all", "ทั้งหมด"], ["mine", "ของฉัน"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === v ? "bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white" : "text-gray-500"}`}
          >{l}</button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : allReqs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <PackageOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">ยังไม่มีรายการเบิก</p>
          </div>
        ) : (
          allReqs.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[req.status]}`}>
                      {statusLabel[req.status]}
                    </span>
                    <span className="font-mono text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {req.itemCode}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">{req.itemName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    จำนวน: <span className="font-semibold text-gray-700 dark:text-gray-300">{req.quantity}</span>
                    {" · "}ผู้ขอ: {req.requesterName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">วัตถุประสงค์: {req.purpose}</p>
                  {req.rejectedReason && <p className="text-xs text-red-500 mt-0.5">เหตุผล: {req.rejectedReason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDateTime(req.createdAt)}</p>
                  {req.status === "pending" && (
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={() => approveMut.mutate(req.id)} disabled={approveMut.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      ><CheckCircle className="w-3.5 h-3.5" />อนุมัติ</button>
                      <button onClick={() => setRejectId(req.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      ><XCircle className="w-3.5 h-3.5" />ปฏิเสธ</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AppShell>
  );
}

// ── Entry point ────────────────────────────────────────────────────────────────
export default function RequisitionPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  if (!stoxyUser) return null;
  if (!isAdmin) {
    return (
      <AppShell>
        <StaffRequisitionPage />
      </AppShell>
    );
  }
  return <AdminRequisitionPage />;
}
