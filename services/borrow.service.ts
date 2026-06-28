import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordStockMovement } from "./inventory.service";
import type { BorrowRecord, BorrowStatus, ItemCondition } from "@/types";

const BORROWS_COLLECTION = "borrow_records";

export async function createBorrowRequest(
  data: Omit<BorrowRecord, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, BORROWS_COLLECTION), {
    ...data,
    status: "pending_approval" as BorrowStatus,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

// ponytail: client-side filter to avoid composite index requirements
export async function getBorrowRecords(status?: BorrowStatus): Promise<BorrowRecord[]> {
  const q = query(collection(db, BORROWS_COLLECTION), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BorrowRecord));
  return status ? all.filter((r) => r.status === status) : all;
}

export async function getBorrowRecord(id: string): Promise<BorrowRecord | null> {
  const snap = await getDoc(doc(db, BORROWS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BorrowRecord;
}

export async function approveBorrowRequest(borrowId: string, approverId: string): Promise<void> {
  const borrowRef = doc(db, BORROWS_COLLECTION, borrowId);
  const borrowSnap = await getDoc(borrowRef);
  if (!borrowSnap.exists()) throw new Error("ไม่พบรายการ");

  const borrow = borrowSnap.data() as BorrowRecord;

  // Read current inventory first so we can record movement correctly
  const itemRef = doc(db, "inventory_items", borrow.itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error("ไม่พบอุปกรณ์");
  const item = itemSnap.data();

  if (item.quantityAvailable < borrow.quantity) throw new Error("สต็อกไม่เพียงพอ");

  const now = Timestamp.now();
  const batch = writeBatch(db);

  batch.update(borrowRef, {
    status: "borrowed",
    approvedBy: approverId,
    approvedAt: now,
    borrowDate: now,
    updatedAt: now,
  });

  batch.update(itemRef, {
    quantityAvailable: increment(-borrow.quantity),
    quantityBorrowed: increment(borrow.quantity),
    updatedAt: now,
  });

  await batch.commit();

  await recordStockMovement({
    itemId: borrow.itemId,
    itemCode: borrow.itemCode,
    itemName: borrow.itemName,
    type: "borrow",
    quantityBefore: item.quantityAvailable,
    quantityChange: -borrow.quantity,
    quantityAfter: item.quantityAvailable - borrow.quantity,
    referenceId: borrowId,
    referenceType: "borrow",
    reason: borrow.purpose,
    performedBy: approverId,
    performedByName: approverId,
  });
}

export async function rejectBorrowRequest(
  borrowId: string,
  approverId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, BORROWS_COLLECTION, borrowId), {
    status: "rejected" as BorrowStatus,
    approvedBy: approverId,
    approvedAt: Timestamp.now(),
    rejectionReason: reason,
    updatedAt: Timestamp.now(),
  });
}

export async function returnItem(
  borrowId: string,
  returnData: { condition: ItemCondition; notes?: string; returnedBy: string }
): Promise<void> {
  const borrowRef = doc(db, BORROWS_COLLECTION, borrowId);
  const borrowSnap = await getDoc(borrowRef);
  if (!borrowSnap.exists()) throw new Error("ไม่พบรายการ");

  const borrow = borrowSnap.data() as BorrowRecord;
  const now = Timestamp.now();
  const batch = writeBatch(db);

  batch.update(borrowRef, {
    status: "returned" as BorrowStatus,
    actualReturnDate: now,
    returnCondition: returnData.condition,
    returnNotes: returnData.notes ?? "",
    updatedAt: now,
  });

  batch.update(doc(db, "inventory_items", borrow.itemId), {
    quantityAvailable: increment(borrow.quantity),
    quantityBorrowed: increment(-borrow.quantity),
    condition: returnData.condition,
    updatedAt: now,
  });

  await batch.commit();
}

export async function getPendingApprovals(): Promise<BorrowRecord[]> {
  const all = await getBorrowRecords();
  return all.filter((r) => r.status === "pending_approval");
}
