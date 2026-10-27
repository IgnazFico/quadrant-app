// WO-029 (D-066) regression check: goal titles, schedule titles and role labels
// are ciphertext to the server.
//
//   npx tsx scripts/verify-sealed-fields.ts
//
// Always STAGING (scripts/lib/use-staging.mjs refuses the production host).
// Uses throwaway users and deletes them afterwards.
//
// Covers:
//  A. server schemas (lib/sealed.ts): accept real ciphertext at the limits,
//     reject plaintext, empty, oversize
//  B. response serializers: Bytes leave as base64 strings, never Buffer JSON
//  C. browser helpers (lib/sealedFields.ts): round trip; a row that cannot be
//     opened (legacy readable bytes, wrong key, no key) shows a placeholder and
//     never throws
//  D. database: the three columns are bytea, hold no readable text
//  E. carry-forward is idempotent (same week completed twice, and two at once)
//  F. role milestone notice names no role and is sent once per tier
import "./lib/use-staging.mjs";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

async function main() {
  const { prisma } = await import("../lib/prisma");
  const crypto = await import("../lib/crypto");
  const sealed = await import("../lib/sealed");
  const fields = await import("../lib/sealedFields");
  const { carryGoalsForward } = await import("../lib/carryForward");
  const { startOfWeek, addDays } = await import("../lib/week");
  const { evaluateNotificationsForUser } = await import("../lib/notifications");

  const key = await crypto.generateMasterKey();
  const otherKey = await crypto.generateMasterKey();
  const seal = (t: string, k = key) => fields.sealText(t, k);

  // ---------------- A. server schemas ----------------
  const goal140 = "g".repeat(sealed.GOAL_TITLE_MAX);
  const label60 = "r".repeat(sealed.ROLE_LABEL_MAX);
  check("title schema accepts a sealed 140-character title", sealed.goalTitleSchema.safeParse(await seal(goal140)).success);
  check("label schema accepts a sealed 60-character label", sealed.roleLabelSchema.safeParse(await seal(label60)).success);
  check("schedule schema accepts a sealed 1-character title", sealed.scheduleTitleSchema.safeParse(await seal("x")).success);
  const emoji140 = "😀".repeat(70); // 140 UTF-16 units, 280 UTF-8 bytes
  check("title schema accepts 140 UTF-16 units of emoji", sealed.goalTitleSchema.safeParse(await seal(emoji140)).success);
  const cjk140 = "字".repeat(140); // 3 bytes each
  check("title schema accepts 140 CJK characters", sealed.goalTitleSchema.safeParse(await seal(cjk140)).success);
  check("schema rejects readable text", !sealed.goalTitleSchema.safeParse("Run 5km three times").success);
  check("schema rejects text that happens to be base64 but too short", !sealed.goalTitleSchema.safeParse("Runn").success);
  check("schema rejects an empty string", !sealed.goalTitleSchema.safeParse("").success);
  check("schema rejects an oversize blob", !sealed.goalTitleSchema.safeParse(await seal("g".repeat(5000))).success);
  check("schema rejects a number", !sealed.goalTitleSchema.safeParse(123).success);
  const parsed = sealed.goalTitleSchema.parse(await seal("hello"));
  check("schema parses to a Buffer ready for Prisma", Buffer.isBuffer(parsed) && parsed.length === 40 + 5, `len=${parsed.length}`);

  // ---------------- B. serializers ----------------
  const bytes = Buffer.from(await crypto.encryptField("hi", key));
  const g = sealed.serializeGoal({ id: "1", title: bytes });
  const b = sealed.serializeBlock({ id: "2", title: bytes, role: { id: "3", label: bytes, domain: "career" } });
  check("serializeGoal gives a base64 string", typeof g.title === "string" && g.title === bytes.toString("base64"));
  check("serializeBlock seals title and role.label on the wire", typeof b.title === "string" && typeof b.role?.label === "string");
  check("serialized JSON has no Buffer objects", !JSON.stringify([g, b]).includes('"type":"Buffer"'));

  // ---------------- C. browser helpers ----------------
  check("round trip opens what was sealed", (await fields.openText(await seal("Ship it"), key)) === "Ship it");
  check("same text sealed twice differs (fresh nonce)", (await seal("same")) !== (await seal("same")));
  check("wrong key does not open", (await fields.openText(await seal("secret"), otherKey)) === null);
  check("no key does not open", (await fields.openText(await seal("secret"), null)) === null);
  const legacy = Buffer.from("Plain old title").toString("base64"); // bytes written before WO-029
  check("a legacy readable row does not throw and does not open", (await fields.openText(legacy, key)) === null);
  const t = await fields.openTitle({ id: "x", title: legacy }, key);
  check("legacy goal title shows the placeholder", t.title === fields.UNREADABLE_TITLE, t.title);
  const l = await fields.openLabel({ label: legacy, domain: "career" }, key);
  check("legacy role label falls back to its domain name", l.label === "Career", l.label);
  const blk = await fields.openBlock(
    { title: await seal("Standup"), role: { label: await seal("Architect"), domain: "career" } },
    key,
  );
  check("a schedule block opens its title and its role label", blk.title === "Standup" && blk.role.label === "Architect");
  check("the placeholder is recognised so it is never written back", fields.isUnreadable(fields.UNREADABLE_TITLE));

  // ---------------- D, E, F need the database ----------------
  const stamp = Date.now();
  const marker = `ZZ-PLAINTEXT-MARKER-${stamp}`;
  const user = await prisma.user.create({
    data: { email: `sealed.${stamp}@quadrant.test`, passwordHash: "x" },
  });
  try {
    const role = await prisma.role.create({
      data: { userId: user.id, domain: "career", label: new Uint8Array(await crypto.encryptField(`role ${marker}`, key)) },
    });
    const week = addDays(startOfWeek(), -7);
    const goal = await prisma.goal.create({
      data: {
        roleId: role.id,
        title: new Uint8Array(await crypto.encryptField(`goal ${marker}`, key)),
        weekStart: week,
        status: "DONE",
        completedAt: addDays(week, 1),
        carryForward: true,
      },
    });
    const block = await prisma.scheduleBlock.create({
      data: {
        roleId: role.id,
        goalId: goal.id,
        day: week,
        hour: 9,
        title: new Uint8Array(await crypto.encryptField(`block ${marker}`, key)),
      },
    });

    // D. the columns are bytea and hold no readable text
    const types = await prisma.$queryRaw<{ t: string; c: string }[]>`
      SELECT table_name || '.' || column_name AS c, data_type AS t
        FROM information_schema.columns
       WHERE (table_name = 'roles' AND column_name = 'label')
          OR (table_name = 'goals' AND column_name = 'title')
          OR (table_name = 'schedule_blocks' AND column_name = 'title')
       ORDER BY 1`;
    check(
      "roles.label, goals.title, schedule_blocks.title are bytea",
      types.length === 3 && types.every((r) => r.t === "bytea"),
      types.map((r) => `${r.c}:${r.t}`).join(" "),
    );
    const readable = await prisma.$queryRaw<{ n: number }[]>`
      SELECT (
        (SELECT COUNT(*) FROM roles WHERE id = ${role.id} AND position(convert_to(${marker}, 'UTF8') in label) > 0) +
        (SELECT COUNT(*) FROM goals WHERE id = ${goal.id} AND position(convert_to(${marker}, 'UTF8') in title) > 0) +
        (SELECT COUNT(*) FROM schedule_blocks WHERE id = ${block.id} AND position(convert_to(${marker}, 'UTF8') in title) > 0)
      )::int AS n`;
    check("no stored value contains the readable marker text", readable[0].n === 0, `hits=${readable[0].n}`);

    // E. carry-forward idempotence, by source goal id
    const target = startOfWeek();
    const toCarry = [{ id: goal.id, roleId: goal.roleId, title: goal.title as Uint8Array<ArrayBuffer> }];
    const first = await carryGoalsForward(toCarry, target);
    const second = await carryGoalsForward(toCarry, target);
    const copies = await prisma.goal.findMany({ where: { roleId: role.id, weekStart: target } });
    check("carry-forward: first run creates 1 goal", first === 1, `first=${first}`);
    check("carry-forward: second run for the same week creates 0", second === 0, `second=${second}`);
    check("carry-forward: exactly one copy exists", copies.length === 1, `n=${copies.length}`);
    check(
      "carry-forward: the ciphertext is copied byte for byte and still opens",
      copies.length === 1 &&
        Buffer.compare(Buffer.from(copies[0].title), Buffer.from(goal.title)) === 0 &&
        (await fields.openText(sealed.toWire(copies[0].title), key)) === `goal ${marker}`,
    );
    check("carry-forward: the copy remembers its source", copies[0]?.carriedFromId === goal.id);

    // two requests at the same moment (double click) on a second source goal
    const goal2 = await prisma.goal.create({
      data: {
        roleId: role.id,
        title: new Uint8Array(await crypto.encryptField("second", key)),
        weekStart: week,
        status: "DONE",
        completedAt: addDays(week, 2),
        carryForward: true,
      },
    });
    const src2 = [{ id: goal2.id, roleId: goal2.roleId, title: goal2.title as Uint8Array<ArrayBuffer> }];
    const [r1, r2] = await Promise.all([carryGoalsForward(src2, target), carryGoalsForward(src2, target)]);
    const copies2 = await prisma.goal.count({ where: { carriedFromId: goal2.id } });
    check("carry-forward: two simultaneous completions create one goal", copies2 === 1 && r1 + r2 === 1, `r1=${r1} r2=${r2} rows=${copies2}`);

    // deleting the source does not delete the copy
    await prisma.goal.delete({ where: { id: goal2.id } });
    const keptCopies = await prisma.goal.count({ where: { roleId: role.id, weekStart: target } });
    check("carry-forward: deleting a source goal keeps the carried copy (link cleared)", keptCopies === 2, `copies=${keptCopies}`);

    // F. role milestone notice: no role name, once per tier
    const year = new Date().getFullYear();
    await prisma.growthRing.create({ data: { roleId: role.id, year, votesLogged: 25 } });
    await evaluateNotificationsForUser(user.id);
    await evaluateNotificationsForUser(user.id);
    let notes = await prisma.notification.findMany({ where: { userId: user.id, type: "ROLE_MILESTONE" } });
    check("milestone: one notice at 25, even after two evaluations", notes.length === 1, `n=${notes.length}`);
    check(
      "milestone: the message names no role and carries no user text",
      notes.every((n) => !n.message.includes(marker) && !n.message.toLowerCase().includes("role r") && /Showed up 25 times in one of your roles/.test(n.message)),
      notes[0]?.message,
    );
    await prisma.growthRing.update({ where: { roleId_year: { roleId: role.id, year } }, data: { votesLogged: 50 } });
    await Promise.all([evaluateNotificationsForUser(user.id), evaluateNotificationsForUser(user.id)]);
    notes = await prisma.notification.findMany({ where: { userId: user.id, type: "ROLE_MILESTONE" } });
    check("milestone: next tier (50) is sent exactly once, even with two requests at once", notes.length === 2, `n=${notes.length}`);
  } finally {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }); // cascades roles, goals, blocks, rings
    await prisma.$disconnect();
  }

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
