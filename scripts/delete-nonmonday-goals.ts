// Inventory (read-only) or delete the anomalous non-Monday goals in a database.
//   npx tsx scripts/delete-nonmonday-goals.ts prod|staging            -> inventory + backup, no writes
//   npx tsx scripts/delete-nonmonday-goals.ts prod|staging --delete <goalId...>
//   npx tsx scripts/delete-nonmonday-goals.ts prod|staging --ids <goalId...>          -> inventory + backup of those ids
//   npx tsx scripts/delete-nonmonday-goals.ts prod|staging --ids <goalId...> --force  -> delete those ids
// --delete removes only ids that are still non-Monday. --ids --force removes the
// listed ids whatever their week (for rows already repaired by the migration).
// Backs up every affected row (goal, review entry, linked schedule blocks) to
// C:/Users/Nazmc/quadrant-backups before writing.
import { mkdirSync, writeFileSync } from "node:fs";
import { Pool } from "pg";
import { resolveEnv } from "./lib/env.mjs";

const target = process.argv[2];
if (target !== "staging" && target !== "prod") throw new Error("usage: prod|staging [--delete <goalId...>]");
// staging: .env.staging; prod: .env (scripts/lib/env.mjs).
const url = resolveEnv(target).DATABASE_URL;
const argv = process.argv.slice(3);
const force = argv.includes("--force");
const byIds = argv[0] === "--ids" ? argv.slice(1).filter((a) => a !== "--force") : null;
const del = argv[0] === "--delete" ? argv.slice(1) : byIds && force ? byIds : null;
const host = (url.match(/@([^/:]+)/) || [])[1];

const pool = new Pool({ connectionString: url, max: 1 });

async function main() {
  const c = await pool.connect();
  try {
    console.log(`[${target}] ${host}`);
    const goals = (
      await c.query(`
        SELECT g.*, to_char(g."weekStart",'YYYY-MM-DD Dy') AS ws, r."userId",
               re.id AS "reId", re.choice, re."resolvedAt",
               encode(re."reasonEncrypted",'base64') AS "reasonB64"
        FROM goals g JOIN roles r ON r.id = g."roleId"
        LEFT JOIN review_entries re ON re."goalId" = g.id
        WHERE ${byIds ? `g.id = ANY($1)` : `EXTRACT(ISODOW FROM g."weekStart") <> 1`}
        ORDER BY g."weekStart", g."createdAt"`, byIds ? [byIds] : [])
    ).rows;
    const ids = goals.map((g) => g.id);
    const blocks = ids.length
      ? (await c.query(`SELECT * FROM schedule_blocks WHERE "goalId" = ANY($1)`, [ids])).rows
      : [];
    const rings = goals.length
      ? (
          await c.query(
            `SELECT "roleId", year, "votesLogged", sealed FROM growth_rings WHERE "roleId" = ANY($1)`,
            [[...new Set(goals.map((g) => g.roleId))]],
          )
        ).rows
      : [];

    for (const g of goals) {
      const nb = blocks.filter((b) => b.goalId === g.id).length;
      console.log(
        `${g.id}  ${g.ws}  ${g.status.padEnd(11)} review=${g.reId ? g.choice : "-"}  completed=${g.completedAt ? "yes" : "no"}  scheduleBlocks=${nb}  user=${g.userId.slice(0, 8)}`,
      );
    }
    console.log(`growth ring rows (data model behind each role's constellation) on those roles: ${JSON.stringify(rings)}`);

    mkdirSync("C:/Users/Nazmc/quadrant-backups", { recursive: true });
    const file = `C:/Users/Nazmc/quadrant-backups/${byIds ? "goals-by-id" : "nonmonday-goals"}-${target}-${Date.now()}.json`;
    writeFileSync(file, JSON.stringify({ host, takenAt: new Date().toISOString(), goals, blocks, rings }, null, 2));
    console.log(`backup: ${file}`);

    if (!del) return;
    if (del.length === 0) throw new Error("--delete needs goal ids");
    const unknown = del.filter((id) => !ids.includes(id));
    if (unknown.length) throw new Error(`not found in the inventory above, refusing: ${unknown.join(", ")}`);

    await c.query("BEGIN");
    // ReviewEntry cascades with the goal; schedule blocks are SET NULL by the FK.
    const r = await c.query(
      byIds
        ? `DELETE FROM goals WHERE id = ANY($1) RETURNING id`
        : `DELETE FROM goals WHERE id = ANY($1) AND EXTRACT(ISODOW FROM "weekStart") <> 1 RETURNING id`,
      [del],
    );
    if (r.rowCount !== del.length) {
      await c.query("ROLLBACK");
      throw new Error(`expected ${del.length} rows, got ${r.rowCount}; rolled back`);
    }
    await c.query("COMMIT");
    console.log(`deleted ${r.rowCount}: ${r.rows.map((x) => x.id).join(", ")}`);
  } finally {
    c.release();
  }
}

main()
  .catch((e) => {
    console.error("ERR", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
