"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { searchInventoryItems, getInventoryItem } from "@/services/inventory.service";
import { getAuditSessions } from "@/services/audit.service";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem } from "@/types";
import { Eye, CheckCircle, AlertCircle, Package, ArrowLeft, ArrowLeftRight, PackageOpen, ShieldCheck } from "lucide-react";
import { statusConfig, getItemMode } from "@/lib/utils";

type ScanState = "idle" | "scanning" | "found" | "not_found";
type ScanMode = "inventory" | "borrow" | "requisition" | "audit";

const modeLabel: Record<ScanMode, string> = {
  inventory: "ดูรายละเอียด",
  borrow:    "ยืมอุปกรณ์",
  requisition: "เบิกอุปกรณ์",
  audit:     "ตรวจนับ",
};

function ScanContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { stoxyUser } = useAuth();
  const mode = (params.get("mode") ?? "inventory") as ScanMode;
  const session = params.get("session") ?? "";
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  // active audit session for the "ตรวจนับ" option in the combined menu
  const { data: sessions = [] } = useQuery({
    queryKey: ["audit_sessions"],
    queryFn: getAuditSessions,
    staleTime: 60_000,
  });
  const activeAuditId = sessions.find(
    (s) =>
      s.status === "in_progress" &&
      (isAdmin || s.assignedUsers?.includes(stoxyUser?.uid ?? "") || s.assignedUsers?.includes("all"))
  )?.id;
  // prefer the in-session id when scanning from an audit session, else any active one
  const auditTarget = session || activeAuditId;
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
    if (!window.isSecureContext) {
      setError("กล้องต้องเปิดผ่าน HTTPS — ลองป้อนรหัสแทน");
      setState("idle");
      return;
    }
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    html5QrRef.current = scanner;
    setState("scanning");

    // qrbox relative to the video so it never exceeds the frame (a start() error on narrow screens)
    const config = {
      fps: 10,
      qrbox: (w: number, h: number) => {
        const m = Math.floor(Math.min(w, h) * 0.75);
        return { width: m, height: m };
      },
    };

    try {
      await scanner.start({ facingMode: "environment" }, config, onScan, () => {});
    } catch {
      // fallback: env constraint can fail on desktop / iOS — pick a camera explicitly
      try {
        const cams = await Html5Qrcode.getCameras();
        if (!cams?.length) throw new Error("no-camera");
        const back = cams.find((c) => /back|rear|environment/i.test(c.label)) ?? cams[cams.length - 1];
        await scanner.start(back.id, config, onScan, () => {});
      } catch (e: any) {
        setError(cameraError(e));
        setState("idle");
      }
    }
  }

  function cameraError(e: any): string {
    switch (e?.name) {
      case "NotAllowedError": return "ไม่ได้อนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องในเบราว์เซอร์แล้วลองใหม่";
      case "NotFoundError":
      case "OverconstrainedError": return "ไม่พบกล้องบนอุปกรณ์นี้ — ลองป้อนรหัสแทน";
      case "NotReadableError": return "กล้องถูกใช้งานโดยแอปอื่น — ปิดแล้วลองใหม่";
      default: return `เปิดกล้องไม่ได้: ${e?.message ?? e?.name ?? "unknown"} — ลองป้อนรหัสแทน`;
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
      // Prefer a direct getDoc by the QR's id — fast and exact. Fall back to a
      // code search for manual entry / legacy codes. Always land on the found-state.
      let searchCode = code;
      let byId: InventoryItem | null = null;
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) searchCode = parsed.code;
        if (parsed.id) byId = await getInventoryItem(parsed.id);
      } catch {}

      const found = byId ?? (await searchInventoryItems(searchCode))[0] ?? null;
      if (found) {
        setItem(found);
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
        <div className="mb-5 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">สแกน QR Code</h2>
            <p className="text-sm text-gray-500">โหมด: {modeLabel[mode]}</p>
          </div>
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
                  className="px-4 py-2 text-sm bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors"
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
              {/* Combined menu — same choices on every scan entry */}
              <div className="space-y-2 mb-2">
                {getItemMode(item.categoryId) === "borrow" ? (
                  <button onClick={() => router.push(`/borrow?item=${item.id}`)}
                    className="w-full flex items-center gap-2 py-2.5 px-3 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors">
                    <ArrowLeftRight className="w-4 h-4" /> ยืมอุปกรณ์
                  </button>
                ) : (
                  <button onClick={() => router.push(`/requisition?item=${item.id}`)}
                    className="w-full flex items-center gap-2 py-2.5 px-3 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors">
                    <PackageOpen className="w-4 h-4" /> เบิกอุปกรณ์
                  </button>
                )}
                {auditTarget && (
                  <button onClick={() => router.push(`/audit/${auditTarget}?q=${encodeURIComponent(item.code)}`)}
                    className="w-full flex items-center gap-2 py-2.5 px-3 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <ShieldCheck className="w-4 h-4 text-gray-500" /> ตรวจนับ
                  </button>
                )}
                <button onClick={() => router.push(`/inventory/${item.id}`)}
                  className="w-full flex items-center gap-2 py-2.5 px-3 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Eye className="w-4 h-4 text-gray-500" /> ดูรายละเอียด
                </button>
                <button onClick={reset}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
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
              className="px-6 py-2 text-sm bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              สแกนใหม่
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanContent />
    </Suspense>
  );
}
