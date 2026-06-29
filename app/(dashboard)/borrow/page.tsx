"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Search, X, Camera, Clock, RotateCcw, Loader2, MapPin,
  Package, CheckCircle, ArrowLeftRight, ChevronRight, Plus, Minus, Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import {
  createBorrowRequest, approveBorrowRequest, rejectBorrowRequest,
  acknowledgeReturn, submitReturn,
} from "@/services/borrow.service";
import { formatDate, cn } from "@/lib/utils";
import { compressImages } from "@/lib/compress";
import type { BorrowRecord, BorrowStatus, InventoryItem } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

// ── Shared status maps ─────────────────────────────────────────────────────────
const statusBadge: Partial<Record<BorrowStatus, string>> = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  borrowed: "bg-blue-100 text-blue-700",
  return_pending: "bg-purple-100 text-purple-700",
  returned: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
};
const statusLabel: Partial<Record<BorrowStatus, string>> = {
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  borrowed: "ยืมอยู่",
  return_pending: "รอรับทราบ",
  returned: "คืนแล้ว",
  rejected: "ปฏิเสธ",
  overdue: "เกินกำหนด",
};

// ── Staff: Borrow Form Bottom Sheet ───────────────────────────────────────────
function BorrowSheet({ item, uid, displayName, dept, onClose }: {
  item: InventoryItem; uid: string; displayName: string; dept: string; onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [returnDate, setReturnDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const mut = useMutation({
    mutationFn: async () => {
      if (!returnDate) throw new Error("กรุณาระบุวันกำหนดคืน");
      if (!purpose.trim()) throw new Error("กรุณาระบุวัตถุประสงค์");
      setCompressing(true);
      const urls = photos.length > 0 ? await compressImages(photos) : [];
      setCompressing(false);
      return createBorrowRequest({
        itemId: item.id, itemCode: item.code, itemName: item.name,
        quantity: qty, borrowerName: displayName, borrowerDepartment: dept,
        borrowerId: uid, expectedReturnDate: Timestamp.fromDate(new Date(returnDate)),
        purpose, status: "pending_approval", borrowPhotos: urls, createdBy: uid,
      } as any);
    },
    onSuccess: () => { toast.success("ส่งคำขอยืมแล้ว รอแอดมินอนุมัติ"); onClose(); },
    onError: (e: any) => { setCompressing(false); toast.error(e.message ?? "เกิดข้อผิดพลาด"); },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}
    >
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="w-full bg-white rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900 text-base">ขอยืมอุปกรณ์</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[240px]">{item.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-50">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Qty */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">จำนวน</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
                <Minus className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-2xl font-bold text-gray-900 min-w-[2rem] text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(item.quantityAvailable, qty + 1))}
                className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xs text-gray-400 ml-auto">คงเหลือ {item.quantityAvailable} {item.notes?.replace("หน่วย: ", "") ?? ""}</span>
            </div>
          </div>

          {/* Return date */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">กำหนดคืน</label>
            <input type="date" value={returnDate} min={minDate} onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">วัตถุประสงค์</label>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2}
              placeholder="ระบุเหตุผลที่ยืม..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 resize-none"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">รูปสภาพก่อนยืม (ไม่บังคับ)</label>
            <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#1D4ED8]/40 transition-colors bg-[#F8FAFC]">
              <Camera className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">ถ่ายรูปหรือเลือกไฟล์</span>
              <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                onChange={(e) => { const f = Array.from(e.target.files ?? []); setPhotos(f); setPreviews(f.map(x => URL.createObjectURL(x))); }}
              />
            </label>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((src, i) => <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />)}
              </div>
            )}
          </div>

          <button onClick={() => mut.mutate()} disabled={!returnDate || !purpose.trim() || mut.isPending || compressing}
            className="w-full py-4 bg-[#1D4ED8] text-white font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 text-base active:scale-[0.98] transition-transform"
          >
            {(compressing || mut.isPending) && <Loader2 className="w-5 h-5 animate-spin" />}
            {compressing ? "กำลัง compress รูป..." : mut.isPending ? "กำลังส่ง..." : "ส่งคำขอยืม"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Staff: Return Bottom Sheet ─────────────────────────────────────────────────
function ReturnSheet({ record, uid, onClose }: { record: BorrowRecord; uid: string; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      setCompressing(true);
      const photos = files.length > 0 ? await compressImages(files) : [];
      setCompressing(false);
      return submitReturn(record.id, { notes, returnPhotos: photos, returnedBy: uid });
    },
    onSuccess: () => { toast.success("แจ้งคืนสำเร็จ รอแอดมินรับทราบ"); onClose(); },
    onError: (e: any) => { setCompressing(false); toast.error(e.message ?? "เกิดข้อผิดพลาด"); },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}
    >
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900 text-base">แจ้งคืนอุปกรณ์</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[240px]">{record.itemName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-50"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">หมายเหตุ (ไม่บังคับ)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="บันทึกเพิ่มเติม..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">รูปสภาพอุปกรณ์ (ไม่บังคับ)</label>
            <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-400/50 transition-colors bg-[#F8FAFC]">
              <Camera className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">ถ่ายรูปหรือเลือกไฟล์</span>
              <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                onChange={(e) => { const f = Array.from(e.target.files ?? []); setFiles(f); setPreviews(f.map(x => URL.createObjectURL(x))); }}
              />
            </label>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((src, i) => <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />)}
              </div>
            )}
          </div>
          <button onClick={() => mut.mutate()} disabled={mut.isPending || compressing}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 text-base active:scale-[0.98] transition-transform"
          >
            {(compressing || mut.isPending) && <Loader2 className="w-5 h-5 animate-spin" />}
            {compressing ? "กำลัง compress รูป..." : mut.isPending ? "กำลังบันทึก..." : "ยืนยันคืน"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Staff Borrow Page ──────────────────────────────────────────────────────────
// ยืมได้เฉพาะเครื่องมือ — ของสิ้นเปลืองให้ใช้เมนูเบิก
const BORROWABLE = new Set(["tools", "meter"]);

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "tools", label: "เครื่องมือ" },
  { id: "meter", label: "มิเตอร์" },
];

