// WO-029 criterion 1 evidence: what the DATABASE holds for an account made through the app.
//   npx tsx scripts/sit/query-sealed-rows.ts [email-prefix]
// STAGING only. Read-only: SELECT statements. Prints lengths and hex prefixes, never decoded text.
import "../lib/use-staging.mjs";

async function main() {
  const { prisma } = await import("../../lib/prisma");
  const prefix = process.argv[2] ?? "wo029.";
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { id: true, email: true },
  });
  if (!users.length) throw new Error(`no staging user with prefix ${prefix}`);
  const u = users[0];
  console.log(`account: ${u.email}`);

  console.log("\n-- SELECT r.id, octet_length(r.label) AS bytes, encode(substring(r.label from 1 for 16),'hex') AS first16_hex, printable_ascii_bytes, r.domain FROM roles r WHERE r.\"userId\" = $1;");
  console.table(
    await prisma.$queryRaw`SELECT left(id,8) AS id, octet_length(label) AS bytes, encode(substring(label from 1 for 16),'hex') AS first16_hex, (SELECT count(*) FROM generate_series(0, octet_length(label)-1) i WHERE get_byte(label,i) BETWEEN 32 AND 126)::int AS printable_ascii_bytes, domain FROM roles WHERE "userId" = ${u.id}`,
  );
  console.log("-- SELECT g.id, octet_length(g.title), encode(substring(g.title from 1 for 16),'hex'), ..., g.status, g.\"weekStart\" FROM goals g JOIN roles r ON r.id=g.\"roleId\" WHERE r.\"userId\" = $1;");
  console.table(
    await prisma.$queryRaw`SELECT left(g.id,8) AS id, octet_length(g.title) AS bytes, encode(substring(g.title from 1 for 16),'hex') AS first16_hex, (SELECT count(*) FROM generate_series(0, octet_length(g.title)-1) i WHERE get_byte(g.title,i) BETWEEN 32 AND 126)::int AS printable_ascii_bytes, g.status, g."weekStart"::text AS week_start, left(g."carriedFromId",8) AS carried_from FROM goals g JOIN roles r ON r.id=g."roleId" WHERE r."userId" = ${u.id} ORDER BY g."createdAt"`,
  );
  console.log("-- SELECT b.id, octet_length(b.title), encode(substring(b.title from 1 for 16),'hex'), ..., b.day, b.hour FROM schedule_blocks b JOIN roles r ON r.id=b.\"roleId\" WHERE r.\"userId\" = $1;");
  console.table(
    await prisma.$queryRaw`SELECT left(b.id,8) AS id, octet_length(b.title) AS bytes, encode(substring(b.title from 1 for 16),'hex') AS first16_hex, (SELECT count(*) FROM generate_series(0, octet_length(b.title)-1) i WHERE get_byte(b.title,i) BETWEEN 32 AND 126)::int AS printable_ascii_bytes, b.day::text AS day, b.hour FROM schedule_blocks b JOIN roles r ON r.id=b."roleId" WHERE r."userId" = ${u.id} ORDER BY b.day, b.hour`,
  );
  const col = await prisma.$queryRaw<{ c: string; t: string }[]>`SELECT table_name||'.'||column_name AS c, data_type AS t FROM information_schema.columns WHERE (table_name='roles' AND column_name IN ('label','domain')) OR (table_name='goals' AND column_name IN ('title','status')) OR (table_name='schedule_blocks' AND column_name IN ('title','hour')) ORDER BY 1`;
  console.log("column types:", col.map((r) => `${r.c}=${r.t}`).join("  "));
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
