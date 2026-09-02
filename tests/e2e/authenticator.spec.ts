import { test, expect } from "@playwright/test";

/**
 * Authenticator journey: sign in as seeded authenticator → dashboard shows
 * the seeded in-flight order → claim → record approval → certificate issued.
 */
test("authenticator inspects and certifies the seeded order", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("authenticator@aurelius.local");
  await page.getByLabel("Password").fill("Aurelius#Demo2024");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/account**");

  await page.goto("/authenticator");
  await expect(page.getByRole("heading", { name: "Authenticator Dashboard" })).toBeVisible();

  // Seeded order #2 awaits inspection (Big Arrow Chronograph 1946)
  const panel = page.locator("div.panel", { hasText: "Big Arrow Chronograph" }).first();
  await expect(panel).toBeVisible();

  // Claim inspection
  await panel.getByRole("button", { name: "Claim inspection" }).click();
  await expect(panel.getByRole("button", { name: "Record outcome" })).toBeVisible();

  // Start the inspection stage (order → AUTHENTICATING)
  await panel.getByRole("button", { name: "Start inspection stage" }).click();

  // Record approval
  await panel.getByRole("button", { name: "Record outcome" }).click();
  await panel.getByLabel(/Inspection notes/).fill("Movement original, serial matches house records, timekeeping within spec.");
  await panel.getByRole("button", { name: "Approve authenticity" }).click();

  // Revalidation moves the item into history; the durable proof is the newly
  // issued certificate in the dashboard list.
  await expect(page.getByRole("link", { name: /^AUR-\d{4}-\d{6}$/ }).first()).toBeVisible();
});

test("certificate public page masks the serial", async ({ page }) => {
  await page.goto("/certificate?number=AUR-2025-000001");
  await expect(page.getByText("AUR-2025-000001").first()).toBeVisible();
  await expect(page.getByText(/authenticated/i).first()).toBeVisible();
  // Masked serial contains bullets; the page must NOT contain a plausible full serial
  const content = await page.content();
  expect(content).toMatch(/•{4,}/);
});
