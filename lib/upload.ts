import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Upload timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function uploadImages(files: File[], folder: string, timeoutMs = 10_000): Promise<string[]> {
  return withTimeout(
    Promise.all(
      files.map(async (file) => {
        const storageRef = ref(storage, `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      })
    ),
    timeoutMs
  );
}
