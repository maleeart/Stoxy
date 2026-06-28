import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const REF = doc(db, "settings", "locations");
const DEFAULTS = ["คลังไฟฟ้า", "ตู้เก็บของ 1", "ตู้เก็บของ 2"];

export async function getLocations(): Promise<string[]> {
  const snap = await getDoc(REF);
  return snap.exists() ? (snap.data().items as string[]) : DEFAULTS;
}

export async function addLocation(name: string): Promise<string[]> {
  const current = await getLocations();
  if (current.includes(name)) return current;
  const updated = [...current, name];
  await setDoc(REF, { items: updated });
  return updated;
}
