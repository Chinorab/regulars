// Journey A: sample profile -> intake -> taste -> plan (live Qloo + planner), with timings.
// Run: playwright-cli run-code --filename=tests/e2e/journey-plan.js
async (page) => {
  const base = "http://localhost:3761";
  const vw = page.viewportSize()?.width ?? 0;
  const tag = vw < 600 ? "mobile" : "desktop";
  const shots = "D:/claude/regulars/tests/e2e/screens";
  const out = { tag, width: vw };

  await page.goto(`${base}/privacy`);
  await page.evaluate(() => localStorage.clear());

  await page.goto(`${base}/start?sample=seattle`);
  await page.getByText(/We found (all 4|both|it)/).waitFor({ timeout: 25000 });
  await page.getByText("Ballard, Seattle", { exact: false }).first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${shots}/${tag}-intake.png`, fullPage: true });

  await page.getByRole("button", { name: "See My Taste Profile" }).click();
  await page.waitForURL("**/taste");
  await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 20000 });
  await page.getByText("What we will look for").waitFor();
  await page.waitForTimeout(1500);
  out.portrait = await page.getByRole("heading", { level: 1 }).innerText();
  await page.screenshot({ path: `${shots}/${tag}-taste.png`, fullPage: true });

  const t0 = Date.now();
  await page.getByRole("link", { name: "Build My Plan" }).click();
  await page.waitForURL("**/plan");
  await page.locator("ol li").first().waitFor({ timeout: 10000 });
  out.firstStepMs = Date.now() - t0;
  await page.getByRole("heading", { name: "Join in." }).waitFor({ timeout: 70000 });
  out.planMs = Date.now() - t0;
  await page.waitForTimeout(800);
  out.places = await page.locator("article h3").allInnerTexts();
  out.whyYou = await page.locator('section[aria-label="Why you"] p').first().innerText();
  out.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await page.screenshot({ path: `${shots}/${tag}-plan.png`, fullPage: true });

  // Swap uses a backup without a network call.
  let planCalls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/")) planCalls++;
  });
  const before = (await page.locator("article h3").first().innerText()).trim();
  await page.getByRole("button", { name: "Swap Place" }).first().click();
  await page.waitForTimeout(500);
  out.swap = { before, after: (await page.locator("article h3").first().innerText()).trim(), apiCalls: planCalls };

  return JSON.stringify(out, null, 2);
}
