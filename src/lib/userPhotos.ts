import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/** Upload a data-URL image to the caller's Storage folder. Returns the storage path. */
export async function uploadUserImage(
  uid: string,
  fileName: 'id.jpg' | 'selfie.jpg' | 'avatar.jpg',
  dataUrl: string
): Promise<string> {
  const path = `users/${uid}/${fileName}`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, 'data_url');
  return path;
}

export async function getUserImageUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}
