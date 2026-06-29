import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  return Promise.all(
    files.map(async (file) => {
      const storageRef = ref(storage, `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    })
  );
}
