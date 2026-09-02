import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// ---------------------------------------------------------------------------
// Resolve Environment & Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../..");
// Load .env from root quadrant workspace
dotenv.config({ path: path.join(workspaceRoot, ".env") });
const execAsync = promisify(exec);
// Initialize Prisma with Postgres adapter matching Quadrant architecture
const databaseUrl = process.env.DATABASE_URL;
const adapter = databaseUrl ? new PrismaPg({ connectionString: databaseUrl }) : undefined;
const prisma = adapter ? new PrismaClient({ adapter }) : new PrismaClient();
// ---------------------------------------------------------------------------
// Create MCP Server Instance
// ---------------------------------------------------------------------------
const server = new McpServer({
    name: "quadrant-dev-test-server",
    version: "1.0.0",
});
// ---------------------------------------------------------------------------
// Tool 1: Seed Test Scenarios
// ---------------------------------------------------------------------------
server.tool("seed_test_scenario", "Seeds a test user configured for specific testing scenarios (e.g. mission statement gate, unreviewed goals)", {
    scenario: z.enum(["mission_gate_ready", "unreviewed_goals_ready", "clean_user"]),
    email: z.string().email().default("test.user@example.com"),
}, async ({ scenario, email }) => {
    try {
        // Clean up previous test user
        await prisma.user.deleteMany({ where: { email } });
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: "$2a$10$testpasswordhashplaceholder",
            },
        });
        if (scenario === "mission_gate_ready") {
            // Seed 7 distinct past activity days to trigger the mission statement gate (lib/missionGate.ts)
            const dates = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (i + 1));
                d.setHours(0, 0, 0, 0);
                return d;
            });
            await prisma.activityDay.createMany({
                data: dates.map((date) => ({ userId: user.id, date })),
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ User ${email} created with 7 active days. Mission statement gate is now ACTIVE.`,
                    },
                ],
            };
        }
        if (scenario === "unreviewed_goals_ready") {
            // Seed a role and a missed goal to test Weekly Review reflection flow
            const role = await prisma.role.create({
                data: {
                    userId: user.id,
                    domain: "health",
                    label: "Athlete",
                },
            });
            const lastWeekStart = new Date();
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            lastWeekStart.setHours(0, 0, 0, 0);
            await prisma.goal.create({
                data: {
                    roleId: role.id,
                    title: "Run 10km 3x",
                    status: "MISSED",
                    weekStart: lastWeekStart,
                },
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ User ${email} created with 1 missed goal ready for weekly review reflection.`,
                    },
                ],
            };
        }
        return {
            content: [{ type: "text", text: `✅ Clean test user ${email} created.` }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `❌ Seeding failed: ${err.message}` }],
            isError: true,
        };
    }
});
// ---------------------------------------------------------------------------
// Tool 2: Programmatic Playwright Test Runner
// ---------------------------------------------------------------------------
server.tool("run_playwright_suite", "Executes Playwright end-to-end test suites and returns formatted results", {
    testFile: z.string().optional().describe("Specific test file, e.g. tests/auth.spec.ts"),
    headed: z.boolean().default(false),
}, async ({ testFile, headed }) => {
    try {
        const testTarget = testFile ? testFile : "";
        const headedFlag = headed ? "--headed" : "";
        const cmd = `npx playwright test ${testTarget} ${headedFlag}`;
        const { stdout, stderr } = await execAsync(cmd, {
            cwd: workspaceRoot,
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Playwright Test Output:\n\n${stdout || stderr}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Playwright Test Execution Failed:\n\n${err.stdout || err.stderr || err.message}`,
                },
            ],
            isError: true,
        };
    }
});
// ---------------------------------------------------------------------------
// Tool 3: Simulate Growth Ring Sealing (Year-End Cron Job)
// ---------------------------------------------------------------------------
server.tool("simulate_growth_ring_seal", "Simulates the year-end cron job that seals annual growth rings for all roles", {
    targetYear: z.number().default(new Date().getFullYear()),
}, async ({ targetYear }) => {
    try {
        const result = await prisma.growthRing.updateMany({
            where: {
                year: targetYear,
                sealed: false,
            },
            data: {
                sealed: true,
                sealedAt: new Date(),
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: `✅ Sealed ${result.count} Growth Ring(s) for year ${targetYear}.`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `❌ Cron simulation failed: ${err.message}` }],
            isError: true,
        };
    }
});
// ---------------------------------------------------------------------------
// Tool 4: Inspect Database Metrics
// ---------------------------------------------------------------------------
server.tool("inspect_database_metrics", "Returns counts and summary of active users, roles, goals, and sealed growth rings", {}, async () => {
    try {
        const [usersCount, rolesCount, goalsCount, ringsCount] = await Promise.all([
            prisma.user.count(),
            prisma.role.count(),
            prisma.goal.count(),
            prisma.growthRing.count(),
        ]);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        users: usersCount,
                        roles: rolesCount,
                        goals: goalsCount,
                        growthRings: ringsCount,
                    }, null, 2),
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `❌ Failed to inspect metrics: ${err.message}` }],
            isError: true,
        };
    }
});
// ---------------------------------------------------------------------------
// Server Bootstrap on Stdio Transport
// ---------------------------------------------------------------------------
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("MCP Server runtime error:", err);
    process.exit(1);
});
