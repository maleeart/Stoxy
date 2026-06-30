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

  // ── Page 1+: Summary table ────────────────────────────────
  doc.setFontSize(16);
  doc.text("รายงานคลังอุปกรณ์ไฟฟ้า - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}  |  รายการทั้งหมด: ${items.length}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "หมวดหมู่", "คงเหลือ/ทั้งหมด", "หน่วย", "สถานะ", "สถานที่"]],
    body: items.map((i) => [
      i.code,
      i.name,
      i.brand ?? "-",
      i.categoryName ?? "-",
      `${i.quantityAvailable}/${i.quantity}`,
      i.unit ?? "-",
      statusLabel[i.status] ?? i.status,
      i.locationName ?? "-",
    ]),
    styles: { font: "Sarabun", fontSize: 10 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });

  // ── Photo pages: 3×3 grid, only items with images ─────────
  const withPhotos = items.filter((i) => (i.images ?? []).length > 0);
  if (withPhotos.length > 0) {
    // landscape: 297 × 210 mm
    const cols = 3;
    const rows = 3;
    const perPage = cols * rows;
    const marginX = 14;
    const marginY = 20;
    const pageW = 297;
    const pageH = 210;
    const cellW = (pageW - marginX * 2) / cols;   // ~89 mm
    const imgH = 48;
    const labelH = 12;
    const cellH = imgH + labelH + 4;

    for (let p = 0; p < Math.ceil(withPhotos.length / perPage); p++) {
      doc.addPage("landscape");
      doc.setFont("Sarabun");
      doc.setFontSize(13);
      doc.text("รูปภาพอุปกรณ์", marginX, 13);
      doc.setFontSize(9);
      doc.text(
        `หน้า ${p + 1} / ${Math.ceil(withPhotos.length / perPage)}  |  แสดงอุปกรณ์ที่มีรูป ${withPhotos.length} รายการ`,
        marginX, 18,
      );

      const slice = withPhotos.slice(p * perPage, (p + 1) * perPage);
      slice.forEach((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = marginX + col * cellW;
        const y = marginY + row * cellH;
        const imgUrl = (item.images ?? [])[0];

        // draw border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cellW - 3, cellH, 2, 2);

        // draw image
        try {
          // base64 data URL works directly; http URLs need fetch below
          if (imgUrl.startsWith("data:")) {
            const fmt = imgUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
            doc.addImage(imgUrl, fmt, x + 1.5, y + 1.5, cellW - 6, imgH - 3);
          }
        } catch { /* skip broken image */ }

        // label: code + name (truncate if long)
        const labelY = y + imgH + 4;
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(item.code, x + 2, labelY);
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        const name = item.name.length > 28 ? item.name.slice(0, 26) + "…" : item.name;
        doc.text(name, x + 2, labelY + 5);
        doc.setTextColor(0, 0, 0);
      });
    }
  }

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

export function exportBorrowsExcel(records: BorrowRecord[]) {
  const headers = ["รหัสอุปกรณ์", "ชื่ออุปกรณ์", "ผู้ยืม", "แผนก", "วันที่ยืม", "กำหนดคืน", "วันที่คืน", "สถานะ"];
  const rows = records.map((r) => [
    r.itemCode, r.itemName, r.borrowerName, r.borrowerDepartment ?? "",
    r.borrowDate?.toDate().toLocaleDateString("th-TH") ?? "",
    r.expectedReturnDate?.toDate().toLocaleDateString("th-TH") ?? "",
    r.returnDate?.toDate().toLocaleDateString("th-TH") ?? "",
    borrowStatusLabel[r.status] ?? r.status,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Borrows");
  saveExcel(wb, `stoxy-borrows-${dateStr()}.xlsx`);
}

export async function exportMovementsPDF(movements: StockMovement[]) {
  const doc = await createDocWithThaiFont("landscape");
  doc.setFontSize(16);
  doc.text("ประวัติการเคลื่อนไหวสต็อก - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["วันที่", "รหัส", "ชื่ออุปกรณ์", "ประเภท", "ก่อน", "เปลี่ยนแปลง", "หลัง", "เหตุผล", "ผู้ดำเนินการ"]],
    body: movements.map((m) => [
      m.createdAt?.toDate().toLocaleDateString("th-TH") ?? "",
      m.itemCode, m.itemName,
      movementTypeLabel[m.type] ?? m.type,
      m.quantityBefore, m.quantityChange, m.quantityAfter,
      m.reason ?? "", m.performedByName,
    ]),
    styles: { font: "Sarabun", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });
  doc.save(`stoxy-movements-${dateStr()}.pdf`);
}

// ── Excel ─────────────────────────────────────────────────────
export function exportInventoryExcel(items: InventoryItem[]) {
  const headers = ["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "รุ่น", "หมวดหมู่", "จำนวนทั้งหมด", "คงเหลือ", "ถูกยืม", "หน่วย", "สถานะ", "สถานที่", "ราคาซื้อ", "หมายเหตุ"];
  const rows = items.map((i) => [
    i.code, i.name, i.brand ?? "", i.model ?? "", i.categoryName ?? "",
    i.quantity, i.quantityAvailable, i.quantityBorrowed, i.unit ?? "",
    statusLabel[i.status] ?? i.status,
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
