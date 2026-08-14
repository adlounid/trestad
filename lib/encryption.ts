import { requireRuntimeValue } from "./runtime";

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function importEncryptionKey(): Promise<CryptoKey> {
  const keyBytes = decodeBase64(requireRuntimeValue("PII_ENCRYPTION_KEY"));
  if (keyBytes.byteLength !== 32) throw new Error("PII_ENCRYPTION_KEY måste vara en base64-kodad 256-bitarsnyckel.");
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptPersonalNumber(value: string): Promise<string> {
  if (!value) return "";
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    await importEncryptionKey(),
    new TextEncoder().encode(value),
  );
  return "v1." + encodeBase64(initializationVector) + "." + encodeBase64(new Uint8Array(encrypted));
}

export async function decryptPersonalNumber(value: string): Promise<string> {
  if (!value) return "";
  const [version, initializationVector, encrypted] = value.split(".");
  if (version !== "v1" || !initializationVector || !encrypted) throw new Error("Personnumrets krypteringsformat är ogiltigt.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(initializationVector) },
    await importEncryptionKey(),
    decodeBase64(encrypted),
  );
  return new TextDecoder().decode(decrypted);
}
