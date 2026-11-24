import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { InventoryItem, BorrowRecord, StockMovement, AuditSession, AuditItem, FMWorkOrder } from "@/types";
import type { Requisition } from "@/services/requisition.service";

// Load & register Sarabun (Thai) font into a jsPDF instance
async function createDocWithThaiFont(orientation: "portrait" | "landscape" = "portrait"): Promise<jsPDF> {
  const doc = new jsPDF({ orientation });
  try {
    const res = await fetch("/fonts/Sarabun-Regular.ttf");
    const buf = await res.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    doc.addFileToVFS("Sarabun-Regular.ttf", b64);
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "bold");
    doc.setFont("Sarabun");
  } catch {
    // fallback to helvetica if font fails to load
  }
  return doc;
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageDimensions(b64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = b64;
  });
}

async function renderContainedImage(
  doc: jsPDF,
  urlOrB64: string,
  boxX: number,
  boxY: number,
  maxW: number,
  maxH: number
): Promise<void> {
  try {
    const b64 = await fetchImageAsBase64(urlOrB64);
    if (!b64) return;

    // Fill empty background with white
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, boxY, maxW, maxH, "F");

    const dims = await getImageDimensions(b64);
    if (!dims.width || !dims.height) {
      const fmt = b64.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(b64, fmt, boxX, boxY, maxW, maxH);
      return;
    }

    const imgAspect = dims.width / dims.height;
    const boxAspect = maxW / maxH;

    let drawW = maxW;
    let drawH = maxH;
    let drawX = boxX;
    let drawY = boxY;

    if (imgAspect > boxAspect) {
      drawW = maxW;
      drawH = maxW / imgAspect;
      drawY = boxY + (maxH - drawH) / 2;
    } else {
      drawH = maxH;
      drawW = maxH * imgAspect;
      drawX = boxX + (maxW - drawW) / 2;
    }

    const fmt = b64.startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(b64, fmt, drawX, drawY, drawW, drawH);
  } catch {
    /* skip broken image */
  }
}

// ── PDF ───────────────────────────────────────────────────────
export async function exportInventoryPDF(items: InventoryItem[], sortBy: "code" | "name" | "quantity" | "status" = "code") {
  const sorted = [...items].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "th");
    if (sortBy === "quantity") return b.quantityAvailable - a.quantityAvailable;
    if (sortBy === "status") return a.status.localeCompare(b.status);
    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" });
  });
  const doc = await createDocWithThaiFont("landscape");

  // ── Page 1+: Summary table ────────────────────────────────
  doc.setFontSize(16);
  doc.text("รายงานคลังอุปกรณ์ไฟฟ้า - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}  |  รายการทั้งหมด: ${sorted.length}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "หมวดหมู่", "คงเหลือ/ทั้งหมด", "หน่วย", "สถานะ", "สถานที่"]],
    body: sorted.map((i) => [
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
  const withPhotos = sorted.filter((i) => (i.images ?? []).length > 0);
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
    const imgH = 42;
    const labelH = 10;
    const cellH = imgH + labelH + 2;

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
      for (let idx = 0; idx < slice.length; idx++) {
        const item = slice[idx];
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = marginX + col * cellW;
        const y = marginY + row * cellH;
        const imgUrl = (item.images ?? [])[0];

        // draw border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cellW - 3, cellH, 2, 2, "S");

        // draw image (contain aspect ratio + white background)
        await renderContainedImage(doc, imgUrl, x + 1.5, y + 1.5, cellW - 6, imgH - 3);

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
      }
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
    r.actualReturnDate?.toDate().toLocaleDateString("th-TH") ?? "",
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
      m.reason ?? "", m.subjectName ?? m.performedByName,
    ]),
    styles: { font: "Sarabun", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });
  doc.save(`stoxy-movements-${dateStr()}.pdf`);
}

