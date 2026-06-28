import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { StoxyUser, UserRole } from "@/types";

const USERS_COLLECTION = "users";

// ── Auth ──────────────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  // Create user doc if doesn't exist
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ── User Document ─────────────────────────────────────────────
export async function ensureUserDoc(firebaseUser: User): Promise<StoxyUser> {
  const ref = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { uid: snap.id, ...snap.data() } as StoxyUser;
  }

  const now = Timestamp.now();
  const newUser: Omit<StoxyUser, "uid"> = {
    email: firebaseUser.email ?? "",
    displayName: firebaseUser.displayName ?? "Unknown",
    photoURL: firebaseUser.photoURL ?? undefined,
    role: "staff",
    department: "ทั่วไป",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, newUser);
  return { uid: firebaseUser.uid, ...newUser };
}

export async function getStoxyUser(uid: string): Promise<StoxyUser | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as StoxyUser;
}

export async function updateStoxyUser(uid: string, data: Partial<StoxyUser>): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function getAllUsers(): Promise<StoxyUser[]> {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as StoxyUser));
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    role,
    updatedAt: Timestamp.now(),
  });
}

// ── Permissions ───────────────────────────────────────────────
export const rolePermissions: Record<UserRole, string[]> = {
  admin: ["*"],
  manager: [
    "inventory.read",
    "inventory.write",
    "borrow.read",
    "borrow.write",
    "borrow.approve",
    "adjustment.read",
    "adjustment.write",
    "adjustment.approve",
    "maintenance.read",
    "maintenance.write",
    "calibration.read",
    "calibration.write",
    "audit.read",
    "audit.write",
    "reports.read",
    "users.read",
  ],
  staff: [
    "inventory.read",
    "borrow.read",
    "borrow.write",
    "maintenance.read",
    "calibration.read",
    "audit.read",
    "reports.read",
  ],
  viewer: ["inventory.read", "borrow.read", "reports.read"],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = rolePermissions[role];
  return perms.includes("*") || perms.includes(permission);
}
