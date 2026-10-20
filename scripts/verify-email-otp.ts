// Library-level check of the email one-time code (WO-012, D-024).
//
//   npx tsx scripts/verify-email-otp.ts
//
// Always runs against STAGING (scripts/lib/use-staging.mjs refuses production).
// Creates throwaway users, cleans up. Starts its own stand-in for the mail
// provider, so it needs no real key and sends nothing.
import "./lib/use-staging.mjs";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

async function main() {
  // --- stand-in mail provider -------------------------------------------
  const sent: { to: string; text: string; auth: string }[] = [];
  let reject = false;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (reject) {
        res.writeHead(500).end("{}");
        return;
      }
      const m = JSON.parse(raw);
      sent.push({ to: m.to, text: m.text, auth: req.headers.authorization ?? "" });
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"id":"x"}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;

  // NODE_ENV must not be "production" for the stand-in URL to be honoured.
  (process.env as Record<string, string>).NODE_ENV = "test";
  process.env.RESEND_API_KEY = "test-key-not-a-secret";
  process.env.EMAIL_FROM = "Quadrant <no-reply@example.test>";
  process.env.RESEND_API_URL = `http://127.0.0.1:${port}/emails`;
  process.env.AUTH_SECRET ||= "verify-email-otp-local-secret";

  const { prisma } = await import("../lib/prisma");
  const otp = await import("../lib/emailOtp");
  const { OTP, generateCode, hashCode, issueCode, verifyCode } = otp;

  const stamp = Date.now();
  const mk = async (tag: string) =>
    prisma.user.create({
      data: { email: `otp-${tag}.${stamp}@quadrant.test`, passwordHash: "x" },
      select: { id: true, email: true },
    });
  const lastCode = (to: string) => {
    const m = [...sent].reverse().find((s) => s.to === to);
    return m?.text.match(/\b(\d{6})\b/)?.[1] ?? "";
  };
  const users: string[] = [];

  try {
    // 0. Code generator: 6 digits, uses crypto, leading zeros possible.
    const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const src = stripComments(fs.readFileSync(path.join(process.cwd(), "lib/emailOtp.ts"), "utf8"));
    const srcRec = stripComments(fs.readFileSync(path.join(process.cwd(), "lib/recoveryToken.ts"), "utf8"));
    check("generator source uses crypto.randomInt, not Math.random", /randomInt/.test(src) && !/Math\.random/.test(src));
    check("recovery token source uses crypto.randomInt, not Math.random", /randomInt/.test(srcRec) && !/Math\.random/.test(srcRec));
    check("recovery token source has no hard-coded fallback secret", !/default-secret/.test(srcRec));
    const many = Array.from({ length: 2000 }, generateCode);
    check("2000 codes are all 6 digits", many.every((c) => /^\d{6}$/.test(c)));
    check("codes are not constant (>1500 distinct of 2000)", new Set(many).size > 1500, `distinct=${new Set(many).size}`);
    check("hash is keyed, deterministic and per user", hashCode("u1", "123456") === hashCode("u1", "123456") && hashCode("u1", "123456") !== hashCode("u2", "123456"));

    // 1. Issue: mail sent, stored hashed, never plaintext.
    const a = await mk("a");
    users.push(a.id);
    const t0 = new Date();
    const r1 = await issueCode(a, t0);
    check("issueCode sends one email", r1.ok && sent.filter((s) => s.to === a.email).length === 1);
    const codeA = lastCode(a.email);
    check("email contains a 6-digit code", /^\d{6}$/.test(codeA));
    check("mail provider got the bearer key header", sent[0]?.auth === "Bearer test-key-not-a-secret");
    const row = await prisma.emailVerification.findUnique({ where: { userId: a.id } });
    check("stored value is a hash, not the code", !!row && row.codeHash !== codeA && /^[0-9a-f]{64}$/.test(row.codeHash));
    const dump = JSON.stringify(row);
    check("stored row contains no plaintext code", !dump.includes(`"${codeA}"`));
    check("expiry is 10 minutes", !!row && Math.abs(row.expiresAt.getTime() - t0.getTime() - 600000) < 5);

    // 2. Cooldown.
    const r2 = await issueCode(a, new Date(t0.getTime() + 30_000));
    check("resend inside 60 s is refused (cooldown)", !r2.ok && r2.reason === "cooldown" && r2.retryAfter > 0 && r2.retryAfter <= 30, JSON.stringify(r2));
    check("refused resend sent no mail", sent.filter((s) => s.to === a.email).length === 1);

    // 3. Wrong code, attempts, lock.
    const wrong = codeA === "000000" ? "111111" : "000000";
    const w1 = await verifyCode(a.email, wrong, new Date(t0.getTime() + 1000));
    check("wrong code rejected, 4 tries left", !w1.ok && w1.reason === "wrong_code" && w1.attemptsLeft === 4, JSON.stringify(w1));
    let last;
    for (let i = 0; i < 3; i++) last = await verifyCode(a.email, wrong, new Date(t0.getTime() + 2000));
    check("4th wrong code: 1 try left", !!last && !last.ok && last.reason === "wrong_code" && last.attemptsLeft === 1, JSON.stringify(last));
    const w5 = await verifyCode(a.email, wrong, new Date(t0.getTime() + 3000));
    check("5th wrong code locks the code", !w5.ok && w5.reason === "locked", JSON.stringify(w5));
    const afterLock = await verifyCode(a.email, codeA, new Date(t0.getTime() + 4000));
    check("after the lock even the RIGHT code is refused", !afterLock.ok && afterLock.reason === "locked", JSON.stringify(afterLock));
    const stillUnverified = await prisma.user.findUnique({ where: { id: a.id } });
    check("account is still unverified after the lock", stillUnverified?.emailVerifiedAt === null);

    // 4. New code after the lock: resets attempts, old code dead.
    const t1 = new Date(t0.getTime() + 61_000);
    const r3 = await issueCode(a, t1);
    check("a new code can be sent after the cooldown", r3.ok);
    const codeA2 = lastCode(a.email);
    const old = codeA === codeA2 ? null : await verifyCode(a.email, codeA, new Date(t1.getTime() + 1000));
    check("the previous code no longer works", old === null || (!old.ok && old.reason === "wrong_code"), JSON.stringify(old));

    // 5. Expiry.
    const exp = await verifyCode(a.email, codeA2, new Date(t1.getTime() + OTP.ttlMs + 1000));
    check("a correct code after 10 minutes is expired", !exp.ok && exp.reason === "expired", JSON.stringify(exp));
    const afterExp = await prisma.user.findUnique({ where: { id: a.id } });
    check("expired code did not verify the account", afterExp?.emailVerifiedAt === null);

    // 6. Success + single use.
    const t2 = new Date(t1.getTime() + 120_000);
    const r4 = await issueCode(a, t2);
    check("fresh code issued", r4.ok);
    const codeA3 = lastCode(a.email);
    const ok = await verifyCode(a.email, codeA3, new Date(t2.getTime() + 1000));
    check("the right code verifies the account", ok.ok);
    const verified = await prisma.user.findUnique({ where: { id: a.id } });
    check("emailVerifiedAt is set", !!verified?.emailVerifiedAt);
    const reuse = await verifyCode(a.email, codeA3, new Date(t2.getTime() + 2000));
    check("the same code cannot be used twice", !reuse.ok && reuse.reason === "expired", JSON.stringify(reuse));
    const gone = await prisma.emailVerification.findUnique({ where: { userId: a.id } });
    check("code row is deleted after use", gone === null);

    // 7. Parallel right-code requests: exactly one wins.
    const b = await mk("b");
    users.push(b.id);
    const tb = new Date();
    await issueCode(b, tb);
    const codeB = lastCode(b.email);
    const race = await Promise.all(Array.from({ length: 5 }, () => verifyCode(b.email, codeB, new Date(tb.getTime() + 1000))));
    check("5 parallel requests with the right code: exactly 1 succeeds", race.filter((r) => r.ok).length === 1, `ok=${race.filter((r) => r.ok).length}`);

    // 8. Parallel wrong guesses cannot exceed 5 attempts.
    const c = await mk("c");
    users.push(c.id);
    const tc = new Date();
    await issueCode(c, tc);
    const codeC = lastCode(c.email);
    const wrongC = codeC === "123456" ? "654321" : "123456";
    await Promise.all(Array.from({ length: 20 }, () => verifyCode(c.email, wrongC, new Date(tc.getTime() + 1000))));
    const rowC = await prisma.emailVerification.findUnique({ where: { userId: c.id } });
    check("20 parallel wrong guesses: attempts capped at 5", rowC?.attempts === OTP.maxAttempts, `attempts=${rowC?.attempts}`);

    // 9. Hourly cap: 5 sends, the 6th refused.
    const d = await mk("d");
    users.push(d.id);
    const td = new Date();
    let okSends = 0;
    let capped: unknown = null;
    for (let i = 0; i < 7; i++) {
      const r = await issueCode(d, new Date(td.getTime() + i * 61_000));
      if (r.ok) okSends++;
      else {
        capped = r;
        break;
      }
    }
    check("5 sends per hour allowed, 6th refused with reason cap", okSends === OTP.maxSendsPerWindow && (capped as { reason?: string })?.reason === "cap", `sent=${okSends} ${JSON.stringify(capped)}`);

    // 10. Unknown address / verified account answer like "expired" (no account probe).
    const unk = await verifyCode(`nobody.${stamp}@quadrant.test`, "123456");
    const ver = await verifyCode(a.email, "123456");
    check("unknown email and verified account both answer 'expired'", !unk.ok && unk.reason === "expired" && !ver.ok && ver.reason === "expired");

    // 11. Fail closed: no mail config -> no row left, no send.
    const e = await mk("e");
    users.push(e.id);
    const before = sent.length;
    const saved = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const nm = await issueCode(e);
    process.env.RESEND_API_KEY = saved;
    check("without a mail key issueCode fails with not_configured", !nm.ok && nm.reason === "not_configured", JSON.stringify(nm));
    check("without a mail key nothing is sent and no code row stays", sent.length === before && (await prisma.emailVerification.findUnique({ where: { userId: e.id } })) === null);

    // 12. Provider rejects the message -> failure, no row left.
    const f = await mk("f");
    users.push(f.id);
    reject = true;
    const rj = await issueCode(f);
    reject = false;
    check("provider rejection -> send_failed and no code row stays", !rj.ok && rj.reason === "send_failed" && (await prisma.emailVerification.findUnique({ where: { userId: f.id } })) === null, JSON.stringify(rj));

    // 13. No server secret -> hashing throws (no hard-coded fallback).
    const s1 = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.BETTER_AUTH_SECRET;
    let threw = false;
    try {
      hashCode("u", "123456");
    } catch {
      threw = true;
    }
    const rt = await import("../lib/recoveryToken");
    let threw2 = false;
    try {
      rt.generateRecoveryVerificationToken("a@b.co", "hash");
    } catch {
      threw2 = true;
    }
    process.env.AUTH_SECRET = s1;
    check("no server secret: OTP hashing throws instead of using a default", threw);
    check("no server secret: recovery token throws instead of using a default", threw2);

    // 14. Recovery ticket: needs ticket AND code; code is not in the ticket.
    const tk = rt.generateRecoveryVerificationToken("a@b.co", "pwhash");
    check("recovery code is 6 digits", /^\d{6}$/.test(tk.code));
    check("recovery ticket does not contain the code", !Buffer.from(tk.token, "base64url").toString("utf8").includes(tk.code) && !tk.token.includes(tk.code));
    check("recovery: right ticket + right code passes", rt.verifyRecoveryVerificationToken("a@b.co", tk.token, tk.code, "pwhash"));
    const badCode = tk.code === "000000" ? "000001" : "000000";
    check("recovery: right ticket + wrong code fails", !rt.verifyRecoveryVerificationToken("a@b.co", tk.token, badCode, "pwhash"));
    check("recovery: ticket alone (empty code) fails", !rt.verifyRecoveryVerificationToken("a@b.co", tk.token, "", "pwhash"));
    check("recovery: ticket fails once the password hash changed", !rt.verifyRecoveryVerificationToken("a@b.co", tk.token, tk.code, "otherhash"));
    check("recovery: ticket fails for another email", !rt.verifyRecoveryVerificationToken("z@b.co", tk.token, tk.code, "pwhash"));

    // 15. Migration effect on existing rows (staging).
    const unv = await prisma.user.count({ where: { emailVerifiedAt: null, email: { endsWith: "@quadrant.com" } } });
    check("no @quadrant.com account is unverified", unv === 0, `unverified=${unv}`);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    server.close();
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
