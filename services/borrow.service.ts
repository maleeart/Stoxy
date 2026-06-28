import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordStockMovement } from "./inventory.service";
import type { BorrowRecord, BorrowStatus, ItemCondition } from "@/types";

const BORROWS_COLLECTION = "borrow_records";

// ── Create Borrow Request ─────────────────────────────────────
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

// ── Get Borrow Records ────────────────────────────────────────
export async function getBorrowRecords(
  status?: BorrowStatus,
  userId?: string
): Promise<BorrowRecord[]> {
  const constraints = [];
  if (status) constraints.push(where("status", "==", status));
  if (userId) constraints.push(where("borrowerId", "==", userId));
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(100));

  const q = query(collection(db, BORROWS_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BorrowRecord));
}

export async function getBorrowRecord(id: string): Promise<BorrowRecord | null> {
  const snap = await getDoc(doc(db, BORROWS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BorrowRecord;
}

export async function getItemBorrowHistory(itemId: string): Promise<BorrowRecord[]> {
  const q = query(
    collection(db, BORROWS_COLLECTION),
    where("itemId", "==", itemId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BorrowRecord));
}

// ── Approve / Reject ──────────────────────────────────────────
export async function approveBorrowRequest(
  borrowId: string,
  approverId: string
): Promise<void> {
  const batch = writeBatch(db);
  const borrowRef = doc(db, BORROWS_COLLECTION, borrowId);
  const borrowSnap = await getDoc(borrowRef);
  if (!borrowSnap.exists()) throw new Error("Borrow record not found");

  const borrow = borrowSnap.data() as BorrowRecord;
  const now = Timestamp.now();

  // Update borrow record
  batch.update(borrowRef, {
    status: "borrowed",
    approvedBy: approverId,
    approvedAt: now,
    borrowDate: now,
    updatedAt: now,
  });

  // Update inventory
  const itemRef = doc(db, "inventory_items", borrow.itemId);
  batch.update(itemRef, {
    quantityAvailable: -borrow.quantity, // will be incremented properly
    quantityBorrowed: borrow.quantity,
    status: "borrowed",
    updatedAt: now,
  });

  await batch.commit();

  // Record movement
  const itemSnap = await getDoc(itemRef);
  const item = itemSnap.data();
  if (item) {
    await recordStockMovement({
      itemId: borrow.itemId,
      itemCode: borrow.itemCode,
      itemName: borrow.itemName,
      type: "borrow",
      quantityBefore: item.quantityAvailable + borrow.quantity,
      quantityChange: -borrow.quantity,
      quantityAfter: item.quantityAvailable,
      referenceId: borrowId,
      referenceType: "borrow",
      reason: borrow.purpose,
      performedBy: approverId,
      performedByName: approverId,
    });
  }
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

// ── Return Item ───────────────────────────────────────────────
export async function returnItem(
  borrowId: string,
  returnData: {
    condition: ItemCondition;
    notes?: string;
    photos?: string[];
    returnedBy: string;
  }
): Promise<void> {
  const batch = writeBatch(db);
  const borrowRef = doc(db, BORROWS_COLLECTION, borrowId);
  const borrowSnap = await getDoc(borrowRef);
  if (!borrowSnap.exists()) throw new Error("Borrow record not found");

  const borrow = borrowSnap.data() as BorrowRecord;
  const now = Timestamp.now();

  batch.update(borrowRef, {
    status: "returned" as BorrowStatus,
    actualReturnDate: now,
    returnCondition: returnData.condition,
    returnNotes: returnData.notes,
    returnPhotos: returnData.photos ?? [],
    updatedAt: now,
  });

  const itemRef = doc(db, "inventory_items", borrow.itemId);
  batch.update(itemRef, {
    status: "available",
    condition: returnData.condition,
    quantityAvailable: borrow.quantity,
    quantityBorrowed: 0,
    updatedAt: now,
  });

  await batch.commit();
}

// ── Get Overdue Borrows ───────────────────────────────────────
export async function getOverdueBorrows(): Promise<BorrowRecord[]> {
  const q = query(
    collection(db, BORROWS_COLLECTION),
    where("status", "==", "borrowed"),
    orderBy("expectedReturnDate", "asc")
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as BorrowRecord))
    .filter((b) => b.expectedReturnDate.toDate() < now);
}

// ── Get Pending Approvals ─────────────────────────────────────
export async function getPendingApprovals(): Promise<BorrowRecord[]> {
  const q = query(
    collection(db, BORROWS_COLLECTION),
    where("status", "==", "pending_approval"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BorrowRecord));
}
