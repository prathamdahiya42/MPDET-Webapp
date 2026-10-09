/**
 * Web Crypto API Decryption for Hostel Private Dataset
 * AES-256-GCM authenticated decryption with PBKDF2-SHA256 key derivation.
 */

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypts the encrypted hostel envelope using the provided password.
 * 
 * @param {string} password - Master hostel password
 * @param {object} encryptedEnvelope - The JSON envelope from hostel.private.enc.json
 * @returns {Promise<object>} The decrypted records map: { [id]: { fullName, studentMobile, fatherName, ... } }
 */
export async function decryptHostelData(password, encryptedEnvelope) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }

  const { iter, salt, iv, ct, aad } = encryptedEnvelope;

  const saltBytes = base64ToUint8Array(salt);
  const ivBytes = base64ToUint8Array(iv);
  const ctBytes = base64ToUint8Array(ct);

  const encoder = new TextEncoder();

  // 1. Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 2. Derive AES-GCM 256-bit key using PBKDF2-SHA256 (600,000 iterations)
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: iter || 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 3. Decrypt ciphertext + auth tag with AES-256-GCM
  try {
    const additionalData = encoder.encode(aad || 'mpdet-hostel-v1');
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
        additionalData
      },
      derivedKey,
      ctBytes
    );

    const decryptedJson = new TextDecoder().decode(decryptedBuffer);
    const parsed = JSON.parse(decryptedJson);
    return parsed.records || {};
  } catch {
    // If decryption or authentication tag fails, Web Crypto throws OperationError
    throw new Error('Incorrect password');
  }
}
