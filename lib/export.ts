import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { InventoryItem, BorrowRecord, StockMovement } from "@/types";

// Load & register Sarabun (Thai) font into a jsPDF instance
async function createDocWithThaiFont(orientation: "portrait" | "landscape" = "portrait"): Promise<jsPDF> {
  const doc = new jsPDF({ orientation });
  try {
    const res = await fetch("/fonts/Sarabun-Regular.ttf");
    const buf = await res.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    doc.addFileToVFS("Sarabun-Regular.ttf", b64);
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
    doc.setFont("Sarabun");
  } catch {
    // fallback to helvetica if font fails to load
  }
  return doc;
}

// ── PDF ───────────────────────────────────────────────────────
export async function exportInventoryPDF(items: InventoryItem[]) {
  const doc = await createDocWithThaiFont("landscape");
  doc.setFontSize(16);
  doc.text("รายงานคลังอุปกรณ์ไฟฟ้า - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "หมวดหมู่", "คงเหลือ/ทั้งหมด", "สถานะ", "สภาพ", "สถานที่"]],
    body: items.map((i) => [
      i.code,
      i.name,
      i.brand ?? "-",
      i.categoryName ?? "-",
      `${i.quantityAvailable}/${i.quantity}`,
      statusLabel[i.status] ?? i.status,
      conditionLabel[i.condition] ?? i.condition,
      i.locationName ?? "-",
    ]),
    styles: { font: "Sarabun", fontSize: 10 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });

  doc.save(`stoxy-inventory-${dateStr()}.pdf`);
}

export async function exportBorrowsPDF(records: BorrowRecord[]) {
  const doc = await createDocWithThaiFont("landscape");
  doc.setFontSize(16);
  doc.text("รายงานการยืม-คืนอุปกรณ์ - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัสอุปกรณ์", "ชื่ออุปกรณ์", "ผู้ยืม", "แผนก", "วันที่ยืม", "กำหนดคืน", "สถานะ"]],
    body: records.map((r) => [
      r.itemCode,
      r.itemName,
      r.borrowerName,
      r.borrowerDepartment ?? "-",
      r.borrowDate?.toDate().toLocaleDateString("th-TH") ?? "-",
      r.expectedReturnDate?.toDate().toLocaleDateString("th-TH") ?? "-",
      borrowStatusLabel[r.status] ?? r.status,
    ]),
    styles: { font: "Sarabun", fontSize: 10 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });

  doc.save(`stoxy-borrows-${dateStr()}.pdf`);
}

// ── Excel ─────────────────────────────────────────────────────
export function exportInventoryExcel(items: InventoryItem[]) {
  const headers = ["รหัส", "ชื่ออุปกรณ์", "หน่วย", "ยี่ห้อ", "รุ่น", "หมวดหมู่", "จำนวนทั้งหมด", "คงเหลือ", "ถูกยืม", "สถานะ", "สภาพ", "สถานที่", "ราคาซื้อ", "หมายเหตุ"];
  const rows = items.map((i) => [
    i.code, i.name, i.unit ?? "", i.brand ?? "", i.model ?? "", i.categoryName ?? "",
    i.quantity, i.quantityAvailable, i.quantityBorrowed,
    statusLabel[i.status] ?? i.status, conditionLabel[i.condition] ?? i.condition,
    i.locationName ?? "", i.purchasePrice ?? "", i.notes ?? "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  saveExcel(wb, `stoxy-inventory-${dateStr()}.xlsx`);
}

export function exportMovementsExcel(movements: StockMovement[]) {
  const headers = ["วันที่", "รหัสอุปกรณ์", "ชื่ออุปกรณ์", "ประเภท", "ก่อน", "เปลี่ยนแปลง", "หลัง", "เหตุผล", "ผู้ดำเนินการ"];
  const rows = movements.map((m) => [
    m.createdAt?.toDate().toLocaleDateString("th-TH") ?? "",
    m.itemCode, m.itemName,
    movementTypeLabel[m.type] ?? m.type,
    m.quantityBefore, m.quantityChange, m.quantityAfter,
    m.reason ?? "",
    m.performedByName,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movements");
  saveExcel(wb, `stoxy-movements-${dateStr()}.xlsx`);
}

// ── Helpers ───────────────────────────────────────────────────
const movementTypeLabel: Record<string, string> = {
  borrow: "ยืม",
  return: "คืน",
  adjustment_in: "รับเข้า",
  adjustment_out: "จ่ายออก",
  transfer: "โอนย้าย",
  disposal: "จำหน่ายออก",
  purchase: "รับซื้อ",
  maintenance_out: "ส่งซ่อม",
  maintenance_in: "รับคืนจากซ่อม",
  lost: "สูญหาย",
};

const statusLabel: Record<string, string> = {
  available: "พร้อมใช้งาน",
  borrowed: "ถูกยืม",
  under_repair: "ซ่อมแซม",
  calibrating: "สอบเทียบ",
  disposed: "จำหน่ายออก",
  lost: "สูญหาย",
};

const conditionLabel: Record<string, string> = {
  excellent: "ดีมาก",
  good: "ดี",
  fair: "พอใช้",
  poor: "แย่",
  broken: "เสีย",
};

const borrowStatusLabel: Record<string, string> = {
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  borrowed: "ยืมอยู่",
  return_pending: "รอรับทราบ",
  returned: "คืนแล้ว",
  rejected: "ปฏิเสธ",
  overdue: "เกินกำหนด",
  lost: "สูญหาย",
};

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

// Write xlsx as Blob to avoid browser encoding issues with Thai headers
function saveExcel(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
