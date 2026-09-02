import {
  decryptField,
  deriveKey,
  encryptField,
  fromBase64,
  generateMasterKey,
  generateSalt,
  toBase64,
  unwrapMasterKey,
  wrapMasterKey,
} from "../lib/crypto";

function hasValidMasterKey(value: unknown): boolean {
  return value instanceof Uint8Array && value.length === 32;
}

async function run() {
  const salt = await generateSalt();
  const password = "Quadrant_079";
  const derived = await deriveKey(password, salt);
  const masterKey = await generateMasterKey();
  const wrapped = await wrapMasterKey(masterKey, derived);
  const unwrapped = await unwrapMasterKey(wrapped, derived);

  if (!hasValidMasterKey(unwrapped)) {
    throw new Error(
      "Valid decrypted key failed the client-side validation guard",
    );
  }

  const ciphertext = await encryptField("hello protected data", masterKey);
  const plaintext = await decryptField(ciphertext, masterKey);
  if (plaintext !== "hello protected data") {
    throw new Error("Encryption/decryption round trip failed");
  }

  const malformed = new Uint8Array([1, 2, 3]);
  if (hasValidMasterKey(malformed)) {
    throw new Error("Malformed key was incorrectly treated as valid");
  }

  const encoded = await toBase64(wrapped);
  const decoded = await fromBase64(encoded);
  const rewrapped = await unwrapMasterKey(decoded, derived);
  if (rewrapped.length !== 32) {
    throw new Error("Rewrapped key did not produce a valid 32-byte master key");
  }

  console.log(
    "masterKey validation passes for valid keys and rejects malformed ones",
  );
}

run().catch((error) => {
  console.error("masterKey validation test failed:", error);
  process.exitCode = 1;
});
