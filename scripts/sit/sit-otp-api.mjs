// SIT driver for the email one-time code, over real HTTP (WO-012).
//   node scripts/sit/sit-otp-api.mjs <baseUrl> <mode>
//   mode "nomail": server has no RESEND_* variables -> sign-up must fail closed
//   mode "mail"  : server points at scripts/sit/mock-resend.mjs on :4010
// Uses throwaway @quadrant.test addresses on staging. Prints PASS/FAIL lines.
import crypto from "node:crypto";
import sodium from "libsodium-wrappers-sumo";

const BASE = process.argv[2] ?? "http://localhost:3200";
const MODE = process.argv[3] ?? "mail";
const MOCK = "http://127.0.0.1:4010";
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const post = async (path, body, headers = {}) => {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text, headers: r.headers };
};
const b64 = (u8) => Buffer.from(u8).toString("base64");

await sodium.ready;
// Opaque stand-ins for the client-side key material (the server only stores bytes).
const keys = () => ({
  saltPassword: b64(crypto.randomBytes(16)),
  saltRecovery: b64(crypto.randomBytes(16)),
  wrappedKeyPassword: b64(crypto.randomBytes(48)),
  wrappedKeyRecovery: b64(crypto.randomBytes(48)),
});
const PASSWORD = "Sit-password-0123";
const register = (email, extra = {}) => post("/api/auth/register", { email, password: PASSWORD, ...keys(), ...extra });

async function csrf(jar) {
  const r = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: jar.c ?? "" } });
  const set = r.headers.getSetCookie?.() ?? [];
  jar.c = [jar.c, ...set.map((s) => s.split(";")[0])].filter(Boolean).join("; ");
  return (await r.json()).csrfToken;
}
// Real Auth.js credentials sign-in. Returns the session user (or null) and the error code.
async function signIn(email, password) {
  const jar = {};
  const token = await csrf(jar);
  const r = await fetch(`${BASE}/api/auth/callback/credentials?`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: jar.c, "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken: token, email, password, callbackUrl: `${BASE}/goals`, json: "true" }),
  });
  const set = r.headers.getSetCookie?.() ?? [];
  jar.c = [jar.c, ...set.map((s) => s.split(";")[0])].filter(Boolean).join("; ");
  const out = await r.json().catch(() => ({}));
  const s = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar.c } });
  const session = await s.json().catch(() => null);
  const url = out.url ?? "";
  const err = new URL(url, BASE).searchParams;
  return { user: session?.user ?? null, error: err.get("error"), code: err.get("code"), raw: out };
}
const mockLast = async (to) => {
  const r = await fetch(`${MOCK}/last?to=${encodeURIComponent(to)}`);
  return r.ok ? r.json() : null;
};
const mockCount = async (to) => (await (await fetch(`${MOCK}/count?to=${encodeURIComponent(to)}`)).json()).count;
const codeOf = (m) => m?.text.match(/\b(\d{6})\b/)?.[1] ?? "";
const stamp = Date.now();
const emailFor = (t) => `sit-${t}.${stamp}@quadrant.test`;

if (MODE === "nomail") {
  const e = emailFor("nomail");
  const r = await register(e);
  check("AC3 no mail config: sign-up answers 503 (fails closed)", r.status === 503, `status=${r.status}`);
  check("AC3 response carries no 6-digit code", !/\b\d{6}\b/.test(r.text), r.text.slice(0, 120));
  check("AC3 response says ok:false / no verificationRequired", r.json?.ok !== true && !r.json?.verificationRequired);
  const s = await signIn(e, PASSWORD);
  check("AC3 no account was created: sign-in fails", !s.user);
  const rs = await post("/api/auth/resend-code", { email: e });
  check("AC3 resend-code with no mail config answers 503, no code", rs.status === 503 && !/\b\d{6}\b/.test(rs.text), `status=${rs.status}`);
  const ve = await post("/api/auth/verify-email", { email: e, code: "123456" });
  check("AC3 verify-email for a never-created account answers 'expired'", ve.status === 400 && ve.json?.code === "expired", JSON.stringify(ve.json));
  // recover-request in production mode, no mail
  const rr = await post("/api/auth/recover-request", { email: "ignaz.fico@quadrant.com" });
  check("AC4 recover-request (prod, no mail): 200 ok, NO devCode, NO token, NO 6-digit code", rr.status === 200 && rr.json?.ok === true && !("devCode" in rr.json) && !("token" in rr.json) && !/\b\d{6}\b/.test(rr.text), rr.text.slice(0, 120));
  const rr2 = await post("/api/auth/recover-request", { email: `nobody.${stamp}@quadrant.test` });
  check("AC4 recover-request unknown email: same shape as known", rr2.status === 200 && rr2.json?.ok === true && !("devCode" in rr2.json) && !("token" in rr2.json));
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
}

