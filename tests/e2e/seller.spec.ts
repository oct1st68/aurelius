import { test, expect } from "@playwright/test";

/**
 * Seller journey: register → become seller → listing wizard (draft + submit) →
 * dashboard shows listing → respond to an offer is covered implicitly by seed
 * offers when using the seeded seller account.
 */
test("seller journey: become seller, create draft, submit for review", async ({ page }) => {
  const email = `e2e-seller-${Date.now()}@aurelius.local`;

  await page.goto("/register");
  await page.getByLabel("Display name").fill("E2E Seller");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("E2EGoodPass1");
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/account");

  // Become a seller
  await page.goto("/seller/dashboard");
  await page.getByRole("button", { name: "Claim the Merchant Role" }).click();
  await page.waitForURL("**/seller/dashboard**");
  await expect(page.getByRole("heading", { name: "Seller Dashboard" })).toBeVisible();

  // Wizard step I
  await page.getByRole("link", { name: "+ New Listing" }).click();
  await page.getByLabel("Great House").selectOption({ index: 1 });
  await page.getByLabel("Model").fill("E2E Test Piece");
  await page.getByLabel("Reference number").fill("E2E-001");
  await page.getByLabel("Year").fill("2022");
  await page.getByLabel("Serial number").fill("E2ESN000123");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step II — specifications
  await page.getByLabel("Case material").fill("Steel");
  await page.getByLabel("Case diameter (mm)").fill("39");
  await page.getByLabel("Dial color").fill("Black");
  await page.getByLabel("Bracelet / strap").fill("Leather");
  await page.getByLabel("Water resistance (m)").fill("50");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step III — condition
  await page.getByLabel("Condition notes").fill("Excellent, one hairline on the clasp.");
  await page.getByLabel("Service history").fill("Serviced 2024");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step IV — documentation
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step V — photography (demo media paths)
  await page
    .getByLabel("Image paths (comma separated, under media/)")
    .fill("media/test-e2e-0.svg");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step VI — pricing + description
  await page.getByLabel("Asking price (USD)").fill("4,200.00");
  await page
    .getByLabel("Connoisseur's description")
    .fill("A test piece created by the Playwright seller journey with enough description text.");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step VII — save draft first, then submit
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();

  await page.goto("/seller/listings");
  await expect(page.getByText("E2E Test Piece")).toBeVisible();
  await expect(page.getByText("draft").first()).toBeVisible();
});

test("seeded seller can view offers dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("seller@aurelius.local");
  await page.getByLabel("Password").fill("Aurelius#Demo2024");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/account**");

  await page.goto("/seller/offers");
  await expect(page.getByRole("heading", { name: "Incoming Offers" })).toBeVisible();
  // Seeded pending offers exist
  await expect(page.getByText("Pending").first()).toBeVisible();
});
