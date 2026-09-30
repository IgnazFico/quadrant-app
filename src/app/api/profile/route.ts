import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { getRoleConstellations } from "../../../../lib/constellation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  const currentYear = new Date().getFullYear();

  const [user, roles, latestStatement, constellations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, createdAt: true },
    }),
    prisma.role.findMany({
      where: { userId },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
    }),
    prisma.missionStatement.findFirst({
      where: { userId },
      orderBy: { version: "desc" },
    }),
    // GROWTH-RING-REDESIGN: the badge is this year's constellation only.
    getRoleConstellations(userId, { currentYearOnly: true }),
  ]);
  const constellationByRole = new Map(constellations.map((c) => [c.roleId, c]));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const rolesOut = roles.map((r: any) => ({
    id: r.id,
    label: r.label,
    domain: r.domain,
    isFeatured: r.isFeatured,
    // Tenure is identity/time-based (how long you've held this role),
    // deliberately independent of vote data — a role you added today is
    // "Year 1" even before you've completed a single goal in it. This
    // replaces the earlier date-math placeholder that inferred tenure
    // from ring.year, which broke for roles with no ring row yet.
    tenureYears: currentYear - r.createdAt.getFullYear() + 1,
    // GROWTH-RING-REDESIGN: replaces `ring: {votesLogged, sealed}`. Twelve
    // monthly scores for the current year; vote counts stay server-side.
    constellation: constellationByRole.get(r.id)?.years[0] ?? {
      year: currentYear,
      months: new Array(12).fill(null),
      sealed: false,
    },
  }));

  return NextResponse.json({
    user: { email: user.email, createdAt: user.createdAt },
    roles: rolesOut,
    missionStatement: latestStatement
      ? {
          signedName: latestStatement.signedName,
          signedAt: latestStatement.signedAt,
          contentEncrypted: Buffer.from(
            latestStatement.contentEncrypted,
          ).toString("base64"),
        }
      : null,
  });
}
