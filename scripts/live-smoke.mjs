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
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Buy now/i }).first().click();
await page.waitForURL("**/checkout/**", { timeout: 25000 });
console.log("3. order created: OK → checkout");

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

// PAYMENT SECURED badge (OrderStatusBadge) — text in DOM, case-insensitive scan
const body = await page.locator("body").innerText();
const ok = /payment secured/i.test(body) && /mock · succeeded|mock · SUCCEEDED/i.test(body);
console.log(`4. mock payment + PAYMENT_SECURED: ${ok ? "OK" : "FAIL"}`);

console.log(`5. server errors: ${errs.length === 0 ? "none" : errs.slice(0, 3).join(" | ")}`);
await page.screenshot({ path: "test-results/live-order.png" });
await browser.close();
console.log("LIVE SMOKE COMPLETE");