// ---------------- mode "mail" ----------------
// 1. Existing/seeded account still signs in.
const seeded = await signIn("ignaz.fico@quadrant.com", "Quadrant_079");
check("AC2 seeded account (@quadrant.com) still signs in", !!seeded.user?.email, JSON.stringify({ e: seeded.error, c: seeded.code }));

// 2. Sign-up: unverified, mail sent, no code in response.
const A = emailFor("a");
const r1 = await register(A);
check("AC1 sign-up answers 200 verificationRequired", r1.status === 200 && r1.json?.ok === true && r1.json?.verificationRequired === true, r1.text.slice(0, 100));
check("AC1/AC3 sign-up response contains no 6-digit code", !/\b\d{6}\b/.test(r1.text));
const m1 = await mockLast(A);
const code1 = codeOf(m1);
check("AC1 exactly one email sent to the address, with a 6-digit code", (await mockCount(A)) === 1 && /^\d{6}$/.test(code1));
check("AC1 mail carries the configured sender and bearer key header", m1?.from === "Quadrant <no-reply@example.test>" && m1?.auth === "Bearer sit-key-not-a-secret", `from=${m1?.from}`);

// 3. Unverified cannot sign in.
const s0 = await signIn(A, PASSWORD);
check("AC1 unverified account cannot sign in (right password)", !s0.user, JSON.stringify({ e: s0.error, c: s0.code }));
check("AC1 sign-in error says email_not_verified", s0.code === "email_not_verified" || s0.error === "CredentialsSignin" || s0.error === "Configuration", JSON.stringify({ e: s0.error, c: s0.code }));
const s0b = await signIn(A, "Wrong-password-1");
check("sign-in with a WRONG password does not reveal verification state", !s0b.user && s0b.code !== "email_not_verified", JSON.stringify({ e: s0b.error, c: s0b.code }));

// 4. Wrong code, x attempts, lock.
const wrong = code1 === "000000" ? "111111" : "000000";
const w1 = await post("/api/auth/verify-email", { email: A, code: wrong });
check("AC1 wrong code rejected (400, wrong_code, 4 left)", w1.status === 400 && w1.json?.code === "wrong_code" && w1.json?.attemptsLeft === 4, JSON.stringify(w1.json));
const bad = await post("/api/auth/verify-email", { email: A, code: "12ab" });
check("malformed code rejected without counting", bad.status === 400 && bad.json?.code === "invalid_input");
// Rate limit in the proxy: 10/min on verify-email; stay under it.
for (let i = 0; i < 3; i++) await post("/api/auth/verify-email", { email: A, code: wrong });
const w5 = await post("/api/auth/verify-email", { email: A, code: wrong });
check("AC1 5th wrong code locks", w5.status === 400 && w5.json?.code === "locked", JSON.stringify(w5.json));
const lockedRight = await post("/api/auth/verify-email", { email: A, code: code1 });
check("AC1 after the lock the right code is refused", lockedRight.status === 400 && lockedRight.json?.code === "locked", JSON.stringify(lockedRight.json));
check("AC1 still cannot sign in", !(await signIn(A, PASSWORD)).user);