// ── Excel ─────────────────────────────────────────────────────
export function exportInventoryExcel(items: InventoryItem[], sortBy: "code" | "name" | "quantity" | "status" = "code") {
  const sorted = [...items].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "th");
    if (sortBy === "quantity") return b.quantityAvailable - a.quantityAvailable;
    if (sortBy === "status") return a.status.localeCompare(b.status);
    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" });
  });
  const headers = ["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "รุ่น", "หมวดหมู่", "จำนวนทั้งหมด", "คงเหลือ", "ถูกยืม", "หน่วย", "สถานะ", "สถานที่", "ราคาซื้อ", "หมายเหตุ"];
  const rows = sorted.map((i) => [
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
    m.subjectName ?? m.performedByName,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movements");
  saveExcel(wb, `stoxy-movements-${dateStr()}.xlsx`);
}

export async function exportRequisitionsPDF(reqs: Requisition[]) {
  const doc = await createDocWithThaiFont("landscape");
  doc.setFontSize(16);
  doc.text("รายงานการเบิกวัสดุ - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["วันที่", "รหัสอุปกรณ์", "ชื่ออุปกรณ์", "จำนวน", "ผู้เบิก", "วัตถุประสงค์", "สถานะ"]],
    body: reqs.map((r) => [
      r.createdAt?.toDate().toLocaleDateString("th-TH") ?? "",
      r.itemCode, r.itemName, r.quantity,
      r.requesterName, r.purpose,
      r.status === "approved" ? "อนุมัติ" : r.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ",
    ]),
    styles: { font: "Sarabun", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });
  doc.save(`stoxy-requisitions-${dateStr()}.pdf`);
}

export function exportRequisitionsExcel(reqs: Requisition[]) {
  const headers = ["วันที่", "รหัสอุปกรณ์", "ชื่ออุปกรณ์", "จำนวน", "ผู้เบิก", "วัตถุประสงค์", "สถานะ"];
  const rows = reqs.map((r) => [
    r.createdAt?.toDate().toLocaleDateString("th-TH") ?? "",
    r.itemCode, r.itemName, r.quantity,
    r.requesterName, r.purpose,
    r.status === "approved" ? "อนุมัติ" : r.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Requisitions");
  saveExcel(wb, `stoxy-requisitions-${dateStr()}.xlsx`);
}

export async function exportPurchasePDF(items: InventoryItem[]) {
  const sorted = [...items].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" }));
  const doc = await createDocWithThaiFont("landscape");

  doc.setFontSize(16);
  doc.text("รายงานรายการอุปกรณ์ที่ต้องสั่งซื้อ - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")}  |  รายการทั้งหมด: ${sorted.length} รายการ`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "รุ่น", "หมวดหมู่", "คงเหลือ", "แนะนำสั่งซื้อ", "หน่วย", "สถานที่"]],
    body: sorted.map((i) => [
      i.code,
      i.name,
      i.brand ?? "-",
      i.model ?? "-",
      i.categoryName ?? "-",
      i.quantityAvailable,
      Math.max(1, (i.minStockLevel ?? 0) * 2 - i.quantityAvailable),
      i.unit ?? "-",
      i.locationName ?? "-",
    ]),
    styles: { font: "Sarabun", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
  });

  // ── Photo pages: 3×3 grid, only items with images ─────────
  const withPhotos = sorted.filter((i) => (i.images ?? []).length > 0);
  if (withPhotos.length > 0) {
    const cols = 3;
    const rows = 3;
    const perPage = cols * rows;
    const marginX = 14;
    const marginY = 20;
    const pageW = 297;
    const pageH = 210;
    const cellW = (pageW - marginX * 2) / cols;
    const imgH = 40;
    const labelH = 14;
    const cellH = imgH + labelH + 2;

    for (let p = 0; p < Math.ceil(withPhotos.length / perPage); p++) {
      doc.addPage("landscape");
      doc.setFont("Sarabun");
      doc.setFontSize(13);
      doc.text("รูปภาพอุปกรณ์ที่ต้องสั่งซื้อ", marginX, 13);
      doc.setFontSize(9);
      doc.text(
        `หน้า ${p + 1} / ${Math.ceil(withPhotos.length / perPage)}  |  แสดงอุปกรณ์ที่มีรูป ${withPhotos.length} รายการ`,
        marginX, 18,
      );

      const slice = withPhotos.slice(p * perPage, (p + 1) * perPage);
      for (let idx = 0; idx < slice.length; idx++) {
        const item = slice[idx];
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = marginX + col * cellW;
        const y = marginY + row * cellH;
        const rawUrl = (item.images ?? [])[0];

        // draw border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cellW - 3, cellH, 2, 2, "S");

        // draw image (contain aspect ratio + white background)
        await renderContainedImage(doc, rawUrl, x + 1.5, y + 1.5, cellW - 6, imgH - 3);

        // label: code + name (truncate if long)
        const labelY = y + imgH + 3.5;
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const brandModel = [item.brand, item.model].filter(Boolean).join(" - ");
        doc.text(`${item.code} ${brandModel ? `(${brandModel})` : ""}`, x + 2, labelY);
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        const name = item.name.length > 28 ? item.name.slice(0, 26) + "…" : item.name;
        doc.text(name, x + 2, labelY + 4.5);
        doc.setFontSize(8);
        doc.setTextColor(29, 78, 216);
        const orderQty = Math.max(1, (item.minStockLevel ?? 0) * 2 - item.quantityAvailable);
        doc.text(`แนะนำสั่ง: +${orderQty} ${item.unit ?? "ชิ้น"} (คงเหลือ ${item.quantityAvailable})`, x + 2, labelY + 8.5);
        doc.setTextColor(0, 0, 0);
      }
    }
  }

  doc.save(`stoxy-purchase-${dateStr()}.pdf`);
}

export function exportPurchaseExcel(items: InventoryItem[]) {
  const sorted = [...items].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" }));
  const headers = ["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "รุ่น", "หมวดหมู่", "คงเหลือ", "แนะนำสั่งซื้อ", "หน่วย", "สถานที่", "ราคาซื้อ", "หมายเหตุ"];
  const rows = sorted.map((i) => [
    i.code,
    i.name,
    i.brand ?? "",
    i.model ?? "",
    i.categoryName ?? "",
    i.quantityAvailable,
    Math.max(1, (i.minStockLevel ?? 0) * 2 - i.quantityAvailable),
    i.unit ?? "",
    i.locationName ?? "",
    i.purchasePrice ?? "",
    i.notes ?? "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PurchaseList");
  saveExcel(wb, `stoxy-purchase-${dateStr()}.xlsx`);
}

// ── Audit Exports ─────────────────────────────────────────────
export async function exportAuditPDF(session: AuditSession, inventoryItems: InventoryItem[] = []) {
  const invMap = new Map(inventoryItems.map((i) => [i.id, i]));
  const rawItems: AuditItem[] = (session.items && session.items.length > 0)
    ? session.items
    : inventoryItems.map((item) => ({
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        expectedQuantity: item.quantityAvailable,
        actualQuantity: undefined,
        status: "pending" as const,
      }));

  const sorted = [...rawItems].sort((a, b) =>
    a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true, sensitivity: "base" })
  );

  const doc = await createDocWithThaiFont("landscape");

  const counted = sorted.filter((i) => i.actualQuantity != null);
  const matched = counted.filter((i) => i.actualQuantity === i.expectedQuantity).length;
  const mismatch = counted.filter((i) => i.actualQuantity !== i.expectedQuantity).length;
  const uncounted = sorted.length - counted.length;

  const dateDisplay = session.endDate
    ? session.endDate.toDate().toLocaleDateString("th-TH")
    : session.startDate
    ? session.startDate.toDate().toLocaleDateString("th-TH")
    : new Date().toLocaleDateString("th-TH");

  doc.setFontSize(16);
  doc.text(`รายงานสรุปผลการตรวจนับสต็อก - ${session.name}`, 14, 15);
  doc.setFontSize(10);
  doc.text(
    `รอบตรวจนับ: ${session.name}  |  วันที่: ${dateDisplay}  |  ทั้งหมด: ${sorted.length} (นับแล้ว: ${counted.length}, ตรงกัน: ${matched}, ต่างกัน: ${mismatch}, ยังไม่นับ: ${uncounted})`,
    14,
    22
  );

  autoTable(doc, {
    startY: 28,
    head: [["รหัส", "ชื่ออุปกรณ์", "ยี่ห้อ", "หมวดหมู่", "สถานที่", "ยอดระบบเดิม", "ยอดตรวจนับ", "ผลต่าง", "หน่วย", "สถานะการนับ"]],
    body: sorted.map((i) => {
      const inv = invMap.get(i.itemId) || inventoryItems.find((x) => x.code === i.itemCode);
      const actual = i.actualQuantity != null ? i.actualQuantity : "-";
      const diffVal = i.actualQuantity != null ? i.actualQuantity - i.expectedQuantity : null;
      const diffStr = diffVal === null ? "-" : diffVal > 0 ? `+${diffVal}` : `${diffVal}`;
      const statusText = i.actualQuantity == null
        ? "ยังไม่ได้นับ"
        : i.actualQuantity === i.expectedQuantity
        ? "ตรงกัน"
        : i.actualQuantity > i.expectedQuantity
        ? `เกิน (+${i.actualQuantity - i.expectedQuantity})`
        : `ขาด (${i.actualQuantity - i.expectedQuantity})`;

      return [
        i.itemCode,
        i.itemName,
        inv?.brand ?? "-",
        inv?.categoryName ?? "-",
        inv?.locationName ?? "-",
        i.expectedQuantity,
        actual,
        diffStr,
        inv?.unit ?? "ชิ้น",
        statusText,
      ];
    }),
    styles: { font: "Sarabun", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55], font: "Sarabun", fontStyle: "normal", textColor: 255 },
    columnStyles: {
      0: { cellWidth: 26 },
      5: { halign: "center" },
      6: { halign: "center" },
      7: { halign: "center" },
      8: { halign: "center" },
      9: { halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val.startsWith("+")) {
          data.cell.styles.textColor = [16, 149, 193];
        } else if (val.startsWith("-")) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
  });

  // ── Photo pages: 3×3 grid, only items with images ─────────
  const withPhotos = sorted
    .map((item) => {
      const inv = invMap.get(item.itemId) || inventoryItems.find((x) => x.code === item.itemCode);
      return {
        ...item,
        images: inv?.images ?? [],
        brand: inv?.brand,
        model: inv?.model,
        unit: inv?.unit ?? "ชิ้น",
      };
    })
    .filter((i) => i.images.length > 0);

  if (withPhotos.length > 0) {
    const cols = 3;
    const rows = 3;
    const perPage = cols * rows;
    const marginX = 14;
    const marginY = 20;
    const pageW = 297;
    const pageH = 210;
    const cellW = (pageW - marginX * 2) / cols;
    const imgH = 40;
    const labelH = 14;
    const cellH = imgH + labelH + 2;

    for (let p = 0; p < Math.ceil(withPhotos.length / perPage); p++) {
      doc.addPage("landscape");
      doc.setFont("Sarabun");
      doc.setFontSize(13);
      doc.text(`รูปภาพอุปกรณ์รอบตรวจนับ - ${session.name}`, marginX, 13);
      doc.setFontSize(9);
      doc.text(
        `หน้า ${p + 1} / ${Math.ceil(withPhotos.length / perPage)}  |  แสดงอุปกรณ์ที่มีรูป ${withPhotos.length} รายการ`,
        marginX,
        18,
      );

      const slice = withPhotos.slice(p * perPage, (p + 1) * perPage);
      for (let idx = 0; idx < slice.length; idx++) {
        const item = slice[idx];
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = marginX + col * cellW;
        const y = marginY + row * cellH;
        const rawUrl = item.images[0];

        // draw border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cellW - 3, cellH, 2, 2, "S");

        // draw image (contain aspect ratio + white background)
        await renderContainedImage(doc, rawUrl, x + 1.5, y + 1.5, cellW - 6, imgH - 3);

        // label: code + brand/model
        const labelY = y + imgH + 3.5;
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const brandModel = [item.brand, item.model].filter(Boolean).join(" - ");
        doc.text(`${item.itemCode} ${brandModel ? `(${brandModel})` : ""}`, x + 2, labelY);

        // name
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20);
        const name = item.itemName.length > 28 ? item.itemName.slice(0, 26) + "…" : item.itemName;
        doc.text(name, x + 2, labelY + 4.5);

        // count result
        doc.setFontSize(8);
        if (item.actualQuantity == null) {
          doc.setTextColor(156, 163, 175);
          doc.text(`ยังไม่ได้นับ (ยอดเดิม: ${item.expectedQuantity} ${item.unit})`, x + 2, labelY + 8.5);
        } else {
          const diff = item.actualQuantity - item.expectedQuantity;
          if (diff === 0) {
            doc.setTextColor(16, 185, 129); // emerald
            doc.text(`นับได้: ${item.actualQuantity} ${item.unit} (ตรงตามระบบ)`, x + 2, labelY + 8.5);
          } else if (diff > 0) {
            doc.setTextColor(29, 78, 216); // blue
            doc.text(`นับได้: ${item.actualQuantity} ${item.unit} (เกิน +${diff})`, x + 2, labelY + 8.5);
          } else {
            doc.setTextColor(220, 38, 38); // red
            doc.text(`นับได้: ${item.actualQuantity} ${item.unit} (ขาด ${diff})`, x + 2, labelY + 8.5);
          }
        }
        doc.setTextColor(0, 0, 0);
      }
    }
  }

  const cleanName = session.name.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
  doc.save(`stoxy-audit-${cleanName}-${dateStr()}.pdf`);
}

export function exportAuditExcel(session: AuditSession, inventoryItems: InventoryItem[] = []) {
  const invMap = new Map(inventoryItems.map((i) => [i.id, i]));
  const rawItems: AuditItem[] = (session.items && session.items.length > 0)
    ? session.items
    : inventoryItems.map((item) => ({
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        expectedQuantity: item.quantityAvailable,
        actualQuantity: undefined,
        status: "pending" as const,
      }));

  const sorted = [...rawItems].sort((a, b) =>
    a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true, sensitivity: "base" })
  );

  const headers = [
    "รหัส",
    "ชื่ออุปกรณ์",
    "ยี่ห้อ",
    "รุ่น",
    "หมวดหมู่",
    "สถานที่",
    "ยอดระบบเดิม",
    "ยอดตรวจนับจริง",
    "ผลต่าง",
    "หน่วย",
    "สถานะการนับ",
    "รูปภาพ",
    "หมายเหตุ",
  ];

  const rows = sorted.map((i) => {
    const inv = invMap.get(i.itemId) || inventoryItems.find((x) => x.code === i.itemCode);
    const actual = i.actualQuantity != null ? i.actualQuantity : "";
    const diffVal = i.actualQuantity != null ? i.actualQuantity - i.expectedQuantity : "";
    const statusText = i.actualQuantity == null
      ? "ยังไม่ได้นับ"
      : i.actualQuantity === i.expectedQuantity
      ? "ตรงกัน"
      : i.actualQuantity > i.expectedQuantity
      ? `เกิน (+${i.actualQuantity - i.expectedQuantity})`
      : `ขาด (${i.actualQuantity - i.expectedQuantity})`;

    return [
      i.itemCode,
      i.itemName,
      inv?.brand ?? "",
      inv?.model ?? "",
      inv?.categoryName ?? "",
      inv?.locationName ?? "",
      i.expectedQuantity,
      actual,
      diffVal,
      inv?.unit ?? "ชิ้น",
      statusText,
      (inv?.images ?? [])[0] ?? "-",
      i.notes ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AuditResult");
  const cleanName = session.name.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
  saveExcel(wb, `stoxy-audit-${cleanName}-${dateStr()}.xlsx`);
}

export async function exportFMReportPDF(workOrders: FMWorkOrder[], monthYearStr?: string) {
  const doc = await createDocWithThaiFont("landscape");

  doc.setFontSize(16);
  doc.setTextColor(29, 78, 216); // #1D4ED8
  doc.text("รายงานสรุปใบแจ้งงานซ่อม (FM) และอุปกรณ์ที่ใช้", 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const filterText = monthYearStr ? `รอบเดือน: ${monthYearStr} | ` : "";
  doc.text(`${filterText}ข้อมูล ณ วันที่: ${new Date().toLocaleDateString("th-TH")} | ทั้งหมด ${workOrders.length} ใบงาน`, 14, 21);

  const headers = [
    "ลำดับ",
    "เลขที่ใบงาน",
    "วันที่แจ้ง",
    "เรื่อง / สถานที่",
    "ผู้แจ้งงาน / สังกัด",
    "ผู้ดำเนินการ",
    "สถานะ",
    "อุปกรณ์ที่ใช้",
  ];

  const statusTh: Record<string, string> = {
    pending: "รอดำเนินการ",
    pending_review: "รอตรวจสอบ",
    completed: "เสร็จสิ้น",
    rejected: "ส่งกลับแก้ไข",
    cancelled: "ยกเลิก",
  };

  const rows = workOrders.map((wo, index) => {
    const itemsText = (wo.items || []).length > 0
      ? (wo.items || []).map((it, i) => `${i + 1}. ${it.itemName} (${it.quantity} ${it.unit || "ชิ้น"})`).join("\n")
      : "-";

    const dateStrFormatted = wo.requestDate?.toDate ? wo.requestDate.toDate().toLocaleDateString("th-TH") : "-";

    return [
      (index + 1).toString(),
      `FM-${wo.workOrderNumber}`,
      dateStrFormatted,
      `${wo.title}\nสถานที่: ${wo.location}`,
      `${wo.requesterName}\n${wo.requesterDepartment}`,
      wo.assignedTechnicianName || "-",
      statusTh[wo.status] || wo.status,
      itemsText,
    ];
  });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 25,
    styles: { font: "Sarabun", fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [29, 78, 216], textColor: 255, font: "Sarabun", fontStyle: "normal" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 24, font: "Sarabun", fontStyle: "normal" },
      2: { cellWidth: 22 },
      3: { cellWidth: 70 },
      4: { cellWidth: 45 },
      5: { cellWidth: 35 },
      6: { cellWidth: 24, halign: "center" },
      7: { cellWidth: 45 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const cleanMonth = (monthYearStr || "").replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
  doc.save(`stoxy-fm-report-${cleanMonth || dateStr()}.pdf`);
}

export function exportFMReportExcel(workOrders: FMWorkOrder[], monthYearStr?: string) {
  const statusTh: Record<string, string> = {
    pending: "รอดำเนินการ",
    pending_review: "รอตรวจสอบ",
    completed: "เสร็จสิ้น",
    rejected: "ส่งกลับแก้ไข",
    cancelled: "ยกเลิก",
  };

  // Sheet 1: Summary of FM Work Orders
  const sheet1Headers = [
    "ลำดับ",
    "เลขที่ใบงาน",
    "ประเภทงาน",
    "วันที่แจ้งงาน",
    "วันที่ใช้งาน",
    "เรื่อง",
    "สถานที่",
    "รายละเอียดงาน",
    "ชื่อผู้แจ้งงาน",
    "สังกัด",
    "อีเมลผู้แจ้ง",
    "โทรศัพท์ผู้แจ้ง",
    "ผู้ประสานงาน",
    "โทรศัพท์ผู้ประสานงาน",
    "ผู้ดำเนินการ (ช่าง)",
    "หน่วยงานช่าง",
    "ผู้มอบหมายงาน",
    "สถานะ",
    "จำนวนรายการอุปกรณ์",
    "จำนวนชิ้นรวม",
    "อนุมัติโดย",
    "วันที่อนุมัติ",
  ];

  const sheet1Rows = workOrders.map((wo, idx) => {
    const itemCount = (wo.items || []).length;
    const totalQty = (wo.items || []).reduce((s, i) => s + i.quantity, 0);
    const reqDate = wo.requestDate?.toDate ? wo.requestDate.toDate().toLocaleDateString("th-TH") : "";
    const uDate = wo.useDate?.toDate ? wo.useDate.toDate().toLocaleDateString("th-TH") : "";
    const appDate = wo.approvedAt?.toDate ? wo.approvedAt.toDate().toLocaleDateString("th-TH") : "";

    return [
      idx + 1,
      `FM-${wo.workOrderNumber}`,
      wo.workType || "",
      reqDate,
      uDate,
      wo.title,
      wo.location,
      wo.description || "",
      wo.requesterName,
      wo.requesterDepartment,
      wo.requesterEmail || "",
      wo.requesterPhone || "",
      wo.coordinatorName || "",
      wo.coordinatorPhone || "",
      wo.assignedTechnicianName || "",
      wo.assignedDepartment || "",
      wo.assignorName || "",
      statusTh[wo.status] || wo.status,
      itemCount,
      totalQty,
      wo.approvedByName || "",
      appDate,
    ];
  });

  // Sheet 2: Items Used Line Breakdown
  const sheet2Headers = [
    "ลำดับ",
    "เลขที่ใบงาน",
    "เรื่อง",
    "สถานที่",
    "รหัสอุปกรณ์",
    "ชื่ออุปกรณ์",
    "จำนวนที่ใช้",
    "หน่วย",
    "หมายเหตุอุปกรณ์",
    "ผู้ดำเนินการ (ช่าง)",
    "สถานะใบงาน",
    "วันที่แจ้งงาน",
  ];

  const sheet2Rows: any[][] = [];
  let lineIdx = 1;
  for (const wo of workOrders) {
    const reqDate = wo.requestDate?.toDate ? wo.requestDate.toDate().toLocaleDateString("th-TH") : "";
    for (const it of wo.items || []) {
      sheet2Rows.push([
        lineIdx++,
        `FM-${wo.workOrderNumber}`,
        wo.title,
        wo.location,
        it.itemCode,
        it.itemName,
        it.quantity,
        it.unit || "ชิ้น",
        it.notes || "",
        wo.assignedTechnicianName || "",
        statusTh[wo.status] || wo.status,
        reqDate,
      ]);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([sheet1Headers, ...sheet1Rows]);
  XLSX.utils.book_append_sheet(wb, ws1, "สรุปใบงาน");

  const ws2 = XLSX.utils.aoa_to_sheet([sheet2Headers, ...(sheet2Rows.length > 0 ? sheet2Rows : [["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]])]);
  XLSX.utils.book_append_sheet(wb, ws2, "รายการอุปกรณ์ที่ใช้");

  const cleanMonth = (monthYearStr || "").replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
  saveExcel(wb, `stoxy-fm-report-${cleanMonth || dateStr()}.xlsx`);
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
  requisition: "เบิก",
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
