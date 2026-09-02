import { test, expect } from "@playwright/test";

/**
 * Admin journey: sign in as seeded admin → dashboard → moderate a seeded
 * listing is read-only here (seed has none pending), so verify console pages,
 * ban dialog flow (cancel), and audit log.
 */
test("admin console renders all sections and confirm dialogs work", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@aurelius.local");
  await page.getByLabel("Password").fill("Aurelius#Demo2024");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/account**");

  // Dashboard
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin Console" })).toBeVisible();
  await expect(page.getByText("Users").first()).toBeVisible();

  // Users: custom confirm dialog opens, cancel works (no browser confirm())
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users & Roles" })).toBeVisible();
  const buyerRow = page.locator("div.panel", { hasText: "buyer@aurelius.local" }).first();
  await buyerRow.getByRole("button", { name: "Manage" }).click();
  await buyerRow.getByRole("button", { name: "Ban user" }).click();
  await expect(page.getByText("Ban this account?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Ban this account?")).toBeHidden();

  // Moderation queue renders
  await page.goto("/admin/listings");
  await expect(page.getByRole("heading", { name: "Listing Moderation" })).toBeVisible();

  // Orders & refunds render
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders & Refunds" })).toBeVisible();

  // Certificates
  await page.goto("/admin/certificates");
  await expect(page.getByText("AUR-2025-000001").first()).toBeVisible();

  // Audit log has entries
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit Log" })).toBeVisible();
});

test("non-admin users cannot reach the admin console", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("buyer@aurelius.local");
  await page.getByLabel("Password").fill("Aurelius#Demo2024");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/account**");

  // Server redirects non-admins away from /admin
  await page.goto("/admin");
  await page.waitForURL("**/account");
  await expect(page).not.toHaveURL(/\/admin/);
});
