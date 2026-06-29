import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, limit, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adjustStock } from "./inventory.service";
import type { AuditSession, AuditItem } from "@/types";

const COL = "audit_sessions";

export async function getAuditSessions(): Promise<AuditSession[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditSession));
}

export async function createAuditSession(data: {
  name: string;
  description?: string;
  assignedUsers: string[];
  createdBy: string;
}): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: "draft",
    locationIds: [],
    startDate: now,
    items: [],
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateAuditItem(
  sessionId: string,
  items: AuditItem[]
): Promise<void> {
  const total = items.length;
  const scanned = items.filter((i) => i.status !== "pending").length;
  const matched = items.filter((i) => i.status === "scanned").length;
  const mismatch = items.filter((i) => i.status === "mismatch").length;
  const missing = items.filter((i) => i.status === "missing").length;

  await updateDoc(doc(db, COL, sessionId), {
    items,
    summary: { totalItems: total, scannedItems: scanned, matchedItems: matched, mismatchItems: mismatch, missingItems: missing },
    updatedAt: Timestamp.now(),
  });
}

export async function completeAuditSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, COL, sessionId), {
    status: "completed",
    endDate: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function getAuditSession(sessionId: string): Promise<AuditSession | null> {
  const snap = await getDoc(doc(db, COL, sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AuditSession;
}

export async function completeAuditWithAdjustment(
  sessionId: string,
  items: AuditItem[],
  performedBy: string,
  performedByName: string,
): Promise<void> {
  const now = Timestamp.now();
  const total = items.length;
  const counted = items.filter(i => i.actualQuantity != null);
  const matched = counted.filter(i => i.actualQuantity === i.expectedQuantity).length;
  const mismatch = counted.filter(i => i.actualQuantity !== i.expectedQuantity).length;

  // bulk adjust items that differ
  const diffs = items.filter(i => i.actualQuantity != null && i.actualQuantity !== i.expectedQuantity);
  await Promise.all(diffs.map(item => {
    const diff = item.actualQuantity! - item.expectedQuantity;
    return adjustStock({
      itemId: item.itemId,
      type: diff > 0 ? "adjustment_in" : "adjustment_out",
      quantity: Math.abs(diff),
      reason: `ตรวจนับสต็อก (audit)`,
      performedBy,
      performedByName,
    });
  }));

  await updateDoc(doc(db, COL, sessionId), {
    items,
    status: "completed",
    endDate: now,
    summary: {
      totalItems: total,
      scannedItems: counted.length,
      matchedItems: matched,
      mismatchItems: mismatch,
      missingItems: total - counted.length,
    },
    updatedAt: now,
  });
}
