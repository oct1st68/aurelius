import { test, expect } from "@playwright/test";

/**
 * Buyer journey: register → browse → detail → vault → cart → buy →
 * checkout (mock success) → order timeline → review unlock (after admin steps
 * are simulated by direct API only if needed) → notifications.
 */
const BUYER_EMAIL = `e2e-buyer-${Date.now()}@aurelius.local`;

test("buyer journey", async ({ page }) => {
  // 1. Homepage renders
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AURELIUS" })).toBeVisible();

  // 2. Register
  await page.goto("/register");
  await page.getByLabel("Display name").fill("E2E Buyer");
  await page.getByLabel("Email").fill(BUYER_EMAIL);
  await page.getByLabel("Password").fill("E2EGoodPass1");
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/account");

  // 3. Browse catalog
  await page.goto("/watches");
  await expect(page.getByRole("heading", { name: "All Watches" })).toBeVisible();
  const cards = page.locator("article");
  expect(await cards.count()).toBeGreaterThan(3);

  // 4. Filter by collection (URL-synchronized)
  await page.goto("/watches?collection=SATURN");
  await page.waitForLoadState("networkidle");
  expect(await cards.count()).toBeGreaterThan(0);

  // 5. Open first watch detail
  await cards.first().getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 6. Save to vault (server-side)
  await page.getByRole("button", { name: "Save to Vault" }).first().click();
  await expect(page.getByText("In your Vault — remove")).toBeVisible();

  // 7. Add another watch to cart via card button
  await page.goto("/watches");
  await cards.nth(1).getByRole("button", { name: "Add to cart" }).click();

  // 8. Cart shows the line; proceed to checkout
  await page.goto("/cart");
  await expect(page.getByText("Estimated total")).toBeVisible();

  // 9. Buy Now flow: open a watch, purchase
  await page.goto("/watches");
  await cards.first().getByRole("link").first().click();
  await page.getByRole("button", { name: /Buy Now/ }).click();
  await page.waitForURL("**/checkout/**");

  // 10. Fill checkout with the SUCCESS test card
  await page.getByLabel("Full name").fill("E2E Buyer");
  await page.getByLabel("Address line 1").fill("1 Test Street");
  await page.getByLabel("City").fill("Rome");
  await page.getByLabel("Postal code").fill("00186");
  await page.getByLabel("Country").fill("Italy");
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByLabel("Cardholder name").fill("E2E Buyer");
  await page.getByLabel("Expiry").fill("12/29");
  await page.getByLabel("CVC").fill("123");
  await page.getByRole("button", { name: /Pay .* & Place Order/ }).click();

  // 11. Order page with timeline
  await page.waitForURL("**/orders/**");
  await expect(page.getByText("Custody Timeline")).toBeVisible();
  await expect(page.getByText("Payment confirmed")).toBeVisible();
});

test("declined card shows a readable error", async ({ page }) => {
  await page.goto("/register");
  const email = `e2e-decline-${Date.now()}@aurelius.local`;
  await page.getByLabel("Display name").fill("E2E Decline");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("E2EGoodPass1");
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/account");

  await page.goto("/watches");
  const cards = page.locator("article");
  await cards.first().getByRole("link").first().click();
  await page.getByRole("button", { name: /Buy Now/ }).click();
  await page.waitForURL("**/checkout/**");

  await page.getByLabel("Full name").fill("E2E Decline");
  await page.getByLabel("Address line 1").fill("1 Test Street");
  await page.getByLabel("City").fill("Rome");
  await page.getByLabel("Postal code").fill("00186");
  await page.getByLabel("Country").fill("Italy");
  await page.getByRole("button", { name: "Declined" }).click();
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByLabel("Cardholder name").fill("E2E Decline");
  await page.getByLabel("Expiry").fill("12/29");
  await page.getByLabel("CVC").fill("123");
  await page.getByRole("button", { name: /Pay .* & Place Order/ }).click();

  await expect(page.getByRole("alert")).toContainText(/declined/i);
});