function useFavorites(uid: string) {
  const key = `stoxy_fav_borrow_${uid}`;
  const [favs, setFavs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
  });
  const toggle = (id: string) => setFavs(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  });
  return { favs, toggle };
}

function ItemCard({ item, isFav, onFav, onBorrow }: {
  item: InventoryItem; isFav: boolean; onFav: () => void; onBorrow: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
        <Package className="w-7 h-7 text-[#1D4ED8]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2 flex-1">{item.name}</p>
          <button onClick={onFav} className="shrink-0 p-0.5 -mt-0.5">
            <Star className={cn("w-4 h-4", isFav ? "fill-amber-400 stroke-amber-400" : "stroke-gray-300")} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {item.locationName && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />{item.locationName}
            </span>
          )}
          <span className="text-xs text-emerald-600 font-medium">คงเหลือ {item.quantityAvailable}</span>
        </div>
      </div>
      <button onClick={onBorrow}
        className="shrink-0 px-4 py-2.5 bg-[#1D4ED8] text-white text-sm font-bold rounded-xl active:scale-95 transition-transform"
      >
        ยืม
      </button>
    </div>
  );
}

function StaffBorrowPage() {
  const { stoxyUser } = useAuth();
  const { data: items = [] } = useInventoryItems();
  const { allRecords, isLoading } = useRealtimeBorrows();
  const uid = stoxyUser?.uid ?? "";
  const { favs, toggle: toggleFav } = useFavorites(uid);

  const [tab, setTab] = useState<"borrow" | "return">("borrow");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [borrowItem, setBorrowItem] = useState<InventoryItem | null>(null);
  const [returnRecord, setReturnRecord] = useState<BorrowRecord | null>(null);

  const myBorrowed = allRecords.filter(b => b.borrowerId === uid && b.status === "borrowed");
  const myPending = allRecords.filter(b => b.borrowerId === uid && b.status === "pending_approval");
  const myReturnPending = allRecords.filter(b => b.borrowerId === uid && b.status === "return_pending");

  const availableItems = items.filter(i => i.quantityAvailable > 0 && BORROWABLE.has(i.categoryId));

  // Recent: last 5 unique itemIds from my borrow history
  const recentItemIds = [...new Map(
    allRecords
      .filter(b => b.borrowerId === uid)
      .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
      .map(b => [b.itemId, b.itemId])
  ).values()].slice(0, 5);
  const recentItems = recentItemIds
    .map(id => availableItems.find(i => i.id === id))
    .filter(Boolean) as InventoryItem[];

  const favItems = availableItems.filter(i => favs.includes(i.id));

  const filtered = availableItems.filter(i => {
    const matchCat = category === "all" || i.categoryId === category;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const returnItems = [...myBorrowed, ...myPending, ...myReturnPending];
  const filteredReturn = search
    ? returnItems.filter(r => r.itemName.toLowerCase().includes(search.toLowerCase()))
    : returnItems;

  const now = new Date();
  const isSearching = search.length > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Unified header */}
      <MobileHeader title="ยืม-คืน" />

      {/* Sub-header: segmented + search + chips */}
      <div className="px-4 pb-0 bg-white sticky top-14 z-20 border-b border-gray-100">
        {/* Segmented Control */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mt-3 mb-3">
          <button onClick={() => { setTab("borrow"); setSearch(""); setCategory("all"); }}
            className={cn("flex-1 py-2 text-sm font-bold rounded-xl transition-all",
              tab === "borrow" ? "bg-white text-[#1D4ED8] shadow-sm" : "text-gray-500")}
          >ยืมอุปกรณ์</button>
          <button onClick={() => { setTab("return"); setSearch(""); }}
            className={cn("flex-1 py-2 text-sm font-bold rounded-xl transition-all relative",
              tab === "return" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
          >
            คืนอุปกรณ์
            {(myBorrowed.length + myPending.length) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                {myBorrowed.length + myPending.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === "borrow" ? "ค้นหาอุปกรณ์, รหัส..." : "ค้นหารายการ..."}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>

        {/* Category chips */}
        {tab === "borrow" && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                  category === c.id ? "bg-[#1D4ED8] text-white" : "bg-gray-100 text-gray-500")}
              >{c.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-3 space-y-3">
        <AnimatePresence mode="wait">
          {tab === "borrow" ? (
            <motion.div key="borrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* When not searching: show Favorites + Recent sections first */}
              {!isSearching && category === "all" && (
                <>
                  {favItems.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">⭐ รายการโปรด</p>
                      <div className="space-y-3">
                        {favItems.map(item => (
                          <ItemCard key={item.id} item={item} isFav onFav={() => toggleFav(item.id)} onBorrow={() => setBorrowItem(item)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {recentItems.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">เคยยืมล่าสุด</p>
                      <div className="space-y-3">
                        {recentItems.map(item => (
                          <ItemCard key={item.id} item={item} isFav={favs.includes(item.id)} onFav={() => toggleFav(item.id)} onBorrow={() => setBorrowItem(item)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(favItems.length > 0 || recentItems.length > 0) && (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">อุปกรณ์ทั้งหมด</p>
                  )}
                </>
              )}

              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">ไม่พบอุปกรณ์</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <ItemCard item={item} isFav={favs.includes(item.id)} onFav={() => toggleFav(item.id)} onBorrow={() => setBorrowItem(item)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="return" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-50" />
                ))
              ) : filteredReturn.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">ไม่มีรายการยืมค้างอยู่</p>
                </div>
              ) : (
                filteredReturn.map((record, i) => {
                  const returnDate = record.expectedReturnDate.toDate();
                  const daysLeft = Math.ceil((returnDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const overdue = daysLeft < 0;
                  const canReturn = record.status === "borrowed";
                  return (
                    <motion.div key={record.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={cn("bg-white rounded-2xl p-4 border shadow-sm", overdue ? "border-red-100" : "border-gray-50")}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                          overdue ? "bg-red-50" : "bg-blue-50")}>
                          <ArrowLeftRight className={cn("w-6 h-6", overdue ? "text-red-400" : "text-[#1D4ED8]")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 line-clamp-1">{record.itemName}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                              statusBadge[record.status] ?? "bg-gray-100 text-gray-600")}>
                              {statusLabel[record.status] ?? record.status}
                            </span>
                            {record.status === "borrowed" && (
                              <span className={cn("text-xs font-medium",
                                overdue ? "text-red-500" : daysLeft <= 2 ? "text-orange-500" : "text-gray-400")}>
                                {overdue ? `เกินกำหนด ${Math.abs(daysLeft)} วัน` : `คืนใน ${daysLeft} วัน`}
                              </span>
                            )}
                          </div>
                          {record.borrowDate && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                              <Clock className="w-3 h-3" />ยืม {formatDate(record.borrowDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {canReturn && (
                        <button onClick={() => setReturnRecord(record)}
                          className="mt-3 w-full py-2.5 border-2 border-emerald-400 text-emerald-600 font-bold text-sm rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />แจ้งคืน
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom sheets */}
      <AnimatePresence>
        {borrowItem && (
          <BorrowSheet
            item={borrowItem}
            uid={uid}
            displayName={stoxyUser?.displayName ?? ""}
            dept={stoxyUser?.department ?? ""}
            onClose={() => setBorrowItem(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {returnRecord && (
          <ReturnSheet record={returnRecord} uid={uid} onClose={() => setReturnRecord(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Admin Borrow Page ──────────────────────────────────────────────────────────
const adminTabs: { label: string; value: BorrowStatus | "all" }[] = [
  { label: "ทั้งหมด", value: "all" },
  { label: "รออนุมัติ", value: "pending_approval" },
  { label: "ยืมอยู่", value: "borrowed" },
  { label: "รอรับทราบ", value: "return_pending" },
  { label: "คืนแล้ว", value: "returned" },
  { label: "ปฏิเสธ", value: "rejected" },
];

function AdminBorrowPage() {
  const { stoxyUser } = useAuth();
  const { data: items = [] } = useInventoryItems();
  const [tab, setTab] = useState<BorrowStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);
  const [compressing, setCompressing] = useState(false);

  const [returnRecord, setReturnRecord] = useState<BorrowRecord | null>(null);
  const [rtNotes, setRtNotes] = useState("");
  const [rtFiles, setRtFiles] = useState<File[]>([]);
  const [rtPreviews, setRtPreviews] = useState<string[]>([]);
  const [rtCompressing, setRtCompressing] = useState(false);

  const [itemId, setItemId] = useState("");
  const [borrowPhotos, setBorrowPhotos] = useState<File[]>([]);
  const [borrowPhotosPreviews, setBorrowPhotosPreviews] = useState<string[]>([]);
  const [quantityStr, setQuantityStr] = useState("1");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerDept, setBorrowerDept] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [purpose, setPurpose] = useState("");

  const { records, isLoading } = useRealtimeBorrows(tab);
  const filtered = search
    ? records.filter(
        (r) => r.itemName.toLowerCase().includes(search.toLowerCase()) ||
               r.borrowerName.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const selected = items.find((i) => i.id === itemId);

  function resetForm() {
    setItemId(""); setQuantityStr("1"); setBorrowerName("");
    setBorrowerDept(""); setReturnDate(""); setPurpose("");
    setBorrowPhotos([]); setBorrowPhotosPreviews([]);
  }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("กรุณาเลือกอุปกรณ์");
      if (!borrowerName.trim()) throw new Error("กรุณาระบุชื่อผู้ยืม");
      if (!returnDate) throw new Error("กรุณาระบุวันกำหนดคืน");
      if (!purpose.trim()) throw new Error("กรุณาระบุวัตถุประสงค์");
      setCompressing(true);
      const urls = borrowPhotos.length > 0 ? await compressImages(borrowPhotos) : [];
      setCompressing(false);
      return createBorrowRequest({
        itemId: selected.id, itemCode: selected.code, itemName: selected.name,
        quantity: Math.max(1, parseInt(quantityStr) || 1),
        borrowerName, borrowerDepartment: borrowerDept, borrowerId: stoxyUser?.uid ?? "",
        expectedReturnDate: Timestamp.fromDate(new Date(returnDate)),
        purpose, status: "pending_approval", borrowPhotos: urls, createdBy: stoxyUser?.uid ?? "",
      } as any);
    },
    onSuccess: () => { toast.success("ส่งคำขอยืมสำเร็จ"); setShowForm(false); resetForm(); },
    onError: (e: any) => { setCompressing(false); toast.error(e.message ?? "เกิดข้อผิดพลาด"); },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveBorrowRequest(id, stoxyUser?.uid ?? ""),
    onSuccess: () => { toast.success("อนุมัติแล้ว"); setTab("borrowed"); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectBorrowRequest(rejectId!, stoxyUser?.uid ?? "", rejectReason),
    onSuccess: () => { toast.success("ปฏิเสธแล้ว"); setRejectId(null); setRejectReason(""); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => acknowledgeReturn(id, stoxyUser?.uid ?? ""),
    onSuccess: () => toast.success("รับทราบการคืนแล้ว"),
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const returnMut = useMutation({
    mutationFn: async () => {
      if (!returnRecord) return;
      setRtCompressing(true);
      const photos = rtFiles.length > 0 ? await compressImages(rtFiles) : [];
      setRtCompressing(false);
      return submitReturn(returnRecord.id, { notes: rtNotes, returnPhotos: photos, returnedBy: stoxyUser?.uid ?? "" });
    },
    onSuccess: () => {
      toast.success("แจ้งคืนสำเร็จ");
      setReturnRecord(null); setRtNotes(""); setRtFiles([]); setRtPreviews([]);
    },
    onError: (e: any) => { setRtCompressing(false); toast.error(e.message ?? "เกิดข้อผิดพลาด"); },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกการยืม-คืน</h2>
          <p className="text-sm text-gray-500">{filtered.length} รายการ</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
        >
          <Plus className="w-4 h-4" /> สร้างคำขอยืม
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowForm(false); resetForm(); }}
          >
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">สร้างคำขอยืม</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">อุปกรณ์</label>
                  <select value={itemId} onChange={(e) => setItemId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- เลือกอุปกรณ์ --</option>
                    {items.filter((i) => i.quantityAvailable > 0).map((i) => (
                      <option key={i.id} value={i.id}>[{i.code}] {i.name} (คงเหลือ {i.quantityAvailable})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">จำนวน</label>
                  <input type="number" inputMode="numeric" value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    onBlur={() => { const n = parseInt(quantityStr); const max = selected?.quantityAvailable ?? 99; setQuantityStr(String(Math.min(Math.max(1, isNaN(n) ? 1 : n), max))); }}
                    min={1} max={selected?.quantityAvailable ?? 99}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ชื่อผู้ยืม</label>
                  <input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="ชื่อ-นามสกุล"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">แผนก</label>
                  <input value={borrowerDept} onChange={(e) => setBorrowerDept(e.target.value)} placeholder="เช่น แผนกไฟฟ้า"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">กำหนดคืน</label>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={minDate}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">วัตถุประสงค์</label>
                  <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2}
                    placeholder="ระบุเหตุผล..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">รูปก่อนยืม (ไม่บังคับ)</label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                    <Camera className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">ถ่ายรูปหรือเลือกไฟล์</span>
                    <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                      onChange={(e) => { const f = Array.from(e.target.files ?? []); setBorrowPhotos(f); setBorrowPhotosPreviews(f.map(x => URL.createObjectURL(x))); }}
                    />
                  </label>
                  {borrowPhotosPreviews.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {borrowPhotosPreviews.map((src, i) => <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />)}
                    </div>
                  )}
                </div>
                <button onClick={() => createMut.mutate()} disabled={!itemId || !borrowerName.trim() || !returnDate || !purpose.trim() || createMut.isPending || compressing}
                  className="w-full py-2.5 text-sm font-medium bg-[#0d2137] text-white rounded-xl disabled:opacity-50 hover:bg-[#1a3a5c] transition-colors flex items-center justify-center gap-2"
                >
                  {(compressing || createMut.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {compressing ? "กำลัง compress..." : createMut.isPending ? "กำลังบันทึก..." : "ส่งคำขอยืม"}
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
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">เหตุผลที่ปฏิเสธ</h3>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                placeholder="ระบุเหตุผล..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => rejectMut.mutate()} disabled={!rejectReason.trim() || rejectMut.isPending}
                  className="flex-1 py-2 text-sm font-medium bg-red-600 text-white rounded-xl disabled:opacity-50">ยืนยัน</button>
                <button onClick={() => setRejectId(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl">ยกเลิก</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Return Popup */}
      <AnimatePresence>
        {returnRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setReturnRecord(null)}
          >
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">แจ้งคืนอุปกรณ์</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{returnRecord.itemName} · {returnRecord.borrowerName}</p>
                </div>
                <button onClick={() => setReturnRecord(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">หมายเหตุ</label>
                  <textarea value={rtNotes} onChange={(e) => setRtNotes(e.target.value)} rows={2} placeholder="บันทึกเพิ่มเติม..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">รูปสภาพอุปกรณ์ (ไม่บังคับ)</label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-emerald-400 transition-colors">
                    <Camera className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">ถ่ายรูปหรือเลือกไฟล์</span>
                    <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                      onChange={(e) => { const f = Array.from(e.target.files ?? []); setRtFiles(f); setRtPreviews(f.map(x => URL.createObjectURL(x))); }}
                    />
                  </label>
                  {rtPreviews.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {rtPreviews.map((src, i) => <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => returnMut.mutate()} disabled={returnMut.isPending || rtCompressing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl disabled:opacity-50"
                  >
                    {(rtCompressing || returnMut.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                    {rtCompressing ? "กำลัง compress..." : returnMut.isPending ? "กำลังบันทึก..." : "ยืนยันคืน"}
                  </button>
                  <button onClick={() => setReturnRecord(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl">ยกเลิก</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Viewer */}
      <AnimatePresence>
        {viewPhotos && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setViewPhotos(null)}
          >
            <div className="flex gap-3 flex-wrap justify-center max-w-2xl" onClick={(e) => e.stopPropagation()}>
              {viewPhotos.map((url, i) => <img key={i} src={url} alt="" className="max-h-[70vh] max-w-full rounded-xl object-contain" />)}
              <button onClick={() => setViewPhotos(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit overflow-x-auto">
        {adminTabs.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              tab === t.value ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"
            )}
          >{t.label}</button>
        ))}
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ไม่พบรายการ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record, i) => {
            const overdue = record.status === "borrowed" && record.expectedReturnDate.toDate() < new Date();
            return (
              <motion.div key={record.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={cn("bg-white dark:bg-gray-900 rounded-2xl border p-4",
                  overdue ? "border-red-200 dark:border-red-900" : "border-gray-100 dark:border-gray-800")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[record.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {overdue ? "เกินกำหนด" : (statusLabel[record.status] ?? record.status)}
                      </span>
                      <span className="font-mono text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">{record.itemCode}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{record.itemName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ผู้ยืม: {record.borrowerName} · {record.borrowerDepartment} · จำนวน: {record.quantity}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {record.borrowDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />ยืม: {formatDate(record.borrowDate)}
                        </span>
                      )}
                      {record.actualReturnDate && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <RotateCcw className="w-3 h-3" />คืน: {formatDate(record.actualReturnDate)}
                        </span>
                      )}
                    </div>
                    {record.rejectionReason && <p className="text-xs text-red-500 mt-0.5">เหตุผล: {record.rejectionReason}</p>}
                    {record.status === "return_pending" && (
                      <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-700 dark:text-purple-400">
                        {record.returnNotes && <p>หมายเหตุ: {record.returnNotes}</p>}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(record.borrowPhotos?.length ?? 0) > 0 && (
                        <button onClick={() => setViewPhotos(record.borrowPhotos!)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Camera className="w-3 h-3" />รูปก่อนยืม ({record.borrowPhotos!.length})
                        </button>
                      )}
                      {(record.returnPhotos?.length ?? 0) > 0 && (
                        <button onClick={() => setViewPhotos(record.returnPhotos!)} className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                          <Camera className="w-3 h-3" />รูปหลังคืน ({record.returnPhotos!.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1.5">
                    <p className="text-xs text-gray-400">กำหนดคืน</p>
                    <p className={cn("text-xs font-medium", overdue ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>
                      {formatDate(record.expectedReturnDate)}
                    </p>
                    <div className="space-y-1">
                      {record.status === "pending_approval" && (
                        <>
                          <button onClick={() => approveMut.mutate(record.id)} disabled={approveMut.isPending}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-lg disabled:opacity-50 w-full justify-center">
                            <CheckCircle className="w-3 h-3" />อนุมัติ
                          </button>
                          <button onClick={() => setRejectId(record.id)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg w-full justify-center">
                            ปฏิเสธ
                          </button>
                        </>
                      )}
                      {record.status === "borrowed" && (
                        <button onClick={() => setReturnRecord(record)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg w-full justify-center">
                          <RotateCcw className="w-3 h-3" />คืน
                        </button>
                      )}
                      {record.status === "return_pending" && (
                        <button onClick={() => acknowledgeMut.mutate(record.id)} disabled={acknowledgeMut.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-600 text-white rounded-lg disabled:opacity-50 w-full justify-center">
                          รับทราบ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Entry point ────────────────────────────────────────────────────────────────
export default function BorrowPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  if (!isAdmin) {
    return (
      <AppShell title="ยืม-คืน">
        <StaffBorrowPage />
      </AppShell>
    );
  }

  return (
    <AppShell title="ยืม-คืน">
      <AdminBorrowPage />
    </AppShell>
  );
}
