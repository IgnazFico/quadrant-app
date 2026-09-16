// Load .env before any imports that instantiate Prisma or pools
process.loadEnvFile();

import { prisma } from "../lib/prisma";
import {
  generateMasterKey,
  generateSalt,
  deriveKey,
  generateRecoveryCode,
  wrapMasterKey,
  unwrapMasterKey,
  toBase64,
  fromBase64,
  encryptField,
  decryptField,
} from "../lib/crypto";

const BASE_URL = process.env.BASE_URL || "https://quadrant-app.vercel.app";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function runProductionVerification() {
  console.log(`\n======================================================`);
  console.log(`🔍 QUADRANT PHASE 4: PRODUCTION VERIFICATION & AUDIT`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // ---------------------------------------------------------
  // 1. Web Manifest & Public Shell
  // ---------------------------------------------------------
  console.log(`[Step 1] Verifying Public Assets & PWA Webmanifest...`);
  const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
  assert(manifestRes.status === 200, "Manifest responds with 200 OK");
  assert(
    (manifestRes.headers.get("content-type") || "").includes("json"),
    "Manifest returns JSON content-type",
  );
  const manifestJson = (await manifestRes.json()) as any;
  assert(manifestJson.name.includes("Quadrant"), "Manifest contains app name");
  assert(manifestJson.start_url === "/goals", "Manifest start_url is /goals");

  const homeRes = await fetch(BASE_URL);
  assert(homeRes.status === 200, "Home page responds with 200 OK");
  const homeHtml = await homeRes.text();
  assert(
    homeHtml.includes("Quadrant") || homeHtml.includes("Doing more is not the same"),
    "Home page renders Quadrant branding",
  );

  // ---------------------------------------------------------
  // 2. Production Security Shields
  // ---------------------------------------------------------
  console.log(`\n[Step 2] Verifying Production Security Shields...`);
  const testNotifPage = await fetch(`${BASE_URL}/test-notifications`);
  assert(
    testNotifPage.status === 404,
    "GET /test-notifications is blocked with 404 in production",
  );

  const testSeedApi = await fetch(`${BASE_URL}/api/notifications/test-seed`, {
    method: "POST",
  });
  assert(
    testSeedApi.status === 404,
    "POST /api/notifications/test-seed is blocked with 404 in production",
  );

  // ---------------------------------------------------------
  // 3. Anti-Account Enumeration & Deterministic Synthetic Salts
  // ---------------------------------------------------------
  console.log(`\n[Step 3] Verifying Anti-Enumeration & Deterministic Salts...`);
  const fakeEmail = `nonexistent-audit-${Date.now()}@example.com`;
  
  const fakeChallenge1 = await (
    await fetch(`${BASE_URL}/api/auth/login-challenge?email=${encodeURIComponent(fakeEmail)}`)
  ).json() as any;

  assert(fakeChallenge1.saltPassword !== undefined, "Synthetic saltPassword returned for fake email");
  assert(fakeChallenge1.wrappedKeyPassword !== undefined, "Synthetic wrappedKeyPassword returned for fake email");
  assert(fakeChallenge1.isNewUser === false, "isNewUser is false for unknown user");

  // Verify determinism for same fake email
  const fakeChallenge2 = await (
    await fetch(`${BASE_URL}/api/auth/login-challenge?email=${encodeURIComponent(fakeEmail)}`)
  ).json() as any;

  assert(
    fakeChallenge1.saltPassword === fakeChallenge2.saltPassword,
    "Synthetic salt is deterministic across multiple requests",
  );
  assert(
    fakeChallenge1.wrappedKeyPassword === fakeChallenge2.wrappedKeyPassword,
    "Synthetic wrapped key is deterministic across multiple requests",
  );

  // Verify recovery challenge anti-enumeration
  const fakeRecovery = await (
    await fetch(`${BASE_URL}/api/auth/recover-challenge?email=${encodeURIComponent(fakeEmail)}`)
  ).json() as any;
  assert(fakeRecovery.saltRecovery !== undefined, "Synthetic saltRecovery returned for fake email");
  assert(fakeRecovery.wrappedKeyRecovery !== undefined, "Synthetic wrappedKeyRecovery returned for fake email");

  // ---------------------------------------------------------
  // 4. Zero-Knowledge User Registration on Live Production
  // ---------------------------------------------------------
  console.log(`\n[Step 4] Testing Live Registration with Zero-Knowledge Crypto...`);
  const testEmail = `audit-${Date.now()}@quadrant-live.test`;
  const testPassword = "StrongProductionPassword#2026!";

  // Client crypto generation (matching client AuthForm.tsx)
  const originalMasterKey = await generateMasterKey();
  assert(originalMasterKey.byteLength === 32, "Client generated 32-byte master key");

  const saltPassword = await generateSalt();
  const saltRecovery = await generateSalt();
  const passwordKey = await deriveKey(testPassword, saltPassword);
  const recoveryCode = await generateRecoveryCode();
  const recoveryKey = await deriveKey(recoveryCode, saltRecovery);

  const wrappedKeyPassword = await wrapMasterKey(originalMasterKey, passwordKey);
  const wrappedKeyRecovery = await wrapMasterKey(originalMasterKey, recoveryKey);

  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      saltPassword: await toBase64(saltPassword),
      saltRecovery: await toBase64(saltRecovery),
      wrappedKeyPassword: await toBase64(wrappedKeyPassword),
      wrappedKeyRecovery: await toBase64(wrappedKeyRecovery),
    }),
  });

  const registerJson = await registerRes.json() as any;
  assert(registerRes.status === 200 && registerJson.ok === true, "Live registration returned 200 { ok: true }");

  // Duplicate registration must be rejected
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      saltPassword: await toBase64(saltPassword),
      saltRecovery: await toBase64(saltRecovery),
      wrappedKeyPassword: await toBase64(wrappedKeyPassword),
      wrappedKeyRecovery: await toBase64(wrappedKeyRecovery),
    }),
  });
  assert(dupRes.status === 409, "Duplicate email registration properly rejected with 409 Conflict");

  // ---------------------------------------------------------
  // 5. Zero-Knowledge Login Challenge & Key Decryption Verification
  // ---------------------------------------------------------
  console.log(`\n[Step 5] Verifying Live Zero-Knowledge Decryption (Login Path)...`);
  const liveLoginChallengeRes = await fetch(
    `${BASE_URL}/api/auth/login-challenge?email=${encodeURIComponent(testEmail)}`,
  );
  assert(liveLoginChallengeRes.status === 200, "Login challenge for registered user returned 200");
  const liveLoginChallenge = await liveLoginChallengeRes.json() as any;

  assert(liveLoginChallenge.isNewUser === true, "isNewUser is true for newly registered user without roles");

  const retrievedSalt = await fromBase64(liveLoginChallenge.saltPassword);
  const retrievedWrappedKey = await fromBase64(liveLoginChallenge.wrappedKeyPassword);

  const clientDerivedKey = await deriveKey(testPassword, retrievedSalt);
  const decryptedMasterKey = await unwrapMasterKey(retrievedWrappedKey, clientDerivedKey);

  assert(decryptedMasterKey.byteLength === 32, "Decrypted master key is 32 bytes");
  let keysMatch = true;
  for (let i = 0; i < 32; i++) {
    if (decryptedMasterKey[i] !== originalMasterKey[i]) {
      keysMatch = false;
      break;
    }
  }
  assert(keysMatch, "Decrypted master key matches original generated master key byte-for-byte!");

  // Client-side data encryption test using the decrypted master key
  const secretReflection = "Live production test: doing more is not the same as living well.";
  const encryptedReflection = await encryptField(secretReflection, decryptedMasterKey);
  const decryptedReflection = await decryptField(encryptedReflection, originalMasterKey);
  assert(
    decryptedReflection === secretReflection,
    "Data encryption & decryption roundtrip verified with zero-knowledge master key",
  );

  // ---------------------------------------------------------
  // 6. Zero-Knowledge Recovery Path Verification
  // ---------------------------------------------------------
  console.log(`\n[Step 6] Verifying Live Zero-Knowledge Recovery Path...`);
  const liveRecoveryRes = await fetch(
    `${BASE_URL}/api/auth/recover-challenge?email=${encodeURIComponent(testEmail)}`,
  );
  assert(liveRecoveryRes.status === 200, "Recovery challenge for registered user returned 200");
  const liveRecovery = await liveRecoveryRes.json() as any;

  const recoverySalt = await fromBase64(liveRecovery.saltRecovery);
  const recoveryWrappedKey = await fromBase64(liveRecovery.wrappedKeyRecovery);
  const derivedRecoveryKey = await deriveKey(recoveryCode, recoverySalt);
  const recoveredMasterKey = await unwrapMasterKey(recoveryWrappedKey, derivedRecoveryKey);

  let recoveryKeysMatch = true;
  for (let i = 0; i < 32; i++) {
    if (recoveredMasterKey[i] !== originalMasterKey[i]) {
      recoveryKeysMatch = false;
      break;
    }
  }
  assert(recoveryKeysMatch, "Master key successfully recovered via recovery code byte-for-byte!");

  // ---------------------------------------------------------
  // 7. Cleanup Audit Users from Production Neon DB
  // ---------------------------------------------------------
  console.log(`\n[Step 7] Cleaning up test audit users from production Neon database...`);
  const deleteResult = await prisma.user.deleteMany({
    where: {
      email: {
        contains: "audit-",
      },
    },
  });
  console.log(`  ✅ Cleaned up ${deleteResult.count} audit test user(s) from Neon database`);

  console.log(`\n======================================================`);
  console.log(`🎉 ALL PHASE 4 PRODUCTION CHECKS PASSED SUCCESSFULLY!`);
  console.log(`======================================================\n`);
}

runProductionVerification()
  .catch((err) => {
    console.error("\n❌ Production verification failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
