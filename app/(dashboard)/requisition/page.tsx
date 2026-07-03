"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth, useRole } from "@/hooks/useAuth";
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
import { EmptyState } from "@/components/ui/EmptyState";

// ── Shared ─────────────────────────────────────────────────────────────────────
const statusBadge = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
const statusLabel = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ" };

// เบิกได้: ของสิ้นเปลือง/ทดแทน — เครื่องมือ/มิเตอร์/PPE ใช้เมนูยืม
const WITHDRAWABLE = new Set(["electrical_parts", "cable", "spareparts", "electrical", "others"]);

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "electrical_parts", label: "อุปกรณ์ไฟฟ้า" },
  { id: "cable", label: "สายและท่อ" },
  { id: "spareparts", label: "อะไหล่และวัสดุ" },
];

type CartItem = { itemId: string; itemCode: string; itemName: string; qty: number; maxQty: number };

// ── Staff Requisition Page (shopping cart) ─────────────────────────────────────
function StaffRequisitionPage() {
  const { stoxyUser } = useAuth();
  const role = useRole();
  const guard = (fn: () => void) => role === "viewer" ? toast.error("ไม่มีสิทธิ์ดำเนินการ") : fn();
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900">
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
      <div className="px-4 pb-0 bg-white dark:bg-gray-800 sticky top-14 z-20 border-b border-gray-100 dark:border-gray-700">
        {/* Search */}
        <div className="relative mt-3 mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาอุปกรณ์, รหัส..."
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border border-gray-100 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                category === c.id ? "bg-[#1D4ED8] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div className="px-5 py-3 pb-32 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">ไม่พบอุปกรณ์</p>
          </div>
        ) : (
          filtered.map((item, i) => {
            const inCart = cart.find(c => c.itemId === item.id);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-50 dark:border-gray-700 shadow-sm flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.images?.[0]
                    ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    : <Package className="w-7 h-7 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight line-clamp-2">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.locationName && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <MapPin className="w-3 h-3" />{item.locationName}
                      </span>
                    )}
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">คงเหลือ {item.quantityAvailable}</span>
                  </div>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.id, inCart.qty - 1)}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-95">
                      <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <input
                      type="number" min={1} max={item.quantityAvailable}
                      value={inCart.qty}
                      onChange={e => updateQty(item.id, Math.min(item.quantityAvailable, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-10 text-center text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg py-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
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
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-10 safe-area-bottom"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">ยืนยันการเบิก</h3>
                <button onClick={() => setShowConfirm(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Cart items */}
              <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                {cart.map(c => (
                  <div key={c.itemId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{c.itemName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.itemCode}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(c.itemId, c.qty - 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center active:scale-95">
                        <Minus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                      </button>
                      <input
                        type="number" min={1} max={c.maxQty}
                        value={c.qty}
                        onChange={e => updateQty(c.itemId, Math.min(c.maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-10 text-center text-sm font-bold border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]/30"
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">วัตถุประสงค์ / งานที่ใช้</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
                  rows={3} placeholder="ระบุงานหรือเหตุผลที่ต้องการเบิก..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-2xl bg-transparent dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
                />
              </div>

              <button onClick={() => guard(() => submitMut.mutate())}
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
  const role = useRole();
  const guard = (fn: () => void) => role === "viewer" ? toast.error("ไม่มีสิทธิ์ดำเนินการ") : fn();
  const qc = useQueryClient();

  const [browseMode, setBrowseMode] = useState(false);
  const [browseCart, setBrowseCart] = useState<CartItem[]>([]);
  const [showBrowseConfirm, setShowBrowseConfirm] = useState(false);
  const [browsePurpose, setBrowsePurpose] = useState("");
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseCategory, setBrowseCategory] = useState("all");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: items = [] } = useInventoryItems();

  const { data: allReqs = [], isLoading } = useQuery({
    queryKey: ["requisitions", tab, stoxyUser?.uid],
    queryFn: () =>
      tab === "all" ? getRequisitions() : getMyRequisitions(stoxyUser?.uid ?? ""),
    enabled: !!stoxyUser,
  });

  const browseAddToCart = (item: InventoryItem) => {
    setBrowseCart(prev => {
      const ex = prev.find(c => c.itemId === item.id);
      if (ex) return prev.map(c => c.itemId === item.id ? { ...c, qty: Math.min(c.qty + 1, c.maxQty) } : c);
      return [...prev, { itemId: item.id, itemCode: item.code, itemName: item.name, qty: 1, maxQty: item.quantityAvailable }];
    });
  };
  const browseUpdateQty = (itemId: string, qty: number) => {
    if (qty <= 0) { setBrowseCart(prev => prev.filter(c => c.itemId !== itemId)); return; }
    setBrowseCart(prev => prev.map(c => c.itemId === itemId ? { ...c, qty: Math.min(qty, c.maxQty) } : c));
  };

  const cartMut = useMutation({
    mutationFn: async () => {
      for (const c of browseCart) {
        await createRequisition({
          itemId: c.itemId, itemCode: c.itemCode, itemName: c.itemName,
          quantity: c.qty, purpose: browsePurpose,
          requesterId: stoxyUser?.uid ?? "",
          requesterName: stoxyUser?.displayName ?? "ไม่ระบุ",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success(`ส่งคำขอเบิก ${browseCart.length} รายการสำเร็จ`);
      setBrowseCart([]); setBrowsePurpose(""); setShowBrowseConfirm(false); setBrowseMode(false);
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveRequisition(id, stoxyUser?.uid ?? "", stoxyUser?.displayName),
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

  const browseTotalItems = browseCart.reduce((s, c) => s + c.qty, 0);
  const browseFiltered = items.filter(i => i.quantityAvailable > 0 && WITHDRAWABLE.has(i.categoryId)).filter(i => {
    const matchCat = browseCategory === "all" || i.categoryId === browseCategory;
    const matchSearch = !browseSearch || i.name.toLowerCase().includes(browseSearch.toLowerCase()) || i.code.toLowerCase().includes(browseSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  if (browseMode) {
    return (
      <AppShell title="เบิกของ">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setBrowseMode(false); setBrowseCart([]); setBrowsePurpose(""); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" /> ยกเลิก
          </button>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">เลือกรายการเบิก</h2>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
            placeholder="ค้นหาวัสดุ, รหัส..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-3">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setBrowseCategory(c.id)}
              className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                browseCategory === c.id ? "bg-[#1D4ED8] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}
            >{c.label}</button>
          ))}
        </div>

        <div className="space-y-3 pb-32">
          {browseFiltered.length === 0 ? (
            <div className="text-center py-16"><Package className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-400">ไม่พบวัสดุ</p></div>
          ) : browseFiltered.map((item, i) => {
            const inCart = browseCart.find(c => c.itemId === item.id);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.images?.[0] ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" loading="lazy" /> : <Package className="w-7 h-7 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight line-clamp-2">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.locationName && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{item.locationName}</span>}
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">คงเหลือ {item.quantityAvailable}</span>
                  </div>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => browseUpdateQty(item.id, inCart.qty - 1)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-95"><Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" /></button>
                    <input type="number" min={1} max={item.quantityAvailable} value={inCart.qty}
                      onChange={e => browseUpdateQty(item.id, Math.min(item.quantityAvailable, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-10 text-center text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg py-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    <button onClick={() => browseUpdateQty(item.id, inCart.qty + 1)} disabled={inCart.qty >= item.quantityAvailable} className="w-8 h-8 rounded-xl bg-[#1D4ED8] flex items-center justify-center active:scale-95 disabled:opacity-40"><Plus className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                ) : (
                  <button onClick={() => browseAddToCart(item)} className="shrink-0 w-9 h-9 bg-[#1D4ED8] rounded-xl flex items-center justify-center active:scale-95 transition-transform"><Plus className="w-4 h-4 text-white" /></button>
                )}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {browseCart.length > 0 && !showBrowseConfirm && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 px-5 pb-5 z-40">
              <button onClick={() => setShowBrowseConfirm(true)}
                className="w-full py-4 bg-[#1D4ED8] text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
              >
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" />รายการเบิก ({browseCart.length} รายการ · {browseTotalItems} ชิ้น)</span>
                <span>ยืนยัน →</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBrowseConfirm && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowBrowseConfirm(false)} />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">ยืนยันการเบิก</h3>
                  <button onClick={() => setShowBrowseConfirm(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                  {browseCart.map(c => (
                    <div key={c.itemId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{c.itemName}</p>
                        <p className="text-xs text-gray-400">{c.itemCode}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => browseUpdateQty(c.itemId, c.qty - 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center active:scale-95"><Minus className="w-3 h-3 text-gray-600 dark:text-gray-300" /></button>
                        <input type="number" min={1} max={c.maxQty} value={c.qty}
                          onChange={e => browseUpdateQty(c.itemId, Math.min(c.maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-10 text-center text-sm font-bold border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white rounded-lg py-0.5 focus:outline-none"
                        />
                        <button onClick={() => browseUpdateQty(c.itemId, c.qty + 1)} disabled={c.qty >= c.maxQty} className="w-7 h-7 rounded-lg bg-[#1D4ED8] flex items-center justify-center disabled:opacity-40 active:scale-95"><Plus className="w-3 h-3 text-white" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">วัตถุประสงค์ / งานที่ใช้</label>
                  <textarea value={browsePurpose} onChange={e => setBrowsePurpose(e.target.value)} rows={3}
                    placeholder="ระบุงานหรือเหตุผลที่ต้องการเบิก..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-transparent dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
                  />
                </div>
                <button onClick={() => guard(() => cartMut.mutate())} disabled={!browsePurpose.trim() || cartMut.isPending}
                  className="w-full py-3.5 bg-[#1D4ED8] text-white font-bold text-sm rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {cartMut.isPending ? "กำลังส่ง..." : `ส่งคำขอเบิก ${browseCart.length} รายการ`}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </AppShell>
    );
  }

  return (
    <AppShell title="เบิกของ">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เบิกของ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">ขอเบิกวัสดุ/อุปกรณ์จากสต็อก</p>
        </div>
        <button onClick={() => setBrowseMode(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <PackageOpen className="w-4 h-4" />ขอเบิก
        </button>
      </div>

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
                <button onClick={() => guard(() => rejectMut.mutate())}
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <EmptyState icon={PackageOpen} title="ยังไม่มีรายการเบิก" description="รายการที่ขอเบิกจะแสดงที่นี่" iconColor="text-amber-400 dark:text-amber-600" />
          </div>
        ) : (
          allReqs.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <div className="flex items-start gap-3">
                {(() => { const img = items.find(i => i.id === req.itemId)?.images?.[0]; return (
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {img ? <img src={img} alt={req.itemName} className="w-full h-full object-cover" loading="lazy" /> : <PackageOpen className="w-5 h-5 text-amber-500" />}
                  </div>
                ); })()}
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
                  {(() => { const inv = items.find(i => i.id === req.itemId); return inv ? (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {inv.locationName && <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><MapPin className="w-3 h-3" />{inv.locationName}</span>}
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">คงเหลือ {inv.quantityAvailable}{inv.unit ? ` ${inv.unit}` : ""}</span>
                    </div>
                  ) : null; })()}
                  <p className="text-xs text-gray-400 mt-0.5 truncate">วัตถุประสงค์: {req.purpose}</p>
                  {req.rejectedReason && <p className="text-xs text-red-500 mt-0.5">เหตุผล: {req.rejectedReason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDateTime(req.createdAt)}</p>
                  {req.status === "pending" && (
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={() => guard(() => approveMut.mutate(req.id))} disabled={approveMut.isPending}
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
