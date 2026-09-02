import { chromium } from "@playwright/test";
const URL = "https://aurelius-production-3c6e.up.railway.app";
const email = `live-${Date.now()}@aurelius.local`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url().slice(-44)}`); });

await page.goto(`${URL}/register`);
await page.getByLabel("Display name").fill("Live Smoke");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill("LiveSmoke123");
await page.getByRole("button", { name: "Create Account" }).click();
await page.waitForURL("**/account**", { timeout: 20000 });
console.log("1. register+session: OK");

await page.goto(`${URL}/watches`);
await page.waitForLoadState("networkidle");
const cards = await page.locator("article").count();
console.log(`2. catalog cards: ${cards > 0 ? "OK (" + cards + ")" : "FAIL"}`);

await page.locator("article a").first().click();
await page.waitForURL("**/watches/**");
// Wait for hydration before clicking server-action button
await page.waitForTimeout(1500);
const buyBtn = page.getByRole("button", { name: /Buy now/i }).first();
await buyBtn.waitFor({ state: "visible", timeout: 15000 });
// Capture which watch we clicked
const heading = await page.locator("h1").innerText();
await buyBtn.click();
// Server action may redirect or error — listen for both
try {
  await page.waitForURL("**/checkout/**", { timeout: 25000 });
  console.log(`3. order created for "${heading.slice(0, 40)}": OK → checkout`);
} catch {
  const url = page.url();
  const err = await page.locator("[role=alert], .text-red-400").first().textContent().catch(() => "n/a");
  console.log(`3. FAIL — still on ${url}; error shown: ${String(err).slice(0, 80)}`);
  await page.screenshot({ path: "test-results/live-fail.png", fullPage: true });
  await browser.close();
  process.exit(1);
}

await page.getByLabel("Full name").fill("Live Smoke");
await page.getByLabel("Address line 1").fill("1 Railway Street");
await page.getByLabel("City").fill("London");
await page.getByLabel("Postal code").fill("W1 1AA");
await page.getByLabel("Country").fill("United Kingdom");
await page.getByLabel("Card number").fill("4242 4242 4242 4242");
await page.getByLabel("Cardholder name").fill("Live Smoke");
await page.getByLabel("Expiry").fill("12/29");
await page.getByLabel("CVC").fill("123");
await page.getByRole("button", { name: /Pay .* & Place Order/i }).click();
await page.waitForURL("**/orders/**", { timeout: 25000 });
await page.waitForLoadState("networkidle");
const secured = await page.getByText("Payment confirmed").count();
console.log(`4. mock payment + PAYMENT_SECURED: ${secured > 0 ? "OK" : "FAIL"}`);

console.log(`5. server errors: ${errs.length === 0 ? "none" : errs.slice(0, 3).join(" | ")}`);
await page.screenshot({ path: "test-results/live-order.png" });
await browser.close();
console.log("LIVE SMOKE COMPLETE");
