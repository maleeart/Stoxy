"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { generateQRData } from "@/lib/utils";
import type { InventoryItem } from "@/types";
import { Search, Printer, QrCode, CheckSquare, Square } from "lucide-react";

// ponytail: qrcode encoding needs a library (Reed-Solomon + masking); dynamic import like the scanner does
async function toSvg(item: InventoryItem): Promise<string> {
  // @ts-expect-error qrcode ships no types
  const QRCode = (await import("qrcode")).default;
  return QRCode.toString(generateQRData(item.id, item.code), {
    type: "svg",
    margin: 1,
    width: 160,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export default function QrPage() {
  const { data: items = [], isLoading } = useInventoryItems();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
    );
  }, [items, search]);

  // generate SVG for any selected item we haven't rendered yet
  useEffect(() => {
    const missing = items.filter((i) => selected.has(i.id) && !svgs[i.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (i) => [i.id, await toSvg(i)] as const)).then((pairs) => {
      if (cancelled) return;
      setSvgs((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => { cancelled = true; };
  }, [selected, items, svgs]);

  const selectedItems = items.filter((i) => selected.has(i.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id))
    );
  }

  function print() {
    const ready = selectedItems.filter((i) => svgs[i.id]);
    if (ready.length === 0) return;
    const cards = ready
      .map(
        (i) =>
          `<div class="label">${svgs[i.id]}<div class="code">${escapeHtml(i.code)}</div><div class="name">${escapeHtml(i.name)}</div></div>`
      )
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR อุปกรณ์</title><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, sans-serif; margin: 12mm; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
      .label { border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; page-break-inside: avoid; }
      .label svg { width: 140px; height: 140px; }
      .code { font-family: monospace; font-size: 12px; color: #1D4ED8; margin-top: 4px; }
      .name { font-size: 12px; color: #333; margin-top: 2px; }
      @media print { @page { margin: 10mm; } }
    </style></head><body><div class="grid">${cards}</div>
    <script>window.onload = function(){ window.print(); }<\/script></body></html>`);
    w.document.close();
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <AppShell title="พิมพ์ QR">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <button
            onClick={toggleAll}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            {allSelected ? "ล้างที่เลือก" : "เลือกทั้งหมด"}
          </button>
          <button
            onClick={print}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ ({selected.size})
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500 py-12 text-center">กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">ไม่พบอุปกรณ์</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((item) => {
              const isSel = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`relative text-left rounded-2xl border p-3 transition-all ${
                    isSel
                      ? "border-[#1D4ED8] ring-2 ring-[#1D4ED8]/20 bg-blue-50/40 dark:bg-blue-900/10"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <span className="absolute top-2 right-2 text-[#1D4ED8]">
                    {isSel ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-gray-300" />}
                  </span>
                  <div className="aspect-square flex items-center justify-center mb-2 bg-white rounded-xl overflow-hidden">
                    {isSel && svgs[item.id] ? (
                      <div className="w-full h-full [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: svgs[item.id] }} />
                    ) : (
                      <QrCode className="w-10 h-10 text-gray-200" />
                    )}
                  </div>
                  <p className="font-mono text-xs text-blue-700 dark:text-blue-400 truncate">{item.code}</p>
                  <p className="text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