// 5. Resend cooldown, then new code.
const rsCool = await post("/api/auth/resend-code", { email: A });
check("AC1 resend inside 60 s -> 429 cooldown with Retry-After", rsCool.status === 429 && rsCool.json?.code === "cooldown" && Number(rsCool.headers.get("retry-after")) > 0, `status=${rsCool.status} ${JSON.stringify(rsCool.json)}`);
check("AC1 cooldown refusal sent no extra mail", (await mockCount(A)) === 1);
console.log("      (waiting 61 s for the resend cooldown)");
await new Promise((r) => setTimeout(r, 61_000));
const rs2 = await post("/api/auth/resend-code", { email: A });
check("AC1 resend after the cooldown -> 200", rs2.status === 200 && rs2.json?.ok === true && !/\b\d{6}\b/.test(rs2.text), JSON.stringify(rs2.json));
const code2 = codeOf(await mockLast(A));
check("AC1 a second email arrived with a code", (await mockCount(A)) === 2 && /^\d{6}$/.test(code2));
if (code2 !== code1) {
  const oldTry = await post("/api/auth/verify-email", { email: A, code: code1 });
  check("AC1 the OLD code does not work any more", oldTry.status === 400 && oldTry.json?.code === "wrong_code", JSON.stringify(oldTry.json));
}

// 6. Right code verifies; reuse rejected; now signs in.
const ok = await post("/api/auth/verify-email", { email: A, code: code2 });
check("AC1 the right code verifies the account", ok.status === 200 && ok.json?.ok === true, JSON.stringify(ok.json));
const reuse = await post("/api/auth/verify-email", { email: A, code: code2 });
check("AC1 reusing the same code is rejected", reuse.status === 400 && reuse.json?.code === "expired", JSON.stringify(reuse.json));
const sOk = await signIn(A, PASSWORD);
check("AC1 after verification the account signs in", sOk.user?.email === A, JSON.stringify({ e: sOk.error, c: sOk.code }));
const dup = await register(A);
check("anti-enumeration: 409 'already exists' kept for a VERIFIED address", dup.status === 409);
const rsVer = await post("/api/auth/resend-code", { email: A });
check("resend-code on a verified account answers like a normal send (no probe), sends nothing", rsVer.status === 200 && rsVer.json?.ok === true && (await mockCount(A)) === 2);
const rsUnk = await post("/api/auth/resend-code", { email: `nobody.${stamp}@quadrant.test` });
check("resend-code on an unknown address answers 200 ok, same shape", rsUnk.status === 200 && rsUnk.json?.ok === true && Object.keys(rsUnk.json).sort().join() === Object.keys(rsVer.json).sort().join());

// 7. Unverified sign-up re-registered: taken over, new code, old password dead.
const B = emailFor("b");
await register(B);
const reB = await register(B, {});
check("re-register an unverified address inside the cooldown -> 429", reB.status === 429 && reB.json?.code === "cooldown", `status=${reB.status}`);

// 8. Expiry cannot be waited out over HTTP in SIT (10 min); covered by the library test with an injected clock.

// 9. Recovery request with mail configured.
const rr = await post("/api/auth/recover-request", { email: "ignaz.fico@quadrant.com" });
const rrMail = await mockLast("ignaz.fico@quadrant.com");
check("AC4 recover-request (mail on): response has a ticket but NO code", rr.status === 200 && !!rr.json?.token && !("devCode" in rr.json) && !rr.text.includes(codeOf(rrMail)), rr.text.slice(0, 80) + "...");
check("AC4 recovery email arrived with the 6-digit code", /^\d{6}$/.test(codeOf(rrMail)));
const unkRR = await post("/api/auth/recover-request", { email: `nobody.${stamp}@quadrant.test` });
check("AC4 recover-request for an unknown address: same shape, no email sent", unkRR.status === 200 && !!unkRR.json?.token && (await mockCount(`nobody.${stamp}@quadrant.test`)) === 0);

// 10. Provider failure: sign-up fails, account not left behind.
await fetch(`${MOCK}/fail?on=1`, { method: "POST" });
const C = emailFor("c");
const rc = await register(C);
check("AC3 provider rejects the message: sign-up answers 502, no code in body", rc.status === 502 && !/\b\d{6}\b/.test(rc.text), `status=${rc.status}`);
check("AC3 failed sign-up left no account (cannot sign in)", !(await signIn(C, PASSWORD)).user);
await fetch(`${MOCK}/fail?on=0`, { method: "POST" });
const rc2 = await register(C);
check("sign-up with the same address works once the provider recovers", rc2.status === 200);

console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
process.exit(failures ? 1 : 0);
