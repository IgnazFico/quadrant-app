import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  const currentYear = new Date().getFullYear();

  const [user, roles, latestStatement] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, createdAt: true },
    }),
    prisma.role.findMany({
      where: { userId },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
      include: { growthRings: { where: { year: currentYear } } },
    }),
    prisma.missionStatement.findFirst({
      where: { userId },
      orderBy: { version: "desc" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const rolesOut = roles.map((r) => ({
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
    ring: r.growthRings[0]
      ? {
          year: r.growthRings[0].year,
          votesLogged: r.growthRings[0].votesLogged,
          sealed: r.growthRings[0].sealed,
        }
      : null,
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
