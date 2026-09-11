import { test, expect } from "@playwright/test";

test.describe("Quadrant Calm Notifications System", () => {
  test("notification bell displays unread badge and opens popover", async ({ page }) => {
    // Mock the notifications API to return sample calm notifications
    await page.route("**/api/notifications*", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            unreadCount: 2,
            notifications: [
              {
                id: "notif-1",
                type: "MORNING_FOCUS",
                title: "Morning Focus",
                message: "You have 2 priorities scheduled for today.",
                link: "/schedule",
                read: false,
                createdAt: new Date().toISOString(),
              },
              {
                id: "notif-2",
                type: "SUNDAY_RESET",
                title: "Sunday Reset",
                message: "Take 5 minutes to wrap up last week and clear your plate for tomorrow.",
                link: "/weekly-review",
                read: false,
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
            ],
          }),
        });
      }

      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }

      return route.continue();
    });

    await page.goto("/test-notifications");

    // 1. Verify Bell and Unread Badge
    const bellBtn = page.getByTestId("notification-bell-btn");
    await expect(bellBtn).toBeVisible({ timeout: 15000 });

    const badge = page.getByTestId("notification-badge");
    await expect(badge).toHaveText("2", { timeout: 15000 });

    // 2. Click Bell to open Dropdown
    await bellBtn.click();
    const dropdown = page.getByTestId("notification-dropdown");
    await expect(dropdown).toBeVisible();

    // 3. Verify notification items specifically inside dropdown
    const item1 = dropdown.getByTestId("notification-item-notif-1");
    await expect(item1).toBeVisible();
    await expect(item1).toContainText("Morning Focus");
    await expect(item1).toContainText("You have 2 priorities scheduled for today.");

    const item2 = dropdown.getByTestId("notification-item-notif-2");
    await expect(item2).toBeVisible();
    await expect(item2).toContainText("Sunday Reset");
    await expect(item2).toContainText("Take 5 minutes to wrap up last week and clear your plate for tomorrow.");

    // 4. Click Mark all read
    const markAllBtn = page.getByTestId("mark-all-read-btn");
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();

    // Badge should be hidden after marking all as read
    await expect(badge).not.toBeVisible();
  });

  test("test suite page allows manually triggering and reading notifications", async ({ page }) => {
    let mockNotifications: any[] = [];

    await page.route("**/api/notifications*", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            unreadCount: mockNotifications.filter((n) => !n.read).length,
            notifications: mockNotifications,
          }),
        });
      }

      if (route.request().method() === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        if (body.all) {
          mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
        } else if (body.id) {
          mockNotifications = mockNotifications.map((n) =>
            n.id === body.id ? { ...n, read: true } : n
          );
        }
        return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }

      if (route.request().method() === "DELETE") {
        const url = new URL(route.request().url());
        const id = url.searchParams.get("id");
        mockNotifications = mockNotifications.filter((n) => n.id !== id);
        return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }

      return route.continue();
    });

    await page.route("**/api/notifications/test-seed", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      const newNotif = {
        id: `mock-${Date.now()}`,
        type: body.type,
        title: body.type === "SEVEN_DAY_MILESTONE" ? "7-Day Milestone" : "Sample Notification",
        message: "You've used Quadrant for 7 days. You can now write your Personal Constitution.",
        link: "/mission-statement",
        read: false,
        createdAt: new Date().toISOString(),
      };
      mockNotifications.unshift(newNotif);
      return route.fulfill({ status: 200, body: JSON.stringify({ success: true, notification: newNotif }) });
    });

    await page.goto("/test-notifications");

    // Verify page header
    await expect(page.getByText("Quadrant Notifications Test Suite")).toBeVisible({ timeout: 15000 });

    // Trigger 7-Day Milestone seed
    const seedMilestoneBtn = page.getByTestId("manual-seed-SEVEN_DAY_MILESTONE");
    await seedMilestoneBtn.click();

    // Verify notification appears in live list section
    const liveSection = page.locator("section").filter({ hasText: "2. Live User Notifications Table" });
    await expect(liveSection.getByText("7-Day Milestone")).toBeVisible();
    await expect(liveSection.getByText("NEW")).toBeVisible();

    // Mark as read
    await page.getByRole("button", { name: "Read", exact: true }).click();
    await expect(page.getByText("NEW")).not.toBeVisible();

    // Delete notification
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(liveSection.getByText("7-Day Milestone")).not.toBeVisible();
  });
});
