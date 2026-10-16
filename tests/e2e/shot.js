// Screenshot an existing page state: SHOT_PATH and SHOT_NAME are edited per call.
async (page) => {
  const vw = page.viewportSize()?.width ?? 0;
  const tag = vw < 600 ? "mobile" : "desktop";
  await page.goto("http://localhost:3761/plan");
  await page.getByRole("heading", { name: "Join in." }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `D:/claude/regulars/tests/e2e/screens/${tag}-plan.png`, fullPage: true });
  return JSON.stringify({
    sections: await page.locator("section[id]").count(),
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    photos: await page.evaluate(() => [...document.querySelectorAll("article img")].map((i) => i.naturalWidth)),
  });
}
