
import { Client } from "@replit/storage";

const storage = new Client();

export async function uploadFile(file: Buffer, filename: string): Promise<string> {
  const key = `uploads/${filename}`;
  await storage.set(key, file);
  return key;
}

export async function getFile(key: string): Promise<Buffer | null> {
  try {
    const file = await storage.get(key);
    return file as Buffer;
  } catch {
    return null;
  }
}
