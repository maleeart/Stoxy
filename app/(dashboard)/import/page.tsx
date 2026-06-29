"use client";

import { useState } from "react";
import { collection, doc, writeBatch, Timestamp, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// locationId = location name string (app convention in inventory.service & edit page)
const CATEGORY_ID = "electrical";
const CATEGORY_NAME = "วัสดุ-อุปกรณ์ไฟฟ้า";
const LOCATION_NAMES = ["คลัง", "ตู้เก็บของ 1", "ตู้เก็บของ 2", "ตู้เก็บของ 6"];

const ITEMS: Array<{ code: string; name: string; brand: string; quantity: number; unit: string; loc: string }> = [
  { code: "ELEC-001", name: "หลอดไฟ FL-T5 14W.", brand: "Philips", quantity: 11, unit: "หลอด", loc: "ตู้เก็บของ 6" },
  { code: "ELEC-002", name: "หลอดไฟ FL-T5 28W.", brand: "Philips", quantity: 225, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-003", name: "หลอดไฟ FL LED 9W. T8 Cool Daylight", brand: "Philips", quantity: 27, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-004", name: "หลอดไฟ FL LED 9W. T8 Daylight", brand: "L&E", quantity: 7, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-005", name: "หลอดไฟ FL-LED T8 18W. Cool Daylight เขียว", brand: "Hiet", quantity: 18, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-006", name: "หลอดไฟ FL-LED T8 18W. Cool Daylight แดง", brand: "TFC electrics", quantity: 0, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-007", name: "หลอดไฟ LED 3W. Warm White ขั้ว E27", brand: "Racer", quantity: 23, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-008", name: "หลอดไฟ LED 7W. ขั้ว E27", brand: "L&E", quantity: 2, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-009", name: "หลอดไฟ LED 9.5W. Cool Daylight ขั้ว E27", brand: "Philips", quantity: 30, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-010", name: "หลอดไฟพาเนลไลท์ LED 15W. ขนาด 6 นิ้ว", brand: "EVE Lighting", quantity: 119, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-011", name: "หลอดไฟ LED Downlight (8 นิ้ว) (ทางเชื่อม ท.0019)", brand: "", quantity: 4, unit: "โคม", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-012", name: "หลอดไฟ LDE 5W. (ใช้แทนหลอด HaLogen)", brand: "Philips", quantity: 15, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-013", name: "หลอดไฟ Halogen 12V. 50W.", brand: "Philips", quantity: 8, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-014", name: "หลอดไฟ Halogen 12V. 50W. (แบบเสียบ)", brand: "Philips", quantity: 11, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-015", name: "หลอดไฟ PL-C 10W.865/2P (หลอดตะเกียบ)", brand: "Philips", quantity: 6, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-016", name: "หลอดไฟ PL-S 11W.865/2P (หลอดตะเกียบ)", brand: "Philips", quantity: 45, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-017", name: "หลอดไฟ PL-C 18W.865/4P (หลอดตะเกียบ)", brand: "Philips", quantity: 60, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-018", name: "หลอดไฟ PL-C 18W.830/2P (หลอดตะเกียบ)", brand: "Philips", quantity: 34, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-019", name: "หลอดไฟ Son-T 250W. ขั้ว E40", brand: "Philips", quantity: 10, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-020", name: "หลอดไฟ 500W. ขั้ว E40 (หลอดแสงจันทร์)", brand: "Narwar", quantity: 2, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-021", name: "หลอดไฟ Dob Better 50W. Daylight", brand: "EVE Lighting", quantity: 4, unit: "หลอด", loc: "คลัง" },
  { code: "ELEC-022", name: "หลอดไฟ Pilot Lamp 6V. 3W. ขั้วเกลียว", brand: "", quantity: 69, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-023", name: "หลอดไฟ Pilot Lamp 6V. 3W. ขั้วเขี้ยว", brand: "", quantity: 69, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-024", name: "สวิทช์ Pilot Lamp สีน้ำเงิน", brand: "Schneider", quantity: 4, unit: "ชุด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-025", name: "Pilot Lamp LED สีเขียว", brand: "", quantity: 7, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-026", name: "Pilot Lamp LED สีแดง", brand: "", quantity: 10, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-027", name: "Pilot Lamp LED สีเหลือง", brand: "", quantity: 10, unit: "หลอด", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-028", name: "หลอดไฟ TUV 8W. (หลอดไฟฆ่าเชื้อ)", brand: "Philips", quantity: 5, unit: "หลอด", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-029", name: "โคมหลอดไฟ LED Downlight Model DL-SRw20 4นิ้ว (ต.0017)", brand: "", quantity: 10, unit: "โคม", loc: "ตู้เก็บของ 6" },
  { code: "ELEC-030", name: "บัลลาส 1X28W-T5", brand: "Silver Light", quantity: 13, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-031", name: "บัลลาส 2X28W-T5", brand: "Philips", quantity: 6, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-032", name: "บัลลาส 24W. (ต.0019 โรงอาหาร-เฟตเนส)", brand: "LiFud", quantity: 37, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-033", name: "บัลลาส LDE หรี่หลอดไฟ ห้องประชุมชั้น 5", brand: "Linkuan", quantity: 3, unit: "อัน", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-034", name: "บัลลาส LDE 30W.", brand: "", quantity: 19, unit: "อัน", loc: "ตู้เก็บของ 1" },
  { code: "ELEC-035", name: "หม้อแปลง 220V. ออก 12V. (หลอด HaLogen)", brand: "CROSS", quantity: 18, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-036", name: "หม้อแปลง 12V. (หลอด HaLogen)", brand: "", quantity: 5, unit: "อัน", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-037", name: "อะแดปเตอร์หลอดไฟ (รุ่น G24D) ขั้วเยื้อง", brand: "", quantity: 44, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-038", name: "อะแดปเตอร์หลอดไฟ (รุ่น G24D) ขั้วตรง", brand: "", quantity: 9, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-039", name: "สวิทช์ 1 ทาง", brand: "Bticino", quantity: 12, unit: "อัน", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-040", name: "สวิทช์ 1 ทาง WEG 5001K", brand: "Panasonic", quantity: 29, unit: "อัน", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-041", name: "สวิทช์ 3 ทาง WEG 5002K", brand: "Panasonic", quantity: 49, unit: "อัน", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-042", name: "สวิทช์แสงแดด", brand: "Dako", quantity: 10, unit: "ชุด", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-043", name: "สวิทช์กระตุก", brand: "", quantity: 77, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-044", name: "เต้ารับไฟฟ้าแบบฝังพื้น (ป๊อปอัพ)", brand: "Bticino", quantity: 8, unit: "ชุด", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-045", name: "ปลั๊กไฟป๊อบอัพ Schneider S-Flexi", brand: "Schneider", quantity: 2, unit: "ชุด", loc: "ตู้เก็บของ 6" },
  { code: "ELEC-046", name: "เต้ารับไฟฟ้าแบบลอย", brand: "Haco", quantity: 23, unit: "ชุด", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-047", name: "ฝาครอบพลาสติก 1 ช่อง WEG 6801WK", brand: "Panasonic", quantity: 50, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-048", name: "ฝาครอบพลาสติก 2 ช่อง WEG 6802WK", brand: "Panasonic", quantity: 54, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-049", name: "ฝาครอบพลาสติก 3 ช่อง WEG 6803WK", brand: "Panasonic", quantity: 72, unit: "อัน", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-050", name: "ฝาบล็อกกันน้ำ 3 ช่อง", brand: "Bticino", quantity: 3, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-051", name: "ฝาบล็อกกันน้ำ 3 ช่อง", brand: "Nan", quantity: 1, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-052", name: "บล็อกพลาสติก 2x4 นิ้ว", brand: "Nan", quantity: 26, unit: "อัน", loc: "ตู้เก็บของ 6" },
  { code: "ELEC-053", name: "บล็อกพลาสติกใส่เบรคเกอร์", brand: "VAVA", quantity: 4, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-054", name: "บล็อกผังเหล็ก 4x4 นิ้ว พร้อมฝาปิด", brand: "", quantity: 4, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-055", name: "รางสายไฟ WD 3", brand: "Euroduct", quantity: 143, unit: "เส้น", loc: "คลัง" },
  { code: "ELEC-056", name: "รางสายไฟ WD 4", brand: "Euroduct", quantity: 5, unit: "เส้น", loc: "คลัง" },
  { code: "ELEC-057", name: "รางสายไฟ FT 50 (รางหลังเต่า)", brand: "Nan", quantity: 16, unit: "เส้น", loc: "คลัง" },
  { code: "ELEC-058", name: "ข้องอ 90 องศา สีขาว IE 20", brand: "Haco", quantity: 24, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-059", name: "ข้อต่อตรง สีขาว M20", brand: "Haco", quantity: 13, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-060", name: "แคล็มป์ก้ามปู สีขาว CC20", brand: "Haco", quantity: 22, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-061", name: "ใส้ไก่รัดสายไฟขนาด 12mm. ยาว 10 เมตร", brand: "", quantity: 3, unit: "ม้วน", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-062", name: "เคเบิ้ลไทร์ สีขาว ขนาด 8 นิ้ว", brand: "Bandex", quantity: 2, unit: "ห่อ", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-063", name: "เคเบิ้ลไทร์ สีขาว ขนาด 15 นิ้ว", brand: "Bandex", quantity: 1, unit: "ห่อ", loc: "ตู้เก็บของ 2" },
  { code: "ELEC-064", name: "ฐาน Smoke Detector B 401", brand: "Notifire", quantity: 5, unit: "อัน", loc: "คลัง" },
  { code: "ELEC-065", name: "ฐาน Smoke Detector B 501", brand: "Notifire", quantity: 6, unit: "อัน", loc: "คลัง" },
];

export default function ImportPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  if (!isAdmin) {
    router.push("/dashboard");
    return null;
  }

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg]);
  }

  async function runImport() {
    setStatus("running");
    setLog([]);
    setProgress(0);

    try {
      // 1. Merge new locations into settings/locations (append-only)
      addLog("📍 อัปเดต locations...");
      const locRef = doc(db, "settings", "locations");
      const locSnap = await getDoc(locRef);
      const existing: string[] = locSnap.exists() ? (locSnap.data().items as string[]) : [];
      const merged = [...new Set([...existing, ...LOCATION_NAMES])];
      await setDoc(locRef, { items: merged });
      addLog(`  ✅ locations: ${merged.join(", ")}`);

      // 2. Import items in batches of 20
      addLog(`\n📦 นำเข้า ${ITEMS.length} รายการ...`);
      const now = Timestamp.now();

      for (let i = 0; i < ITEMS.length; i += 20) {
        const chunk = ITEMS.slice(i, i + 20);
        const batch = writeBatch(db);
        for (const item of chunk) {
          const ref = doc(collection(db, "inventory_items"));
          batch.set(ref, {
            code: item.code,
            name: item.name,
            brand: item.brand || null,
            model: null,
            categoryId: CATEGORY_ID,
            categoryName: CATEGORY_NAME,
            locationId: item.loc,
            locationName: item.loc,
            quantity: item.quantity,
            quantityAvailable: item.quantity,
            quantityBorrowed: 0,
            quantityUnderRepair: 0,
            minStockLevel: 0,
            status: "available",
            condition: "good",
            requiresCalibration: false,
            requiresMaintenance: false,
            notes: `หน่วย: ${item.unit}`,
            createdAt: now,
            updatedAt: now,
          });
        }
        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / ITEMS.length) * 100));
        addLog(`  ✅ ${i + 1}–${Math.min(i + 20, ITEMS.length)} จาก ${ITEMS.length}`);
      }

      addLog(`\n🎉 เสร็จสมบูรณ์! นำเข้า ${ITEMS.length} รายการเรียบร้อยแล้ว`);
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`❌ เกิดข้อผิดพลาด: ${msg}`);
      setStatus("error");
    }
  }

  return (
    <AppShell title="นำเข้าข้อมูลสินค้าคงคลัง">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#0d2137] text-white rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-1">นำเข้าวัสดุ-อุปกรณ์ไฟฟ้า ปี 69</h2>
          <p className="text-sm text-white/60">จำนวน {ITEMS.length} รายการ · หมวดหมู่: {CATEGORY_NAME}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/50">
            <span>📦 คลัง: {ITEMS.filter(i => i.loc === "คลัง").length} รายการ</span>
            <span>🗄️ ตู้เก็บของ 1: {ITEMS.filter(i => i.loc === "ตู้เก็บของ 1").length} รายการ</span>
            <span>🗄️ ตู้เก็บของ 2: {ITEMS.filter(i => i.loc === "ตู้เก็บของ 2").length} รายการ</span>
            <span>🗄️ ตู้เก็บของ 6: {ITEMS.filter(i => i.loc === "ตู้เก็บของ 6").length} รายการ</span>
          </div>
        </div>

        {/* Action */}
        {status === "idle" && (
          <button
            onClick={runImport}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-base transition-colors"
          >
            เริ่มนำเข้าข้อมูล
          </button>
        )}

        {(status === "running" || status === "done") && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-500">{progress}%</p>
          </div>
        )}

        {status === "done" && (
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/inventory")}
              className="flex-1 py-3 bg-[#0d2137] text-white font-bold rounded-2xl"
            >
              ไปที่คลังอุปกรณ์
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl"
            >
              หน้าหลัก
            </button>
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => setStatus("idle")}
            className="w-full py-3 bg-red-100 text-red-700 font-bold rounded-2xl"
          >
            ลองใหม่
          </button>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="bg-gray-950 text-gray-300 rounded-2xl p-4 font-mono text-xs space-y-1 max-h-80 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
