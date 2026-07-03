import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, where, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserRole } from "@/services/auth.service";
import type { AccessRequest } from "@/types";

const COL = "accessRequests";

export async function createAccessRequest(
  uid: string, displayName: string, email: string,
  department: string, employeeType?: string,
): Promise<void> {
  await addDoc(collection(db, COL), {
    uid, displayName, email, department, employeeType: employeeType ?? null,
    status: "pending",
    createdAt: Timestamp.now(),
  });
}

export async function getAccessRequests(): Promise<AccessRequest[]> {
  const snap = await getDocs(
    query(collection(db, COL), orderBy("createdAt", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest));
}

export async function getPendingCount(): Promise<number> {
  const snap = await getDocs(query(collection(db, COL), where("status", "==", "pending")));
  return snap.size;
}

export async function approveAccessRequest(
  requestId: string, uid: string, reviewerUid: string,
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, COL, requestId), {
      status: "approved",
      reviewedAt: Timestamp.now(),
      reviewedBy: reviewerUid,
    }),
    updateUserRole(uid, "staff"),
  ]);
}

export async function rejectAccessRequest(
  requestId: string, reviewerUid: string,
): Promise<void> {
  await updateDoc(doc(db, COL, requestId), {
    status: "rejected",
    reviewedAt: Timestamp.now(),
    reviewedBy: reviewerUid,
  });
}
