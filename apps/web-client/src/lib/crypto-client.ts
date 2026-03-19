/**
 * Client-side encryption helpers using WebCrypto API.
 * Key derivation: PBKDF2 (browser) or Argon2 in production via WASM.
 * For demo we use PBKDF2; replace with Argon2 WASM for production.
 */

const PBKDF2_ITERATIONS = 260000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const ALGORITHM = 'AES-GCM';

function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return crypto.subtle.importKey(
    'raw',
    bits,
    { name: ALGORITHM, length: KEY_LENGTH * 8 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithKey(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(plaintext)
  );
  return {
    ciphertext: bufToB64(ct),
    iv: bufToB64(iv),
  };
}

export async function decryptWithKey(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const ct = b64ToBuf(ciphertext);
  const ivBuf = b64ToBuf(iv);
  const dec = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBuf },
    key,
    ct
  );
  return new TextDecoder().decode(dec);
}

export function generateKeySalt(): string {
  return bufToB64(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)));
}

/** Decode base64 key salt to Uint8Array for deriveKeyFromPassword */
export function decodeSalt(saltB64: string): Uint8Array {
  return b64ToBuf(saltB64);
}

/** Encrypt private key for storage (client-side). Returns encrypted blob as base64. */
export async function encryptPrivateKey(
  password: string,
  privateKeyPem: string
): Promise<{ encrypted: string; iv: string; keySalt: string }> {
  const keySaltB64 = generateKeySalt();
  const salt = decodeSalt(keySaltB64);
  const key = await deriveKeyFromPassword(password, salt);
  const { ciphertext, iv } = await encryptWithKey(key, privateKeyPem);
  return { encrypted: ciphertext, iv, keySalt: keySaltB64 };
}

/** Decrypt private key from stored blob (client-side). */
export async function decryptPrivateKey(
  password: string,
  encryptedB64: string,
  ivB64: string,
  keySaltB64: string
): Promise<string> {
  const salt = decodeSalt(keySaltB64);
  const key = await deriveKeyFromPassword(password, salt);
  return decryptWithKey(key, encryptedB64, ivB64);
}

/** Generate a random AES key for encrypting email body (session key). */
export async function generateSessionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Export session key to raw bytes for wrapping with RSA. */
export async function exportSessionKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

/** Import session key from raw bytes. */
export async function importSessionKeyRaw(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt email body with session key; returns ciphertext + iv. */
export async function encryptBody(
  sessionKey: CryptoKey,
  body: string
): Promise<{ bodyEncrypted: string; iv: string }> {
  return encryptWithKey(sessionKey, body);
}

/** Decrypt email body with session key. */
export async function decryptBody(
  sessionKey: CryptoKey,
  bodyEncrypted: string,
  iv: string
): Promise<string> {
  return decryptWithKey(sessionKey, bodyEncrypted, iv);
}
