import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { InventoryItem, BorrowRecord, StockMovement } from "@/types";

// ── PDF ───────────────────────────────────────────────────────
export function exportInventoryPDF(items: InventoryItem[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("Electrical Equipment Inventory - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`Printed: ${new Date().toLocaleDateString("en-GB")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Code", "Name", "Brand", "Category", "Available/Total", "Status", "Condition", "Location"]],
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
  doc.text("Borrow/Return Records - Stoxy", 14, 15);
  doc.setFontSize(10);
  doc.text(`Printed: ${new Date().toLocaleDateString("en-GB")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Item Code", "Item Name", "Borrower", "Borrow Date", "Due Date", "Status"]],
    body: records.map((r) => [
      r.itemCode,
      r.itemName,
      r.borrowerName,
      r.borrowDate?.toDate().toLocaleDateString("en-GB") ?? "-",
      r.expectedReturnDate?.toDate().toLocaleDateString("en-GB") ?? "-",
      borrowStatusLabel[r.status] ?? r.status,
    ]),
    styles: { font: "helvetica", fontSize: 9 },
    headStyles: { fillColor: [13, 33, 55] },
  });

  doc.save(`stoxy-borrows-${dateStr()}.pdf`);
}

// ── Excel ─────────────────────────────────────────────────────
export function exportInventoryExcel(items: InventoryItem[]) {
  const rows = items.map((i) => ({
    Code: i.code,
    Name: i.name,
    Brand: i.brand ?? "",
    Model: i.model ?? "",
    Category: i.categoryName ?? "",
    "Total Qty": i.quantity,
    Available: i.quantityAvailable,
    Borrowed: i.quantityBorrowed,
    Status: statusLabel[i.status] ?? i.status,
    Condition: conditionLabel[i.condition] ?? i.condition,
    Location: i.locationName ?? "",
    "Purchase Price": i.purchasePrice ?? "",
    Notes: i.notes ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  XLSX.writeFile(wb, `stoxy-inventory-${dateStr()}.xlsx`);
}

export function exportMovementsExcel(movements: StockMovement[]) {
  const rows = movements.map((m) => ({
    Date: m.createdAt?.toDate().toLocaleDateString("en-GB") ?? "",
    "Item Code": m.itemCode,
    "Item Name": m.itemName,
    Type: m.type,
    Before: m.quantityBefore,
    Change: m.quantityChange,
    After: m.quantityAfter,
    Reason: m.reason ?? "",
    "Performed By": m.performedByName,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movements");
  XLSX.writeFile(wb, `stoxy-movements-${dateStr()}.xlsx`);
}

// ── Helpers ───────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  available: "Available",
  borrowed: "Borrowed",
  under_repair: "Under Repair",
  calibrating: "Calibrating",
  disposed: "Disposed",
  lost: "Lost",
};

const conditionLabel: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  broken: "Broken",
};

const borrowStatusLabel: Record<string, string> = {
  pending_approval: "Pending Approval",
  approved: "Approved",
  borrowed: "Borrowed",
  return_pending: "Return Pending",
  returned: "Returned",
  rejected: "Rejected",
  overdue: "Overdue",
  lost: "Lost",
};

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}
