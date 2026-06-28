"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { searchInventoryItems } from "@/services/inventory.service";
import type { InventoryItem } from "@/types";
import { ScanLine, CheckCircle, AlertCircle, Package } from "lucide-react";
import { statusConfig, conditionConfig } from "@/lib/utils";

type ScanState = "idle" | "scanning" | "found" | "not_found";

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []);

  async function startScanner() {
    if (!scannerRef.current) return;
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    html5QrRef.current = scanner;
    setState("scanning");

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScan,
        () => {}
      );
    } catch {
      setError("ไม่สามารถเปิดกล้องได้ ลองป้อนรหัสแทน");
      setState("idle");
    }
  }

  async function stopScanner() {
    if (html5QrRef.current?.isScanning) {
      await html5QrRef.current.stop();
    }
  }

  async function onScan(text: string) {
    await stopScanner();
    await lookupCode(text);
  }

  async function lookupCode(code: string) {
    try {
      // Try parse QR JSON first
      let searchCode = code;
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) searchCode = parsed.code;
        if (parsed.id) {
          router.push(`/inventory/${parsed.id}`);
          return;
        }
      } catch {}

      const results = await searchInventoryItems(searchCode);
      if (results.length > 0) {
        setItem(results[0]);
        setState("found");
      } else {
        setState("not_found");
      }
    } catch {
      setState("not_found");
    }
  }

  function reset() {
    setItem(null);
    setManualCode("");
    setError("");
    setState("idle");
    startScanner();
  }

  return (
    <AppShell title="สแกน QR">
      <div className="max-w-md mx-auto">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">สแกน QR Code</h2>
          <p className="text-sm text-gray-500">สแกน QR หรือบาร์โค้ดของอุปกรณ์</p>
        </div>

        {/* Scanner */}
        {(state === "idle" || state === "scanning") && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="relative">
              <div id="qr-reader" ref={scannerRef} className="w-full" />
              {state === "scanning" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 border-2 border-blue-500 rounded-xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Manual input */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 mb-2">หรือป้อนรหัสอุปกรณ์</p>
              <div className="flex gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && manualCode && lookupCode(manualCode)}
                  placeholder="เช่น ELEC-001"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={() => manualCode && lookupCode(manualCode)}
                  className="px-4 py-2 text-sm bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Found */}
        {state === "found" && item && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">พบอุปกรณ์</span>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-mono text-xs text-blue-700 dark:text-blue-400 mb-0.5">{item.code}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  {item.brand && <p className="text-xs text-gray-500">{item.brand}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
                  <p className="text-xs text-gray-400 mb-1">สถานะ</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[item.status].badge}`}>
                    {statusConfig[item.status].label}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
                  <p className="text-xs text-gray-400 mb-1">คงเหลือ</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{item.quantityAvailable}/{item.quantity}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/inventory/${item.id}`)}
                  className="flex-1 py-2 text-sm bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
                >
                  ดูรายละเอียด
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  สแกนใหม่
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Not found */}
        {state === "not_found" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-white mb-1">ไม่พบอุปกรณ์</p>
            <p className="text-sm text-gray-500 mb-4">รหัสนี้ไม่มีในระบบ</p>
            <button
              onClick={reset}
              className="px-6 py-2 text-sm bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
            >
              สแกนใหม่
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
