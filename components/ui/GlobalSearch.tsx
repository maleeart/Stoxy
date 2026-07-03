"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Package, ArrowLeftRight, X } from "lucide-react";
import { useInventoryItems } from "@/hooks/useInventory";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: items = [] } = useInventoryItems();
  const { allRecords } = useRealtimeBorrows();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQ("");
  }, [open]);

  // keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const term = q.trim().toLowerCase();
  const itemResults = term.length >= 1
    ? items.filter(i => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term)).slice(0, 5)
    : [];
  const borrowResults = term.length >= 1
    ? allRecords.filter(b => b.itemName.toLowerCase().includes(term) || b.borrowerName.toLowerCase().includes(term)).slice(0, 3)
    : [];
  const hasResults = itemResults.length > 0 || borrowResults.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="ค้นหา (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">ค้นหา...</span>
        <kbd className="hidden sm:inline text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: -8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="ค้นหาอุปกรณ์ รหัส หรือผู้ยืม..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                {q && <button onClick={() => setQ("")}><X className="w-4 h-4 text-gray-400" /></button>}
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto py-2">
                {!term && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-6 text-center">พิมพ์เพื่อค้นหา...</p>
                )}
                {term && !hasResults && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-6 text-center">ไม่พบผลลัพธ์สำหรับ "{q}"</p>
                )}

                {itemResults.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 py-1.5">อุปกรณ์</p>
                    {itemResults.map(item => (
                      <button key={item.id} onClick={() => { router.push(`/inventory/${item.id}`); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.images?.[0]
                            ? <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                            : <Package className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.code} · คงเหลือ {item.quantityAvailable}{item.unit ? ` ${item.unit}` : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {borrowResults.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 py-1.5">รายการยืม</p>
                    {borrowResults.map(b => (
                      <button key={b.id} onClick={() => { router.push("/borrow"); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.itemName}</p>
                          <p className="text-xs text-gray-400">{b.borrowerName} · {b.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
