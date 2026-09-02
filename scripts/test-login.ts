import {
  deriveKey,
  fromBase64,
  unwrapMasterKey,
} from "../lib/crypto";

const email = "ignaz.fico@quadrant.com";
const password = "Quadrant_079";
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const challengeUrl = `${baseUrl}/api/auth/login-challenge?email=${encodeURIComponent(email)}`;
  const response = await fetch(challengeUrl);

  if (!response.ok) {
    throw new Error(
      `Database lookup failed: ${response.status} ${response.statusText}`,
    );
  }

  const challenge = (await response.json()) as {
    saltPassword?: string;
    wrappedKeyPassword?: string;
  };

  if (!challenge.saltPassword || !challenge.wrappedKeyPassword) {
    throw new Error("Database response is missing the login challenge data");
  }

  const salt = await fromBase64(challenge.saltPassword);
  const wrappedMasterKey = await fromBase64(challenge.wrappedKeyPassword);
  const passwordKey = await deriveKey(password, salt);
  const masterKey = await unwrapMasterKey(wrappedMasterKey, passwordKey);

  if (masterKey.byteLength !== 32) {
    throw new Error(
      `Client validation produced an invalid master key length: ${masterKey.byteLength}`,
    );
  }

  console.log(`Database lookup passed for ${email}`);
  console.log("Client password validation passed: master key decrypted");
}

main().catch((error: unknown) => {
  console.error("Login test failed:", error);
  process.exitCode = 1;
});