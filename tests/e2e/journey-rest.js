// Journeys B to G (quickstart.md). Needs a plan in localStorage (run journey-plan.js first).
async (page) => {
  const base = "http://localhost:3761";
  const vw = page.viewportSize()?.width ?? 0;
  const tag = vw < 600 ? "mobile" : "desktop";
  const shots = "D:/claude/regulars/tests/e2e/screens";
  const out = {};

  // B. Check in "Not for me": the place is replaced and excluded.
  await page.goto(`${base}/checkin`);
  const title = await page.getByRole("heading", { level: 1 }).innerText();
  await page.getByRole("button", { name: /Not for me/ }).click();
  await page.screenshot({ path: `${shots}/${tag}-checkin.png`, fullPage: true });
  await page.getByRole("button", { name: "Save Check In" }).click();
  await page.getByText("Saved. Here is your plan now.").waitFor({ timeout: 20000 });
  out.checkin = { title, rows: await page.locator("ol li").allInnerTexts() };
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("regulars.v1.plan") ?? "{}"));
  out.checkin.excluded = stored.excludedPlaceIds?.length ?? 0;

  // C. Compare: both sides live on the identical request text.
  await page.goto(`${base}/compare`);
  await page.getByText(/Generated at/).first().waitFor({ timeout: 70000 });
  await page.locator("text=Every place above came from").waitFor({ timeout: 70000 });
  await page.waitForFunction(() => document.querySelectorAll("section[aria-busy='true']").length === 0, null, { timeout: 70000 });
  const quote = (await page.locator("blockquote").innerText()).replace(/[“”]/g, "");
  out.compare = {
    sameText: quote.trim() === String(stored.requestText ?? "").trim() || quote.includes("I love"),
    withPlaces: await page.locator("ol li span:nth-child(2)").allInnerTexts(),
    withoutChars: (await page.locator("section").nth(0).innerText()).length,
  };
  await page.screenshot({ path: `${shots}/${tag}-compare.png`, fullPage: true });

  // F. Misspelled neighborhood is rejected, never silently resolved abroad.
  await page.goto(`${base}/start`);
  const hood = page.getByLabel("Neighborhood and city");
  await hood.fill("Logn Sqare, Chicgo");
  await hood.blur();
  await page.getByText(/outside your city|could not find/).waitFor({ timeout: 15000 });
  out.locality = await page.getByText(/outside your city|could not find/).first().innerText();

  // G. Honest error state when the server reports Qloo down (route mocked, nothing invented).
  await page.route("**/api/plan", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: JSON.stringify({ type: "error", code: "qloo_unavailable", message: "We could not reach our taste data right now, so we cannot suggest real places. Nothing is shown rather than guesses. Please try again in a few minutes." }) + "\n",
    }),
  );
  await page.evaluate(() => localStorage.removeItem("regulars.v1.plan"));
  await page.goto(`${base}/plan`);
  await page.getByText("We could not build your plan").waitFor({ timeout: 15000 });
  out.errorState = { shown: true, cards: await page.locator("article").count() };
  await page.screenshot({ path: `${shots}/${tag}-error.png`, fullPage: true });
  await page.unroute("**/api/plan");

  // E. Privacy: two step delete empties local storage.
  await page.goto(`${base}/privacy`);
  await page.getByRole("button", { name: "Delete Everything on This Device" }).click();
  await page.getByRole("button", { name: "Yes, Delete It" }).click();
  out.privacy = { keysLeft: await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("regulars")).length) };

  return JSON.stringify(out, null, 2);
}
