import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export interface AttachmentResult {
  url: string;
  name: string;
  size: number;
}

/**
 * Convert a File to base64 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a Base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string, fallbackMime = "application/pdf"): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Save file into Firestore collection `fm_attachments` as base64.
 * If size <= 650KB, stores in a single document.
 * If size > 650KB, splits into 350KB chunks in subcollection `chunks`.
 */
export async function saveFileToFirestore(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const colRef = collection(db, "fm_attachments");
  const now = Timestamp.now();
  const chunkSize = 350_000; // ~350KB per chunk

  if (dataUrl.length <= 650_000) {
    // Single document
    const docRef = await addDoc(colRef, {
      name: file.name,
      size: file.size,
      type: file.type || "application/pdf",
      data: dataUrl,
      isChunked: false,
      createdAt: now,
    });
    return `firestore://fm_attachments/${docRef.id}`;
  }

  // Chunked document for larger files
  const totalChunks = Math.ceil(dataUrl.length / chunkSize);
  const parentDocRef = await addDoc(colRef, {
    name: file.name,
    size: file.size,
    type: file.type || "application/pdf",
    totalChunks,
    isChunked: true,
    createdAt: now,
  });

  const batch = writeBatch(db);
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = dataUrl.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkRef = doc(db, "fm_attachments", parentDocRef.id, "chunks", i.toString().padStart(4, "0"));
    batch.set(chunkRef, {
      index: i,
      data: chunkData,
    });
  }
  await batch.commit();

  return `firestore://fm_attachments/${parentDocRef.id}`;
}

/**
 * Fetch and reassemble a file stored in Firestore `fm_attachments`
 */
export async function loadFileFromFirestore(attachmentId: string): Promise<Blob> {
  const docRef = doc(db, "fm_attachments", attachmentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("ไม่พบไฟล์เอกสารแนบในระบบ");
  }

  const data = snap.data();
  if (!data.isChunked && data.data) {
    return dataUrlToBlob(data.data, data.type || "application/pdf");
  }

  // Read chunks
  const chunksCol = collection(db, "fm_attachments", attachmentId, "chunks");
  const q = query(chunksCol, orderBy("index", "asc"));
  const chunkSnaps = await getDocs(q);

  let fullDataUrl = "";
  chunkSnaps.forEach((c) => {
    fullDataUrl += c.data().data || "";
  });

  if (!fullDataUrl) {
    throw new Error("ไฟล์เอกสารแนบไม่มีข้อมูลหรือเสียหาย");
  }

  return dataUrlToBlob(fullDataUrl, data.type || "application/pdf");
}

/**
 * Upload FM work order document.
 * Tries Firebase Storage first (with 5-second timeout and ASCII-safe filename).
 * Automatically falls back to Firestore file storage if Firebase Storage is unavailable or times out.
 */
export async function uploadFMFile(file: File, folder = "fm_documents"): Promise<AttachmentResult> {
  const bucket = storage?.app?.options?.storageBucket;
  const hasStorageBucket = Boolean(bucket && bucket !== "" && bucket !== "undefined");

  if (hasStorageBucket) {
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const safeName = `fm_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, `${folder}/${safeName}`);

      const uploadPromise = uploadBytes(storageRef, file);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Storage timeout")), 5000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);
      const downloadUrl = await getDownloadURL(storageRef);

      return {
        url: downloadUrl,
        name: file.name,
        size: file.size,
      };
    } catch (storageErr) {
      console.warn("Firebase Storage failed or timed out, falling back to Firestore storage:", storageErr);
    }
  }

  // Fallback to Firestore storage (fast, reliable, no CORS or bucket issues)
  const firestoreUrl = await saveFileToFirestore(file);
  return {
    url: firestoreUrl,
    name: file.name,
    size: file.size,
  };
}

/**
 * Resolves any attachment URL (http, data, firestore://, or /public path)
 * into a viewable/downloadable URL or Object URL.
 */
export async function resolveAttachmentUrl(url: string): Promise<string> {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }

  if (url.startsWith("data:")) {
    const blob = dataUrlToBlob(url);
    return URL.createObjectURL(blob);
  }

  if (url.startsWith("firestore://fm_attachments/")) {
    const id = url.replace("firestore://fm_attachments/", "").trim();
    const blob = await loadFileFromFirestore(id);
    return URL.createObjectURL(blob);
  }

  return url;
}

/**
 * Open attachment in a new browser tab with popup fallback
 */
export async function openAttachmentInNewTab(url: string, filename?: string): Promise<void> {
  if (!url) return;

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const resolved = await resolveAttachmentUrl(url);
  const win = window.open(resolved, "_blank");
  if (!win) {
    // Popup was blocked, fallback to download
    downloadAttachmentFile(resolved, filename);
  }
}

/**
 * Download attachment file
 */
export async function downloadAttachmentFile(url: string, filename = "document.pdf"): Promise<void> {
  if (!url) return;

  const resolved = await resolveAttachmentUrl(url);
  const a = document.createElement("a");
  a.href = resolved;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
