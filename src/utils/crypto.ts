import CryptoJS from 'crypto-js';

// ─── AES-256-CBC Encryption Key ──────────────────────────────────────────
export const AES_KEY_HEX =
  '0129996789abcdef0123451019abcdef0120756789abcdef0123456789abcdef';

const parsedKey = CryptoJS.enc.Hex.parse(AES_KEY_HEX);

/**
 * Generates a random Hex string of given byte length (default 16 bytes = 32 hex chars).
 * Falls back to PRNG in environments where native crypto is unavailable (like React Native).
 */
export const generateRandomIvHex = (byteLength: number = 16): string => {
  const gCrypto =
    typeof globalThis !== 'undefined' ? (globalThis as any).crypto : null;
  if (gCrypto && typeof gCrypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(byteLength);
      gCrypto.getRandomValues(bytes);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return hex;
    } catch {
      // fallback below
    }
  }

  let hex = '';
  for (let i = 0; i < byteLength * 2; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
};

// Patch CryptoJS.lib.WordArray.random to prevent "Native crypto module could not be used" in React Native
try {
  (CryptoJS.lib.WordArray as any).random = (nBytes: number) => {
    const hex = generateRandomIvHex(nBytes);
    return CryptoJS.enc.Hex.parse(hex);
  };
} catch {
  // ignore
}

/**
 * Encrypts payload (string or object) with AES-256-CBC + PKCS7 padding.
 * Generates a random 16-byte IV and outputs `${ivHex}:${ciphertextHex}`.
 */
export const encryptAes256Cbc = (data: any): string => {
  if (data === null || data === undefined) {
    return '';
  }

  const plainText =
    typeof data === 'object' ? JSON.stringify(data) : String(data);

  // Generate 16-byte random IV
  const ivHex = generateRandomIvHex(16);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const encrypted = CryptoJS.AES.encrypt(plainText, parsedKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

  return `${ivHex}:${ciphertextHex}`;
};

/**
 * Decrypts `${ivHex}:${ciphertextHex}` encrypted string back to plaintext.
 */
export const decryptAes256Cbc = (encryptedString: string): string => {
  if (!encryptedString) {
    return '';
  }

  const parts = String(encryptedString).split(':');
  if (parts.length !== 2) {
    return encryptedString;
  }

  const [ivHex, ciphertextHex] = parts;
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext } as CryptoJS.lib.CipherParams,
    parsedKey,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
};
