import { test, expect } from "@playwright/test";

// WO-002 / D-002 B: the product has 7 life domains (lib/domains.ts), so landing
// copy that states the number of life domains must say 7. "6 identity roles"
// counts roles, not domains, and stays as is.
test.describe("Landing copy: life-domain count", () => {
  test("domain counts say 7 and the roles line is untouched", async ({ page }) => {
    await page.goto("/");
    // textContent, not innerText: the flip-card back face and uppercase styling
    // would otherwise change what we read.
    const text = (await page.locator("body").textContent()) ?? "";
    const flat = text.replace(/\s+/g, " ");

    expect(flat).toContain("STRUCTURE: 7 LOAD-BEARING DOMAINS");
    expect(flat).toContain("Why Quadrant balances 7 human domains so nothing is forgotten.");
    expect(flat).not.toMatch(/\b(6|six)\s+(load-bearing |human |life )?domains/i);

    // Roles count: a different claim, reported to the owner, not changed here.
    expect(flat).toContain("PILLAR 01 • 6 IDENTITY ROLES");
  });

  test("approved statistics are unchanged", async ({ page }) => {
    await page.goto("/");
    const flat = ((await page.locator("body").textContent()) ?? "").replace(/\s+/g, " ");
    expect(flat).toContain("80%");
    expect(flat).toContain("46%");
    expect(flat).toContain("2022");
    expect(flat).toContain("HBR 2024");
    expect(flat).toContain("The 'Quiet Quitting' cultural reckoning.");
  });
});
