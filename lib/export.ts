import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { InventoryItem, BorrowRecord, StockMovement } from "@/types";

// ── PDF ───────────────────────────────────────────────────────
export function exportInventoryPDF(items: InventoryItem[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("รายงานคลังอุปกรณ์ไฟฟ้า - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "หมวดหมู่", "คงเหลือ", "สถานะ", "สภาพ", "สถานที่"]],
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
    styles: { font: "helvetica", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55] },
  });

  doc.save(`stoxy-inventory-${dateStr()}.pdf`);
}

export function exportBorrowsPDF(records: BorrowRecord[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("รายงานการยืม-คืนอุปกรณ์ - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัสอุปกรณ์", "ชื่ออุปกรณ์", "ผู้ยืม", "วันที่ยืม", "กำหนดคืน", "สถานะ"]],
    body: records.map((r) => [
      r.itemCode,
      r.itemName,
      r.borrowerName,
      r.borrowDate?.toDate().toLocaleDateString("th-TH") ?? "-",
      r.expectedReturnDate?.toDate().toLocaleDateString("th-TH") ?? "-",
      r.status,
    ]),
    styles: { font: "helvetica", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55] },
  });

  doc.save(`stoxy-borrows-${dateStr()}.pdf`);
}

// ── Excel ─────────────────────────────────────────────────────
export function exportInventoryExcel(items: InventoryItem[]) {
  const rows = items.map((i) => ({
    รหัส: i.code,
    ชื่ออุปกรณ์: i.name,
    ยี่ห้อ: i.brand ?? "",
    รุ่น: i.model ?? "",
    หมวดหมู่: i.categoryName ?? "",
    จำนวนทั้งหมด: i.quantity,
    คงเหลือ: i.quantityAvailable,
    ถูกยืม: i.quantityBorrowed,
    สถานะ: statusLabel[i.status] ?? i.status,
    สภาพ: conditionLabel[i.condition] ?? i.condition,
    สถานที่: i.locationName ?? "",
    ราคาซื้อ: i.purchasePrice ?? "",
    หมายเหตุ: i.notes ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  XLSX.writeFile(wb, `stoxy-inventory-${dateStr()}.xlsx`);
}

export function exportMovementsExcel(movements: StockMovement[]) {
  const rows = movements.map((m) => ({
    วันที่: m.createdAt?.toDate().toLocaleDateString("th-TH") ?? "",
    รหัสอุปกรณ์: m.itemCode,
    ชื่ออุปกรณ์: m.itemName,
    ประเภท: m.type,
    ก่อน: m.quantityBefore,
    เปลี่ยนแปลง: m.quantityChange,
    หลัง: m.quantityAfter,
    เหตุผล: m.reason ?? "",
    ผู้ดำเนินการ: m.performedByName,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movements");
  XLSX.writeFile(wb, `stoxy-movements-${dateStr()}.xlsx`);
}

// ── Helpers ───────────────────────────────────────────────────
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

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}
