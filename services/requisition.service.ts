import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, limit, Timestamp, writeBatch, increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordStockMovement } from "./inventory.service";

const COL = "requisitions";

export type RequisitionStatus = "pending" | "approved" | "rejected";

export interface Requisition {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  purpose: string;
  requesterName: string;
  requesterId: string;
  status: RequisitionStatus;
  approvedBy?: string;
  rejectedReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function createRequisition(data: {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  purpose: string;
  requesterId: string;
  requesterName: string;
}): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getRequisitions(): Promise<Requisition[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Requisition));
}

export async function getMyRequisitions(requesterId: string): Promise<Requisition[]> {
  // ponytail: client-side filter to avoid composite index requirement
  const all = await getRequisitions();
  return all.filter((r) => r.requesterId === requesterId);
}

export async function approveRequisition(id: string, approverId: string, approverName?: string): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบรายการ");
  const req = snap.data() as Requisition;

  const itemRef = doc(db, "inventory_items", req.itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error("ไม่พบอุปกรณ์");
  const item = itemSnap.data();

  if (item.quantityAvailable < req.quantity) throw new Error("สต็อกไม่เพียงพอ");

  const now = Timestamp.now();
  const batch = writeBatch(db);

  batch.update(ref, { status: "approved", approvedBy: approverId, updatedAt: now });
  batch.update(itemRef, {
    quantityAvailable: increment(-req.quantity),
    quantity: increment(-req.quantity),
    updatedAt: now,
  });

  await batch.commit();

  await recordStockMovement({
    itemId: req.itemId,
    itemCode: req.itemCode,
    itemName: req.itemName,
    type: "adjustment_out",
    quantityBefore: item.quantityAvailable,
    quantityChange: -req.quantity,
    quantityAfter: item.quantityAvailable - req.quantity,
    referenceId: id,
    referenceType: "requisition",
    reason: `เบิกโดย ${req.requesterName}: ${req.purpose}`,
    performedBy: approverId,
    performedByName: approverName || approverId,
  });
}

export async function rejectRequisition(id: string, approverId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: "rejected",
    approvedBy: approverId,
    rejectedReason: reason,
    updatedAt: Timestamp.now(),
  });
}
